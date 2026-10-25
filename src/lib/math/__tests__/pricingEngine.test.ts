import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USD_TO_BRL_RATE,
  RegionalPriceOffer,
  isPriceStale,
  overlayRegionalPrices,
  priceAgeDays,
  resolveRegionalPrice,
  summarizePriceSources,
} from '../pricingEngine';

describe('DATA-04: Regional Pricing Overlay Engine', () => {
  const mockOffers: RegionalPriceOffer[] = [
    {
      componentId: 'rx-6600',
      store: 'KaBuM!',
      price: 1599,
      cashPrice: 1399,
      installmentPrice: 1645,
      installments: 10,
      url: 'https://kabum.com.br/rx6600',
      inStock: true,
      checkedAt: '2026-10-20',
    },
    {
      componentId: 'rtx-4060',
      store: 'TerabyteShop',
      price: 2199,
      cashPrice: 1999,
      url: 'https://terabyte.com.br/rtx4060',
      inStock: true,
      checkedAt: '2026-10-20',
    },
    {
      componentId: 'out-of-stock-part',
      store: 'Pichau',
      price: 999,
      cashPrice: 899,
      url: 'https://pichau.com.br/oos',
      inStock: false,
      checkedAt: '2026-10-20',
    },
  ];

  it('resolves real store shelf price with cash/PIX discount by default', () => {
    const item = { id: 'rx-6600', price: 195 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'BRL',
    });

    expect(resolved.isEstimated).toBe(false);
    expect(resolved.effectivePrice).toBe(1399);
    expect(resolved.store).toBe('KaBuM!');
    expect(resolved.storeUrl).toBe('https://kabum.com.br/rx6600');
    expect(resolved.checkedAt).toBe('2026-10-20');
    expect(resolved.cashPrice).toBe(1399);
    expect(resolved.installmentPrice).toBe(1645);
    expect(resolved.installments).toBe(10);
  });

  it('resolves installment card price when preferCashDiscount is false', () => {
    const item = { id: 'rx-6600', price: 195 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'BRL',
      preferCashDiscount: false,
    });

    expect(resolved.isEstimated).toBe(false);
    expect(resolved.effectivePrice).toBe(1599);
    expect(resolved.store).toBe('KaBuM!');
  });

  it('cleanly falls back to estimated converted price when no regional store offer exists', () => {
    const item = { id: 'unlisted-gpu', price: 300 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'BRL',
      exchangeRate: 5.7,
    });

    expect(resolved.isEstimated).toBe(true);
    expect(resolved.effectivePrice).toBe(Math.round(300 * 5.7));
    expect(resolved.currency).toBe('BRL');
    expect(resolved.store).toBeUndefined();
    expect(resolved.storeUrl).toBeUndefined();
  });

  it('cleanly falls back to baseline MSRP in USD currency when unlisted', () => {
    const item = { id: 'unlisted-gpu', price: 300 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'USD',
    });

    expect(resolved.isEstimated).toBe(true);
    expect(resolved.effectivePrice).toBe(300);
    expect(resolved.currency).toBe('USD');
  });

  it('skips out-of-stock offers and falls back to estimated conversion', () => {
    const item = { id: 'out-of-stock-part', price: 150 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'BRL',
    });

    expect(resolved.isEstimated).toBe(true);
    expect(resolved.effectivePrice).toBe(
      Math.round(150 * DEFAULT_USD_TO_BRL_RATE),
    );
  });

  it('guards against negative or non-finite prices', () => {
    const item = { id: 'negative-price-part', price: -50 };
    const resolved = resolveRegionalPrice(item, [], { currency: 'USD' });

    expect(resolved.isEstimated).toBe(true);
    expect(resolved.effectivePrice).toBe(0);
  });

  it('overlays regional prices across a catalog array preserving all component fields', () => {
    const catalog = [
      { id: 'rx-6600', name: 'Radeon RX 6600', price: 195, vramGb: 8 },
      { id: 'unlisted-part', name: 'Unlisted Part', price: 100, vramGb: 16 },
    ];

    const overlaid = overlayRegionalPrices(catalog, mockOffers, {
      currency: 'BRL',
    });

    expect(overlaid).toHaveLength(2);

    expect(overlaid[0].id).toBe('rx-6600');
    expect(overlaid[0].price).toBe(1399);
    expect(overlaid[0].priceInfo.isEstimated).toBe(false);
    expect(overlaid[0].priceInfo.store).toBe('KaBuM!');
    expect(overlaid[0].vramGb).toBe(8);

    expect(overlaid[1].id).toBe('unlisted-part');
    expect(overlaid[1].price).toBe(Math.round(100 * DEFAULT_USD_TO_BRL_RATE));
    expect(overlaid[1].priceInfo.isEstimated).toBe(true);
    expect(overlaid[1].vramGb).toBe(16);
  });

  it('a positive price the user typed in always wins, and keeps the store link', () => {
    const item = { id: 'rx-6600', price: 195 };
    const resolved = resolveRegionalPrice(item, mockOffers, {
      currency: 'BRL',
      userPrices: { 'rx-6600': 1250 },
    });
    expect(resolved.source).toBe('user');
    expect(resolved.effectivePrice).toBe(1250);
    expect(resolved.isEstimated).toBe(false);
    expect(resolved.storeUrl).toBe('https://kabum.com.br/rx6600');
  });

  it('ignores zero, negative or non-finite user prices', () => {
    const item = { id: 'rx-6600', price: 195 };
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      const resolved = resolveRegionalPrice(item, mockOffers, {
        currency: 'BRL',
        userPrices: { 'rx-6600': bad },
      });
      expect(resolved.source).toBe('store');
      expect(resolved.effectivePrice).toBe(1399);
    }
  });

  it('picks the cheapest in-stock offer whatever the order of the file', () => {
    const offers: RegionalPriceOffer[] = [
      { ...mockOffers[0], store: 'A', price: 1500, cashPrice: undefined },
      { ...mockOffers[0], store: 'B', price: 1300, cashPrice: undefined },
      { ...mockOffers[0], store: 'C', price: 900, inStock: false },
    ];
    const item = { id: 'rx-6600', price: 195 };
    const forward = resolveRegionalPrice(item, offers, { currency: 'BRL' });
    const reversed = resolveRegionalPrice(item, [...offers].reverse(), {
      currency: 'BRL',
    });
    expect(forward.store).toBe('B');
    expect(reversed.store).toBe('B');
    expect(forward.effectivePrice).toBe(1300);
  });

  it('every resolved price is labelled with exactly one source', () => {
    const items = [
      { id: 'rx-6600', price: 195 },
      { id: 'rtx-4060', price: 300 },
      { id: 'unlisted', price: 100 },
    ];
    const overlaid = overlayRegionalPrices(items, mockOffers, {
      currency: 'BRL',
      userPrices: { 'rtx-4060': 1800 },
    });
    expect(overlaid.map((o) => o.priceInfo.source)).toEqual([
      'store',
      'user',
      'estimate',
    ]);
    for (const o of overlaid) {
      expect(o.priceInfo.isEstimated).toBe(o.priceInfo.source === 'estimate');
      expect(o.price).toBe(o.priceInfo.effectivePrice);
    }
    expect(summarizePriceSources(overlaid)).toEqual({
      user: 1,
      store: 1,
      estimate: 1,
      oldestStoreCheck: '2026-10-20',
    });
    expect(summarizePriceSources([{}])).toEqual({
      user: 0,
      store: 0,
      estimate: 1,
      oldestStoreCheck: undefined,
    });
  });

  it('price age is monotone in time and unknown dates read as stale', () => {
    expect(priceAgeDays('2026-10-20', '2026-10-20')).toBe(0);
    expect(priceAgeDays('2026-10-20', '2026-10-27')).toBe(7);
    expect(priceAgeDays('2026-10-20', '2026-10-10')).toBe(0);
    expect(isPriceStale('2026-10-20', '2026-11-03')).toBe(false);
    expect(isPriceStale('2026-10-20', '2026-11-04')).toBe(true);
    expect(isPriceStale(undefined, '2026-10-20')).toBe(true);
    expect(isPriceStale('not-a-date', '2026-10-20')).toBe(true);
  });
});
