import { AffiliatePartnerProfile } from '../lib/math/pricingEngine';
import { sanitizeCreatorRef, sanitizeHttpUrl } from '../utils/shareBuild';
import partnersJson from './partners.json';

function parsePartner(
  item: (typeof partnersJson)[number],
): AffiliatePartnerProfile {
  return {
    id: item.id,
    displayName: item.displayName,
    handle: item.handle,
    amazonTagBr: 'amazonTagBr' in item ? item.amazonTagBr : undefined,
    amazonTagUs: 'amazonTagUs' in item ? item.amazonTagUs : undefined,
    kabumPartnerTag:
      'kabumPartnerTag' in item ? item.kabumPartnerTag : undefined,
    terabytePartnerTag:
      'terabytePartnerTag' in item ? item.terabytePartnerTag : undefined,
    pichauPartnerTag:
      'pichauPartnerTag' in item ? item.pichauPartnerTag : undefined,
    neweggPartnerTag:
      'neweggPartnerTag' in item ? item.neweggPartnerTag : undefined,
  };
}

export const PARTNER_PROFILES: readonly AffiliatePartnerProfile[] =
  partnersJson.map(parsePartner);

const DEFAULT_HOUSE_PROFILE: AffiliatePartnerProfile = {
  id: 'paretopc-official',
  displayName: 'ParetoPC Official',
  handle: '@paretopc',
  amazonTagBr: 'paretopc-20',
  amazonTagUs: 'paretopcus-20',
  kabumPartnerTag: 'paretopc',
  terabytePartnerTag: 'paretopc',
  pichauPartnerTag: 'paretopc',
  neweggPartnerTag: 'paretopc',
};

export const HOUSE_PARTNER_PROFILE: AffiliatePartnerProfile =
  PARTNER_PROFILES.find((p) => p.id === 'paretopc-official') ??
  DEFAULT_HOUSE_PROFILE;

/**
 * Resolves the active Bring-Your-Own-Affiliate (BYOA) partner profile from URL query parameters (`[AFF-05]`).
 * Supports registered slugs (`?p=ofertas-hardware-br`) and stateless creator tags (`?ref=@Channel&amz=tag-20&kabum=...`).
 */
export function resolveActivePartnerFromSearch(
  searchOrUrl: string,
): AffiliatePartnerProfile | null {
  if (!searchOrUrl || !searchOrUrl.includes('=')) return null;

  try {
    const search = searchOrUrl.includes('?')
      ? searchOrUrl.slice(searchOrUrl.indexOf('?'))
      : searchOrUrl;
    const params = new URLSearchParams(search);

    const partnerSlug = sanitizeCreatorRef(
      params.get('p') ?? params.get('partner'),
    );
    const matched = partnerSlug
      ? PARTNER_PROFILES.find(
          (p) => p.id.toLowerCase() === partnerSlug.toLowerCase(),
        )
      : undefined;

    const refHandle = sanitizeCreatorRef(params.get('ref'));
    const amzTag = sanitizeCreatorRef(params.get('amz'));
    const amzBr = sanitizeCreatorRef(params.get('amz_br')) ?? amzTag;
    const amzUs = sanitizeCreatorRef(params.get('amz_us')) ?? amzTag;
    const kabumTag = sanitizeCreatorRef(params.get('kabum'));
    const terabyteTag = sanitizeCreatorRef(params.get('terabyte'));
    const pichauTag = sanitizeCreatorRef(params.get('pichau'));
    const neweggTag = sanitizeCreatorRef(params.get('newegg'));
    const customStoreUrl = sanitizeHttpUrl(params.get('store'));

    if (
      !matched &&
      !refHandle &&
      !amzBr &&
      !amzUs &&
      !kabumTag &&
      !terabyteTag &&
      !pichauTag &&
      !neweggTag &&
      !customStoreUrl
    ) {
      return null;
    }

    const baseId =
      matched?.id ??
      (refHandle ? refHandle.replace(/^@+/, '').toLowerCase() : 'creator');
    const displayHandle =
      refHandle ?? matched?.handle ?? (baseId ? `@${baseId}` : '@creator');
    const displayName =
      matched?.displayName ??
      (refHandle ? refHandle.replace(/^@+/, '') : displayHandle);

    return {
      id: baseId || 'creator',
      displayName,
      handle: displayHandle,
      amazonTagBr: amzBr ?? matched?.amazonTagBr,
      amazonTagUs: amzUs ?? matched?.amazonTagUs,
      kabumPartnerTag: kabumTag ?? matched?.kabumPartnerTag,
      terabytePartnerTag: terabyteTag ?? matched?.terabytePartnerTag,
      pichauPartnerTag: pichauTag ?? matched?.pichauPartnerTag,
      neweggPartnerTag: neweggTag ?? matched?.neweggPartnerTag,
      customStoreUrl: customStoreUrl ?? matched?.customStoreUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the effective affiliate partner with creator-first precedence (`[AFF-04]`, `[AFF-05]`):
 * when a creator slug or stateless tag exists in `searchOrUrl`, that creator receives 100% attribution;
 * otherwise organic traffic falls back to `HOUSE_PARTNER_PROFILE`.
 */
export function resolveEffectivePartner(
  searchOrUrl?: string,
  useHouseFallback = true,
): AffiliatePartnerProfile | null {
  const creator = searchOrUrl
    ? resolveActivePartnerFromSearch(searchOrUrl)
    : null;
  if (creator) return creator;
  return useHouseFallback ? HOUSE_PARTNER_PROFILE : null;
}
