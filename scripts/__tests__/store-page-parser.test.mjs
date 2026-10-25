import { describe, expect, it } from 'vitest';
import {
  extractOfferFromHtml,
  isSuspiciousJump,
  modelTokens,
  nameMatchesPart,
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

describe('product name check (store reused a product id)', () => {
  it('accepts store titles for the same model', () => {
    expect(
      nameMatchesPart(
        'Processador AMD Ryzen 7 5700X3D, 3.0GHz (4.1GHz Max Turbo), AM4',
        'AMD Ryzen 7 5700X3D',
      ),
    ).toBe(true);
    expect(
      nameMatchesPart(
        'Fonte MSI MAG A650BN, 650W, 80 Plus Bronze, PFC Ativo',
        'MSI MAG A650BN 650W',
      ),
    ).toBe(true);
    expect(
      nameMatchesPart(
        'Memória Kingston Fury Beast, RGB, 16GB (2x8GB), 3200MHz, DDR4, CL16',
        'Kingston Fury Beast RGB 16GB (2x8GB) DDR4-3200 CL16',
      ),
    ).toBe(true);
    expect(
      nameMatchesPart(
        'Placa de Vídeo RX 6750 XT ASRock Challenger, 12GB GDDR6',
        'Radeon RX 6750 XT 12GB',
      ),
    ).toBe(true);
  });

  it('rejects other products and other variants', () => {
    // Real cases from the first run: KaBuM ids now pointing elsewhere.
    expect(
      nameMatchesPart(
        'Fechadura Digital Intelbras FR 101',
        'GeForce RTX 4080 SUPER 16GB',
      ),
    ).toBe(false);
    expect(
      nameMatchesPart(
        'Placa Mãe MSI B550M Pro-VDH WiFi, AMD AM4, mATX, DDR4',
        'MSI B550-A PRO',
      ),
    ).toBe(false);
    expect(
      nameMatchesPart(
        'Placa de Vídeo RTX 4070 Gigabyte',
        'GeForce RTX 4070 SUPER 12GB',
      ),
    ).toBe(false);
    expect(nameMatchesPart(null, 'AMD Ryzen 5 5600')).toBe(false);
  });

  it('every catalog part matches its own name', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(__dirname, '../../src/data/catalogs');
    for (const file of fs.readdirSync(dir)) {
      for (const part of JSON.parse(fs.readFileSync(path.join(dir, file)))) {
        expect(modelTokens(part.name).length, part.name).toBeGreaterThan(0);
        expect(nameMatchesPart(part.name, part.name), part.name).toBe(true);
      }
    }
  });
});
