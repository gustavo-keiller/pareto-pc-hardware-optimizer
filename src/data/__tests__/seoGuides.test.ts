import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REAL_WORLD_GPUS } from '../realGpus';

const ROOT = path.resolve(__dirname, '../../..');
const GUIDES_DIR = path.join(ROOT, 'public/guides');
const SITEMAP_PATH = path.join(ROOT, 'public/sitemap.xml');
const ROBOTS_PATH = path.join(ROOT, 'public/robots.txt');

const EXPECTED_GUIDES = [
  'index.html',
  'melhor-placa-de-video-ate-2500-reais.html',
  'melhor-pc-gamer-ate-6000-reais.html',
  'best-gpu-under-400-dollars.html',
  'best-gaming-pc-build-under-1000-dollars.html',
];

describe('LAUNCH-04: Pre-Rendered SEO Buyer Guides & Sitemap', () => {
  it('verifies generated sitemap.xml, robots.txt, and static HTML buyer guides with valid Schema.org Product markup', () => {
    expect(fs.existsSync(SITEMAP_PATH)).toBe(true);
    expect(fs.existsSync(ROBOTS_PATH)).toBe(true);

    const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const robots = fs.readFileSync(ROBOTS_PATH, 'utf8');
    expect(robots).toContain('Sitemap: https://paretopc.com/sitemap.xml');

    const knownGpuIds = new Set(REAL_WORLD_GPUS.map((g) => g.id));

    for (const fileName of EXPECTED_GUIDES) {
      expect(sitemap).toContain(`/guides/${fileName}`);

      const guidePath = path.join(GUIDES_DIR, fileName);
      expect(fs.existsSync(guidePath)).toBe(true);
      const html = fs.readFileSync(guidePath, 'utf8');

      expect(html).toMatch(/<link[^>]*rel="canonical"/i);
      expect(html).toContain('https://paretopc.com/');

      const ldMatch = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      expect(ldMatch).not.toBeNull();
      const parsed: {
        '@type'?: string;
        itemListElement?: Array<{
          item?: {
            sku?: string;
            offers?: { price?: number; priceCurrency?: string };
          };
        }>;
      } = JSON.parse(ldMatch?.[1] ?? '{}');

      expect(parsed['@type']).toBe('ItemList');
      expect((parsed.itemListElement ?? []).length).toBeGreaterThan(0);

      for (const entry of parsed.itemListElement ?? []) {
        const sku = entry.item?.sku ?? '';
        expect(knownGpuIds.has(sku)).toBe(true);
        // Estimates carry no Offer; a real store Offer always has a price.
        if (entry.item?.offers) {
          expect(entry.item.offers.price ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });
});
