import { RegionalPriceOffer } from '../lib/math/pricingEngine';
import brPricesJson from './prices/br.json';
import usPricesJson from './prices/us.json';

function parsePriceOffer(
  item: (typeof brPricesJson)[number] | (typeof usPricesJson)[number],
): RegionalPriceOffer {
  return {
    componentId: item.componentId,
    store: item.store,
    price: item.price,
    cashPrice: 'cashPrice' in item ? item.cashPrice : undefined,
    installmentPrice:
      'installmentPrice' in item ? item.installmentPrice : undefined,
    installments: 'installments' in item ? item.installments : undefined,
    url: item.url,
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
