import { GpuCandidate, METRIC_DEFINITIONS, MetricKey } from './types';

export type ExtrapolationMode = 'gpu' | 'two-gpu' | 'custom';
export type ExtrapolationScalingModel =
  | 'linear-ratio'
  | 'diminishing-power'
  | 'two-point-line';

const EXTRAPOLATION_SCALING_MODELS: readonly ExtrapolationScalingModel[] = [
  'linear-ratio',
  'diminishing-power',
  'two-point-line',
];

export function isExtrapolationScalingModel(
  value: string,
): value is ExtrapolationScalingModel {
  return EXTRAPOLATION_SCALING_MODELS.some((model) => model === value);
}

export interface ExtrapolationConfig {
  enabled: boolean;
  mode: ExtrapolationMode;
  scalingModel: ExtrapolationScalingModel;
  anchorGpuId: string;
  secondGpuId: string; // Used when mode === 'two-gpu' or scalingModel === 'two-point-line'
  customXValue: number; // e.g., 1000 ($ USD)
  customYValue: number; // e.g., 10 (GB or FPS)
  exponent: number; // Power-law exponent alpha in y = Y0 * (x / X0)^alpha (1.0 = linear, 0.7 = diminishing returns)
  tolerancePct: number; // Margin slack in % (-40 to +40). e.g. -15 means allow 15% below anchor before flagging as bad
  whatIfX: number; // Interactive "What-If" input value on X axis (e.g. $700)
  enforceAsTrap: boolean; // When true, paints GPUs below the cutoff margin as bad/traps
}

export interface GpuExtrapolationDiagnostic {
  gpuId: string;
  isBelowMargin: boolean;
  actualCostPerUnit: number; // X / Y (e.g. $/GB or $/FPS)
  targetCostPerUnit: number; // X / cutoffY at this GPU's X
  anchorYAtActualX: number; // Raw curve Y at this GPU's X
  expectedYAtActualX: number; // Cutoff Y (including tolerancePct) at this GPU's X
  fairXForActualY: number; // How much X (e.g. $) it SHOULD cost for its actual Y
  deltaPctFromCutoff: number; // + means beats cutoff, - means below cutoff
  summaryText: string;
}

export interface ExtrapolationEvaluation {
  anchorLabel: string;
  formulaLabel: string;
  anchorX: number;
  anchorY: number;
  secondX?: number;
  secondY?: number;
  slope: number; // Primary linear slope Y_0 / X_0 (or secant slope)
  intercept: number; // Y-intercept for two-point affine lines
  exponent: number;
  toleranceFactor: number;
  costPerUnit: number; // X_0 / Y_0 (e.g., $100 / GB)
  unitPerCost: number; // Y_0 / X_0 (e.g., 0.01 GB / $)
  whatIfX: number;
  whatIfAnchorY: number;
  whatIfCutoffY: number;
  belowMarginIds: string[];
  diagnostics: Record<string, GpuExtrapolationDiagnostic>;
  evaluateAnchorY: (x: number) => number;
  evaluateCutoffY: (x: number) => number;
  evaluateInverseX: (y: number) => number;
}

/**
 * Evaluates a personalized value extrapolation model across candidates:
 * - 'linear-ratio':      y(x) = (Y_0 / X_0) * x
 * - 'diminishing-power': y(x) = Y_0 * (x / X_0)^alpha
 * - 'two-point-line':    y(x) = Y_1 + ((Y_2 - Y_1) / (X_2 - X_1)) * (x - X_1)
 *
 * Applies `tolerancePct` slack/strictness to compute the cutoff curve `y_cutoff(x)`.
 */
export function evaluateLinearExtrapolation(
  candidates: GpuCandidate[],
  xMetric: MetricKey,
  yMetric: MetricKey,
  config: ExtrapolationConfig
): ExtrapolationEvaluation {
  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];

  const exponent =
    typeof config.exponent === 'number' && Number.isFinite(config.exponent)
      ? Math.max(0.2, Math.min(2.0, config.exponent))
      : 1.0;
  const tolerancePct =
    typeof config.tolerancePct === 'number' &&
    Number.isFinite(config.tolerancePct)
      ? Math.max(-60, Math.min(60, config.tolerancePct))
      : 0;
  const scalingModel: ExtrapolationScalingModel =
    config.scalingModel ??
    (config.mode === 'two-gpu' ? 'two-point-line' : 'linear-ratio');

  let anchorX = Math.max(1e-6, config.customXValue || 1000);
  let anchorY = Math.max(1e-6, config.customYValue || 10);
  let anchorLabel = `Custom (${
    xDef.unit === '$' ? `$${anchorX}` : `${anchorX} ${xDef.unit}`
  } → ${anchorY} ${yDef.unit})`;

  if (
    (config.mode === 'gpu' || config.mode === 'two-gpu') &&
    candidates.length > 0
  ) {
    const found =
      candidates.find((c) => c.id === config.anchorGpuId) ?? candidates[0];
    anchorX = Math.max(1e-6, found[xMetric]);
    anchorY = Math.max(1e-6, found[yMetric]);
    anchorLabel = found.name.replace(' [TRAP]', '');
  }

  let secondX = anchorX * 1.5;
  let secondY = anchorY * 1.5;
  if (candidates.length > 1) {
    const secondFound =
      candidates.find(
        (c) => c.id === config.secondGpuId && c.id !== config.anchorGpuId
      ) ??
      candidates.find((c) => c.id !== config.anchorGpuId) ??
      candidates[0];
    secondX = Math.max(1e-6, secondFound[xMetric]);
    secondY = Math.max(1e-6, secondFound[yMetric]);
    if (config.mode === 'two-gpu' || scalingModel === 'two-point-line') {
      anchorLabel = `${anchorLabel} ↔ ${secondFound.name.replace(
        ' [TRAP]',
        ''
      )}`;
    }
  }

  const ratioSlope = anchorY / anchorX;
  const costPerUnit = anchorX / anchorY;
  const unitPerCost = ratioSlope;

  // Secant slope & intercept for 'two-point-line'
  const dx = secondX - anchorX;
  const secantSlope =
    Math.abs(dx) > 1e-6 ? (secondY - anchorY) / dx : ratioSlope;
  const secantIntercept = anchorY - secantSlope * anchorX;

  const isTwoPoint =
    config.mode === 'two-gpu' || scalingModel === 'two-point-line';
  const isPowerLaw = !isTwoPoint && scalingModel === 'diminishing-power';

  // Primary Anchor Function y_anchor(x)
  const evaluateAnchorY = (x: number): number => {
    const safeX = Math.max(1e-6, x);
    if (isTwoPoint) {
      return Math.max(0, secantIntercept + secantSlope * safeX);
    }
    if (isPowerLaw) {
      return anchorY * Math.pow(safeX / anchorX, exponent);
    }
    return ratioSlope * safeX;
  };

  // When y is maximized (FPS, VRAM), positive tolerancePct (+10%) raises the required bar,
  // while negative tolerancePct (-15%) gives diminishing-returns slack below the anchor curve.
  // When y is minimized (Power Draw W), negative tolerancePct allows slightly higher Watts.
  const toleranceFactor =
    yDef.direction === 'max'
      ? Math.max(0.1, 1 + tolerancePct / 100)
      : Math.max(0.1, 1 - tolerancePct / 100);

  const evaluateCutoffY = (x: number): number => {
    return evaluateAnchorY(x) * toleranceFactor;
  };

  // Inverse function x_cutoff(y): how much X is justified for a given Y
  const evaluateInverseX = (y: number): number => {
    const targetAnchorY = Math.max(1e-6, y / toleranceFactor);
    if (isTwoPoint) {
      if (Math.abs(secantSlope) < 1e-6) return anchorX;
      return Math.max(0, (targetAnchorY - secantIntercept) / secantSlope);
    }
    if (isPowerLaw) {
      return anchorX * Math.pow(targetAnchorY / anchorY, 1 / exponent);
    }
    return ratioSlope > 0 ? targetAnchorY / ratioSlope : anchorX;
  };

  const formulaLabel = isTwoPoint
    ? `Secant Line: y = ${secantSlope.toFixed(2)}x ${
        secantIntercept >= 0 ? '+' : '-'
      } ${Math.abs(secantIntercept).toFixed(1)}`
    : isPowerLaw
    ? `Power Curve (α=${exponent.toFixed(2)}): y = ${anchorY}·(x/${anchorX})^${exponent.toFixed(
        2
      )}`
    : `Linear Ratio: ${
        xDef.unit === '$' ? `$${costPerUnit.toFixed(2)}` : costPerUnit.toFixed(2)
      }/${yDef.unit}`;

  const belowMarginIds: string[] = [];
  const diagnostics: Record<string, GpuExtrapolationDiagnostic> = {};

  for (const gpu of candidates) {
    const gx = Math.max(1e-6, gpu[xMetric]);
    const gy = Math.max(1e-6, gpu[yMetric]);

    const anchorYAtActualX = evaluateAnchorY(gx);
    const expectedYAtActualX = evaluateCutoffY(gx);
    const fairXForActualY = evaluateInverseX(gy);
    const actualCostPerUnit = gx / gy;
    const targetCostPerUnit =
      expectedYAtActualX > 1e-6 ? gx / expectedYAtActualX : costPerUnit;

    let isBelowMargin = false;
    if (yDef.direction === 'max' && xDef.direction === 'min') {
      isBelowMargin = gy < expectedYAtActualX - 1e-6;
    } else if (yDef.direction === 'min' && xDef.direction === 'min') {
      isBelowMargin = gy > expectedYAtActualX + 1e-6;
    } else if (yDef.direction === 'max' && xDef.direction === 'max') {
      isBelowMargin = gy < expectedYAtActualX - 1e-6;
    } else {
      isBelowMargin = gy > expectedYAtActualX + 1e-6;
    }

    if (isBelowMargin) {
      belowMarginIds.push(gpu.id);
    }

    const rawDeltaPct =
      expectedYAtActualX > 1e-6
        ? ((gy - expectedYAtActualX) / expectedYAtActualX) * 100
        : 0;
    const deltaPctFromCutoff =
      yDef.direction === 'max' ? rawDeltaPct : -rawDeltaPct;

    const rateUnit =
      xDef.unit === '$'
        ? `$${actualCostPerUnit.toFixed(2)}/${yDef.unit}`
        : `${actualCostPerUnit.toFixed(2)} ${xDef.unit}/${yDef.unit}`;
    const targetRateUnit =
      xDef.unit === '$'
        ? `$${targetCostPerUnit.toFixed(2)}/${yDef.unit}`
        : `${targetCostPerUnit.toFixed(2)} ${xDef.unit}/${yDef.unit}`;

    const summaryText = isBelowMargin
      ? `Below extrapolated cutoff (${rateUnit} vs target ${targetRateUnit}): at ${
          xDef.unit === '$' ? `$${gx}` : `${gx} ${xDef.unit}`
        }, needs ≥ ${expectedYAtActualX.toFixed(1)} ${yDef.unit} (or max ${
          xDef.unit === '$'
            ? `$${Math.round(fairXForActualY)}`
            : `${Math.round(fairXForActualY)} ${xDef.unit}`
        }).`
      : `Passes extrapolated cutoff (${
          deltaPctFromCutoff >= 0 ? '+' : ''
        }${deltaPctFromCutoff.toFixed(1)}% vs cutoff, ${rateUnit}).`;

    diagnostics[gpu.id] = {
      gpuId: gpu.id,
      isBelowMargin,
      actualCostPerUnit: Math.round(actualCostPerUnit * 100) / 100,
      targetCostPerUnit: Math.round(targetCostPerUnit * 100) / 100,
      anchorYAtActualX: Math.round(anchorYAtActualX * 10) / 10,
      expectedYAtActualX: Math.round(expectedYAtActualX * 10) / 10,
      fairXForActualY: Math.round(fairXForActualY),
      deltaPctFromCutoff: Math.round(deltaPctFromCutoff * 10) / 10,
      summaryText,
    };
  }

  const whatIfX =
    typeof config.whatIfX === 'number' && config.whatIfX > 0
      ? config.whatIfX
      : anchorX;

  return {
    anchorLabel,
    formulaLabel,
    anchorX,
    anchorY,
    secondX: isTwoPoint ? secondX : undefined,
    secondY: isTwoPoint ? secondY : undefined,
    slope: isTwoPoint ? secantSlope : ratioSlope,
    intercept: isTwoPoint ? secantIntercept : 0,
    exponent,
    toleranceFactor,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    unitPerCost: Math.round(unitPerCost * 10000) / 10000,
    whatIfX,
    whatIfAnchorY: Math.round(evaluateAnchorY(whatIfX) * 10) / 10,
    whatIfCutoffY: Math.round(evaluateCutoffY(whatIfX) * 10) / 10,
    belowMarginIds,
    diagnostics,
    evaluateAnchorY,
    evaluateCutoffY,
    evaluateInverseX,
  };
}

/**
 * Samples the extrapolated curve (linear, secant, or power-law) across [xMin, xMax]
 * and clips to the visible chart box [xMin, xMax] x [yMin, yMax].
 */
export function getExtrapolationCurvePoints(
  evalFn: (x: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  steps = 48
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const dx = (xMax - xMin) / Math.max(1, steps);
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    const y = evalFn(x);
    if (y >= yMin - (yMax - yMin) * 0.05 && y <= yMax + (yMax - yMin) * 0.05) {
      pts.push([
        Math.round(x * 100) / 100,
        Math.round(Math.max(yMin, Math.min(yMax, y)) * 100) / 100,
      ]);
    }
  }
  if (pts.length < 2) {
    return [
      [xMin, Math.max(yMin, Math.min(yMax, evalFn(xMin)))],
      [xMax, Math.max(yMin, Math.min(yMax, evalFn(xMax)))],
    ];
  }
  return pts;
}

/**
 * Clips the linear ray y = slope * x to the visible rectangular chart box [xMin, xMax] x [yMin, yMax].
 */
export function getClippedExtrapolationLine(
  slope: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): [[number, number], [number, number]] {
  if (slope <= 0) {
    return [
      [xMin, yMin],
      [xMax, yMin],
    ];
  }

  let xStart = xMin;
  let yStart = slope * xStart;
  if (yStart < yMin) {
    yStart = yMin;
    xStart = yMin / slope;
  } else if (yStart > yMax) {
    yStart = yMax;
    xStart = yMax / slope;
  }

  let xEnd = xMax;
  let yEnd = slope * xEnd;
  if (yEnd > yMax) {
    yEnd = yMax;
    xEnd = yMax / slope;
  } else if (yEnd < yMin) {
    yEnd = yMin;
    xEnd = yMin / slope;
  }

  return [
    [
      Math.max(xMin, Math.min(xMax, xStart)),
      Math.max(yMin, Math.min(yMax, yStart)),
    ],
    [
      Math.max(xMin, Math.min(xMax, xEnd)),
      Math.max(yMin, Math.min(yMax, yEnd)),
    ],
  ];
}
