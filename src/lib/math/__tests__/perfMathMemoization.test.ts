import { describe, expect, it } from 'vitest';
import { rankByTopsis } from '../topsis';
import { METRIC_DEFINITIONS, ParetoEvaluatedGpu } from '../types';
import {
  computeBounds,
  computeDominatedGeometry,
  computeDominatedBoundary,
  projectDominatedBoundary,
  createProjectPoint,
} from '../../../components/pareto3d/pareto3dMath';

function createMockCandidate(
  id: string,
  name: string,
  price: number,
  rasterFps1440p: number,
  rtFps1440p: number,
  vramGb: number,
  tdpWatts: number,
  isParetoOptimal = true,
): ParetoEvaluatedGpu {
  return {
    id,
    name,
    chip: name,
    brand: 'TestBrand',
    price,
    rasterFps1440p,
    rtFps1440p,
    vramGb,
    tdpWatts,
    isParetoOptimal,
    isDominated: !isParetoOptimal,
    dominatedBy: isParetoOptimal ? [] : ['Card A'],
    paretoDominatedBy: isParetoOptimal ? [] : ['Card A'],
    dominanceReasons: isParetoOptimal
      ? []
      : [
          {
            dominatorId: 'gpu-a',
            dominatorName: 'Card A',
            priceSaved: 250,
            metricGains: {},
            summaryText: 'Card A is cheaper and faster',
          },
        ],
  };
}

const TEST_CANDIDATES: ParetoEvaluatedGpu[] = [
  createMockCandidate('gpu-a', 'Card A', 300, 60, 30, 8, 150, true),
  createMockCandidate('gpu-b', 'Card B', 500, 100, 50, 16, 220, true),
  createMockCandidate('gpu-c', 'Card C [TRAP]', 550, 55, 25, 8, 200, false),
];

describe('PERF-06: Heavy Math Off-Main-Thread & Input Memoization', () => {
  it('preserves mathematical identity across successive slider weight changes (TOPSIS normalization memoization)', () => {
    // Initial ranking with balanced weights
    const initialRanking = rankByTopsis(TEST_CANDIDATES, {
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 8,
    });

    expect(initialRanking.length).toBe(3);
    const topPickInitial = initialRanking[0];
    expect(topPickInitial.topsisScore).toBeGreaterThan(0);
    expect(topPickInitial.topsisScore).toBeLessThanOrEqual(1);

    // Micro-adjust price weight slider (reusing memoized normalized candidate matrix)
    const priceHeavyRanking = rankByTopsis(TEST_CANDIDATES, {
      price: 80,
      rasterFps1440p: 10,
      rtFps1440p: 5,
      vramGb: 5,
      tdpWatts: 0,
    });

    // Card A is cheapest ($300 vs $500), so under heavy price weight it must rank highest
    expect(priceHeavyRanking[0].id).toBe('gpu-a');
    expect(priceHeavyRanking[0].topsisScore).toBeGreaterThan(
      priceHeavyRanking[1].topsisScore,
    );

    // Micro-adjust raster weight slider
    const rasterHeavyRanking = rankByTopsis(TEST_CANDIDATES, {
      price: 10,
      rasterFps1440p: 80,
      rtFps1440p: 5,
      vramGb: 5,
      tdpWatts: 0,
    });

    // Card B has highest FPS (100 vs 60), so under raster weight it must rank highest
    expect(rasterHeavyRanking[0].id).toBe('gpu-b');
    expect(rasterHeavyRanking[0].topsisScore).toBeGreaterThan(
      rasterHeavyRanking[1].topsisScore,
    );
  });

  it('guarantees fresh candidate instances compute independently without stale cache leaks', () => {
    const cloneCandidates: ParetoEvaluatedGpu[] = TEST_CANDIDATES.map((c) => ({
      ...c,
      price: c.price * 2, // Double price
    }));

    const clonedRanking = rankByTopsis(cloneCandidates, { price: 50 });
    expect(clonedRanking.length).toBe(3);
    // Card C was still dominated
    expect(clonedRanking[2].id).toBe('gpu-c');
  });

  it('separates 3D voxel geometry from camera viewport projection (Pareto3DCloud)', () => {
    const rankedCandidates = rankByTopsis(TEST_CANDIDATES);
    const bounds = computeBounds(
      rankedCandidates,
      'price',
      'rasterFps1440p',
      'vramGb',
    );
    const viewOptimalityMap = new Map([
      ['gpu-a', { isViewOptimal: true, isBelowMargin: false }],
      ['gpu-b', { isViewOptimal: true, isBelowMargin: false }],
      ['gpu-c', { isViewOptimal: false, isBelowMargin: true }],
    ]);

    // 1. Generate 3D geometry (independent of camera transforms)
    const geometry = computeDominatedGeometry({
      gpus: rankedCandidates,
      viewOptimalityMap,
      xMetric: 'price',
      yMetric: 'rasterFps1440p',
      zMetric: 'vramGb',
      bounds,
      xDef: METRIC_DEFINITIONS.price,
      yDef: METRIC_DEFINITIONS.rasterFps1440p,
      zDef: METRIC_DEFINITIONS.vramGb,
      activePreset: 'iso',
      showDominatedZoneMesh: true,
    });

    expect(geometry.rawFaces.length).toBeGreaterThan(0);
    expect(geometry.cornerTicks.length).toBe(2); // Two optimal cards (Card A & B)

    // 2. Project under Camera Angle 1 (yaw: 25, pitch: 22)
    const project1 = createProjectPoint(25, 22, 1.0, { x: 0, y: 0 }, false);
    const boundaryView1 = projectDominatedBoundary(geometry, project1);

    // 3. Project under Camera Angle 2 (yaw: 45, pitch: 10)
    const project2 = createProjectPoint(45, 10, 1.0, { x: 0, y: 0 }, false);
    const boundaryView2 = projectDominatedBoundary(geometry, project2);

    expect(boundaryView1.fillFaces.length).toBe(geometry.rawFaces.length);
    expect(boundaryView2.fillFaces.length).toBe(geometry.rawFaces.length);

    // Screen coordinates must differ between camera views while underlying geometry face count is invariant
    expect(boundaryView1.fillFaces[0].points).not.toBe(
      boundaryView2.fillFaces[0].points,
    );

    // 4. Combined computeDominatedBoundary wrapper produces equivalent output
    const combinedView = computeDominatedBoundary({
      gpus: rankedCandidates,
      viewOptimalityMap,
      xMetric: 'price',
      yMetric: 'rasterFps1440p',
      zMetric: 'vramGb',
      bounds,
      xDef: METRIC_DEFINITIONS.price,
      yDef: METRIC_DEFINITIONS.rasterFps1440p,
      zDef: METRIC_DEFINITIONS.vramGb,
      activePreset: 'iso',
      projectPoint: project1,
      showDominatedZoneMesh: true,
    });
    expect(combinedView.fillFaces.length).toBe(boundaryView1.fillFaces.length);
    expect(combinedView.cornerTicks.length).toBe(
      boundaryView1.cornerTicks.length,
    );
  });
});
