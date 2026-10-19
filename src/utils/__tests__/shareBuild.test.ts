import { describe, expect, it } from 'vitest';
import {
  decodeBuildShareUrl,
  encodeBuildShareUrl,
  formatBuildShareText,
  BuildShareParams,
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
});
