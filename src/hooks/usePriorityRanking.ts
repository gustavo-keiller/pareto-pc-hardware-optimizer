import { useMemo } from 'react';
import {
  PriorityProfile,
  PriorityScoredGpu,
  ScoringContext,
  findBetterAlternatives,
  resolveParameters,
  scoreByPriorities,
} from '../lib/math/priorityModel';
import {
  FlipPoint,
  PickConfidence,
  findFlipPoints,
  pickConfidence,
} from '../lib/math/priorityInsights';
import { GpuCandidate } from '../lib/math/types';
import { DEFAULT_USD_TO_BRL_RATE } from '../utils/currency';

export interface PriorityRanking<T extends GpuCandidate> {
  /** Cards worth considering, best first (no better alternative, has every must-have). */
  ranked: PriorityScoredGpu<T>[];
  /** Every card in budget with all must-haves, best first (including set-aside ones). */
  eligible: PriorityScoredGpu<T>[];
  /** Cards set aside because another card is as good or better on everything picked. */
  setAsideCount: number;
  flips: FlipPoint[];
  confidence: PickConfidence;
}

/**
 * Scores the (already budget-filtered) cards on the user's priorities (PRI-04).
 * Fixed scales: the budget and FPS/VRAM goals set the yardsticks, not the other cards.
 */
export function usePriorityRanking<T extends GpuCandidate>(
  gpus: T[],
  profile: PriorityProfile,
  budget: number,
  currency: 'USD' | 'BRL',
): PriorityRanking<T> {
  return useMemo(() => {
    const ctx: ScoringContext = {
      budget,
      priceUnit: currency === 'BRL' ? DEFAULT_USD_TO_BRL_RATE : 1,
      targets: profile.targets,
    };
    const params = resolveParameters(profile, ctx);
    const scored = scoreByPriorities(gpus, params, profile.entries);
    const eligible = scored.filter((s) => s.missingMustHaves.length === 0);
    const better = findBetterAlternatives(
      eligible.map((s) => s.gpu),
      params,
      profile.entries,
    );
    const ranked = eligible.filter((s) => better.get(s.gpu.id) === null);
    return {
      ranked,
      eligible,
      setAsideCount: eligible.length - ranked.length,
      flips: findFlipPoints(ranked, profile.entries, 3),
      confidence: pickConfidence(ranked, profile.entries),
    };
  }, [gpus, profile, budget, currency]);
}
