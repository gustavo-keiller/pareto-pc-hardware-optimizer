// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  convertDealsToRegionalOffers,
  detectHardwareCategory,
  matchCatalogComponent,
  parseHardwareListings,
} from '../hardwareListingParser';
import {
  buildStoreImportBookmarklet,
  consumeLocationImportHash,
  decodeImportHashPayload,
  encodeImportHashPayload,
} from '../../../utils/bookmarklet';

describe('DATA-07: Multi-Category Smart Paste Parser', () => {
  it('accurately detects hardware categories across PT-BR and EN-US store listings', () => {
    expect(
      detectHardwareCategory(
        'Processador AMD Ryzen 7 7800X3D, 5.0GHz Max Turbo, AM5',
      ),
    ).toBe('cpu');
    expect(
      detectHardwareCategory(
        'Placa-Mãe Gigabyte B650M AORUS Elite, AMD AM5, DDR5',
      ),
    ).toBe('motherboard');
    expect(
      detectHardwareCategory(
        'Memória Corsair Vengeance, 32GB (2x16GB), 6000MHz, DDR5',
      ),
    ).toBe('ram');
    expect(
      detectHardwareCategory('SSD 1 TB Kingston NV2, M.2 2280 PCIe, NVMe'),
    ).toBe('storage');
    expect(
      detectHardwareCategory(
        'Air Cooler DeepCool AK400, 120mm, AMD/Intel Preta',
      ),
    ).toBe('cooler');
    expect(
      detectHardwareCategory(
        'Gabinete Gamer Montech Air 903 Max, Mid Tower, Vidro Temperado',
      ),
    ).toBe('case');
    expect(
      detectHardwareCategory('Fonte MSI MAG A650BN, 650W, 80 PLUS Bronze'),
    ).toBe('psu');
    expect(
      detectHardwareCategory(
        'Placa de Vídeo PowerColor Radeon RX 7800 XT 16GB',
      ),
    ).toBe('gpu');
  });

  it('matches catalog IDs and extracts BRL/USD prices across multi-item store pastes', () => {
    const paste = `Processador AMD Ryzen 5 5600, 3.5GHz (4.4GHz Max Turbo), AM4 - KaBuM!
R$ 779,00 à vista no PIX ou R$ 916,47 em até 10x

SSD 1 TB Kingston NV2, M.2 2280 PCIe, NVMe - Pichau
R$ 389,99 à vista no PIX

Fonte MSI MAG A650BN, ATX, 650W, 80 PLUS Bronze - TerabyteShop
R$ 299,99 à vista no PIX

Placa de Video XFX Radeon RX 6600 Speedster SWFT 210 8GB - KaBuM!
R$ 1.349,00 à vista no PIX`;

    const parsed = parseHardwareListings(paste);
    expect(parsed.length).toBeGreaterThanOrEqual(4);

    const cpu = parsed.find((d) => d.category === 'cpu');
    expect(cpu?.matchedComponentId).toBe('cpu-ryzen-5600');
    expect(cpu?.price).toBe(779);
    expect(cpu?.store).toBe('KaBuM!');

    const ssd = parsed.find((d) => d.category === 'storage');
    expect(ssd?.matchedComponentId).toBe('storage-kingston-nv2-1tb');
    expect(ssd?.price).toBe(389.99);
    expect(ssd?.store).toBe('Pichau');

    const psu = parsed.find((d) => d.category === 'psu');
    expect(psu?.matchedComponentId).toBe('psu-msi-a650bn');
    expect(psu?.price).toBe(299.99);
    expect(psu?.store).toBe('TerabyteShop');

    const gpu = parsed.find((d) => d.category === 'gpu');
    expect(gpu?.matchedComponentId).toBe('rx-6600');
    expect(gpu?.price).toBe(1349);

    const offers = convertDealsToRegionalOffers(parsed, '2026-11-23');
    expect(offers.length).toBeGreaterThanOrEqual(4);
    expect(offers.every((o) => o.inStock && o.checkedAt === '2026-11-23')).toBe(
      true,
    );
  });

  it('matches US Amazon/Newegg listings and formats USD offers cleanly', () => {
    const usdMatch = matchCatalogComponent(
      'Corsair RM750e Fully Modular Low-Noise ATX Power Supply - 80 Plus Gold',
      'psu',
    );
    expect(usdMatch?.componentId).toBe('psu-corsair-rm750e');

    const deals = parseHardwareListings(
      'Corsair RM750e 750W 80 Plus Gold Power Supply - Amazon https://www.amazon.com/dp/B0BYR1BXC6\n$99.99',
    );
    expect(deals).toHaveLength(1);
    expect(deals[0].category).toBe('psu');
    expect(deals[0].currency).toBe('USD');
    expect(deals[0].price).toBe(99.99);
    expect(deals[0].store).toBe('Amazon');
  });
});

describe('DATA-08: 1-Click Store Bookmarklet & Hash Importer', () => {
  it('encodes, decodes, and builds a valid javascript: store bookmarklet', () => {
    const rawSample =
      'Placa de Vídeo RTX 4060 8GB\nhttps://www.kabum.com.br/produto/123\nR$ 1.899,99 à vista no PIX';
    const hash = encodeImportHashPayload(rawSample);
    expect(hash.startsWith('#import=')).toBe(true);
    expect(decodeImportHashPayload(hash)).toBe(rawSample);

    const bookmarklet = buildStoreImportBookmarklet('https://paretopc.com');
    expect(bookmarklet.startsWith('javascript:(function(){')).toBe(true);
    expect(bookmarklet).toContain('https://paretopc.com/#import=');
  });

  it('consumes #import= from window.location.hash and clears the fragment cleanly', () => {
    const spy = vi.fn();
    window.history.replaceState(
      null,
      '',
      '/#import=Test%20RX%206600%20R%24%201399%2C00',
    );
    const consumed = consumeLocationImportHash(spy);
    expect(consumed).toBe(true);
    expect(spy).toHaveBeenCalledWith('Test RX 6600 R$ 1399,00');
    expect(window.location.hash).toBe('');
  });
});
