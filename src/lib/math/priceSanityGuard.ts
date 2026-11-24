/**
 * Automated Feed Price Sanity Guard (`[DATA-09]`, `src/lib/math/priceSanityGuard.ts`)
 *
 * Prevents corrupted retail feeds, scraping glitches, or scalper anomalies from
 * polluting catalog prices by rejecting candidate offers outside ±40% of Hedonic
 * OLS / verified fair market baselines.
 *
 * Pure TypeScript — zero React, DOM, or localStorage imports (Rule 1).
 */

import { RegionalPriceOffer } from './pricingEngine';
import { computeHedonicRegression } from './regression';
import { GpuCandidate } from './types';

export const DEFAULT_MAX_PRICE_DEVIATION = 0.4;
const SANITY_EPSILON = 1e-9;

export type PriceRejectionReason =
  | 'non_positive_price'
  | 'missing_reference_price'
  | 'invalid_store_url'
  | 'outlier_above_fair_value'
  | 'outlier_below_fair_value';

export interface PriceSanityCheckResult {
  readonly componentId: string;
  readonly candidatePrice: number;
  readonly referenceFairPrice: number;
  readonly deviationRatio: number;
  readonly maxAllowedDeviation: number;
  readonly isAccepted: boolean;
  readonly rejectionReason?: PriceRejectionReason;
}

export interface RejectedFeedOffer {
  readonly offer: RegionalPriceOffer;
  readonly check: PriceSanityCheckResult;
}

export interface FeedSanityFilterSummary {
  readonly accepted: RegionalPriceOffer[];
  readonly rejected: RejectedFeedOffer[];
}

function isValidHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return /^https?:\/\/[^\s]+$/i.test(rawUrl.trim());
}

/**
 * Checks whether a candidate store price falls within `±maxAllowedDeviation` (default ±40%)
 * of the reference fair price (`[DATA-09]`).
 */
export function evaluatePriceSanity(
  componentId: string,
  candidatePrice: number,
  referenceFairPrice: number,
  maxAllowedDeviation = DEFAULT_MAX_PRICE_DEVIATION,
): PriceSanityCheckResult {
  const safeMaxDeviation =
    Number.isFinite(maxAllowedDeviation) && maxAllowedDeviation > 0
      ? maxAllowedDeviation
      : DEFAULT_MAX_PRICE_DEVIATION;

  if (!Number.isFinite(candidatePrice) || candidatePrice <= 0) {
    return {
      componentId,
      candidatePrice,
      referenceFairPrice,
      deviationRatio: 1,
      maxAllowedDeviation: safeMaxDeviation,
      isAccepted: false,
      rejectionReason: 'non_positive_price',
    };
  }

  if (!Number.isFinite(referenceFairPrice) || referenceFairPrice <= 0) {
    return {
      componentId,
      candidatePrice,
      referenceFairPrice,
      deviationRatio: 1,
      maxAllowedDeviation: safeMaxDeviation,
      isAccepted: false,
      rejectionReason: 'missing_reference_price',
    };
  }

  const diff = candidatePrice - referenceFairPrice;
  const deviationRatio = Math.abs(diff) / referenceFairPrice;

  if (deviationRatio <= safeMaxDeviation + SANITY_EPSILON) {
    return {
      componentId,
      candidatePrice,
      referenceFairPrice,
      deviationRatio,
      maxAllowedDeviation: safeMaxDeviation,
      isAccepted: true,
    };
  }

  return {
    componentId,
    candidatePrice,
    referenceFairPrice,
    deviationRatio,
    maxAllowedDeviation: safeMaxDeviation,
    isAccepted: false,
    rejectionReason:
      diff > 0 ? 'outlier_above_fair_value' : 'outlier_below_fair_value',
  };
}

/**
 * Computes Hedonic OLS fair market price baselines (`P_hat_i`) across a GPU catalog.
 */
export function buildGpuOlsReferencePrices(
  gpus: readonly GpuCandidate[],
): Record<string, number> {
  const result: Record<string, number> = {};
  if (gpus.length === 0) return result;

  if (gpus.length < 4) {
    for (const gpu of gpus) {
      result[gpu.id] = gpu.price > 0 ? gpu.price : 1;
    }
    return result;
  }

  const summary = computeHedonicRegression([...gpus]);
  for (const gpu of gpus) {
    const predicted = summary.valuations[gpu.id]?.fairPrice;
    result[gpu.id] =
      typeof predicted === 'number' &&
      Number.isFinite(predicted) &&
      predicted > 0
        ? predicted
        : Math.max(1, gpu.price);
  }
  return result;
}

/**
 * Filters incoming affiliate/store feed offers against known component reference baselines.
 */
export function filterFeedOffersWithSanityGuard(
  incomingOffers: readonly RegionalPriceOffer[],
  referencePrices: Readonly<Record<string, number>>,
  maxAllowedDeviation = DEFAULT_MAX_PRICE_DEVIATION,
): FeedSanityFilterSummary {
  const accepted: RegionalPriceOffer[] = [];
  const rejected: RejectedFeedOffer[] = [];

  for (const offer of incomingOffers) {
    const refPrice = referencePrices[offer.componentId] ?? 0;
    const effectiveCandidatePrice =
      typeof offer.cashPrice === 'number' && offer.cashPrice > 0
        ? offer.cashPrice
        : offer.price;

    if (!isValidHttpUrl(offer.url)) {
      rejected.push({
        offer,
        check: {
          componentId: offer.componentId,
          candidatePrice: effectiveCandidatePrice,
          referenceFairPrice: refPrice,
          deviationRatio: 1,
          maxAllowedDeviation,
          isAccepted: false,
          rejectionReason: 'invalid_store_url',
        },
      });
      continue;
    }

    const check = evaluatePriceSanity(
      offer.componentId,
      effectiveCandidatePrice,
      refPrice,
      maxAllowedDeviation,
    );

    if (check.isAccepted) {
      accepted.push(offer);
    } else {
      rejected.push({ offer, check });
    }
  }

  return { accepted, rejected };
}

/**
 * Merges accepted incoming feed offers into an existing regional offer list
 * while preserving deterministic ordering and any un-updated catalog items.
 */
export function mergeAcceptedFeedOffers(
  existingOffers: readonly RegionalPriceOffer[],
  acceptedOffers: readonly RegionalPriceOffer[],
): RegionalPriceOffer[] {
  const acceptedMap = new Map<string, RegionalPriceOffer>();
  for (const offer of acceptedOffers) {
    acceptedMap.set(offer.componentId, offer);
  }

  const seenIds = new Set<string>();
  const merged = existingOffers.map((existing) => {
    seenIds.add(existing.componentId);
    return acceptedMap.get(existing.componentId) ?? existing;
  });

  for (const offer of acceptedOffers) {
    if (!seenIds.has(offer.componentId)) {
      merged.push(offer);
      seenIds.add(offer.componentId);
    }
  }

  return merged;
}
