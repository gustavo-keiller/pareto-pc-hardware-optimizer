import { describe, expect, it } from 'vitest';
import { getBuildPriceNotice, getCurrencyAdjustedCatalogs } from '../currency';
import { sanitizeUserPrices } from '../../hooks/useUserPrices';
import { parsePriceOffers } from '../../data/storePrices';
import { getStoreSearchLinks } from '../storeLinks';

describe('prices the user types in, store files and store links', () => {
  it('a typed price replaces that part only, in that currency only', () => {
    const base = getCurrencyAdjustedCatalogs('BRL');
    const target = base.cpus[0];
    const edited = getCurrencyAdjustedCatalogs('BRL', undefined, {
      [target.id]: 777,
    });
    expect(edited.cpus[0].price).toBe(777);
    expect(edited.cpus[0].priceInfo?.source).toBe('user');
    expect(edited.cpus.slice(1)).toEqual(base.cpus.slice(1));
    expect(edited.motherboards).toEqual(base.motherboards);
  });

  it('every catalog part carries a price source', () => {
    for (const currency of ['BRL', 'USD'] as const) {
      const catalogs = getCurrencyAdjustedCatalogs(currency);
      for (const list of Object.values(catalogs)) {
        for (const part of list) {
          expect(part.priceInfo?.source).toBeDefined();
          expect(part.price).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('the build notice only claims store prices when no part is estimated', () => {
    const store = {
      priceInfo: {
        effectivePrice: 1,
        currency: 'BRL' as const,
        isEstimated: false,
        source: 'store' as const,
        checkedAt: '2026-10-21',
      },
    };
    const estimate = {};
    const mixed = getBuildPriceNotice([store, estimate], 'BRL', 'pt-BR');
    expect(mixed.isEstimate).toBe(true);
    expect(mixed.text).toBe(
      '1 de 2 peças com preço estimado (convertido de US$)',
    );
    const allStore = getBuildPriceNotice([store, store], 'BRL', 'en-US');
    expect(allStore.isEstimate).toBe(false);
    expect(allStore.text).toBe('Store prices, checked on 2026-10-21');
  });

  it('drops malformed stored user prices instead of crashing', () => {
    expect(sanitizeUserPrices(null)).toEqual({ BRL: {}, USD: {} });
    expect(sanitizeUserPrices('x')).toEqual({ BRL: {}, USD: {} });
    expect(
      sanitizeUserPrices({ BRL: { a: 10, b: -1, c: 'x', d: 0 }, USD: [] }),
    ).toEqual({ BRL: { a: 10 }, USD: {} });
  });

  it('drops malformed store price entries', () => {
    const ok = {
      componentId: 'rx-7600',
      store: 'KaBuM!',
      price: 1500,
      url: 'https://x',
      inStock: true,
      checkedAt: '2026-10-25',
    };
    expect(parsePriceOffers('nope')).toEqual([]);
    expect(
      parsePriceOffers([ok, { ...ok, price: 0 }, { ...ok, url: 3 }, null]),
    ).toHaveLength(1);
  });

  it('search links are https and contain the part name', () => {
    for (const currency of ['BRL', 'USD'] as const) {
      const links = getStoreSearchLinks('Ryzen 5 7600', currency);
      expect(links.length).toBeGreaterThan(2);
      for (const link of links) {
        expect(link.url.startsWith('https://')).toBe(true);
        expect(link.url.toLowerCase()).toMatch(/ryzen/);
      }
    }
  });
});
