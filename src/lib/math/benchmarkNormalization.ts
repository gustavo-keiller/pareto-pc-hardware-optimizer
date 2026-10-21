/**
 * Public Creator Benchmark Normalization Engine (`src/lib/math/benchmarkNormalization.ts`)
 *
 * Implements mathematical algorithms to normalize, re-center, bridge, and
 * harmonize hardware benchmark metrics across independent public review outlets
 * (TechPowerUp, Hardware Unboxed, Gamers Nexus, LTT Labs) using transitive
 * ratio chaining and geometric mean aggregation.
 *
 * Adheres strictly to AGENTS.md Rule 1 (Pure Math Engine Isolation) and Rule 3 (Numerical Safety).
 */

export type BenchmarkCreator =
  'TechPowerUp' | 'Hardware Unboxed' | 'Gamers Nexus' | 'LTT Labs' | 'Other';

export interface BenchmarkRunEntry {
  id: string;
  creator: BenchmarkCreator;
  url: string;
  date: string;
  resolution?: '1080p' | '1440p' | '4K';
  metric?: 'rasterFps' | 'rtFps' | 'relativePercent' | 'gamingScore';
  testBenchCpu?: string;
  anchorItem: string;
  anchorValue: number;
  scores: Record<string, number>;
}

export interface HarmonizedBenchmarkScore {
  itemId: string;
  harmonizedIndex: number;
  sampleSizeReviewers: number;
  reviewers: BenchmarkCreator[];
  individualScores: Record<string, number>;
}

const EPSILON = 1e-9;

/**
 * Re-centers a benchmark run so that the chosen canonical anchor item equals 100.
 * Returns null if the anchor item is missing or has a non-positive score.
 *
 * Formula:
 *   I_recentered(X) = (I_raw(X) / I_raw(Anchor)) * 100
 */
export function recenterBenchmarkToAnchor(
  run: BenchmarkRunEntry,
  canonicalAnchor: string,
): BenchmarkRunEntry | null {
  const anchorVal = run.scores[canonicalAnchor];
  if (
    typeof anchorVal !== 'number' ||
    !Number.isFinite(anchorVal) ||
    anchorVal <= EPSILON
  ) {
    return null;
  }

  const recenteredScores: Record<string, number> = {};
  for (const [key, val] of Object.entries(run.scores)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      recenteredScores[key] = (val / anchorVal) * 100;
    }
  }

  return {
    ...run,
    anchorItem: canonicalAnchor,
    anchorValue: 100,
    scores: recenteredScores,
  };
}

export interface TransitiveBridgeParams {
  targetRun: BenchmarkRunEntry;
  referenceRun: BenchmarkRunEntry;
  bridgeItem: string;
  canonicalAnchor: string;
}

/**
 * Chains a target benchmark run to a canonical anchor through a bridge component
 * present in both the target run and the reference run.
 *
 * Formula:
 *   I_{target -> canonical}(X) = I_target(X) * (I_{ref}(bridge) / I_target(bridge)) * (100 / I_{ref}(canonical))
 */
export function transitiveBridgeReCenter({
  targetRun,
  referenceRun,
  bridgeItem,
  canonicalAnchor,
}: TransitiveBridgeParams): BenchmarkRunEntry | null {
  const refAnchorVal = referenceRun.scores[canonicalAnchor];
  const refBridgeVal = referenceRun.scores[bridgeItem];
  const targetBridgeVal = targetRun.scores[bridgeItem];

  if (
    typeof refAnchorVal !== 'number' ||
    refAnchorVal <= EPSILON ||
    typeof refBridgeVal !== 'number' ||
    refBridgeVal <= EPSILON ||
    typeof targetBridgeVal !== 'number' ||
    targetBridgeVal <= EPSILON
  ) {
    return null;
  }

  // Scaling factor that maps targetRun's scale to canonicalAnchor = 100
  // in referenceRun: ratio of bridge to anchor is (refBridgeVal / refAnchorVal)
  // in targetRun: bridge has score targetBridgeVal.
  // Therefore, for any item X in targetRun:
  // score_canonical(X) = (targetVal / targetBridgeVal) * (refBridgeVal / refAnchorVal) * 100
  const bridgeFactor = (refBridgeVal / refAnchorVal) * (100 / targetBridgeVal);

  const bridgedScores: Record<string, number> = {};
  for (const [key, val] of Object.entries(targetRun.scores)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      bridgedScores[key] = val * bridgeFactor;
    }
  }

  return {
    ...targetRun,
    anchorItem: canonicalAnchor,
    anchorValue: 100,
    scores: bridgedScores,
  };
}

/**
 * Aggregates multiple normalized benchmark runs using geometric mean.
 * Geometric mean is mathematically required for normalized ratio indexes
 * because it preserves ratio symmetry (Scale Invariance).
 *
 * Formula:
 *   HarmonizedIndex(X) = ( Product_{k=1}^K I_k(X) )^(1 / K)
 *   Equivalent to: exp( (1 / K) * Sum_{k=1}^K ln(I_k(X)) )
 */
export function aggregateCrossReviewerIndex(
  recenteredRuns: BenchmarkRunEntry[],
): Record<string, HarmonizedBenchmarkScore> {
  const itemScoresMap: Record<
    string,
    {
      scores: number[];
      reviewers: BenchmarkCreator[];
      runScores: Record<string, number>;
    }
  > = {};

  for (const run of recenteredRuns) {
    for (const [itemId, score] of Object.entries(run.scores)) {
      if (
        typeof score === 'number' &&
        Number.isFinite(score) &&
        score > EPSILON
      ) {
        if (!itemScoresMap[itemId]) {
          itemScoresMap[itemId] = { scores: [], reviewers: [], runScores: {} };
        }
        itemScoresMap[itemId].scores.push(score);
        if (!itemScoresMap[itemId].reviewers.includes(run.creator)) {
          itemScoresMap[itemId].reviewers.push(run.creator);
        }
        itemScoresMap[itemId].runScores[run.id] = score;
      }
    }
  }

  const result: Record<string, HarmonizedBenchmarkScore> = {};

  for (const [itemId, data] of Object.entries(itemScoresMap)) {
    const count = data.scores.length;
    if (count === 0) continue;

    // Geometric mean computed via sum of logarithms for numerical stability
    let sumLog = 0;
    for (const s of data.scores) {
      sumLog += Math.log(s);
    }
    const geomMean = Math.exp(sumLog / count);

    result[itemId] = {
      itemId,
      harmonizedIndex: geomMean,
      sampleSizeReviewers: count,
      reviewers: data.reviewers,
      individualScores: data.runScores,
    };
  }

  return result;
}

/**
 * Converts a normalized relative index into an absolute estimated FPS
 * based on a calibrated anchor card's physical benchmark result.
 *
 * Formula:
 *   FPS(X) = round( anchorFps * (normalizedIndex / 100) )
 */
export function calculateCalibratedFps(
  normalizedIndex: number,
  anchorFps: number,
): number {
  if (
    !Number.isFinite(normalizedIndex) ||
    normalizedIndex <= 0 ||
    !Number.isFinite(anchorFps) ||
    anchorFps <= 0
  ) {
    return 0;
  }

  return Math.round(anchorFps * (normalizedIndex / 100));
}
