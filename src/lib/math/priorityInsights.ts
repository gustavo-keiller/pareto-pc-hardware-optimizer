import {
  PriorityEntry,
  PriorityScoredGpu,
  weightShares,
} from './priorityModel';
import { GpuCandidate } from './types';

/**
 * Explanations built on the priority model (PRI-05, PRI-10).
 * The score is linear in the raw weights up to one shared normalization, so the
 * sign of (winner − challenger) only depends on N = Σ_j w_j (v_wj − v_cj).
 * That makes "how much would this weight have to move?" an exact formula.
 */

/** Gap (in points out of 10) below which two cards count as practically tied. */
export const PRACTICAL_TIE_POINTS = 0.2;

export function isPracticalTie(
  a: PriorityScoredGpu,
  b: PriorityScoredGpu,
): boolean {
  return Math.abs(a.score - b.score) < PRACTICAL_TIE_POINTS;
}

export interface FlipPoint {
  challengerId: string;
  paramId: string;
  fromWeight: number;
  /** Whole-number weight (0–100) at which the challenger strictly passes the winner. */
  toWeight: number;
}

function valueOf(s: PriorityScoredGpu, id: string): number {
  return s.contributions.find((c) => c.id === id)?.value ?? 0;
}

/** Σ_j w_j (v_w − v_c) using the same weights the scorer used (uniform when all are 0). */
function weightedGap(
  winner: PriorityScoredGpu,
  challenger: PriorityScoredGpu,
  entries: PriorityEntry[],
): number {
  const allZero = entries.every((e) => e.weight <= 0);
  return entries.reduce((acc, e) => {
    const w = allZero ? 1 : Math.max(0, e.weight);
    return acc + w * (valueOf(winner, e.id) - valueOf(challenger, e.id));
  }, 0);
}

/**
 * Smallest single-weight change (kept within 0–100) that makes `challenger`
 * score strictly higher than `winner`, or null if no single slider can do it.
 */
export function findFlipPoint(
  winner: PriorityScoredGpu,
  challenger: PriorityScoredGpu,
  entries: PriorityEntry[],
): FlipPoint | null {
  if (entries.length === 0 || entries.every((e) => e.weight <= 0)) return null;
  let best: FlipPoint | null = null;

  for (const entry of entries) {
    const gapK = valueOf(challenger, entry.id) - valueOf(winner, entry.id);
    if (Math.abs(gapK) < 1e-9) continue;
    const others = entries.map((e) =>
      e.id === entry.id ? { ...e, weight: 0 } : e,
    );
    const rest = weightedGap(winner, challenger, others);
    // With weight x on this entry: N(x) = rest − x · gapK. Challenger wins when N(x) < 0.
    const crossing = rest / gapK;
    let to: number;
    if (gapK > 0) {
      to = Math.floor(crossing) + 1; // smallest whole x with x > crossing
      if (to <= entry.weight || to > 100) continue;
    } else {
      to = Math.ceil(crossing) - 1; // largest whole x with x < crossing
      if (to >= entry.weight || to < 0) continue;
    }
    // Guard the all-zero uniform fallback: at to = 0 every other weight could also be 0.
    const check = entries.map((e) =>
      e.id === entry.id ? { ...e, weight: to } : e,
    );
    if (weightedGap(winner, challenger, check) >= 0) continue;

    const flip = {
      challengerId: challenger.gpu.id,
      paramId: entry.id,
      fromWeight: entry.weight,
      toWeight: to,
    };
    if (
      !best ||
      Math.abs(to - entry.weight) < Math.abs(best.toWeight - best.fromWeight)
    ) {
      best = flip;
    }
  }
  return best;
}

/** Flip points for the runners-up (up to `limit`), closest first. */
export function findFlipPoints(
  ranked: PriorityScoredGpu[],
  entries: PriorityEntry[],
  limit = 3,
): FlipPoint[] {
  const [winner, ...rest] = ranked;
  if (!winner) return [];
  return rest
    .slice(0, limit)
    .map((c) => findFlipPoint(winner, c, entries))
    .filter((f): f is FlipPoint => f !== null)
    .sort(
      (a, b) =>
        Math.abs(a.toWeight - a.fromWeight) -
        Math.abs(b.toWeight - b.fromWeight),
    );
}

export type PickConfidence = 'confident' | 'likely' | 'close-call';

/**
 * How far the closest runner-up is from taking over, in weight points:
 * ≥ 20 → confident, ≥ 8 → likely, otherwise a close call (or a practical tie).
 */
export function pickConfidence(
  ranked: PriorityScoredGpu[],
  entries: PriorityEntry[],
): PickConfidence {
  if (ranked.length < 2) return 'confident';
  if (isPracticalTie(ranked[0], ranked[1])) return 'close-call';
  const flips = findFlipPoints(ranked, entries, 3);
  if (flips.length === 0) return 'confident';
  const distance = Math.abs(flips[0].toWeight - flips[0].fromWeight);
  if (distance >= 20) return 'confident';
  if (distance >= 8) return 'likely';
  return 'close-call';
}

export interface TopChangeReason {
  paramId: string;
  /** Whether the user raised or lowered that parameter's share. */
  raised: boolean;
}

/**
 * When the #1 card changes after a weight edit, names the parameter whose share
 * change helped the new #1 over the old #1 the most:
 * argmax_j (s'_j − s_j) · (v_new,j − v_old,j).
 * Returns null if the top card didn't change or no weight moved.
 */
export function explainTopChange<T extends GpuCandidate>(
  previousTopId: string | null,
  ranked: PriorityScoredGpu<T>[],
  previousEntries: PriorityEntry[],
  nextEntries: PriorityEntry[],
): TopChangeReason | null {
  const newTop = ranked[0];
  if (!newTop || !previousTopId || newTop.gpu.id === previousTopId) return null;
  const oldTop = ranked.find((r) => r.gpu.id === previousTopId);
  if (!oldTop) return null;
  const before = weightShares(previousEntries);
  const after = weightShares(nextEntries);
  let bestReason: TopChangeReason | null = null;
  let bestEffect = 1e-9;
  for (const e of nextEntries) {
    const dShare = (after[e.id] ?? 0) - (before[e.id] ?? 0);
    const effect = dShare * (valueOf(newTop, e.id) - valueOf(oldTop, e.id));
    if (effect > bestEffect) {
      bestEffect = effect;
      bestReason = { paramId: e.id, raised: dShare > 0 };
    }
  }
  return bestReason;
}
