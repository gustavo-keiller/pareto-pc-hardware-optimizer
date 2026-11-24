import { describe, expect, it } from 'vitest';
import {
  AffiliatePartnerProfile,
  DEFAULT_USD_TO_BRL_RATE,
  RegionalPriceOffer,
  injectAffiliateParameters,
  overlayRegionalPrices,
  resolveRegionalPrice,
  verifyFrontierSponsorship,
} from '../pricingEngine';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';
import { BRAZIL_STORE_PRICES } from '../../../data/storePrices';
import {
  HOUSE_PARTNER_PROFILE,
  resolveActivePartnerFromSearch,
  resolveEffectivePartner,
} from '../../../data/partnerProfiles';

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

  it('AFF-02 Ranking Neutrality: affiliate partners never alter effective prices or rankings', () => {
    const creatorPartner: AffiliatePartnerProfile = {
      id: 'creator-test',
      displayName: 'Creator Test',
      handle: '@CreatorTest',
      amazonTagBr: 'creatortest-20',
      amazonTagUs: 'creatortestus-20',
      kabumPartnerTag: 'creatorkabum',
      terabytePartnerTag: 'creatortera',
      pichauPartnerTag: 'creatorpichau',
      neweggPartnerTag: 'creatornewegg',
    };

    const baseline = overlayRegionalPrices(
      REAL_WORLD_GPUS,
      BRAZIL_STORE_PRICES,
      {
        currency: 'BRL',
      },
    );
    const withPartner = overlayRegionalPrices(
      REAL_WORLD_GPUS,
      BRAZIL_STORE_PRICES,
      {
        currency: 'BRL',
        partner: creatorPartner,
      },
    );

    expect(withPartner).toHaveLength(baseline.length);
    for (let i = 0; i < baseline.length; i++) {
      expect(withPartner[i].id).toBe(baseline[i].id);
      expect(withPartner[i].price).toBe(baseline[i].price);
      expect(withPartner[i].priceInfo.effectivePrice).toBe(
        baseline[i].priceInfo.effectivePrice,
      );
      expect(withPartner[i].priceInfo.storeUrl).toContain(
        'utm_source=paretopc',
      );
      expect(withPartner[i].priceInfo.storeUrl).toContain(
        'utm_campaign=creator-test',
      );
    }
  });

  it('AFF-01 & AFF-05: injects store-specific affiliate parameters and resolves registered/stateless partners', () => {
    const partner = resolveActivePartnerFromSearch(
      '?p=ofertas-hardware-br&amz=override-20',
    );
    expect(partner).not.toBeNull();
    expect(partner?.handle).toBe('@OfertasHardwareBR');
    expect(partner?.amazonTagBr).toBe('override-20');

    const amz = injectAffiliateParameters(
      'https://www.amazon.com.br/dp/B0TEST',
      partner,
      'BRL',
    );
    expect(amz.isAffiliateLink).toBe(true);
    expect(amz.url).toContain('tag=override-20');

    const kabum = injectAffiliateParameters(
      'https://www.kabum.com.br/produto/235984',
      partner,
      'BRL',
    );
    expect(kabum.isAffiliateLink).toBe(true);
    expect(kabum.url).toContain('partner_tag=ofertashw');

    const stateless = resolveActivePartnerFromSearch(
      '?ref=@GuigaGames&terabyte=guigatera&pichau=guigaref&newegg=guigacmc',
    );
    expect(stateless?.handle).toBe('@GuigaGames');
    expect(
      injectAffiliateParameters(
        'https://www.terabyteshop.com.br/produto/123',
        stateless,
        'BRL',
      ).url,
    ).toContain('p=guigatera');
    expect(
      injectAffiliateParameters(
        'https://www.pichau.com.br/placa-de-video',
        stateless,
        'BRL',
      ).url,
    ).toContain('ref=guigaref');
    expect(
      injectAffiliateParameters(
        'https://www.newegg.com/p/123',
        stateless,
        'USD',
      ).url,
    ).toContain('cm_mmc=guigacmc');

    expect(resolveActivePartnerFromSearch('?foo=bar')).toBeNull();
  });

  it('AFF-04: falls back to house affiliate IDs on organic visits while creator tags override 100%', () => {
    const organicPartner = resolveEffectivePartner('', true);
    expect(organicPartner?.id).toBe(HOUSE_PARTNER_PROFILE.id);

    const organicResolved = resolveRegionalPrice(
      { id: 'rx-6600', price: 195 },
      mockOffers,
      {
        currency: 'BRL',
        partner: null,
        fallbackPartner: HOUSE_PARTNER_PROFILE,
      },
    );
    expect(organicResolved.storeUrl).toContain('partner_tag=paretopc');
    expect(organicResolved.storeUrl).toContain(
      'utm_campaign=paretopc-official',
    );

    const creatorPartner = resolveEffectivePartner(
      '?p=ofertas-hardware-br',
      true,
    );
    const creatorResolved = resolveRegionalPrice(
      { id: 'rx-6600', price: 195 },
      mockOffers,
      {
        currency: 'BRL',
        partner: creatorPartner,
        fallbackPartner: HOUSE_PARTNER_PROFILE,
      },
    );
    expect(creatorResolved.storeUrl).toContain('partner_tag=ofertashw');
    expect(creatorResolved.storeUrl).not.toContain('partner_tag=paretopc');
  });

  it('AFF-07: allows sponsorship labels/coupons only on Pareto-optimal non-trap items', () => {
    const sponsoredPrice = resolveRegionalPrice(
      { id: 'sponsored-gpu', price: 350 },
      [
        {
          componentId: 'sponsored-gpu',
          store: 'KaBuM!',
          price: 1899,
          url: 'https://www.kabum.com.br/produto/999',
          sponsored: true,
          sponsorLabel: 'Black Friday Verified Deal',
          couponCode: 'PARETO5',
          inStock: true,
          checkedAt: '2026-11-23',
        },
      ],
      { currency: 'BRL' },
    );

    const frontierCheck = verifyFrontierSponsorship(
      { isParetoOptimal: true, isTrap: false },
      sponsoredPrice,
    );
    expect(frontierCheck.isEligibleSponsor).toBe(true);
    expect(frontierCheck.sponsorLabel).toBe('Black Friday Verified Deal');
    expect(frontierCheck.couponCode).toBe('PARETO5');

    const dominatedCheck = verifyFrontierSponsorship(
      { isParetoOptimal: false, isTrap: false },
      sponsoredPrice,
    );
    expect(dominatedCheck.isEligibleSponsor).toBe(false);

    const trapCheck = verifyFrontierSponsorship(
      { isParetoOptimal: true, isTrap: true },
      sponsoredPrice,
    );
    expect(trapCheck.isEligibleSponsor).toBe(false);
  });
});
