import {
  METRIC_DEFINITIONS,
  MetricKey,
  MetricScoreBreakdown,
  ParetoEvaluatedGpu,
  PreferenceWeights,
  RankedGpu,
  TopsisScoreBreakdown,
} from './types';

export const ALL_METRIC_KEYS: MetricKey[] = [
  'price',
  'rasterFps1440p',
  'rtFps1440p',
  'vramGb',
  'tdpWatts',
];

export const DEFAULT_PREFERENCE_WEIGHTS: PreferenceWeights = {
  price: 35,
  rasterFps1440p: 30,
  rtFps1440p: 15,
  vramGb: 12,
  tdpWatts: 8,
};

/** A fresh all-zero record over every MetricKey (typed without an `as` cast). */
function zeroMetricRecord(): Record<MetricKey, number> {
  return { price: 0, rasterFps1440p: 0, rtFps1440p: 0, vramGb: 0, tdpWatts: 0 };
}

/**
 * Normalizes user slider weights w = [w_1, ..., w_k] so that sum(w_j) = 1.
 * If all sliders are set to 0, falls back to uniform weights (1 / k).
 */
export function normalizeWeights(
  weights: Partial<PreferenceWeights>,
): PreferenceWeights {
  const sum = ALL_METRIC_KEYS.reduce(
    (acc, key) => acc + Math.max(0, weights[key] ?? 0),
    0,
  );

  if (sum <= 0) {
    const uniform = 1 / ALL_METRIC_KEYS.length;
    return {
      price: uniform,
      rasterFps1440p: uniform,
      rtFps1440p: uniform,
      vramGb: uniform,
      tdpWatts: uniform,
    };
  }

  return {
    price: Math.max(0, weights.price ?? 0) / sum,
    rasterFps1440p: Math.max(0, weights.rasterFps1440p ?? 0) / sum,
    rtFps1440p: Math.max(0, weights.rtFps1440p ?? 0) / sum,
    vramGb: Math.max(0, weights.vramGb ?? 0) / sum,
    tdpWatts: Math.max(0, weights.tdpWatts ?? 0) / sum,
  };
}

interface CachedNormalizedCandidate {
  candidate: ParetoEvaluatedGpu;
  normalizedMetrics: Record<MetricKey, number>;
}

const NORMALIZED_MATRIX_CACHE = new WeakMap<
  ParetoEvaluatedGpu[],
  readonly CachedNormalizedCandidate[]
>();

/**
 * Stage 3: TOPSIS Ranking (Technique for Order of Preference by Similarity to Ideal Solution)
 *
 * 1. Vector Normalization: r_ij = x_ij / sqrt(sum_{i=1}^N x_ij^2)
 * 2. Weighted Normalized Matrix: v_ij = w_j * r_ij
 * 3. Ideal Best (A^+) and Ideal Worst (A^-):
 *    - Maximized metrics: A_j^+ = max_i(v_ij), A_j^- = min_i(v_ij)
 *    - Minimized metrics: A_j^+ = min_i(v_ij), A_j^- = max_i(v_ij)
 * 4. Euclidean Distances:
 *    - d_i^+ = sqrt(sum_j (v_ij - A_j^+)^2)
 *    - d_i^- = sqrt(sum_j (v_ij - A_j^-)^2)
 * 5. Relative Closeness Score:
 *    - C_i = d_i^- / (d_i^+ + d_i^-)
 */
export function rankByTopsis(
  candidates: ParetoEvaluatedGpu[],
  rawWeights: Partial<PreferenceWeights> = DEFAULT_PREFERENCE_WEIGHTS,
): RankedGpu[] {
  if (candidates.length === 0) {
    return [];
  }

  const weights = normalizeWeights(rawWeights);

  // Fast-path memoization: reuse precomputed Euclidean column norms and normalized candidate vectors (PERF-06)
  let normalizedList = NORMALIZED_MATRIX_CACHE.get(candidates);
  if (!normalizedList) {
    // Step 1: Compute Euclidean column norms sqrt(sum x_ij^2)
    const columnNorms = zeroMetricRecord();
    for (const metric of ALL_METRIC_KEYS) {
      const sumSq = candidates.reduce(
        (acc, c) => acc + c[metric] * c[metric],
        0,
      );
      columnNorms[metric] = Math.sqrt(sumSq);
    }

    normalizedList = candidates.map((candidate) => {
      const normalizedMetrics = zeroMetricRecord();
      for (const metric of ALL_METRIC_KEYS) {
        const norm = columnNorms[metric];
        normalizedMetrics[metric] = norm > 0 ? candidate[metric] / norm : 0;
      }
      return { candidate, normalizedMetrics };
    });

    NORMALIZED_MATRIX_CACHE.set(candidates, normalizedList);
  }

  // Step 2: Compute weighted metrics v_ij = w_j * r_ij for each candidate
  const matrices = normalizedList.map(({ candidate, normalizedMetrics }) => {
    const weightedMetrics = zeroMetricRecord();
    for (const metric of ALL_METRIC_KEYS) {
      weightedMetrics[metric] = weights[metric] * normalizedMetrics[metric];
    }

    return {
      candidate,
      normalizedMetrics,
      weightedMetrics,
    };
  });

  // Step 3: Determine Ideal Best (A^+) and Ideal Worst (A^-)
  const idealBest = zeroMetricRecord();
  const idealWorst = zeroMetricRecord();

  for (const metric of ALL_METRIC_KEYS) {
    const values = matrices.map((m) => m.weightedMetrics[metric]);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const direction = METRIC_DEFINITIONS[metric].direction;

    if (direction === 'max') {
      idealBest[metric] = maxVal;
      idealWorst[metric] = minVal;
    } else {
      idealBest[metric] = minVal;
      idealWorst[metric] = maxVal;
    }
  }

  // Step 4 & 5: Compute Euclidean distances d_i^+, d_i^- and Relative Closeness C_i
  const scored: RankedGpu[] = matrices.map(
    ({ candidate, normalizedMetrics, weightedMetrics }) => {
      let sumSqBest = 0;
      let sumSqWorst = 0;

      for (const metric of ALL_METRIC_KEYS) {
        const v_ij = weightedMetrics[metric];
        const diffBest = v_ij - idealBest[metric];
        const diffWorst = v_ij - idealWorst[metric];
        sumSqBest += diffBest * diffBest;
        sumSqWorst += diffWorst * diffWorst;
      }

      const dPlus = Math.sqrt(sumSqBest);
      const dMinus = Math.sqrt(sumSqWorst);
      const denom = dPlus + dMinus;
      // If all candidates are identical (denom === 0), closeness score is 1.0
      const topsisScore = denom > 0 ? dMinus / denom : 1.0;

      return {
        ...candidate,
        topsisScore,
        topsisScorePct: Math.round(topsisScore * 1000) / 10,
        distanceToBest: dPlus,
        distanceToWorst: dMinus,
        normalizedMetrics,
        weightedMetrics,
        rank: 0,
        frontierRank: null,
      };
    },
  );

  // Sort descending by C_i (tie-breaker: Pareto optimal first, then lower price)
  const sorted = [...scored].sort((a, b) => {
    if (Math.abs(b.topsisScore - a.topsisScore) > 1e-9) {
      return b.topsisScore - a.topsisScore;
    }
    if (a.isParetoOptimal !== b.isParetoOptimal) {
      return a.isParetoOptimal ? -1 : 1;
    }
    return a.price - b.price;
  });

  // Assign overall rank and frontier-only rank
  let currentFrontierRank = 1;
  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    frontierRank: item.isParetoOptimal ? currentFrontierRank++ : null,
  }));
}

/**
 * Detailed multi-criteria score breakdown for a specific candidate.
 * Shows normalized values r_ij, user weights w_j, weighted values v_ij,
 * ideal best A_j^+ / worst A_j^-, squared Euclidean distances, and relative proximity.
 */
export function computeTopsisBreakdown(
  candidate: RankedGpu,
  allCandidates: RankedGpu[],
  rawWeights: Partial<PreferenceWeights> = DEFAULT_PREFERENCE_WEIGHTS,
): TopsisScoreBreakdown {
  const weights = normalizeWeights(rawWeights);

  // Determine Ideal Best (A^+) and Ideal Worst (A^-) across all candidates
  const idealBest = zeroMetricRecord();
  const idealWorst = zeroMetricRecord();

  for (const metric of ALL_METRIC_KEYS) {
    const values = allCandidates.map((c) => c.weightedMetrics[metric]);
    const maxVal = values.length > 0 ? Math.max(...values) : 0;
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const direction = METRIC_DEFINITIONS[metric].direction;

    if (direction === 'max') {
      idealBest[metric] = maxVal;
      idealWorst[metric] = minVal;
    } else {
      idealBest[metric] = minVal;
      idealWorst[metric] = maxVal;
    }
  }

  const metrics: MetricScoreBreakdown[] = ALL_METRIC_KEYS.map((metric) => {
    const direction = METRIC_DEFINITIONS[metric].direction;
    const rawVal = candidate[metric];
    const normalizedVal = candidate.normalizedMetrics[metric];
    const weight = weights[metric];
    const weightedVal = candidate.weightedMetrics[metric];
    const best = idealBest[metric];
    const worst = idealWorst[metric];
    const diffBest = weightedVal - best;
    const diffWorst = weightedVal - worst;
    const diffBestSq = diffBest * diffBest;
    const diffWorstSq = diffWorst * diffWorst;

    let closenessPct = 100;
    const range = Math.abs(best - worst);
    if (range > 1e-9) {
      if (direction === 'max') {
        closenessPct = Math.max(
          0,
          Math.min(100, ((weightedVal - worst) / range) * 100),
        );
      } else {
        closenessPct = Math.max(
          0,
          Math.min(100, ((worst - weightedVal) / range) * 100),
        );
      }
    }

    return {
      metric,
      direction,
      rawVal,
      normalizedVal,
      weight,
      weightedVal,
      idealBest: best,
      idealWorst: worst,
      diffBestSq,
      diffWorstSq,
      closenessPct: Math.round(closenessPct * 10) / 10,
    };
  });

  const sumSqBest = metrics.reduce((acc, m) => acc + m.diffBestSq, 0);
  const sumSqWorst = metrics.reduce((acc, m) => acc + m.diffWorstSq, 0);
  const distanceToBest = Math.sqrt(sumSqBest);
  const distanceToWorst = Math.sqrt(sumSqWorst);
  const denom = distanceToBest + distanceToWorst;
  const topsisScore = denom > 0 ? distanceToWorst / denom : 1.0;

  return {
    gpuId: candidate.id,
    gpuName: candidate.name,
    topsisScore,
    topsisScorePct: Math.round(topsisScore * 1000) / 10,
    distanceToBest,
    distanceToWorst,
    metrics,
  };
}
