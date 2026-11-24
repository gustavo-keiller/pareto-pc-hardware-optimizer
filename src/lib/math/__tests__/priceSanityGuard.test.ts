import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_PRICE_DEVIATION,
  buildGpuOlsReferencePrices,
  evaluatePriceSanity,
  filterFeedOffersWithSanityGuard,
  mergeAcceptedFeedOffers,
} from '../priceSanityGuard';
import { RegionalPriceOffer } from '../pricingEngine';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';

describe('DATA-09: Hedonic OLS & Reference Feed Price Sanity Guard', () => {
  it('accepts realistic Black Friday price changes within ±40% and rejects extreme outliers', () => {
    const realisticDrop = evaluatePriceSanity('rx-6600', 1199, 1399);
    expect(realisticDrop.isAccepted).toBe(true);
    expect(realisticDrop.rejectionReason).toBeUndefined();

    const exactBoundary = evaluatePriceSanity(
      'rx-6600',
      1400,
      1000,
      DEFAULT_MAX_PRICE_DEVIATION,
    );
    expect(exactBoundary.isAccepted).toBe(true);

    const corruptedDrop = evaluatePriceSanity('rx-6600', 299, 1399);
    expect(corruptedDrop.isAccepted).toBe(false);
    expect(corruptedDrop.rejectionReason).toBe('outlier_below_fair_value');

    const scalperSpike = evaluatePriceSanity('rx-6600', 2999, 1399);
    expect(scalperSpike.isAccepted).toBe(false);
    expect(scalperSpike.rejectionReason).toBe('outlier_above_fair_value');
  });

  it('guards zero, negative, and missing-baseline prices without NaN or Infinity', () => {
    const zeroPrice = evaluatePriceSanity('cpu-ryzen-5600', 0, 799);
    expect(zeroPrice.isAccepted).toBe(false);
    expect(zeroPrice.rejectionReason).toBe('non_positive_price');
    expect(Number.isFinite(zeroPrice.deviationRatio)).toBe(true);

    const missingRef = evaluatePriceSanity('unknown-part', 500, 0);
    expect(missingRef.isAccepted).toBe(false);
    expect(missingRef.rejectionReason).toBe('missing_reference_price');
  });

  it('computes positive finite Hedonic OLS reference prices across REAL_WORLD_GPUS', () => {
    const references = buildGpuOlsReferencePrices(REAL_WORLD_GPUS);
    expect(Object.keys(references)).toHaveLength(REAL_WORLD_GPUS.length);
    for (const gpu of REAL_WORLD_GPUS) {
      expect(references[gpu.id]).toBeGreaterThan(0);
      expect(Number.isFinite(references[gpu.id])).toBe(true);
    }
  });

  it('filters incoming affiliate feed diffs cleanly and merges accepted updates', () => {
    const referencePrices: Record<string, number> = {
      'rx-6600': 1399,
      'cpu-ryzen-5600': 799,
      'psu-msi-a650bn': 299,
    };

    const incoming: RegionalPriceOffer[] = [
      {
        componentId: 'rx-6600',
        store: 'KaBuM!',
        price: 1499,
        cashPrice: 1249,
        url: 'https://www.kabum.com.br/produto/235984',
        inStock: true,
        checkedAt: '2026-11-23',
      },
      {
        componentId: 'cpu-ryzen-5600',
        store: 'Amazon BR',
        price: 199,
        cashPrice: 179,
        url: 'https://www.amazon.com.br/dp/B09VCHR1VH',
        inStock: true,
        checkedAt: '2026-11-23',
      },
      {
        componentId: 'psu-msi-a650bn',
        store: 'Pichau',
        price: 289,
        cashPrice: 269,
        url: 'not-a-valid-url',
        inStock: true,
        checkedAt: '2026-11-23',
      },
    ];

    const summary = filterFeedOffersWithSanityGuard(incoming, referencePrices);
    expect(summary.accepted).toHaveLength(1);
    expect(summary.accepted[0].componentId).toBe('rx-6600');
    expect(summary.rejected).toHaveLength(2);
    expect(summary.rejected[0].check.rejectionReason).toBe(
      'outlier_below_fair_value',
    );
    expect(summary.rejected[1].check.rejectionReason).toBe('invalid_store_url');

    const existing: RegionalPriceOffer[] = [
      {
        componentId: 'rx-6600',
        store: 'KaBuM!',
        price: 1599,
        cashPrice: 1399,
        url: 'https://www.kabum.com.br/produto/235984',
        inStock: true,
        checkedAt: '2026-11-22',
      },
      {
        componentId: 'cpu-ryzen-5600',
        store: 'KaBuM!',
        price: 929,
        cashPrice: 799,
        url: 'https://www.kabum.com.br/produto/320798',
        inStock: true,
        checkedAt: '2026-11-22',
      },
    ];

    const merged = mergeAcceptedFeedOffers(existing, summary.accepted);
    expect(merged).toHaveLength(2);
    expect(merged[0].cashPrice).toBe(1249);
    expect(merged[1].cashPrice).toBe(799);
  });
});
