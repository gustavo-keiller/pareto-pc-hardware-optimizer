import { describe, expect, it } from 'vitest';
import { PHASE1_SEED_GPUS } from '../../../data/seedGpus';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';
import {
  buildDominanceReason,
  dominates,
  evaluateParetoFrontier,
  filterByHardConstraints,
  get2DParetoFrontierCurve,
} from '../pareto';
import {
  DEFAULT_PREFERENCE_WEIGHTS,
  normalizeWeights,
  rankByTopsis,
} from '../topsis';
import {
  classifyValueTier,
  computeHedonicRegression,
  solveLinearSystem,
} from '../regression';
import {
  evaluateLinearExtrapolation,
  getClippedExtrapolationLine,
  getExtrapolationCurvePoints,
  isExtrapolationScalingModel,
} from '../extrapolation';
import { METRIC_DEFINITIONS, isMetricKey } from '../types';
import { GpuCandidate } from '../types';

describe('Stage 1: Hard-Constraint Filtering (filterByHardConstraints)', () => {
  it('returns all 10 seed GPUs when no constraints are breached', () => {
    const valid = filterByHardConstraints(PHASE1_SEED_GPUS, {
      maxPrice: 1000,
      minVram: 8,
      maxWatts: 400,
    });
    expect(valid).toHaveLength(10);
  });

  it('filters out GPUs exceeding maxPrice, below minVram, or exceeding maxWatts', () => {
    const valid = filterByHardConstraints(PHASE1_SEED_GPUS, {
      maxPrice: 600,
      minVram: 12,
      maxWatts: 250,
    });
    const ids = valid.map((g) => g.id);
    expect(ids).toEqual(['gpu-4', 'gpu-6', 'gpu-7']);
  });

  it('filters by brand / vendor when selectedVendors is provided', () => {
    const nvidiaOnly = filterByHardConstraints(REAL_WORLD_GPUS, {
      selectedVendors: ['NVIDIA'],
    });
    expect(nvidiaOnly).toHaveLength(8);
    expect(nvidiaOnly.every((g) => g.vendor === 'NVIDIA')).toBe(true);

    const amdOnly = filterByHardConstraints(REAL_WORLD_GPUS, {
      selectedVendors: ['AMD'],
    });
    expect(amdOnly).toHaveLength(9);
    expect(amdOnly.every((g) => g.vendor === 'AMD')).toBe(true);

    const intelOnly = filterByHardConstraints(REAL_WORLD_GPUS, {
      selectedVendors: ['Intel'],
    });
    expect(intelOnly).toHaveLength(1);
    expect(intelOnly[0].id).toBe('arc-b580');

    const multiVendor = filterByHardConstraints(REAL_WORLD_GPUS, {
      selectedVendors: ['AMD', 'Intel'],
    });
    expect(multiVendor).toHaveLength(10);
  });

  it('filters by proprietary technology requirements (e.g. DLSS 3+ Frame Gen, AV1 Video Encode)', () => {
    const dlssGpus = filterByHardConstraints(REAL_WORLD_GPUS, {
      requiredFeatures: ['DLSS 3+ Frame Gen'],
    });
    // RTX 40 cards have DLSS 3 Frame Gen; RTX 3060 12GB does not
    expect(dlssGpus.length).toBeGreaterThan(0);
    expect(dlssGpus.some((g) => g.id === 'rtx-3060-12gb')).toBe(false);
    expect(dlssGpus.every((g) => g.vendor === 'NVIDIA')).toBe(true);

    const av1Gpus = filterByHardConstraints(REAL_WORLD_GPUS, {
      requiredFeatures: ['AV1 Video Encode'],
    });
    // Older RX 6000 and RTX 3000 do not have AV1 encoder
    expect(av1Gpus.some((g) => g.id === 'rx-6600')).toBe(false);
    expect(av1Gpus.some((g) => g.id === 'rx-6750-xt')).toBe(false);
    expect(av1Gpus.some((g) => g.id === 'rtx-3060-12gb')).toBe(false);
    expect(av1Gpus.some((g) => g.id === 'arc-b580')).toBe(true);
    expect(av1Gpus.some((g) => g.id === 'rx-7800-xt')).toBe(true);
  });

  it('combines numeric budget constraints with brand and technology filters', () => {
    const filtered = filterByHardConstraints(REAL_WORLD_GPUS, {
      maxPrice: 500,
      minVram: 12,
      selectedVendors: ['AMD'],
      requiredFeatures: ['AV1 Video Encode'],
    });
    // Must be AMD, <= $500, >= 12GB VRAM, and have AV1 encode (RX 7600 XT, RX 7700 XT, RX 7800 XT)
    expect(filtered.every((g) => g.vendor === 'AMD')).toBe(true);
    expect(filtered.every((g) => g.price <= 500)).toBe(true);
    expect(filtered.every((g) => g.vramGb >= 12)).toBe(true);
    expect(filtered.some((g) => g.id === 'rx-6750-xt')).toBe(false); // RX 6750 XT lacks AV1
  });
});

describe('Stage 2: Pareto Dominance Engine (pareto.ts)', () => {
  it('flags exactly gpu-3, gpu-5, and gpu-8 as dominated when evaluating Price vs. Raster FPS on Phase 1 Seed Data', () => {
    const evaluated = evaluateParetoFrontier(PHASE1_SEED_GPUS, [
      'price',
      'rasterFps1440p',
    ]);

    const dominatedIds = evaluated
      .filter((g) => g.isDominated)
      .map((g) => g.id)
      .sort();

    const optimalIds = evaluated
      .filter((g) => g.isParetoOptimal)
      .map((g) => g.id)
      .sort();

    expect(dominatedIds).toEqual(['gpu-3', 'gpu-5', 'gpu-8']);
    expect(optimalIds).toEqual([
      'gpu-1',
      'gpu-10',
      'gpu-2',
      'gpu-4',
      'gpu-6',
      'gpu-7',
      'gpu-9',
    ]);
  });

  it('correctly identifies the exact Pareto-optimal dominators for gpu-3, gpu-5, and gpu-8', () => {
    const evaluated = evaluateParetoFrontier(PHASE1_SEED_GPUS, [
      'price',
      'rasterFps1440p',
    ]);

    const byId = Object.fromEntries(evaluated.map((g) => [g.id, g]));

    expect(byId['gpu-3'].dominatedBy).toEqual(['gpu-2']);
    expect(byId['gpu-3'].dominanceReasons[0].summaryText).toContain(
      'Vortex RX 760 is $35 cheaper',
    );

    expect(byId['gpu-5'].dominatedBy).toEqual(['gpu-4']);
    expect(byId['gpu-5'].dominanceReasons[0].summaryText).toContain(
      'Vortex RX 770 XT is $30 cheaper',
    );

    expect(byId['gpu-8'].dominatedBy).toEqual(['gpu-7']);
    expect(byId['gpu-8'].dominanceReasons[0].summaryText).toContain(
      'Apex 4075 Super is $30 cheaper',
    );
  });

  it('distinguishes 2D Price/Raster dominance from 5D Full Dominance on Real-World GPUs', () => {
    const eval2D = evaluateParetoFrontier(REAL_WORLD_GPUS, [
      'price',
      'rasterFps1440p',
    ]);
    const eval5D = evaluateParetoFrontier(REAL_WORLD_GPUS, [
      'price',
      'rasterFps1440p',
      'rtFps1440p',
      'vramGb',
      'tdpWatts',
    ]);

    const opt2D = eval2D.filter((g) => g.isParetoOptimal).map((g) => g.id);
    const opt5D = eval5D.filter((g) => g.isParetoOptimal).map((g) => g.id);

    // In 2D (Price vs Raster), RTX 4070 Super ($590, 126 FPS) is dominated by RX 7900 GRE ($540, 128 FPS)
    expect(opt2D).not.toContain('rtx-4070-super');
    // In 5D (including Ray Tracing & Power), RTX 4070 Super (102 RT FPS, 220W) is Pareto-optimal!
    expect(opt5D).toContain('rtx-4070-super');

    // Similarly, RTX 4060 (115W) and RX 7600 XT (16GB VRAM at $315) survive in 5D
    expect(opt2D).not.toContain('rtx-4060');
    expect(opt5D).toContain('rtx-4060');
    expect(opt2D).not.toContain('rx-7600-xt');
    expect(opt5D).toContain('rx-7600-xt');

    // Meanwhile RTX 3060 12GB ($285, 56 FPS, 35 RT, 12GB, 170W) is strictly dominated in 2D by Arc B580 ($250, 74 FPS)
    expect(opt2D).not.toContain('rtx-3060-12gb');
  });

  it('handles edge cases in dominates() and buildDominanceReason()', () => {
    const gpuA = PHASE1_SEED_GPUS[0];
    expect(dominates(gpuA, gpuA, ['price', 'rasterFps1440p'])).toBe(false);
    expect(dominates(PHASE1_SEED_GPUS[1], PHASE1_SEED_GPUS[2], [])).toBe(false);

    const cloneA: GpuCandidate = { ...gpuA, id: 'gpu-clone' };
    expect(dominates(gpuA, cloneA, ['price', 'rasterFps1440p'])).toBe(false);

    const reason = buildDominanceReason(
      PHASE1_SEED_GPUS[3],
      PHASE1_SEED_GPUS[4],
      ['price', 'rasterFps1440p', 'vramGb'],
    );
    expect(reason.summaryText).toContain('+8 GB VRAM');

    const reasonWatts = buildDominanceReason(
      PHASE1_SEED_GPUS[1],
      PHASE1_SEED_GPUS[2],
      ['tdpWatts'],
    );
    expect(reasonWatts.summaryText).toContain('25W lower Power (TBP)');

    const emptyReason = buildDominanceReason(gpuA, cloneA, []);
    expect(emptyReason.summaryText).toContain('dominates');
  });

  it('handles transitive chain where a dominated candidate is also dominated by a Pareto-optimal one', () => {
    const chain: GpuCandidate[] = [
      {
        id: 'opt',
        name: 'Optimal',
        price: 200,
        rasterFps1440p: 100,
        rtFps1440p: 50,
        vramGb: 16,
        tdpWatts: 150,
      },
      {
        id: 'mid',
        name: 'Mid Trap',
        price: 250,
        rasterFps1440p: 90,
        rtFps1440p: 45,
        vramGb: 12,
        tdpWatts: 170,
      },
      {
        id: 'worst',
        name: 'Deep Trap',
        price: 300,
        rasterFps1440p: 80,
        rtFps1440p: 40,
        vramGb: 8,
        tdpWatts: 200,
      },
    ];

    const res = evaluateParetoFrontier(chain, ['price', 'rasterFps1440p']);
    const worst = res.find((r) => r.id === 'worst')!;
    expect(worst.dominatedBy).toEqual(['opt']);
  });

  it('computes ordered 2D Pareto Frontier curve coordinates for both min and max X axes', () => {
    expect(get2DParetoFrontierCurve([])).toEqual({
      frontierGpus: [],
      stepLineCoords: [],
    });

    const curveMinX = get2DParetoFrontierCurve(
      PHASE1_SEED_GPUS,
      'price',
      'rasterFps1440p',
    );
    expect(curveMinX.frontierGpus).toHaveLength(7);
    expect(curveMinX.frontierGpus[0].id).toBe('gpu-1');
    expect(curveMinX.frontierGpus[6].id).toBe('gpu-10');
    expect(curveMinX.stepLineCoords[0]).toEqual([220, 52]);

    const curveMaxX = get2DParetoFrontierCurve(
      PHASE1_SEED_GPUS,
      'rasterFps1440p',
      'rtFps1440p',
    );
    expect(curveMaxX.frontierGpus[0].id).toBe('gpu-10');

    const identicalXY: GpuCandidate[] = [
      { ...PHASE1_SEED_GPUS[0], id: 'i1', price: 200, rasterFps1440p: 60 },
      { ...PHASE1_SEED_GPUS[0], id: 'i2', price: 200, rasterFps1440p: 60 },
    ];
    const tiedCurve = get2DParetoFrontierCurve(
      identicalXY,
      'price',
      'rasterFps1440p',
    );
    expect(tiedCurve.frontierGpus).toHaveLength(2);
  });
});

describe('Stage 3: TOPSIS Ranking Engine (topsis.ts)', () => {
  it('normalizes slider weights so they sum to 1.0, and handles all-zero sliders gracefully', () => {
    const norm = normalizeWeights({
      price: 50,
      rasterFps1440p: 50,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    });
    expect(norm.price).toBeCloseTo(0.5);
    expect(norm.rasterFps1440p).toBeCloseTo(0.5);
    expect(norm.rtFps1440p).toBe(0);

    const zeroNorm = normalizeWeights({
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    });
    expect(zeroNorm.price).toBeCloseTo(0.2);
    expect(
      zeroNorm.price +
        zeroNorm.rasterFps1440p +
        zeroNorm.rtFps1440p +
        zeroNorm.vramGb +
        zeroNorm.tdpWatts,
    ).toBeCloseTo(1.0);
  });

  it('ranks candidates properly according to extreme preference weights', () => {
    const evaluated = evaluateParetoFrontier(PHASE1_SEED_GPUS, [
      'price',
      'rasterFps1440p',
    ]);

    const budgetRanked = rankByTopsis(evaluated, {
      price: 100,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    });
    expect(budgetRanked[0].id).toBe('gpu-1');
    expect(budgetRanked[0].topsisScore).toBeCloseTo(1.0, 5);
    expect(budgetRanked[budgetRanked.length - 1].id).toBe('gpu-10');
    expect(budgetRanked[budgetRanked.length - 1].topsisScore).toBeCloseTo(
      0.0,
      5,
    );

    const flagshipRanked = rankByTopsis(evaluated, {
      price: 0,
      rasterFps1440p: 50,
      rtFps1440p: 50,
      vramGb: 0,
      tdpWatts: 0,
    });
    expect(flagshipRanked[0].id).toBe('gpu-10');
    expect(flagshipRanked[0].topsisScore).toBeCloseTo(1.0, 5);

    const balancedRanked = rankByTopsis(evaluated, DEFAULT_PREFERENCE_WEIGHTS);
    expect(balancedRanked[0].isParetoOptimal).toBe(true);
    expect(balancedRanked[0].frontierRank).toBe(1);
  });

  it('handles empty array and identical candidate edge cases in rankByTopsis', () => {
    expect(rankByTopsis([])).toEqual([]);

    const single = evaluateParetoFrontier([PHASE1_SEED_GPUS[0]]);
    const rankedSingle = rankByTopsis(single);
    expect(rankedSingle).toHaveLength(1);
    expect(rankedSingle[0].topsisScore).toBe(1.0);

    const zeroMetricA: GpuCandidate = {
      id: 'a',
      name: 'A',
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    };
    const zeroMetricB: GpuCandidate = {
      id: 'b',
      name: 'B',
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    };
    const evalZeros = evaluateParetoFrontier([zeroMetricA, zeroMetricB]);
    evalZeros[1].isParetoOptimal = false;
    evalZeros[1].isDominated = true;
    const rankedZeros = rankByTopsis(evalZeros);
    expect(rankedZeros[0].id).toBe('a');

    const evalEqual = evaluateParetoFrontier([zeroMetricA, zeroMetricB]);
    const rankedEqual = rankByTopsis(evalEqual);
    expect(rankedEqual).toHaveLength(2);
  });
});

describe('Phase 2: Hedonic OLS Regression Engine (regression.ts)', () => {
  it('fits log-linear OLS with high R^2 on both Phase 1 Seed and Real-World GPU datasets', () => {
    const seedModel = computeHedonicRegression(PHASE1_SEED_GPUS);
    expect(seedModel.rSquared).toBeGreaterThan(0.92);

    // gpu-5 (Apex 4065 Ti 8GB Trap at $410) should be flagged as overpriced relative to its specs
    expect(seedModel.valuations['gpu-5'].residualUsd).toBeGreaterThan(0);

    const realModel = computeHedonicRegression(REAL_WORLD_GPUS);
    expect(realModel.rSquared).toBeGreaterThan(0.88);

    // Intel Arc B580 ($250, 74 FPS, 12GB) is a standout bargain (negative residual)
    expect(realModel.valuations['arc-b580'].residualUsd).toBeLessThan(0);
    expect(realModel.valuations['arc-b580'].valueTier).toBe('bargain');

    // RTX 4060 Ti 16GB ($445, 85 FPS) is overpriced relative to the 1440p market curve
    expect(
      realModel.valuations['rtx-4060-ti-16gb'].residualUsd,
    ).toBeGreaterThan(0);
  });

  it('handles degenerate empty, single-item, and singular matrix inputs safely', () => {
    const emptyModel = computeHedonicRegression([]);
    expect(emptyModel.rSquared).toBe(0);
    expect(emptyModel.valuations).toEqual({});

    const singleModel = computeHedonicRegression([PHASE1_SEED_GPUS[0]]);
    expect(singleModel.rSquared).toBe(1);
    expect(singleModel.valuations['gpu-1'].fairPrice).toBe(220);
    expect(singleModel.valuations['gpu-1'].residualUsd).toBe(0);

    // Singular matrix returns null in solveLinearSystem
    const singular = solveLinearSystem(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6],
    );
    expect(singular).toBeNull();

    expect(classifyValueTier(-10)).toBe('bargain');
    expect(classifyValueTier(0)).toBe('fair');
    expect(classifyValueTier(12)).toBe('overpriced');
  });
});

describe('Personalized Value Extrapolation Engine (extrapolation.ts)', () => {
  it('evaluates custom $1000 for 10 GB ($100/GB) extrapolation margin accurately', () => {
    const res = evaluateLinearExtrapolation(
      PHASE1_SEED_GPUS,
      'price',
      'vramGb',
      {
        enabled: true,
        mode: 'custom',
        scalingModel: 'linear-ratio',
        anchorGpuId: 'gpu-1',
        secondGpuId: 'gpu-4',
        customXValue: 1000,
        customYValue: 10,
        exponent: 1.0,
        tolerancePct: 0,
        whatIfX: 600,
        enforceAsTrap: true,
      },
    );

    // $1000 / 10 GB = $100 / GB
    expect(res.costPerUnit).toBe(100);
    expect(res.slope).toBeCloseTo(0.01);

    // Every GPU in PHASE1_SEED_GPUS has <= $51.25/GB (gpu-5 is $410 / 8GB = $51.25/GB), so none are worse than $100/GB
    expect(res.belowMarginIds).toHaveLength(0);

    // Now test a stricter custom margin: $300 for 10 GB ($30/GB)
    const strictRes = evaluateLinearExtrapolation(
      PHASE1_SEED_GPUS,
      'price',
      'vramGb',
      {
        enabled: true,
        mode: 'custom',
        scalingModel: 'linear-ratio',
        anchorGpuId: 'gpu-1',
        secondGpuId: 'gpu-4',
        customXValue: 300,
        customYValue: 10,
        exponent: 1.0,
        tolerancePct: 0,
        whatIfX: 600,
        enforceAsTrap: true,
      },
    );
    expect(strictRes.costPerUnit).toBe(30);
    // gpu-5 ($410 for 8 GB = $51.25/GB) and gpu-10 ($950 for 24 GB = $39.58/GB) are worse than $30/GB
    expect(strictRes.belowMarginIds).toContain('gpu-5');
    expect(strictRes.belowMarginIds).toContain('gpu-10');
    // gpu-4 ($380 for 16 GB = $23.75/GB) beats the $30/GB margin
    expect(strictRes.belowMarginIds).not.toContain('gpu-4');
  });

  it('anchors extrapolation on a specific GPU, supports diminishing-returns power law, 2-GPU secant, and clips curves', () => {
    const gpuAnchored = evaluateLinearExtrapolation(
      PHASE1_SEED_GPUS,
      'price',
      'rasterFps1440p',
      {
        enabled: true,
        mode: 'gpu',
        scalingModel: 'linear-ratio',
        anchorGpuId: 'gpu-4', // $380, 94 FPS -> $4.04/FPS
        secondGpuId: 'gpu-6',
        customXValue: 500,
        customYValue: 100,
        exponent: 1.0,
        tolerancePct: 0,
        whatIfX: 500,
        enforceAsTrap: false,
      },
    );

    expect(gpuAnchored.anchorX).toBe(380);
    expect(gpuAnchored.anchorY).toBe(94);
    expect(gpuAnchored.belowMarginIds).toContain('gpu-5'); // $410, 88 FPS ($4.66/FPS) is worse than gpu-4
    expect(gpuAnchored.belowMarginIds).not.toContain('gpu-4'); // Anchor itself is on the line, not below

    // Diminishing returns power law (alpha = 0.7) with -10% tolerance slack
    const powerRes = evaluateLinearExtrapolation(
      PHASE1_SEED_GPUS,
      'price',
      'rasterFps1440p',
      {
        enabled: true,
        mode: 'gpu',
        scalingModel: 'diminishing-power',
        anchorGpuId: 'gpu-4',
        secondGpuId: 'gpu-6',
        customXValue: 500,
        customYValue: 100,
        exponent: 0.7,
        tolerancePct: -10,
        whatIfX: 760,
        enforceAsTrap: true,
      },
    );
    // At 2x anchor price ($760), alpha = 0.7 predicts 94 * 2^0.7 = 152.7 FPS (cutoff = 0.9 * 152.7 = 137.4 FPS)
    expect(powerRes.whatIfAnchorY).toBeCloseTo(94 * Math.pow(2, 0.7), 1);
    expect(powerRes.whatIfCutoffY).toBeCloseTo(94 * Math.pow(2, 0.7) * 0.9, 1);

    const curvePts = getExtrapolationCurvePoints(
      powerRes.evaluateCutoffY,
      200,
      1000,
      40,
      200,
      10,
    );
    expect(curvePts.length).toBeGreaterThan(2);

    const clipped = getClippedExtrapolationLine(0.25, 200, 1000, 40, 200);
    expect(clipped[0]).toEqual([200, 50]);
    expect(clipped[1]).toEqual([800, 200]);
  });
});

describe('Type guards for untrusted strings', () => {
  it('isMetricKey accepts exactly the keys of METRIC_DEFINITIONS', () => {
    for (const key of Object.keys(METRIC_DEFINITIONS)) {
      expect(isMetricKey(key)).toBe(true);
    }
    for (const bad of ['', 'Price', 'toString', '__proto__', 'constructor']) {
      expect(isMetricKey(bad)).toBe(false);
    }
  });

  it('isExtrapolationScalingModel rejects unknown models', () => {
    expect(isExtrapolationScalingModel('linear-ratio')).toBe(true);
    expect(isExtrapolationScalingModel('two-point-line')).toBe(true);
    expect(isExtrapolationScalingModel('cubic')).toBe(false);
  });
});
