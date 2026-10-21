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

export interface ResolvedPriceInfo {
  readonly effectivePrice: number;
  readonly currency: SupportedPricingCurrency;
  readonly isEstimated: boolean;
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
}

export const DEFAULT_USD_TO_BRL_RATE = 5.7;

/**
 * Resolves the effective purchasing price for a component given a regional price dataset.
 *
 * Algorithm:
 * 1. Looks up the item by `componentId` in the regional store offers list.
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

  const match = storeOffers.find((o) => o.componentId === item.id && o.inStock);

  if (match) {
    const effectivePrice =
      preferCash && typeof match.cashPrice === 'number' && match.cashPrice > 0
        ? match.cashPrice
        : match.price;

    return {
      effectivePrice,
      currency,
      isEstimated: false,
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
  };
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
