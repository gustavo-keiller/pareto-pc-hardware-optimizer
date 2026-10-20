import { describe, expect, it } from 'vitest';
import { computeTopsisBreakdown, rankByTopsis } from '../topsis';
import { ParetoEvaluatedGpu } from '../types';

function createMockGpu(
  id: string,
  name: string,
  price: number,
  rasterFps1440p: number,
  rtFps1440p: number,
  vramGb: number,
  tdpWatts: number,
): ParetoEvaluatedGpu {
  return {
    id,
    name,
    price,
    rasterFps1440p,
    rtFps1440p,
    vramGb,
    tdpWatts,
    isParetoOptimal: true,
    isDominated: false,
    dominatedBy: [],
    paretoDominatedBy: [],
    dominanceReasons: [],
  };
}

describe('computeTopsisBreakdown ([UX-08])', () => {
  const gpus: ParetoEvaluatedGpu[] = [
    createMockGpu('gpu-budget', 'Budget Star', 300, 75, 40, 8, 120),
    createMockGpu('gpu-mid', 'Midrange Sweetspot', 500, 110, 65, 12, 190),
    createMockGpu('gpu-halo', 'Halo Titan', 1000, 160, 110, 24, 320),
  ];

  it('reconstructs Euclidean distances to best and worst identically to rankByTopsis', () => {
    const weights = {
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 8,
    };
    const ranked = rankByTopsis(gpus, weights);

    for (const item of ranked) {
      const breakdown = computeTopsisBreakdown(item, ranked, weights);

      expect(breakdown.gpuId).toBe(item.id);
      expect(breakdown.gpuName).toBe(item.name);

      // Verify sum of squared distances matches dPlus and dMinus
      const reconstructedDPlus = Math.sqrt(
        breakdown.metrics.reduce((acc, m) => acc + m.diffBestSq, 0),
      );
      const reconstructedDMinus = Math.sqrt(
        breakdown.metrics.reduce((acc, m) => acc + m.diffWorstSq, 0),
      );

      expect(reconstructedDPlus).toBeCloseTo(item.distanceToBest, 9);
      expect(reconstructedDMinus).toBeCloseTo(item.distanceToWorst, 9);
      expect(breakdown.topsisScore).toBeCloseTo(item.topsisScore, 9);
      expect(breakdown.topsisScorePct).toBeCloseTo(item.topsisScorePct, 1);
    }
  });

  it('correctly maps directionality so best and worst reflect metric goals', () => {
    const weights = {
      price: 20,
      rasterFps1440p: 20,
      rtFps1440p: 20,
      vramGb: 20,
      tdpWatts: 20,
    };
    const ranked = rankByTopsis(gpus, weights);

    const halo = ranked.find((g) => g.id === 'gpu-halo');
    expect(halo).toBeDefined();
    if (!halo) return;

    const breakdown = computeTopsisBreakdown(halo, ranked, weights);
    const vramMetric = breakdown.metrics.find((m) => m.metric === 'vramGb');
    const priceMetric = breakdown.metrics.find((m) => m.metric === 'price');

    // Halo has highest VRAM (24GB = ideal best for maximized metric) -> diffBestSq should be 0
    expect(vramMetric?.direction).toBe('max');
    expect(vramMetric?.diffBestSq).toBeCloseTo(0, 9);
    expect(vramMetric?.closenessPct).toBe(100);

    // Halo has highest price ($1000 = worst for minimized metric) -> diffWorstSq should be 0
    expect(priceMetric?.direction).toBe('min');
    expect(priceMetric?.diffWorstSq).toBeCloseTo(0, 9);
    expect(priceMetric?.closenessPct).toBe(0);
  });

  it('handles single candidate without division by zero or NaN', () => {
    const single = [
      createMockGpu('gpu-solo', 'Solo GPU', 400, 100, 50, 12, 150),
    ];
    const ranked = rankByTopsis(single);
    const breakdown = computeTopsisBreakdown(ranked[0], ranked);

    expect(breakdown.topsisScore).toBe(1.0);
    expect(breakdown.topsisScorePct).toBe(100);
    for (const m of breakdown.metrics) {
      expect(m.closenessPct).toBe(100);
      expect(m.diffBestSq).toBe(0);
      expect(m.diffWorstSq).toBe(0);
    }
  });
});
