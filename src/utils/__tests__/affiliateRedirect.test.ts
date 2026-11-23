import { describe, expect, it } from 'vitest';
import { resolveOfferRedirect } from '../affiliateRedirect';

describe('AFF-06: Serverless /go/:offerId Click Redirect Resolver', () => {
  it('resolves Brazilian offer URLs with house affiliate fallback for organic traffic', () => {
    const result = resolveOfferRedirect('rx-6600', { region: 'BR' });
    expect(result.status).toBe(302);
    expect(result.componentId).toBe('rx-6600');
    expect(result.currency).toBe('BRL');
    expect(result.location).toContain('utm_source=paretopc');
    expect(result.location).toContain('utm_campaign=paretopc-official');
    expect(result.partnerHandle).toBe('@paretopc');
    expect(result.isAffiliateLink).toBe(true);
  });

  it('gives 100% affiliate precedence to creator query params on /go/:offerId', () => {
    const result = resolveOfferRedirect('us:rx-6600', {
      searchParams: '?p=tech-deals-us',
    });
    expect(result.status).toBe(302);
    expect(result.currency).toBe('USD');
    expect(result.partnerHandle).toBe('@TechDealsUS');
    expect(result.location).toContain('utm_campaign=tech-deals-us');
  });

  it('returns 404 status redirecting home when component offer does not exist', () => {
    const result = resolveOfferRedirect('nonexistent-component-999');
    expect(result.status).toBe(404);
    expect(result.location).toBe('/');
    expect(result.isAffiliateLink).toBe(false);
  });
});
