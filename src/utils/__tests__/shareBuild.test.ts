import { describe, expect, it } from 'vitest';
import {
  decodeBuildShareUrl,
  decodeGpuShareUrl,
  encodeBuildShareUrl,
  encodeGpuShareUrl,
  formatBuildShareText,
  BuildShareParams,
  GpuShareParams,
} from '../shareBuild';
import { assemblePcBuild } from '../../lib/math/buildTypes';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../../data/seedComponents';
import { REAL_WORLD_GPUS } from '../../data/realGpus';

describe('Save & Share Builds Engine (BLD-07)', () => {
  const cpu = SEED_CPUS.find((c) => c.id === 'cpu-ryzen-5600')!;
  const gpu = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4070-super')!;
  const mobo = SEED_MOTHERBOARDS.find((m) => m.id === 'mobo-msi-b550-a-pro')!;
  const ram = SEED_RAM_KITS.find((r) => r.id === 'ram-corsair-32gb-d4-3600')!;
  const psu = SEED_PSUS.find((p) => p.id === 'psu-corsair-rm750e')!;
  const storage = SEED_STORAGES.find((s) => s.id === 'storage-wd-sn770-1tb')!;
  const pcCase = SEED_CASES.find((c) => c.id === 'case-deepcool-cc560')!;
  const cooler = SEED_COOLERS.find(
    (c) => c.id === 'cooler-thermalright-assassin-x',
  )!;

  const testBuild = assemblePcBuild(
    cpu,
    gpu,
    ram,
    mobo,
    psu,
    storage,
    pcCase,
    cooler,
    0.5,
    'sweetspot-1440p',
  );

  describe('encodeBuildShareUrl & decodeBuildShareUrl', () => {
    it('encodes and decodes full build parameters faithfully', () => {
      const params: BuildShareParams = {
        cpuId: cpu.id,
        gpuId: gpu.id,
        moboId: mobo.id,
        ramId: ram.id,
        psuId: psu.id,
        storageId: storage.id,
        caseId: pcCase.id,
        coolerId: cooler.id,
        budget: 6500,
        workload: 'sweetspot-1440p',
        currency: 'BRL',
      };

      const url = encodeBuildShareUrl(params, 'https://paretopc.com');
      expect(url).toContain('https://paretopc.com/?mode=builds');
      expect(url).toContain(`cpu=${cpu.id}`);
      expect(url).toContain(`gpu=${gpu.id}`);
      expect(url).toContain('budget=6500');
      expect(url).toContain('curr=BRL');
      expect(url).toContain('workload=sweetspot-1440p');

      const decoded = decodeBuildShareUrl(new URL(url).search);
      expect(decoded).not.toBeNull();
      expect(decoded?.cpuId).toBe(cpu.id);
      expect(decoded?.gpuId).toBe(gpu.id);
      expect(decoded?.moboId).toBe(mobo.id);
      expect(decoded?.ramId).toBe(ram.id);
      expect(decoded?.psuId).toBe(psu.id);
      expect(decoded?.storageId).toBe(storage.id);
      expect(decoded?.caseId).toBe(pcCase.id);
      expect(decoded?.coolerId).toBe(cooler.id);
      expect(decoded?.budget).toBe(6500);
      expect(decoded?.currency).toBe('BRL');
      expect(decoded?.workload).toBe('sweetspot-1440p');
    });

    it('returns null or empty object when query string is empty or invalid', () => {
      expect(decodeBuildShareUrl('')).toBeNull();
      expect(decodeBuildShareUrl('?foo=bar')).toBeNull();
    });

    it('safely falls back on malformed currency or workload values', () => {
      const decoded = decodeBuildShareUrl(
        '?mode=builds&cpu=cpu-1&curr=INVALID&workload=UNRECOGNIZED',
      );
      expect(decoded).not.toBeNull();
      expect(decoded?.cpuId).toBe('cpu-1');
      expect(decoded?.currency).toBeUndefined();
      expect(decoded?.workload).toBeUndefined();
    });

    it('encodes and decodes enthusiast constraint options [BLD-08]', () => {
      const url = encodeBuildShareUrl({
        cpuVendor: 'AMD',
        formFactor: 'SFF',
        coolerType: 'AIO',
        aesthetic: 'RGB',
      });
      const decoded = decodeBuildShareUrl(url);
      expect(decoded).not.toBeNull();
      expect(decoded?.cpuVendor).toBe('AMD');
      expect(decoded?.formFactor).toBe('SFF');
      expect(decoded?.coolerType).toBe('AIO');
      expect(decoded?.aesthetic).toBe('RGB');
    });
  });

  describe('formatBuildShareText', () => {
    it('formats a complete 8-component parts list for clipboard sharing in pt-BR', () => {
      const shareUrl = 'https://paretopc.com/?mode=builds&cpu=cpu-ryzen-5600';
      const text = formatBuildShareText(testBuild, shareUrl, 'BRL', 'pt-BR');

      expect(text).toContain('ParetoPC');
      expect(text).toContain('R$');
      expect(text).toContain(cpu.name);
      expect(text).toContain(gpu.name);
      expect(text).toContain(mobo.name);
      expect(text).toContain(ram.name);
      expect(text).toContain(storage.name);
      expect(text).toContain(pcCase.name);
      expect(text).toContain(cooler.name);
      expect(text).toContain(psu.name);
      expect(text).toContain(shareUrl);
      expect(text).toContain('FPS');
    });

    it('formats a complete 8-component parts list in en-US', () => {
      const shareUrl = 'https://paretopc.com/?mode=builds';
      const text = formatBuildShareText(testBuild, shareUrl, 'USD', 'en-US');

      expect(text).toContain('ParetoPC Build Recommendation');
      expect(text).toContain('$');
      expect(text).toContain(cpu.name);
      expect(text).toContain(gpu.name);
      expect(text).toContain('Total Hardware Cost:');
      expect(text).toContain(shareUrl);
    });
  });

  describe('encodeGpuShareUrl & decodeGpuShareUrl & creator attribution', () => {
    it('round-trips GPU ID, budget, currency, TOPSIS weights, and creator ref', () => {
      const params: GpuShareParams = {
        gpuId: 'arc-b580',
        budget: 2500,
        currency: 'BRL',
        mode: 'simple',
        weights: {
          price: 30,
          rasterFps1440p: 40,
          rtFps1440p: 5,
          vramGb: 25,
          tdpWatts: 0,
        },
        ref: '@GuigaGames',
        amz: 'guiga-20',
        storeUrl: 'https://www.amazon.com.br/dp/B0EXAMPLE',
      };

      const url = encodeGpuShareUrl(params, 'https://paretopc.com');
      expect(url).toContain('mode=simple');
      expect(url).toContain('gpu=arc-b580');
      expect(url).toContain('w=30-40-5-25-0');
      expect(url).toContain('ref=%40GuigaGames');

      // Should not be misparsed as a full build URL
      expect(decodeBuildShareUrl(url)).toBeNull();

      const decoded = decodeGpuShareUrl(url);
      expect(decoded).not.toBeNull();
      expect(decoded?.gpuId).toBe('arc-b580');
      expect(decoded?.budget).toBe(2500);
      expect(decoded?.currency).toBe('BRL');
      expect(decoded?.mode).toBe('simple');
      expect(decoded?.weights).toEqual(params.weights);
      expect(decoded?.ref).toBe('@GuigaGames');
      expect(decoded?.amz).toBe('guiga-20');
      expect(decoded?.storeUrl).toBe('https://www.amazon.com.br/dp/B0EXAMPLE');
    });

    it('sanitizes unsafe store URLs and returns null on empty/unrelated queries', () => {
      const url = encodeGpuShareUrl(
        {
          gpuId: 'rx-7600',
          storeUrl: 'javascript:alert(1)',
        },
        'https://paretopc.com',
      );
      expect(url).not.toContain('javascript:');
      expect(decodeGpuShareUrl('?foo=bar')).toBeNull();
      expect(decodeGpuShareUrl('?mode=builds&cpu=cpu-1')).toBeNull();
    });

    it('preserves creator attribution params on Build share URLs', () => {
      const url = encodeBuildShareUrl(
        {
          cpuId: cpu.id,
          gpuId: gpu.id,
          ref: 'OfertasPC',
          amz: 'ofertas-20',
        },
        'https://paretopc.com',
      );
      const decoded = decodeBuildShareUrl(url);
      expect(decoded?.ref).toBe('OfertasPC');
      expect(decoded?.amz).toBe('ofertas-20');
    });
  });
});
