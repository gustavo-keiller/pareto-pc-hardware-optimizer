import { describe, expect, it } from 'vitest';
import {
  extractOfferFromHtml,
  isSuspiciousJump,
  parsePriceValue,
  storeNameFromUrl,
} from '../lib/store-page-parser.mjs';

const ld = (data) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head></html>`;

describe('store page parser (weekly price script)', () => {
  it('reads pt-BR and en-US price formats the same way', () => {
    expect(parsePriceValue('R$ 1.299,90')).toBe(1299.9);
    expect(parsePriceValue('1299.90')).toBe(1299.9);
    expect(parsePriceValue('1,299.90')).toBe(1299.9);
    expect(parsePriceValue('1.299')).toBe(1299);
    expect(parsePriceValue(899)).toBe(899);
  });

  it('never returns a zero, negative or missing price', () => {
    expect(parsePriceValue('0')).toBeNull();
    expect(parsePriceValue('')).toBeNull();
    expect(parsePriceValue('esgotado')).toBeNull();
    expect(parsePriceValue(Number.NaN)).toBeNull();
    expect(extractOfferFromHtml('')).toBeNull();
    expect(extractOfferFromHtml('<html>blocked</html>')).toBeNull();
  });

  it('reads schema.org Product offers, including @graph and offer lists', () => {
    const page = ld({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList' },
        {
          '@type': 'Product',
          name: 'Placa de Vídeo RX 7600',
          offers: [
            {
              '@type': 'Offer',
              price: '1899.90',
              availability: 'https://schema.org/InStock',
            },
            {
              '@type': 'Offer',
              price: '1749.90',
              availability: 'https://schema.org/InStock',
            },
          ],
        },
      ],
    });
    expect(extractOfferFromHtml(page)).toEqual({
      price: 1749.9,
      inStock: true,
      name: 'Placa de Vídeo RX 7600',
      method: 'json-ld',
    });
  });

  it('prefers an in-stock offer over a cheaper sold-out one', () => {
    const page = ld({
      '@type': 'Product',
      offers: [
        { price: 999, availability: 'https://schema.org/OutOfStock' },
        { price: 1299, availability: 'https://schema.org/InStock' },
      ],
    });
    expect(extractOfferFromHtml(page)?.price).toBe(1299);
    const soldOut = ld({
      '@type': 'Product',
      offers: { price: 999, availability: 'https://schema.org/OutOfStock' },
    });
    expect(extractOfferFromHtml(soldOut)?.inStock).toBe(false);
  });

  it('falls back to price meta tags when there is no usable JSON-LD', () => {
    const page =
      '<script type="application/ld+json">{broken</script>' +
      '<meta property="product:price:amount" content="549.00">';
    expect(extractOfferFromHtml(page)).toEqual({
      price: 549,
      inStock: true,
      name: null,
      method: 'meta',
    });
  });

  it('names stores from their URLs', () => {
    expect(storeNameFromUrl('https://www.kabum.com.br/produto/1/x')).toBe(
      'KaBuM!',
    );
    expect(storeNameFromUrl('https://www.amazon.com.br/dp/X')).toBe(
      'Amazon BR',
    );
    expect(storeNameFromUrl('not a url')).toBeNull();
  });

  it('flags price jumps that suggest a misread page', () => {
    expect(isSuspiciousJump(1500, 1400)).toBe(false);
    expect(isSuspiciousJump(1500, 15000)).toBe(true);
    expect(isSuspiciousJump(1500, 150)).toBe(true);
    expect(isSuspiciousJump(0, 150)).toBe(false);
  });
});
