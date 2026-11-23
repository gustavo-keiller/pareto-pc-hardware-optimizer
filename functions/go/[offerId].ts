import { resolveOfferRedirect } from '../../src/utils/affiliateRedirect';

interface RedirectHandlerContext {
  readonly request: Request;
  readonly params: {
    readonly offerId?: string | readonly string[];
  };
}

/**
 * Cloudflare Pages / Edge serverless click-redirect endpoint (`/go/:offerId`, `[AFF-06]`).
 * Applies active creator BYOA tags or house affiliate IDs (`[AFF-04]`) and redirects cleanly.
 */
export function onRequestGet(context: RedirectHandlerContext): Response {
  const rawOfferId = context.params.offerId;
  const offerId =
    typeof rawOfferId === 'string'
      ? rawOfferId
      : Array.isArray(rawOfferId) && typeof rawOfferId[0] === 'string'
        ? rawOfferId[0]
        : '';

  const requestUrl = new URL(context.request.url);
  const regionParam = requestUrl.searchParams.get('region');
  const region =
    regionParam === 'US' || regionParam === 'us'
      ? 'US'
      : regionParam === 'BR' || regionParam === 'br'
        ? 'BR'
        : undefined;

  const result = resolveOfferRedirect(offerId, {
    region,
    searchParams: requestUrl.search,
  });

  if (result.status === 404) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: result.location,
        'Cache-Control': 'no-store',
        'X-ParetoPC-Offer-Found': 'false',
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: result.location,
      'Cache-Control': 'no-store',
      'X-ParetoPC-Offer-Id': result.componentId,
      'X-ParetoPC-Partner': result.partnerHandle ?? 'paretopc',
    },
  });
}
