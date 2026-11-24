/**
 * Regional Pricing Overlay Engine (`src/lib/math/pricingEngine.ts`)
 *
 * Replaces flat currency multiplication with real retail store shelf prices
 * (KaBuM!, TerabyteShop, Pichau / Newegg, Best Buy, B&H; never Amazon, see `isAmazonStoreUrl`),
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
  readonly affiliateUrl?: string;
  readonly partner?: string;
  readonly sponsored?: boolean;
  readonly sponsorLabel?: string;
  readonly couponCode?: string;
  readonly inStock: boolean;
  readonly checkedAt: string;
}

export interface AffiliatePartnerProfile {
  readonly id: string;
  readonly displayName: string;
  readonly handle: string;
  readonly amazonTagBr?: string;
  readonly amazonTagUs?: string;
  readonly kabumPartnerTag?: string;
  readonly terabytePartnerTag?: string;
  readonly pichauPartnerTag?: string;
  readonly neweggPartnerTag?: string;
  readonly customStoreUrl?: string;
}

export type SupportedPricingCurrency = 'USD' | 'BRL';

export interface ResolvedPriceInfo {
  readonly effectivePrice: number;
  readonly currency: SupportedPricingCurrency;
  readonly isEstimated: boolean;
  readonly store?: string;
  readonly storeUrl?: string;
  readonly isAffiliateLink?: boolean;
  readonly partnerHandle?: string;
  readonly cashPrice?: number;
  readonly installmentPrice?: number;
  readonly installments?: number;
  readonly checkedAt?: string;
  readonly sponsored?: boolean;
  readonly sponsorLabel?: string;
  readonly couponCode?: string;
}

export interface PricingResolutionOptions {
  readonly currency?: SupportedPricingCurrency;
  readonly exchangeRate?: number;
  readonly preferCashDiscount?: boolean;
  readonly partner?: AffiliatePartnerProfile | null;
  readonly fallbackPartner?: AffiliatePartnerProfile | null;
}

export const DEFAULT_USD_TO_BRL_RATE = 5.7;

/**
 * Amazon Associates rules forbid showing an Amazon price that was not fetched live
 * from their API, so a stored Amazon offer never supplies a price (BF-B5, research R-03).
 */
export function isAmazonStoreUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return (
      /(^|\.)amazon\.[a-z.]+$/.test(host) || /(^|\.)amzn\.[a-z]+$/.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Pure URL affiliate tag injector (`[AFF-01]`, `[AFF-05]`).
 * Injects partner tags for Amazon BR/US, KaBuM!, TerabyteShop, Pichau, and Newegg
 * plus referral UTM attribution without modifying prices or rankings (`[AFF-02]`).
 */
export function injectAffiliateParameters(
  rawUrl: string,
  partner?: AffiliatePartnerProfile | null,
): { url: string; isAffiliateLink: boolean; partnerHandle?: string } {
  if (!rawUrl || !partner) {
    return { url: rawUrl, isAffiliateLink: false };
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: rawUrl, isAffiliateLink: false };
    }

    const host = parsed.hostname.toLowerCase();
    let tagApplied = false;

    // A tag only earns in the store country it was issued for, so never cross BR/US (BF-B4).
    if (host.includes('amazon.com.br')) {
      const tag = partner.amazonTagBr;
      if (tag && !parsed.searchParams.has('tag')) {
        parsed.searchParams.set('tag', tag);
        tagApplied = true;
      }
    } else if (host.includes('amazon.')) {
      const tag = host.endsWith('amazon.com') ? partner.amazonTagUs : undefined;
      if (tag && !parsed.searchParams.has('tag')) {
        parsed.searchParams.set('tag', tag);
        tagApplied = true;
      }
    } else if (host.includes('kabum.com.br')) {
      if (partner.kabumPartnerTag && !parsed.searchParams.has('partner_tag')) {
        parsed.searchParams.set('partner_tag', partner.kabumPartnerTag);
        tagApplied = true;
      }
    } else if (host.includes('terabyteshop.com.br')) {
      if (partner.terabytePartnerTag && !parsed.searchParams.has('p')) {
        parsed.searchParams.set('p', partner.terabytePartnerTag);
        tagApplied = true;
      }
    } else if (host.includes('pichau.com.br')) {
      if (partner.pichauPartnerTag && !parsed.searchParams.has('ref')) {
        parsed.searchParams.set('ref', partner.pichauPartnerTag);
        tagApplied = true;
      }
    } else if (host.includes('newegg.com')) {
      if (partner.neweggPartnerTag && !parsed.searchParams.has('cm_mmc')) {
        parsed.searchParams.set('cm_mmc', partner.neweggPartnerTag);
        tagApplied = true;
      }
    }

    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', 'paretopc');
    }
    if (partner.id && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', partner.id);
    }

    return {
      url: parsed.toString(),
      isAffiliateLink: tagApplied,
      partnerHandle: partner.handle,
    };
  } catch {
    return { url: rawUrl, isAffiliateLink: false };
  }
}

/**
 * Resolves the effective purchasing price for a component given a regional price dataset.
 *
 * Algorithm:
 * 1. Looks up the item by `componentId` in the regional store offers list.
 * 2. If a matching in-stock store offer exists (Amazon offers never count, see `isAmazonStoreUrl`):
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

  const match = storeOffers.find(
    (o) =>
      o.componentId === item.id &&
      o.inStock &&
      !isAmazonStoreUrl(o.affiliateUrl ?? o.url),
  );

  if (match) {
    const effectivePrice =
      preferCash && typeof match.cashPrice === 'number' && match.cashPrice > 0
        ? match.cashPrice
        : match.price;

    const baseUrl = match.affiliateUrl ?? match.url;
    const effectivePartner =
      options?.partner ?? options?.fallbackPartner ?? null;
    const affiliateResult = injectAffiliateParameters(
      baseUrl,
      effectivePartner,
    );

    return {
      effectivePrice,
      currency,
      isEstimated: false,
      store: match.store,
      storeUrl: affiliateResult.url,
      isAffiliateLink:
        Boolean(match.affiliateUrl) || affiliateResult.isAffiliateLink,
      partnerHandle: affiliateResult.partnerHandle ?? match.partner,
      cashPrice: match.cashPrice,
      installmentPrice: match.installmentPrice,
      installments: match.installments,
      checkedAt: match.checkedAt,
      sponsored: match.sponsored,
      sponsorLabel: match.sponsorLabel,
      couponCode: match.couponCode,
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

/**
 * Ethical Frontier Sponsorship Guardrail (`[AFF-07]`):
 * Brands or stores can only surface a sponsored deal badge or coupon when
 * the promotional price keeps the component mathematically Pareto-optimal
 * and non-trapped (`[AFF-02]`).
 */
export function verifyFrontierSponsorship(
  item: { readonly isParetoOptimal: boolean; readonly isTrap?: boolean },
  priceInfo?: ResolvedPriceInfo,
): {
  readonly isEligibleSponsor: boolean;
  readonly sponsorLabel?: string;
  readonly couponCode?: string;
} {
  if (!priceInfo?.sponsored || !item.isParetoOptimal || item.isTrap) {
    return { isEligibleSponsor: false };
  }
  return {
    isEligibleSponsor: true,
    sponsorLabel: priceInfo.sponsorLabel,
    couponCode: priceInfo.couponCode,
  };
}
