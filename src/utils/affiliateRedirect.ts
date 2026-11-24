import { getRegionalStorePrices } from '../data/storePrices';
import { resolveEffectivePartner } from '../data/partnerProfiles';
import {
  RegionalPriceOffer,
  SupportedPricingCurrency,
  injectAffiliateParameters,
} from '../lib/math/pricingEngine';

export interface OfferRedirectResult {
  readonly status: 302 | 404;
  readonly location: string;
  readonly componentId: string;
  readonly currency?: SupportedPricingCurrency;
  readonly store?: string;
  readonly partnerHandle?: string;
  readonly isAffiliateLink: boolean;
}

function parseOfferIdentifier(
  rawOfferId: string,
  explicitRegion?: 'BR' | 'US',
): { componentId: string; preferredCurrency: SupportedPricingCurrency } {
  const cleaned = rawOfferId.trim().replace(/^\/+|\/+$/g, '');
  if (cleaned.toLowerCase().startsWith('us:')) {
    return { componentId: cleaned.slice(3), preferredCurrency: 'USD' };
  }
  if (cleaned.toLowerCase().startsWith('br:')) {
    return { componentId: cleaned.slice(3), preferredCurrency: 'BRL' };
  }
  return {
    componentId: cleaned,
    preferredCurrency: explicitRegion === 'US' ? 'USD' : 'BRL',
  };
}

function findOfferInCurrency(
  componentId: string,
  currency: SupportedPricingCurrency,
): RegionalPriceOffer | undefined {
  const offers = getRegionalStorePrices(currency);
  return (
    offers.find((o) => o.componentId === componentId && o.inStock) ??
    offers.find((o) => o.componentId === componentId)
  );
}

/**
 * Resolves a `/go/:offerId` serverless click redirect (`[AFF-06]`), applying
 * creator BYOA tags with 100% precedence or falling back to house affiliate tags (`[AFF-04]`).
 */
export function resolveOfferRedirect(
  offerId: string,
  options?: {
    readonly region?: 'BR' | 'US';
    readonly searchParams?: string;
  },
): OfferRedirectResult {
  const { componentId, preferredCurrency } = parseOfferIdentifier(
    offerId,
    options?.region,
  );
  if (!componentId) {
    return {
      status: 404,
      location: '/',
      componentId: '',
      isAffiliateLink: false,
    };
  }

  const alternateCurrency: SupportedPricingCurrency =
    preferredCurrency === 'BRL' ? 'USD' : 'BRL';
  let resolvedCurrency: SupportedPricingCurrency = preferredCurrency;
  let match = findOfferInCurrency(componentId, preferredCurrency);
  if (!match) {
    match = findOfferInCurrency(componentId, alternateCurrency);
    resolvedCurrency = alternateCurrency;
  }

  if (!match) {
    return {
      status: 404,
      location: '/',
      componentId,
      isAffiliateLink: false,
    };
  }

  const partner = resolveEffectivePartner(options?.searchParams, true);
  const injected = injectAffiliateParameters(
    match.affiliateUrl ?? match.url,
    partner,
  );

  return {
    status: 302,
    location: injected.url,
    componentId: match.componentId,
    currency: resolvedCurrency,
    store: match.store,
    partnerHandle: injected.partnerHandle ?? match.partner,
    isAffiliateLink: Boolean(match.affiliateUrl) || injected.isAffiliateLink,
  };
}
