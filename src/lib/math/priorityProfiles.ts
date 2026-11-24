import { ALL_METRIC_KEYS } from './topsis';
import {
  CUSTOM_PARAMETER_PREFIX,
  CustomRatingParameter,
  DEFAULT_TARGETS,
  PriorityEntry,
  PriorityProfile,
  PriorityTargets,
  isBuiltInParameterId,
} from './priorityModel';
import { PreferenceWeights, isMetricKey } from './types';

/**
 * Use-case presets and conversions between the priority profile (PRI-06) and the
 * five-metric TOPSIS weights that Explorer and Pro still use.
 */

export type PriorityUseCase =
  'esports-1080p' | 'sweetspot-1440p' | 'enthusiast-4k' | 'creator-ai';

// Weights sit on the importance-dot steps (0/10/25/45/70/100) so the panel shows them exactly.
export const USE_CASE_PRESETS: Record<
  PriorityUseCase,
  { entries: PriorityEntry[]; targets: PriorityTargets }
> = {
  'esports-1080p': {
    entries: [
      { id: 'price', weight: 70 },
      { id: 'rasterFps1440p', weight: 100 },
      { id: 'vramGb', weight: 10 },
      { id: 'tdpWatts', weight: 25 },
    ],
    targets: { fps: 165, rtFps: 60, vramGb: 12 },
  },
  'sweetspot-1440p': {
    entries: [
      { id: 'price', weight: 45 },
      { id: 'rasterFps1440p', weight: 70 },
      { id: 'rtFps1440p', weight: 10 },
      { id: 'vramGb', weight: 45 },
      { id: 'tdpWatts', weight: 10 },
    ],
    targets: DEFAULT_TARGETS,
  },
  'enthusiast-4k': {
    entries: [
      { id: 'price', weight: 25 },
      { id: 'rasterFps1440p', weight: 70 },
      { id: 'rtFps1440p', weight: 70 },
      { id: 'vramGb', weight: 45 },
      { id: 'tdpWatts', weight: 10 },
    ],
    // 4K runs at roughly 0.58× the 1440p frame rate, so 60 FPS at 4K ≈ 105 at 1440p.
    targets: { fps: 180, rtFps: 120, vramGb: 20 },
  },
  'creator-ai': {
    entries: [
      { id: 'price', weight: 45 },
      { id: 'vramGb', weight: 100 },
      { id: 'rasterFps1440p', weight: 25 },
      { id: 'cuda', weight: 45 },
      { id: 'tdpWatts', weight: 10 },
    ],
    targets: { fps: 100, rtFps: 60, vramGb: 24 },
  },
};

export function profileForUseCase(
  useCase: PriorityUseCase,
  custom: CustomRatingParameter[] = [],
): PriorityProfile {
  const preset = USE_CASE_PRESETS[useCase];
  return {
    entries: preset.entries.map((e) => ({ ...e })),
    targets: { ...preset.targets },
    custom,
  };
}

export const DEFAULT_PRIORITY_PROFILE: PriorityProfile =
  profileForUseCase('sweetspot-1440p');

/** The five-metric slice of a profile, as TOPSIS weights (missing metrics → 0). */
export function profileToTopsisWeights(
  profile: PriorityProfile,
): PreferenceWeights {
  const weights: PreferenceWeights = {
    price: 0,
    rasterFps1440p: 0,
    rtFps1440p: 0,
    vramGb: 0,
    tdpWatts: 0,
  };
  for (const e of profile.entries) {
    if (isMetricKey(e.id)) weights[e.id] = Math.max(0, e.weight);
  }
  return weights;
}

/**
 * Applies five-metric TOPSIS weights back onto a profile: updates the weights of
 * metrics already in the profile (a 0 keeps the row, so the user still sees it),
 * adds metrics that became > 0, and keeps every other parameter untouched.
 */
export function applyTopsisWeights(
  profile: PriorityProfile,
  weights: PreferenceWeights,
): PriorityProfile {
  const kept = profile.entries.map((e) =>
    isMetricKey(e.id) ? { ...e, weight: Math.max(0, weights[e.id]) } : e,
  );
  for (const key of ALL_METRIC_KEYS) {
    if (weights[key] > 0 && !kept.some((e) => e.id === key)) {
      kept.push({ id: key, weight: weights[key] });
    }
  }
  return { ...profile, entries: kept };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseTargets(v: unknown): PriorityTargets {
  if (!isRecord(v)) return { ...DEFAULT_TARGETS };
  const num = (x: unknown, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : fallback;
  return {
    fps: num(v.fps, DEFAULT_TARGETS.fps),
    rtFps: num(v.rtFps, DEFAULT_TARGETS.rtFps),
    vramGb: num(v.vramGb, DEFAULT_TARGETS.vramGb),
  };
}

function parseCustom(v: unknown): CustomRatingParameter[] {
  if (!Array.isArray(v)) return [];
  const out: CustomRatingParameter[] = [];
  for (const item of v) {
    if (!isRecord(item) || item.kind !== 'manual-rating') continue;
    if (
      typeof item.id !== 'string' ||
      !item.id.startsWith(CUSTOM_PARAMETER_PREFIX)
    )
      continue;
    if (typeof item.label !== 'string') continue;
    const ratings: Record<string, number> = {};
    if (isRecord(item.ratings)) {
      for (const [k, r] of Object.entries(item.ratings)) {
        if (typeof r === 'number' && Number.isFinite(r)) {
          ratings[k] = Math.max(0, Math.min(10, r));
        }
      }
    }
    out.push({
      kind: 'manual-rating',
      id: item.id,
      label: item.label.slice(0, 40),
      ratings,
    });
  }
  return out;
}

/**
 * Reads a stored profile (unknown JSON). When there is none, migrates the old
 * five-metric `paretopc_weights` record so nobody loses their settings.
 */
export function parsePriorityProfile(
  stored: unknown,
  legacyWeights?: unknown,
): PriorityProfile {
  if (isRecord(stored) && Array.isArray(stored.entries)) {
    const custom = parseCustom(stored.custom);
    const customIds = new Set(custom.map((c) => c.id));
    const seen = new Set<string>();
    const entries: PriorityEntry[] = [];
    for (const e of stored.entries) {
      if (!isRecord(e) || typeof e.id !== 'string' || seen.has(e.id)) continue;
      if (!isBuiltInParameterId(e.id) && !customIds.has(e.id)) continue;
      const weight =
        typeof e.weight === 'number' && Number.isFinite(e.weight)
          ? Math.max(0, Math.min(100, e.weight))
          : 0;
      seen.add(e.id);
      entries.push({
        id: e.id,
        weight,
        ...(e.mustHave === true ? { mustHave: true } : {}),
      });
    }
    if (entries.length > 0) {
      return { entries, targets: parseTargets(stored.targets), custom };
    }
  }
  if (isRecord(legacyWeights)) {
    const weights: PreferenceWeights = {
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
    };
    let any = false;
    for (const key of ALL_METRIC_KEYS) {
      const w = legacyWeights[key];
      if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
        weights[key] = Math.min(100, w);
        any = true;
      }
    }
    if (any) {
      return applyTopsisWeights(
        { ...DEFAULT_PRIORITY_PROFILE, entries: [] },
        weights,
      );
    }
  }
  return profileForUseCase('sweetspot-1440p');
}
