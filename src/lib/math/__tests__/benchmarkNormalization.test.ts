import { describe, expect, it } from 'vitest';
import {
  aggregateCrossReviewerIndex,
  calculateCalibratedFps,
  recenterBenchmarkToAnchor,
  transitiveBridgeReCenter,
  BenchmarkRunEntry,
} from '../benchmarkNormalization';

describe('DATA-02: Public Creator Benchmark Normalization Engine', () => {
  describe('recenterBenchmarkToAnchor', () => {
    it('re-centers all scores so that the target anchor equals 100', () => {
      const run: BenchmarkRunEntry = {
        id: 'run-1',
        creator: 'Hardware Unboxed',
        url: 'https://youtube.com/example',
        date: '2024-06-01',
        anchorItem: 'rtx-4090',
        anchorValue: 100,
        scores: {
          'rtx-4090': 100,
          'rtx-4080-super': 78.9,
          'rtx-4070': 51.4,
          'rx-6600': 23.4,
        },
      };

      // Re-center with rtx-4070 as the canonical anchor (100)
      const recentered = recenterBenchmarkToAnchor(run, 'rtx-4070');
      expect(recentered).not.toBeNull();
      if (!recentered) return;

      expect(recentered.scores['rtx-4070']).toBeCloseTo(100, 2);
      // rtx-4090 was 100 / 51.4 = ~194.55
      expect(recentered.scores['rtx-4090']).toBeCloseTo(194.55, 1);
      // rx-6600 was 23.4 / 51.4 = ~45.53
      expect(recentered.scores['rx-6600']).toBeCloseTo(45.53, 1);
    });

    it('asserts scale invariance: linear scaling of raw values produces identical re-centered ratios', () => {
      // Raw FPS values from TechPowerUp
      const runFps: BenchmarkRunEntry = {
        id: 'run-fps',
        creator: 'TechPowerUp',
        url: 'https://techpowerup.com/review',
        date: '2024-06-01',
        anchorItem: 'rtx-4070',
        anchorValue: 112.5,
        scores: {
          'rtx-4070': 112.5,
          'rtx-4080-super': 172.0,
          'rx-7800-xt': 116.0,
          'rx-6600': 51.0,
        },
      };

      const runPercent: BenchmarkRunEntry = {
        id: 'run-percent',
        creator: 'TechPowerUp',
        url: 'https://techpowerup.com/review',
        date: '2024-06-01',
        anchorItem: 'rtx-4070',
        anchorValue: 100,
        scores: {
          'rtx-4070': 100,
          'rtx-4080-super': (172.0 / 112.5) * 100,
          'rx-7800-xt': (116.0 / 112.5) * 100,
          'rx-6600': (51.0 / 112.5) * 100,
        },
      };

      const resFps = recenterBenchmarkToAnchor(runFps, 'rtx-4070');
      const resPercent = recenterBenchmarkToAnchor(runPercent, 'rtx-4070');

      expect(resFps).not.toBeNull();
      expect(resPercent).not.toBeNull();
      if (!resFps || !resPercent) return;

      for (const key of Object.keys(resFps.scores)) {
        expect(resFps.scores[key]).toBeCloseTo(resPercent.scores[key], 4);
      }
    });

    it('returns null safely when the requested anchor is absent or zero', () => {
      const run: BenchmarkRunEntry = {
        id: 'run-err',
        creator: 'Gamers Nexus',
        url: 'https://youtube.com',
        date: '2024-01-01',
        anchorItem: 'rtx-4070',
        anchorValue: 100,
        scores: {
          'rtx-4060': 67,
          'rtx-4070': 0, // invalid zero anchor
        },
      };

      expect(recenterBenchmarkToAnchor(run, 'missing-gpu')).toBeNull();
      expect(recenterBenchmarkToAnchor(run, 'rtx-4070')).toBeNull();
    });
  });

  describe('transitiveBridgeReCenter', () => {
    it('chains scores across benchmarks using a bridge component present in both', () => {
      // Reviewer A tested Anchor (rtx-4070) and Bridge (rtx-4060)
      const runA: BenchmarkRunEntry = {
        id: 'run-a',
        creator: 'Hardware Unboxed',
        url: 'https://youtube.com',
        date: '2024-05-01',
        anchorItem: 'rtx-4070',
        anchorValue: 100,
        scores: {
          'rtx-4070': 100,
          'rtx-4060': 60,
        },
      };

      // Reviewer B tested Bridge (rtx-4060) and Target (arc-b580), but did not test rtx-4070
      const runB: BenchmarkRunEntry = {
        id: 'run-b',
        creator: 'Gamers Nexus',
        url: 'https://youtube.com',
        date: '2024-12-01',
        anchorItem: 'rtx-4060',
        anchorValue: 100,
        scores: {
          'rtx-4060': 100,
          'arc-b580': 110, // Arc B580 is 10% faster than RTX 4060 in B's test
        },
      };

      // Re-center Reviewer B to rtx-4070 through bridge rtx-4060
      const bridged = transitiveBridgeReCenter({
        targetRun: runB,
        referenceRun: runA,
        bridgeItem: 'rtx-4060',
        canonicalAnchor: 'rtx-4070',
      });

      expect(bridged).not.toBeNull();
      if (!bridged) return;

      // In run A, rtx-4060 is 60% of rtx-4070.
      // In run B, arc-b580 is 1.10 * rtx-4060.
      // So arc-b580 relative to rtx-4070 should be 60 * 1.10 = 66.
      expect(bridged.scores['arc-b580']).toBeCloseTo(66, 1);
      expect(bridged.scores['rtx-4060']).toBeCloseTo(60, 1);
    });
  });

  describe('aggregateCrossReviewerIndex', () => {
    it('calculates the geometric mean across multiple reviewer scores for each hardware item', () => {
      const recenteredRuns: BenchmarkRunEntry[] = [
        {
          id: 'tpu-2024',
          creator: 'TechPowerUp',
          url: 'https://techpowerup.com',
          date: '2024-05-01',
          anchorItem: 'rtx-4070',
          anchorValue: 100,
          scores: {
            'rtx-4070': 100,
            'rx-7800-xt': 103.1, // TPU: RX 7800 XT +3.1% over 4070
            'rtx-4060': 59.5,
          },
        },
        {
          id: 'hub-2024',
          creator: 'Hardware Unboxed',
          url: 'https://youtube.com',
          date: '2024-05-15',
          anchorItem: 'rtx-4070',
          anchorValue: 100,
          scores: {
            'rtx-4070': 100,
            'rx-7800-xt': 105.0, // HUB: RX 7800 XT +5.0% over 4070
            'rtx-4060': 61.0,
          },
        },
      ];

      const aggregated = aggregateCrossReviewerIndex(recenteredRuns);

      // Geometric mean of 100 and 100 is 100
      expect(aggregated['rtx-4070'].harmonizedIndex).toBeCloseTo(100, 2);

      // Geometric mean of 103.1 and 105.0 is sqrt(103.1 * 105.0) = ~104.045
      const expected7800 = Math.sqrt(103.1 * 105.0);
      expect(aggregated['rx-7800-xt'].harmonizedIndex).toBeCloseTo(
        expected7800,
        2,
      );
      expect(aggregated['rx-7800-xt'].sampleSizeReviewers).toBe(2);
      expect(aggregated['rx-7800-xt'].reviewers).toEqual([
        'TechPowerUp',
        'Hardware Unboxed',
      ]);

      // Geometric mean of 59.5 and 61.0 is sqrt(59.5 * 61.0) = ~60.245
      const expected4060 = Math.sqrt(59.5 * 61.0);
      expect(aggregated['rtx-4060'].harmonizedIndex).toBeCloseTo(
        expected4060,
        2,
      );
    });

    it('satisfies bounding property: harmonized index is strictly between min and max reviewer ratings', () => {
      const runs: BenchmarkRunEntry[] = [
        {
          id: 'r1',
          creator: 'TechPowerUp',
          url: '',
          date: '2024-01-01',
          anchorItem: 'a',
          anchorValue: 100,
          scores: { x: 80 },
        },
        {
          id: 'r2',
          creator: 'Hardware Unboxed',
          url: '',
          date: '2024-01-01',
          anchorItem: 'a',
          anchorValue: 100,
          scores: { x: 120 },
        },
        {
          id: 'r3',
          creator: 'Gamers Nexus',
          url: '',
          date: '2024-01-01',
          anchorItem: 'a',
          anchorValue: 100,
          scores: { x: 95 },
        },
      ];

      const res = aggregateCrossReviewerIndex(runs);
      expect(res.x.harmonizedIndex).toBeGreaterThanOrEqual(80);
      expect(res.x.harmonizedIndex).toBeLessThanOrEqual(120);
    });
  });

  describe('calculateCalibratedFps', () => {
    it('calibrates absolute FPS from normalized index given anchor FPS', () => {
      // Anchor RTX 4070 is calibrated at 112 FPS in 1440p Ultra Raster
      const anchorFps = 112;

      expect(calculateCalibratedFps(100, anchorFps)).toBe(112);
      expect(calculateCalibratedFps(50, anchorFps)).toBe(56);
      expect(calculateCalibratedFps(150, anchorFps)).toBe(168);
      // Handles 0 or negative gracefully
      expect(calculateCalibratedFps(0, anchorFps)).toBe(0);
      expect(calculateCalibratedFps(-10, anchorFps)).toBe(0);
    });
  });
});
