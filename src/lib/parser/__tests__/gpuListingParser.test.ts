import { describe, expect, it } from 'vitest';
import {
  parseGpuListings,
  parsePriceString,
  splitMultiListings,
} from '../gpuListingParser';

describe('gpuListingParser', () => {
  describe('parsePriceString', () => {
    it('parses Brazilian Real currency formatting with thousands dot and decimal comma', () => {
      expect(parsePriceString('3.899,99')).toBe(3899.99);
      expect(parsePriceString('R$ 5.176,46')).toBe(5176.46);
      expect(parsePriceString('R$ 1.389,99')).toBe(1389.99);
      expect(parsePriceString('2.944,05')).toBe(2944.05);
      expect(parsePriceString('3099,00')).toBe(3099.0);
    });

    it('parses US currency formatting', () => {
      expect(parsePriceString('$299.99')).toBe(299.99);
      expect(parsePriceString('$1,299.00')).toBe(1299.0);
    });

    it('handles empty or invalid strings gracefully', () => {
      expect(parsePriceString('')).toBe(0);
      expect(parsePriceString('abc')).toBe(0);
    });
  });

  describe('User Example 1: Pichau PowerColor Radeon RX 9060 XT', () => {
    const rawPichau = `Placa de Video PowerColor Radeon RX 9060 XT Reaper, 16GB, GDDR6, 128-bit, RX9060XT-16G-A-NAC de R$ 5.176,46 por:
à vista
R$ 3.899,99
no PIX com 15% desconto pichau
R$ 4.588,22
em até 12x de R$ 382,35
sem juros no cartão`;

    it('extracts chip, brand, VRAM, store, and cash/installment prices correctly', () => {
      const deals = parseGpuListings(rawPichau);
      expect(deals.length).toBe(1);

      const deal = deals[0];
      expect(deal.chip).toBe('RX 9060 XT');
      expect(deal.vendor).toBe('AMD');
      expect(deal.brand).toBe('PowerColor');
      expect(deal.vramGb).toBe(16);
      expect(deal.store).toBe('Pichau');
      expect(deal.currency).toBe('BRL');
      expect(deal.priceCash).toBe(3899.99);
      expect(deal.priceInstallment).toBe(4588.22);
      expect(deal.originalPrice).toBe(5176.46);
      expect(deal.price).toBe(3899.99);
      expect(deal.validationWarnings.length).toBe(0);
    });
  });

  describe('User Example 2: TerabyteShop Gamer Ninja GTX 1660 Super', () => {
    const rawTerabyte = `Placa de Vídeo Gamer Ninja NVIDIA GeForce GTX 1660 Super Ronin, 6GB, GDDR6, 192bit, GN-PV-NVGTX1660S6D6
CÓD: GN-PV-NVGTX1660S6D6 Vendido por: TerabyteShop
MAIS VENDIDO 1º Posição em [Placa de Vídeo](https://www.terabyteshop.com.br/hardware/placas-de-video)
FRETE GRÁTIS: RS,PR,SC,SP,MG,RJ,ES
De: R$ 1.449,99 por:
R$ 1.389,99
à vista com 15% de desconto no pix
R$ 1.635,28 em até 12x de R$ 136,27 sem juros no cartão`;

    it('extracts Turing GTX 1660 Super specs, Terabyte store, and URL', () => {
      const deals = parseGpuListings(rawTerabyte);
      expect(deals.length).toBe(1);

      const deal = deals[0];
      expect(deal.chip).toBe('GTX 1660 Super');
      expect(deal.vendor).toBe('NVIDIA');
      expect(deal.brand).toBe('Gamer Ninja');
      expect(deal.vramGb).toBe(6);
      expect(deal.store).toBe('TerabyteShop');
      expect(deal.url).toBe(
        'https://www.terabyteshop.com.br/hardware/placas-de-video',
      );
      expect(deal.priceCash).toBe(1389.99);
      expect(deal.priceInstallment).toBe(1635.28);
      expect(deal.originalPrice).toBe(1449.99);
      expect(deal.price).toBe(1389.99);
      expect(deal.tdpWatts).toBe(125);
      expect(deal.rasterFps1440p).toBe(34);
    });
  });

  describe('User Example 3: PCYes RX 7600 XT 16GB', () => {
    const rawPcYes = `Placa de vídeo AMD Radeon RX 7600XT 16GB GDDR6 128 Bits Projeto Edge (PVR760016GBPEDF)
[Seja o primeiro a avaliar este produto](https://www.pcyes.com.br/placa-de-video-amd-radeon-rx-7600xt-16gb-gddr6-128-bits-projeto-edge-pvr760016gbpedf#review-form)
COD: 317981
R$ 2.944,05 Ganhe 3.090 PC Points
À vista no PIX com 5% de desconto
ou R$ 3099,00 em até 10x R$ 309,90 sem juros.`;

    it('extracts RX 7600 XT, PCYes store, 16GB VRAM, PIX vs installment prices', () => {
      const deals = parseGpuListings(rawPcYes);
      expect(deals.length).toBe(1);

      const deal = deals[0];
      expect(deal.chip).toBe('RX 7600 XT');
      expect(deal.vendor).toBe('AMD');
      expect(deal.vramGb).toBe(16);
      expect(deal.store).toBe('PCYes');
      expect(deal.priceCash).toBe(2944.05);
      expect(deal.priceInstallment).toBe(3099.0);
      expect(deal.price).toBe(2944.05);
      expect(deal.rasterFps1440p).toBe(70);
      expect(deal.rtFps1440p).toBe(37);
      expect(deal.tdpWatts).toBe(190);
    });
  });

  describe('User Example 4: KaBuM! Palit GeForce RTX 5060 8GB', () => {
    const rawKabum = `Placa de Video Palit GeForce RTX 5060 8GB INFINITY 2 OC GDDR7 128bits - NE75060V19P1-GB2063L
Vendido e entregue por:
KaBuM!
Sobre o produto
Resumo gerado por IA

Performance de Próxima Geração: Eleve seu setup com a arquitetura NVIDIA Blackwell!`;

    it('extracts RTX 5060, Palit, KaBuM, and detects missing price as warning', () => {
      const deals = parseGpuListings(rawKabum);
      expect(deals.length).toBe(1);

      const deal = deals[0];
      expect(deal.chip).toBe('RTX 5060');
      expect(deal.vendor).toBe('NVIDIA');
      expect(deal.brand).toBe('Palit');
      expect(deal.vramGb).toBe(8);
      expect(deal.store).toBe('KaBuM!');
      expect(deal.rasterFps1440p).toBe(82);
      expect(deal.validationWarnings).toContain(
        'Could not detect a valid price. Please enter price manually.',
      );
    });
  });

  describe('Batch Multi-Listing Paste', () => {
    it('splits and parses multiple listings pasted together', () => {
      const multiPaste = `Placa de Video PowerColor Radeon RX 9060 XT Reaper, 16GB, GDDR6, 128-bit, RX9060XT-16G-A-NAC de R$ 5.176,46 por:
à vista
R$ 3.899,99
no PIX com 15% desconto pichau

Placa de Vídeo Gamer Ninja NVIDIA GeForce GTX 1660 Super Ronin, 6GB, GDDR6, 192bit, GN-PV-NVGTX1660S6D6
Vendido por: TerabyteShop
R$ 1.389,99 à vista no pix`;

      const chunks = splitMultiListings(multiPaste);
      expect(chunks.length).toBe(2);

      const parsed = parseGpuListings(multiPaste);
      expect(parsed.length).toBe(2);
      expect(parsed[0].chip).toBe('RX 9060 XT');
      expect(parsed[0].store).toBe('Pichau');
      expect(parsed[1].chip).toBe('GTX 1660 Super');
      expect(parsed[1].store).toBe('TerabyteShop');
    });

    it('handles empty input gracefully', () => {
      expect(parseGpuListings('')).toEqual([]);
      expect(parseGpuListings('   \n  ')).toEqual([]);
    });
  });
});
