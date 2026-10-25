import { RegionalPriceOffer } from '../lib/math/pricingEngine';
import { PriceHistoryPoint } from '../utils/priceHistory';
import brPricesJson from './prices/br.json';
import usPricesJson from './prices/us.json';
import historyJson from './prices/history.json';

const optionalPositive = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

/**
 * Validates a store price file written by `npm run prices:update`.
 * JSON enters as `unknown` (Rule 5); malformed entries are dropped.
 */
export function parsePriceOffers(raw: unknown): RegionalPriceOffer[] {
  if (!Array.isArray(raw)) return [];
  const offers: RegionalPriceOffer[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const r: Record<string, unknown> = { ...item };
    const price = optionalPositive(r.price);
    if (
      typeof r.componentId !== 'string' ||
      typeof r.store !== 'string' ||
      typeof r.url !== 'string' ||
      typeof r.checkedAt !== 'string' ||
      price === undefined
    ) {
      continue;
    }
    offers.push({
      componentId: r.componentId,
      store: r.store,
      price,
      cashPrice: optionalPositive(r.cashPrice),
      installmentPrice: optionalPositive(r.installmentPrice),
      installments: optionalPositive(r.installments),
      url: r.url,
      inStock: r.inStock !== false,
      checkedAt: r.checkedAt,
    });
  }
  return offers;
}

export const BRAZIL_STORE_PRICES: readonly RegionalPriceOffer[] =
  parsePriceOffers(brPricesJson);

export const US_STORE_PRICES: readonly RegionalPriceOffer[] =
  parsePriceOffers(usPricesJson);

/**
 * Returns the store offers catalog corresponding to the given currency.
 */
export function getRegionalStorePrices(
  currency: 'USD' | 'BRL',
): readonly RegionalPriceOffer[] {
  return currency === 'BRL' ? BRAZIL_STORE_PRICES : US_STORE_PRICES;
}

/**
 * Retrieves the recorded historical price points for a component in the given currency.
 */
export function getPriceHistory(
  componentId: string,
  currency: 'USD' | 'BRL' = 'BRL',
): readonly PriceHistoryPoint[] {
  const match = historyJson.find(
    (h) => h.componentId === componentId && h.currency === currency,
  );
  return match ? match.history : [];
}
