/**
 * Regional Pricing Overlay Engine (`src/lib/math/pricingEngine.ts`)
 *
 * Replaces flat currency multiplication with real retail store shelf prices
 * (KaBuM!, TerabyteShop, Pichau, Amazon BR / Newegg, Amazon US, Best Buy),
 * with cash/PIX discount awareness and honest uncertainty labeling.
 *
 * Pure TypeScript — zero React, DOM, or localStorage imports (Rule 1).
 */

export interface RegionalPriceOffer {
  readonly componentId: string;
  readonly store: string;
  readonly price: number;
  readonly cashPrice?: number;
  readonly installmentPrice?: number;
  readonly installments?: number;
  readonly url: string;
  readonly inStock: boolean;
  readonly checkedAt: string;
}

export type SupportedPricingCurrency = 'USD' | 'BRL';

/** Where an effective price came from, in order of precedence. */
export type PriceSource = 'user' | 'store' | 'estimate';

/** Prices the user typed in, keyed by component id, in the active currency. */
export type UserPriceMap = Readonly<Record<string, number>>;

export interface ResolvedPriceInfo {
  readonly effectivePrice: number;
  readonly currency: SupportedPricingCurrency;
  readonly isEstimated: boolean;
  readonly source: PriceSource;
  readonly store?: string;
  readonly storeUrl?: string;
  readonly cashPrice?: number;
  readonly installmentPrice?: number;
  readonly installments?: number;
  readonly checkedAt?: string;
}

export interface PricingResolutionOptions {
  readonly currency?: SupportedPricingCurrency;
  readonly exchangeRate?: number;
  readonly preferCashDiscount?: boolean;
  readonly userPrices?: UserPriceMap;
}

export const DEFAULT_USD_TO_BRL_RATE = 5.7;

/**
 * Resolves the effective purchasing price for a component given a regional price dataset.
 *
 * Algorithm:
 * 0. A positive finite price the user typed in wins (`source: 'user'`); the
 *    cheapest store offer, if any, is still attached so its link stays visible.
 * 1. Looks up the cheapest in-stock offer for `componentId` across all stores.
 * 2. If a matching in-stock store offer exists:
 *    - Uses `cashPrice` if `preferCashDiscount` is true and `cashPrice` is defined; otherwise uses `price`.
 *    - Flags `isEstimated: false`.
 *    - Attaches store attribution, direct product URL, and check date.
 * 3. If no regional store offer exists:
 *    - In USD mode: returns baseline catalog MSRP.
 *    - In BRL mode: calculates estimated BRL price via `catalogPrice * exchangeRate`.
 *    - Flags `isEstimated: true` to display honest uncertainty labeling.
 */
export function resolveRegionalPrice(
  item: { readonly id: string; readonly price: number },
  storeOffers: readonly RegionalPriceOffer[],
  options?: PricingResolutionOptions,
): ResolvedPriceInfo {
  const currency: SupportedPricingCurrency = options?.currency ?? 'BRL';
  const exchangeRate =
    options?.exchangeRate && options.exchangeRate > 0
      ? options.exchangeRate
      : DEFAULT_USD_TO_BRL_RATE;
  const preferCash = options?.preferCashDiscount ?? true;

  const match = cheapestInStockOffer(item.id, storeOffers, preferCash);
  const userPrice = options?.userPrices?.[item.id];

  if (
    typeof userPrice === 'number' &&
    Number.isFinite(userPrice) &&
    userPrice > 0
  ) {
    return {
      effectivePrice: userPrice,
      currency,
      isEstimated: false,
      source: 'user',
      store: match?.store,
      storeUrl: match?.url,
      checkedAt: match?.checkedAt,
    };
  }

  if (match) {
    return {
      effectivePrice: offerPrice(match, preferCash),
      currency,
      isEstimated: false,
      source: 'store',
      store: match.store,
      storeUrl: match.url,
      cashPrice: match.cashPrice,
      installmentPrice: match.installmentPrice,
      installments: match.installments,
      checkedAt: match.checkedAt,
    };
  }

  // Fallback: estimate using exchange rate or USD baseline
  const basePrice = Math.max(0, item.price);
  const effectivePrice =
    currency === 'BRL' ? Math.round(basePrice * exchangeRate) : basePrice;

  return {
    effectivePrice,
    currency,
    isEstimated: true,
    source: 'estimate',
  };
}

function offerPrice(offer: RegionalPriceOffer, preferCash: boolean): number {
  return preferCash &&
    typeof offer.cashPrice === 'number' &&
    offer.cashPrice > 0
    ? offer.cashPrice
    : offer.price;
}

function cheapestInStockOffer(
  componentId: string,
  storeOffers: readonly RegionalPriceOffer[],
  preferCash: boolean,
): RegionalPriceOffer | undefined {
  let best: RegionalPriceOffer | undefined;
  for (const offer of storeOffers) {
    if (offer.componentId !== componentId || !offer.inStock) continue;
    if (!(offer.price > 0) || !Number.isFinite(offer.price)) continue;
    if (!best || offerPrice(offer, preferCash) < offerPrice(best, preferCash)) {
      best = offer;
    }
  }
  return best;
}

const MS_PER_DAY = 86_400_000;

/** Default age after which a store price is shown as possibly outdated. */
export const DEFAULT_PRICE_MAX_AGE_DAYS = 14;

/**
 * Whole days between an ISO `YYYY-MM-DD` check date and `today` (also ISO).
 * Returns `Infinity` for a missing or malformed date so it reads as stale.
 */
export function priceAgeDays(
  checkedAt: string | undefined,
  today: string,
): number {
  if (!checkedAt) return Infinity;
  const checked = Date.parse(`${checkedAt}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(checked) || !Number.isFinite(now)) return Infinity;
  return Math.max(0, Math.floor((now - checked) / MS_PER_DAY));
}

export function isPriceStale(
  checkedAt: string | undefined,
  today: string,
  maxAgeDays: number = DEFAULT_PRICE_MAX_AGE_DAYS,
): boolean {
  return priceAgeDays(checkedAt, today) > maxAgeDays;
}

export interface PriceSourceSummary {
  readonly user: number;
  readonly store: number;
  readonly estimate: number;
  /** Oldest `checkedAt` among parts priced from a store, if any. */
  readonly oldestStoreCheck?: string;
}

/**
 * Counts how the parts of a build were priced. Parts without `priceInfo`
 * (catalogs that never went through the overlay) count as estimates.
 */
export function summarizePriceSources(
  parts: readonly { readonly priceInfo?: ResolvedPriceInfo }[],
): PriceSourceSummary {
  let user = 0;
  let store = 0;
  let estimate = 0;
  let oldestStoreCheck: string | undefined;
  for (const part of parts) {
    const source: PriceSource = part.priceInfo?.source ?? 'estimate';
    switch (source) {
      case 'user':
        user += 1;
        break;
      case 'store': {
        store += 1;
        const checked = part.priceInfo?.checkedAt;
        if (checked && (!oldestStoreCheck || checked < oldestStoreCheck)) {
          oldestStoreCheck = checked;
        }
        break;
      }
      case 'estimate':
        estimate += 1;
        break;
      default: {
        const _exhaustive: never = source;
        return _exhaustive;
      }
    }
  }
  return { user, store, estimate, oldestStoreCheck };
}

/**
 * Overlays regional store prices across an array of components,
 * updating `price` to `effectivePrice` and attaching `priceInfo`.
 */
export function overlayRegionalPrices<
  T extends { readonly id: string; readonly price: number },
>(
  items: readonly T[],
  storeOffers: readonly RegionalPriceOffer[],
  options?: PricingResolutionOptions,
): Array<
  T & { readonly price: number; readonly priceInfo: ResolvedPriceInfo }
> {
  return items.map((item) => {
    const priceInfo = resolveRegionalPrice(item, storeOffers, options);
    return {
      ...item,
      price: priceInfo.effectivePrice,
      priceInfo,
    };
  });
}
