import {
  aggregateCrossReviewerIndex,
  BenchmarkCreator,
  BenchmarkRunEntry,
  HarmonizedBenchmarkScore,
} from '../lib/math/benchmarkNormalization';
import gpuBenchmarksJson from './benchmarks/gpuBenchmarks.json';
import cpuBenchmarksJson from './benchmarks/cpuBenchmarks.json';

function parseGpuBenchmarkRun(
  item: (typeof gpuBenchmarksJson)[number],
): BenchmarkRunEntry {
  const creator: BenchmarkCreator =
    item.creator === 'TechPowerUp' ||
    item.creator === 'Hardware Unboxed' ||
    item.creator === 'Gamers Nexus' ||
    item.creator === 'LTT Labs'
      ? item.creator
      : 'Other';

  const scores: Record<string, number> = {};
  for (const [key, val] of Object.entries(item.scores)) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      scores[key] = val;
    }
  }

  const resolution =
    item.resolution === '1080p' ||
    item.resolution === '1440p' ||
    item.resolution === '4K'
      ? item.resolution
      : undefined;

  const metric =
    item.metric === 'rasterFps' ||
    item.metric === 'rtFps' ||
    item.metric === 'relativePercent' ||
    item.metric === 'gamingScore'
      ? item.metric
      : undefined;

  return {
    id: item.id,
    creator,
    url: item.url,
    date: item.date,
    resolution,
    metric,
    anchorItem: item.anchorItem,
    anchorValue: item.anchorValue,
    scores,
  };
}

function parseCpuBenchmarkRun(
  item: (typeof cpuBenchmarksJson)[number],
): BenchmarkRunEntry {
  const creator: BenchmarkCreator =
    item.creator === 'TechPowerUp' ||
    item.creator === 'Hardware Unboxed' ||
    item.creator === 'Gamers Nexus' ||
    item.creator === 'LTT Labs'
      ? item.creator
      : 'Other';

  const scores: Record<string, number> = {};
  for (const [key, val] of Object.entries(item.scores)) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      scores[key] = val;
    }
  }

  const resolution =
    item.resolution === '1080p' ||
    item.resolution === '1440p' ||
    item.resolution === '4K'
      ? item.resolution
      : undefined;

  const metric =
    item.metric === 'rasterFps' ||
    item.metric === 'rtFps' ||
    item.metric === 'relativePercent' ||
    item.metric === 'gamingScore'
      ? item.metric
      : undefined;

  return {
    id: item.id,
    creator,
    url: item.url,
    date: item.date,
    resolution,
    metric,
    anchorItem: item.anchorItem,
    anchorValue: item.anchorValue,
    scores,
  };
}

export const GPU_BENCHMARK_RUNS: BenchmarkRunEntry[] =
  gpuBenchmarksJson.map(parseGpuBenchmarkRun);

export const CPU_BENCHMARK_RUNS: BenchmarkRunEntry[] =
  cpuBenchmarksJson.map(parseCpuBenchmarkRun);

export const HARMONIZED_GPU_SCORES: Record<string, HarmonizedBenchmarkScore> =
  aggregateCrossReviewerIndex(GPU_BENCHMARK_RUNS);

export const HARMONIZED_CPU_SCORES: Record<string, HarmonizedBenchmarkScore> =
  aggregateCrossReviewerIndex(CPU_BENCHMARK_RUNS);

/**
 * Returns formatted creator provenance string for a component if available.
 * E.g. "Hardware Unboxed + TechPowerUp (Harmonized Geomean)"
 */
export function getBenchmarkProvenance(itemId: string): string | null {
  const gpuScore = HARMONIZED_GPU_SCORES[itemId];
  if (gpuScore && gpuScore.reviewers.length > 0) {
    return `${gpuScore.reviewers.join(' + ')} (${gpuScore.sampleSizeReviewers} reviewer geomean)`;
  }
  const cpuScore = HARMONIZED_CPU_SCORES[itemId];
  if (cpuScore && cpuScore.reviewers.length > 0) {
    return `${cpuScore.reviewers.join(' + ')} (${cpuScore.sampleSizeReviewers} reviewer geomean)`;
  }
  return null;
}
