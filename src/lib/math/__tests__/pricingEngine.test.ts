import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USD_TO_BRL_RATE,
  RegionalPriceOffer,
  overlayRegionalPrices,
  resolveRegionalPrice,
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
});
