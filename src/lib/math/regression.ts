import { GpuCandidate, GpuValuation, HedonicModelSummary, ValueTier } from './types';

/**
 * Solves a linear system A * x = b of size k x k using Gaussian elimination
 * with partial pivoting. Returns null if the matrix is singular.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find row with maximum absolute value in column `col`
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const absVal = Math.abs(M[row][col]);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxRow = row;
      }
    }

    if (maxVal < 1e-11) {
      return null;
    }

    // Swap rows if needed
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate rows below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row][n];
    for (let col = row + 1; col < n; col++) {
      sum -= M[row][col] * x[col];
    }
    x[row] = sum / M[row][row];
  }

  return x;
}

/**
 * Classifies a percentage residual into a buyer-friendly value tier:
 * - residualPct <= -8%: 'bargain' (Underpriced / Great Value)
 * - residualPct >= +8%: 'overpriced' (Overpriced vs. market curve)
 * - otherwise: 'fair'
 */
export function classifyValueTier(residualPct: number): ValueTier {
  if (residualPct <= -8) return 'bargain';
  if (residualPct >= 8) return 'overpriced';
  return 'fair';
}

/**
 * Phase 2: Hedonic Log-Linear Ordinary Least Squares (OLS) Regression
 *
 * Fits:
 *   ln(Price_i) = beta_0 + beta_1 * rasterFps1440p + beta_2 * rtFps1440p + beta_3 * vramGb + beta_4 * tdpWatts
 *
 * Applies slight Ridge regularization (lambda = 1e-5) on non-intercept diagonal entries of X^T X
 * so collinear or small filtered subsets never produce NaN/Infinity.
 */
export function computeHedonicRegression(
  candidates: GpuCandidate[]
): HedonicModelSummary {
  if (candidates.length === 0) {
    return {
      intercept: 0,
      coefficients: {
        rasterFps1440p: 0,
        rtFps1440p: 0,
        vramGb: 0,
        tdpWatts: 0,
      },
      rSquared: 0,
      valuations: {},
    };
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    return {
      intercept: Math.log(Math.max(1, only.price)),
      coefficients: {
        rasterFps1440p: 0,
        rtFps1440p: 0,
        vramGb: 0,
        tdpWatts: 0,
      },
      rSquared: 1,
      valuations: {
        [only.id]: {
          fairPrice: only.price,
          residualUsd: 0,
          residualPct: 0,
          valueTier: 'fair',
        },
      },
    };
  }

  const p = 5; // [1, rasterFps1440p, rtFps1440p, vramGb, tdpWatts]
  const XtX: number[][] = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0)
  );
  const Xty: number[] = new Array<number>(p).fill(0);

  const rows: number[][] = [];
  const yLogPrices: number[] = [];

  for (const gpu of candidates) {
    const safePrice = Math.max(1, gpu.price);
    const y = Math.log(safePrice);
    const xRow = [
      1,
      gpu.rasterFps1440p,
      gpu.rtFps1440p,
      gpu.vramGb,
      gpu.tdpWatts,
    ];
    rows.push(xRow);
    yLogPrices.push(y);

    for (let i = 0; i < p; i++) {
      Xty[i] += xRow[i] * y;
      for (let j = 0; j < p; j++) {
        XtX[i][j] += xRow[i] * xRow[j];
      }
    }
  }

  // Tikhonov / Ridge stabilization on feature diagonals (excluding intercept i=0)
  const ridgeLambda = 1e-4;
  for (let i = 1; i < p; i++) {
    XtX[i][i] += ridgeLambda;
  }

  const meanLogY =
    yLogPrices.reduce((acc, val) => acc + val, 0) / yLogPrices.length;

  const betas = solveLinearSystem(XtX, Xty) ?? [meanLogY, 0, 0, 0, 0];

  // Compute predictions, R^2 in log space, and dollar residuals
  let ssTot = 0;
  let ssRes = 0;
  const valuations: Record<string, GpuValuation> = {};

  for (let idx = 0; idx < candidates.length; idx++) {
    const gpu = candidates[idx];
    const xRow = rows[idx];
    const yActual = yLogPrices[idx];

    let yHat = 0;
    for (let j = 0; j < p; j++) {
      yHat += betas[j] * xRow[j];
    }

    ssTot += (yActual - meanLogY) ** 2;
    ssRes += (yActual - yHat) ** 2;

    const rawFairPrice = Math.exp(yHat);
    const fairPrice = Math.round(rawFairPrice);
    const residualUsd = Math.round(gpu.price - fairPrice);
    const residualPct =
      fairPrice > 0
        ? Math.round(((gpu.price - fairPrice) / fairPrice) * 1000) / 10
        : 0;

    valuations[gpu.id] = {
      fairPrice,
      residualUsd,
      residualPct,
      valueTier: classifyValueTier(residualPct),
    };
  }

  const rSquared =
    ssTot > 1e-9 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  return {
    intercept: betas[0],
    coefficients: {
      rasterFps1440p: betas[1],
      rtFps1440p: betas[2],
      vramGb: betas[3],
      tdpWatts: betas[4],
    },
    rSquared,
    valuations,
  };
}
