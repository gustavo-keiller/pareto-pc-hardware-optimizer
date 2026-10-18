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

    it('splits and parses multiple markdown links pasted together (Pichau batch)', () => {
      const userMarkdownBatch = `[Placa de Video PowerColor Radeon RX 9060 XT Reaper, 16GB, GDDR6, 128-bit, RX9060XT-16G-A-NACde R$ 5.176,46 porR$ 3.899,99À vista15% de desconto no PIXR$ 4.588,22Em até 12x de R$ 382,35 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-powercolor-radeon-rx-9060-xt-reaper-16gb-gddr6-128-bit-rx9060xt-16g-a-nac)
[Frete Grátis: Sul e SudestePlaca de Video Leadertech Radeon RX 550, 4GB, GDDR5, 128-bit, PV-LT-RX550-4G-D5de R$ 894,11 porR$ 639,99À vista15% de desconto no PIXR$ 752,93Em até 12x de R$ 62,74 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-leadertech-radeon-rx-550-4gb-gddr5-128-bit-pv-lt-rx550-4g-d5)
[Placa de Video XFX Swift Radeon RX 9050 Black, 8GB, GDDR6, 128-bit, RX-95SWFT8BEde R$ 3.529,40 porR$ 2.099,99À vista15% de desconto no PIXR$ 2.470,58Em até 12x de R$ 205,88 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-xfx-swift-radeon-rx-9050-black-8gb-gddr6-128-bit-rx-95swft8be)
[22%OFF30 UNIDFrete Grátis: Sul e SudestePlaca de Video Gigabyte Radeon RX 9050 Gaming OC, 8GB, GDDR6, 128-bit, GV-R9050GAMING-OC-8GDde R$ 3.176,46 porR$ 2.099,99À vista15% de desconto no PIXR$ 2.470,58Em até 12x de R$ 205,88 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-gigabyte-radeon-rx-9050-gaming-oc-8gb-gddr6-128-bit-gv-r9050gaming-oc-8gd)
[Frete Grátis: Sul e SudestePlaca de Video PowerColor Radeon RX 6500 XT Fighter, 4GB, GDDR6, 64-bit, AXRX-6500XT-4GBD6-DHV3-NACde R$ 1.764,69 porR$ 1.099,99À vista15% de desconto no PIXR$ 1.294,11Em até 12x de R$ 107,84 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-powercolor-radeon-rx-6500-xt-fighter-4gb-gddr6-64-bit-axrx-6500xt-4gbd6-dhv3-nac)
[Frete Grátis: Sul e SudestePlaca de Video PowerColor Radeon RX 9070 GRE Reaper, 12GB, GDDR6, 192-bit, RX9070GRE-12G-Ade R$ 5.411,75 porR$ 4.099,99À vista15% de desconto no PIXR$ 4.823,52Em até 12x de R$ 401,96 Sem juros no cartão](https://www.pichau.com.br/placa-de-video-powercolor-radeon-rx-9070-gre-reaper-12gb-gddr6-192-bit-rx9070gre-12g-a)`;

      const chunks = splitMultiListings(userMarkdownBatch);
      expect(chunks.length).toBe(6);

      const parsed = parseGpuListings(userMarkdownBatch);
      expect(parsed.length).toBe(6);

      // 1. RX 9060 XT
      expect(parsed[0].chip).toBe('RX 9060 XT');
      expect(parsed[0].brand).toBe('PowerColor');
      expect(parsed[0].vramGb).toBe(16);
      expect(parsed[0].priceCash).toBe(3899.99);
      expect(parsed[0].priceInstallment).toBe(4588.22);
      expect(parsed[0].originalPrice).toBe(5176.46);
      expect(parsed[0].price).toBe(3899.99);
      expect(parsed[0].store).toBe('Pichau');
      expect(parsed[0].url).toContain('rx9060xt-16g-a-nac');

      // 2. RX 550
      expect(parsed[1].chip).toBe('RX 550');
      expect(parsed[1].brand).toBe('Leadertech');
      expect(parsed[1].vramGb).toBe(4);
      expect(parsed[1].priceCash).toBe(639.99);
      expect(parsed[1].priceInstallment).toBe(752.93);
      expect(parsed[1].originalPrice).toBe(894.11);
      expect(parsed[1].store).toBe('Pichau');

      // 3. RX 9050 (XFX)
      expect(parsed[2].chip).toBe('RX 9050');
      expect(parsed[2].brand).toBe('XFX');
      expect(parsed[2].vramGb).toBe(8);
      expect(parsed[2].priceCash).toBe(2099.99);
      expect(parsed[2].priceInstallment).toBe(2470.58);
      expect(parsed[2].originalPrice).toBe(3529.4);
      expect(parsed[2].store).toBe('Pichau');

      // 4. RX 9050 (Gigabyte)
      expect(parsed[3].chip).toBe('RX 9050');
      expect(parsed[3].brand).toBe('Gigabyte');
      expect(parsed[3].vramGb).toBe(8);
      expect(parsed[3].priceCash).toBe(2099.99);
      expect(parsed[3].priceInstallment).toBe(2470.58);
      expect(parsed[3].originalPrice).toBe(3176.46);
      expect(parsed[3].store).toBe('Pichau');

      // 5. RX 6500 XT
      expect(parsed[4].chip).toBe('RX 6500 XT');
      expect(parsed[4].brand).toBe('PowerColor');
      expect(parsed[4].vramGb).toBe(4);
      expect(parsed[4].priceCash).toBe(1099.99);
      expect(parsed[4].priceInstallment).toBe(1294.11);
      expect(parsed[4].originalPrice).toBe(1764.69);
      expect(parsed[4].store).toBe('Pichau');

      // 6. RX 9070 GRE
      expect(parsed[5].chip).toBe('RX 9070 GRE');
      expect(parsed[5].brand).toBe('PowerColor');
      expect(parsed[5].vramGb).toBe(12);
      expect(parsed[5].priceCash).toBe(4099.99);
      expect(parsed[5].priceInstallment).toBe(4823.52);
      expect(parsed[5].originalPrice).toBe(5411.75);
      expect(parsed[5].store).toBe('Pichau');
    });
  });
});
