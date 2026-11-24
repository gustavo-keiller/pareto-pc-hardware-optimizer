import { RegionalPriceOffer } from '../lib/math/pricingEngine';
import { PriceHistoryPoint } from '../utils/priceHistory';
import brPricesJson from './prices/br.json';
import usPricesJson from './prices/us.json';
import historyJson from './prices/history.json';

function parsePriceOffer(
  item: (typeof brPricesJson)[number] | (typeof usPricesJson)[number],
): RegionalPriceOffer {
  const rawRecord: Record<string, unknown> = item;
  return {
    componentId: item.componentId,
    store: item.store,
    price: item.price,
    cashPrice: 'cashPrice' in item ? item.cashPrice : undefined,
    installmentPrice:
      'installmentPrice' in item ? item.installmentPrice : undefined,
    installments: 'installments' in item ? item.installments : undefined,
    url: item.url,
    affiliateUrl:
      typeof rawRecord.affiliateUrl === 'string'
        ? rawRecord.affiliateUrl
        : undefined,
    partner:
      typeof rawRecord.partner === 'string' ? rawRecord.partner : undefined,
    sponsored:
      typeof rawRecord.sponsored === 'boolean'
        ? rawRecord.sponsored
        : undefined,
    sponsorLabel:
      typeof rawRecord.sponsorLabel === 'string'
        ? rawRecord.sponsorLabel
        : undefined,
    couponCode:
      typeof rawRecord.couponCode === 'string'
        ? rawRecord.couponCode
        : undefined,
    inStock: item.inStock,
    checkedAt: item.checkedAt,
  };
}

export const BRAZIL_STORE_PRICES: readonly RegionalPriceOffer[] =
  brPricesJson.map(parsePriceOffer);

export const US_STORE_PRICES: readonly RegionalPriceOffer[] =
  usPricesJson.map(parsePriceOffer);

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
