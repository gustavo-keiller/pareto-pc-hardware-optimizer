import { inferGpuFeatures } from './capabilities';
import { GpuCandidate, OptimizationDirection } from './types';

/**
 * Priority model (PRI-04): weighted value scoring on fixed scales.
 *
 * Each parameter j turns a card's raw number into a value v_j in [0, 1] using a
 * scale whose anchors are constants (or come from the user's own settings),
 * never from the other cards in the list:
 *
 *   t = (x - worst) / (best - worst), clamped to [0, 1]
 *   linear:     v = t
 *   saturating: v = 1 - (1 - t)^2      (early gains count more: "good enough")
 *   threshold:  v = t >= 1 ? 1 : 0     (yes / no features)
 *
 * Score (0–10) = 10 * Σ_j s_j * v_j, with shares s_j = w_j / Σ w (uniform when all w_j = 0).
 * Because a card's score only uses its own numbers, adding or removing other
 * cards can never reorder the rest (no rank reversal), and each card's score
 * splits exactly into per-parameter points.
 */

export type ValueCurve = 'linear' | 'saturating' | 'threshold';

export interface ValueScale {
  /** Raw value worth 0. */
  worst: number;
  /** Raw value worth 10. If worst > best, lower is better. */
  best: number;
  curve: ValueCurve;
}

export type ParameterGroup =
  'cost' | 'performance' | 'memory' | 'efficiency' | 'features' | 'custom';

export type MissingValuePolicy = 'neutral' | 'worst';

export interface PriorityTargets {
  /** 1440p gaming FPS that counts as "fully enough". */
  fps: number;
  /** 1440p ray tracing FPS that counts as "fully enough". */
  rtFps: number;
  /** VRAM (GB) that counts as "fully enough". */
  vramGb: number;
}

export interface ScoringContext {
  /** Budget in the active currency; cards at the budget get 0 price points. */
  budget: number;
  /** Units of the active currency per 1 USD (1 for USD, ~5.7 for BRL). */
  priceUnit: number;
  targets: PriorityTargets;
}

export interface ResolvedParameter {
  id: string;
  group: ParameterGroup;
  direction: OptimizationDirection;
  scale: ValueScale;
  read: (gpu: GpuCandidate) => number | undefined;
  missing: MissingValuePolicy;
  /** True when the number is a model estimate rather than a measurement. */
  estimated?: boolean;
}

export interface PriorityEntry {
  id: string;
  /** Importance on a 0–100 scale (normalized before scoring). */
  weight: number;
  /** Feature parameters only: cards without it are set aside. */
  mustHave?: boolean;
}

/** A parameter the user made: a 0–10 rating they type for each card. */
export interface CustomRatingParameter {
  kind: 'manual-rating';
  id: string;
  label: string;
  ratings: Record<string, number>;
}

export interface PriorityProfile {
  entries: PriorityEntry[];
  targets: PriorityTargets;
  custom: CustomRatingParameter[];
}

export const DEFAULT_TARGETS: PriorityTargets = {
  fps: 120,
  rtFps: 80,
  vramGb: 16,
};

export const CUSTOM_PARAMETER_PREFIX = 'custom:';

const FEATURE_PARAMETERS: Record<string, string> = {
  frameGen: 'Frame Gen',
  av1: 'AV1 Video Encode',
  cuda: 'CUDA / OptiX AI & 3D',
};

function hasFeature(gpu: GpuCandidate, needle: string): number {
  return inferGpuFeatures(gpu).some((f) => f.includes(needle)) ? 1 : 0;
}

/** Ids of every built-in parameter, in the order the "+ Add" library lists them. */
export const BUILT_IN_PARAMETER_IDS = [
  'price',
  'rasterFps1440p',
  'rtFps1440p',
  'vramGb',
  'tdpWatts',
  'fpsPerPrice',
  'fpsPerWatt',
  'frameGen',
  'av1',
  'cuda',
] as const;

export type BuiltInParameterId = (typeof BUILT_IN_PARAMETER_IDS)[number];

export function isBuiltInParameterId(id: string): id is BuiltInParameterId {
  return BUILT_IN_PARAMETER_IDS.some((known) => known === id);
}

export function isFeatureParameter(id: string): boolean {
  return id in FEATURE_PARAMETERS;
}

function builtIn(
  id: BuiltInParameterId,
  ctx: ScoringContext,
): ResolvedParameter {
  const unit = ctx.priceUnit > 0 ? ctx.priceUnit : 1;
  switch (id) {
    case 'price': {
      const worst =
        ctx.budget > 0 && Number.isFinite(ctx.budget)
          ? ctx.budget
          : 2000 * unit;
      return {
        id,
        group: 'cost',
        direction: 'min',
        scale: { worst, best: worst * 0.3, curve: 'linear' },
        read: (g) => g.price,
        missing: 'worst',
      };
    }
    case 'rasterFps1440p':
      return {
        id,
        group: 'performance',
        direction: 'max',
        scale: {
          worst: 30,
          best: Math.max(31, ctx.targets.fps),
          curve: 'saturating',
        },
        read: (g) => g.rasterFps1440p,
        missing: 'worst',
      };
    case 'rtFps1440p':
      return {
        id,
        group: 'performance',
        direction: 'max',
        scale: {
          worst: 0,
          best: Math.max(1, ctx.targets.rtFps),
          curve: 'saturating',
        },
        read: (g) => g.rtFps1440p,
        missing: 'worst',
      };
    case 'vramGb':
      return {
        id,
        group: 'memory',
        direction: 'max',
        scale: {
          worst: 6,
          best: Math.max(7, ctx.targets.vramGb),
          curve: 'linear',
        },
        read: (g) => g.vramGb,
        missing: 'worst',
      };
    case 'tdpWatts':
      return {
        id,
        group: 'efficiency',
        direction: 'min',
        scale: { worst: 450, best: 120, curve: 'linear' },
        read: (g) => g.tdpWatts,
        missing: 'neutral',
      };
    case 'fpsPerPrice':
      // Gaming FPS per 100 USD-equivalent of price.
      return {
        id,
        group: 'cost',
        direction: 'max',
        scale: { worst: 8, best: 30, curve: 'linear' },
        read: (g) =>
          g.price > 0 ? (g.rasterFps1440p / (g.price / unit)) * 100 : undefined,
        missing: 'worst',
      };
    case 'fpsPerWatt':
      return {
        id,
        group: 'efficiency',
        direction: 'max',
        scale: { worst: 0.2, best: 0.65, curve: 'linear' },
        read: (g) =>
          g.tdpWatts > 0 ? g.rasterFps1440p / g.tdpWatts : undefined,
        missing: 'neutral',
      };
    case 'frameGen':
    case 'av1':
    case 'cuda': {
      const needle = FEATURE_PARAMETERS[id];
      return {
        id,
        group: 'features',
        direction: 'max',
        scale: { worst: 0, best: 1, curve: 'threshold' },
        read: (g) => hasFeature(g, needle),
        missing: 'worst',
        estimated: true,
      };
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/**
 * Turns the profile's entries into scoring parameters for a given context.
 * Unknown ids (e.g. a deleted custom rating) are skipped.
 */
export function resolveParameters(
  profile: PriorityProfile,
  ctx: ScoringContext,
): ResolvedParameter[] {
  const customById = new Map(profile.custom.map((c) => [c.id, c]));
  const resolved: ResolvedParameter[] = [];
  for (const entry of profile.entries) {
    if (isBuiltInParameterId(entry.id)) {
      resolved.push(builtIn(entry.id, ctx));
      continue;
    }
    const custom = customById.get(entry.id);
    if (custom) {
      resolved.push({
        id: custom.id,
        group: 'custom',
        direction: 'max',
        scale: { worst: 0, best: 10, curve: 'linear' },
        read: (g) => {
          const v = custom.ratings[g.id];
          return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
        },
        missing: 'neutral',
      });
    }
  }
  return resolved;
}

/** Maps a raw value to [0, 1] on a fixed scale. */
export function valueOnScale(x: number, scale: ValueScale): number {
  const span = scale.best - scale.worst;
  if (Math.abs(span) < 1e-9) return x === scale.best ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - scale.worst) / span));
  switch (scale.curve) {
    case 'linear':
      return t;
    case 'saturating':
      return 1 - (1 - t) * (1 - t);
    case 'threshold':
      return t >= 1 - 1e-9 ? 1 : 0;
    default: {
      const _exhaustive: never = scale.curve;
      return _exhaustive;
    }
  }
}

/**
 * Inverse of `valueOnScale` for continuous curves: the raw value worth `v`.
 * Threshold scales return `best` for v > 0 and `worst` otherwise.
 */
export function rawForValue(v: number, scale: ValueScale): number {
  const clamped = Math.max(0, Math.min(1, v));
  let t: number;
  switch (scale.curve) {
    case 'linear':
      t = clamped;
      break;
    case 'saturating':
      t = 1 - Math.sqrt(1 - clamped);
      break;
    case 'threshold':
      t = clamped > 0 ? 1 : 0;
      break;
    default: {
      const _exhaustive: never = scale.curve;
      return _exhaustive;
    }
  }
  return scale.worst + t * (scale.best - scale.worst);
}

/** Normalized shares s_j = w_j / Σ w; uniform when every weight is 0 (Rule 3). */
export function weightShares(entries: PriorityEntry[]): Record<string, number> {
  const shares: Record<string, number> = {};
  if (entries.length === 0) return shares;
  const sum = entries.reduce((acc, e) => acc + Math.max(0, e.weight), 0);
  for (const e of entries) {
    shares[e.id] = sum > 0 ? Math.max(0, e.weight) / sum : 1 / entries.length;
  }
  return shares;
}

export interface ParameterContribution {
  id: string;
  raw: number | undefined;
  /** Value on the parameter's scale, 0–1. */
  value: number;
  share: number;
  /** Points out of 10 this parameter added to the score. */
  points: number;
  missing: boolean;
}

export interface PriorityScoredGpu<T extends GpuCandidate = GpuCandidate> {
  gpu: T;
  /** 0–10. */
  score: number;
  contributions: ParameterContribution[];
  /** Ids of must-have features this card lacks. */
  missingMustHaves: string[];
}

/**
 * Scores every card on the profile, best first.
 * Ties (within 1e-9) go to the cheaper card.
 */
export function scoreByPriorities<T extends GpuCandidate>(
  gpus: T[],
  params: ResolvedParameter[],
  entries: PriorityEntry[],
): PriorityScoredGpu<T>[] {
  const shares = weightShares(
    entries.filter((e) => params.some((p) => p.id === e.id)),
  );
  const mustHaves = entries.filter(
    (e) => e.mustHave && isFeatureParameter(e.id),
  );

  const scored = gpus.map((gpu) => {
    let total = 0;
    const contributions = params.map((p) => {
      const raw = p.read(gpu);
      const missing = raw === undefined || !Number.isFinite(raw);
      const value = missing
        ? p.missing === 'neutral'
          ? 0.5
          : 0
        : valueOnScale(raw, p.scale);
      const share = shares[p.id] ?? 0;
      const points = 10 * share * value;
      total += points;
      return {
        id: p.id,
        raw: missing ? undefined : raw,
        value,
        share,
        points,
        missing,
      };
    });
    const missingMustHaves = mustHaves
      .filter((m) => {
        const c = contributions.find((x) => x.id === m.id);
        return !c || c.value < 1;
      })
      .map((m) => m.id);
    return { gpu, score: total, contributions, missingMustHaves };
  });

  return scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 1e-9) return b.score - a.score;
    return a.gpu.price - b.gpu.price;
  });
}

/**
 * "Bad deal" test on the parameters the user cares about (weight > 0), with a
 * tolerance so benchmark noise doesn't decide it:
 * A beats B when A is at least as good on every such parameter (within `tol`)
 * and clearly better (by more than `tol`) on at least one.
 * Feature (yes/no) parameters compare exactly. Missing values never beat anything.
 */
export function beatsWithTolerance(
  a: GpuCandidate,
  b: GpuCandidate,
  params: ResolvedParameter[],
  tol = 0.03,
): boolean {
  if (a.id === b.id || params.length === 0) return false;
  let clearlyBetter = false;
  for (const p of params) {
    const va = p.read(a);
    const vb = p.read(b);
    if (va === undefined || vb === undefined) return false;
    const exact = p.scale.curve === 'threshold';
    const t = exact ? 0 : tol;
    const mag = Math.abs(vb);
    if (p.direction === 'max') {
      if (va < vb - t * mag) return false;
      if (va > vb + t * mag) clearlyBetter = true;
    } else {
      if (va > vb + t * mag) return false;
      if (va < vb - t * mag) clearlyBetter = true;
    }
  }
  return clearlyBetter;
}

/**
 * For each card, the id of a card that beats it (see `beatsWithTolerance`), or null.
 * Only parameters with weight > 0 count. If the tolerance would leave no card
 * standing (possible with long near-tie chains), falls back to exact comparison.
 */
export function findBetterAlternatives(
  gpus: GpuCandidate[],
  params: ResolvedParameter[],
  entries: PriorityEntry[],
  tol = 0.03,
): Map<string, string | null> {
  const active = params.filter((p) =>
    entries.some((e) => e.id === p.id && e.weight > 0),
  );
  const run = (t: number) => {
    const result = new Map<string, string | null>();
    for (const b of gpus) {
      const beater = gpus.find((a) => beatsWithTolerance(a, b, active, t));
      result.set(b.id, beater ? beater.id : null);
    }
    return result;
  };
  const withTol = run(tol);
  const anyStanding = [...withTol.values()].some((v) => v === null);
  return anyStanding || gpus.length === 0 ? withTol : run(0);
}

/**
 * Pairwise "this or that" answers → weights (0–100, summing to ~100).
 * Each parameter starts with one point and earns a point per answer it wins.
 */
export function weightsFromChoices(
  ids: string[],
  winners: string[],
): PriorityEntry[] {
  const counts = new Map(ids.map((id) => [id, 1]));
  for (const w of winners) {
    if (counts.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const sum = [...counts.values()].reduce((a, b) => a + b, 0);
  return ids.map((id) => ({
    id,
    weight: Math.round(((counts.get(id) ?? 0) / sum) * 100),
  }));
}
