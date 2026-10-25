import { describe, expect, it } from 'vitest';
import { REAL_WORLD_GPUS } from '../realGpus';
import {
  SEED_CASES,
  SEED_COMPONENTS,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../seedComponents';

describe('DATA-01 & DATA-03: Versioned JSON Catalogs & Hardware Coverage', () => {
  it('loads all hardware categories from versioned JSON with expected catalog counts', () => {
    expect(SEED_CPUS.length).toBe(24);
    expect(SEED_MOTHERBOARDS.length).toBe(16);
    expect(SEED_RAM_KITS.length).toBe(11);
    expect(SEED_STORAGES.length).toBe(8);
    expect(SEED_COOLERS.length).toBe(10);
    expect(SEED_CASES.length).toBe(9);
    expect(SEED_PSUS.length).toBe(10);
    expect(REAL_WORLD_GPUS.length).toBe(36);

    expect(SEED_COMPONENTS.cpus).toBe(SEED_CPUS);
    expect(SEED_COMPONENTS.motherboards).toBe(SEED_MOTHERBOARDS);
  });

  it('guarantees comprehensive market coverage across CPU sockets and GPU families [DATA-03]', () => {
    // CPUs cover AM4, AM5, LGA1700, and LGA1851
    const sockets = new Set(SEED_CPUS.map((c) => c.socket));
    expect(sockets.has('AM4')).toBe(true);
    expect(sockets.has('AM5')).toBe(true);
    expect(sockets.has('LGA1700')).toBe(true);
    expect(sockets.has('LGA1851')).toBe(true);

    // GPUs cover NVIDIA, AMD, and Intel
    const vendors = new Set(REAL_WORLD_GPUS.map((g) => g.vendor));
    expect(vendors.has('NVIDIA')).toBe(true);
    expect(vendors.has('AMD')).toBe(true);
    expect(vendors.has('Intel')).toBe(true);

    // GPU coverage spans entry (<$200) to enthusiast halo (RTX 5090 / RTX 4090)
    const gpuPrices = REAL_WORLD_GPUS.map((g) => g.price);
    expect(Math.min(...gpuPrices)).toBeLessThanOrEqual(200);
    expect(Math.max(...gpuPrices)).toBeGreaterThanOrEqual(1999);
  });

  it('guarantees unique IDs across every component catalog', () => {
    const allCatalogs = [
      { name: 'CPUs', items: SEED_CPUS },
      { name: 'Motherboards', items: SEED_MOTHERBOARDS },
      { name: 'RAM', items: SEED_RAM_KITS },
      { name: 'Storage', items: SEED_STORAGES },
      { name: 'Coolers', items: SEED_COOLERS },
      { name: 'Cases', items: SEED_CASES },
      { name: 'PSUs', items: SEED_PSUS },
      { name: 'GPUs', items: REAL_WORLD_GPUS },
    ];

    for (const cat of allCatalogs) {
      const ids = new Set<string>();
      for (const item of cat.items) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
        expect(item.id).toMatch(/^[a-z0-9-]+$/);
      }
      expect(ids.size).toBe(cat.items.length);
    }
  });

  it('guarantees every component has valid source citation and checkedAt audit date', () => {
    const allItems = [
      ...SEED_CPUS,
      ...SEED_MOTHERBOARDS,
      ...SEED_RAM_KITS,
      ...SEED_STORAGES,
      ...SEED_COOLERS,
      ...SEED_CASES,
      ...SEED_PSUS,
      ...REAL_WORLD_GPUS,
    ];

    expect(allItems.length).toBe(124);

    for (const item of allItems) {
      expect(typeof item.source).toBe('string');
      expect(item.source?.trim().length).toBeGreaterThan(5);

      expect(typeof item.checkedAt).toBe('string');
      expect(item.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      expect(typeof item.price).toBe('number');
      expect(item.price).toBeGreaterThan(0);
      expect(Number.isFinite(item.price)).toBe(true);
    }
  });

  it('guarantees cross-catalog referential integrity (sockets, RAM generations, form factors)', () => {
    const cpuSockets = new Set(SEED_CPUS.map((c) => c.socket));
    const moboSockets = new Set(SEED_MOTHERBOARDS.map((m) => m.socket));
    const coolerSockets = new Set(
      SEED_COOLERS.flatMap((c) => c.supportedSockets),
    );

    // Every CPU socket must have a matching motherboard and cooler
    for (const socket of cpuSockets) {
      expect(moboSockets.has(socket)).toBe(true);
      expect(coolerSockets.has(socket)).toBe(true);
    }

    // Every motherboard RAM generation must exist in RAM catalog
    const ramGens = new Set(SEED_RAM_KITS.map((r) => r.generation));
    for (const mobo of SEED_MOTHERBOARDS) {
      expect(ramGens.has(mobo.ramGeneration)).toBe(true);
    }

    // Every motherboard form factor must be supported by at least one case
    const caseFormFactors = new Set(
      SEED_CASES.flatMap((cs) => cs.supportedFormFactors),
    );
    for (const mobo of SEED_MOTHERBOARDS) {
      expect(caseFormFactors.has(mobo.formFactor)).toBe(true);
    }
  });

  it('loads public creator benchmark datasets and computes harmonized indexes (DATA-02)', async () => {
    const {
      CPU_BENCHMARK_RUNS,
      GPU_BENCHMARK_RUNS,
      HARMONIZED_CPU_SCORES,
      HARMONIZED_GPU_SCORES,
      getBenchmarkProvenance,
    } = await import('../benchmarks');

    expect(GPU_BENCHMARK_RUNS.length).toBeGreaterThanOrEqual(3);
    expect(CPU_BENCHMARK_RUNS.length).toBeGreaterThanOrEqual(2);

    // Harmonized score computed for key cards
    expect(HARMONIZED_GPU_SCORES['rtx-4070'].harmonizedIndex).toBeCloseTo(
      100,
      1,
    );
    expect(HARMONIZED_GPU_SCORES['rtx-4090'].harmonizedIndex).toBeGreaterThan(
      180,
    );
    expect(HARMONIZED_GPU_SCORES['rx-6600'].harmonizedIndex).toBeLessThan(50);

    // Harmonized score computed for key CPUs
    expect(
      HARMONIZED_CPU_SCORES['cpu-ryzen-7800x3d'].harmonizedIndex,
    ).toBeCloseTo(100, 1);
    expect(
      HARMONIZED_CPU_SCORES['cpu-i7-14700k'].harmonizedIndex,
    ).toBeGreaterThan(90);

    // Provenance citation returns reviewers list
    const provGpu = getBenchmarkProvenance('rtx-4070');
    expect(provGpu).toContain('TechPowerUp');
    expect(provGpu).toContain('Hardware Unboxed');

    const provCpu = getBenchmarkProvenance('cpu-ryzen-7800x3d');
    expect(provCpu).toContain('Hardware Unboxed');
    expect(provCpu).toContain('TechPowerUp');
  });

  it('provides store price offers and historical price trends for USD and BRL (DATA-01 & DATA-02)', async () => {
    const { getRegionalStorePrices, getPriceHistory } =
      await import('../storePrices');

    const brlPrices = getRegionalStorePrices('BRL');
    const usdPrices = getRegionalStorePrices('USD');

    // Store price files are written by `npm run prices:update` and may be
    // empty; every entry they hold must be usable.
    for (const offer of [...brlPrices, ...usdPrices]) {
      expect(offer.componentId).toBeTruthy();
      expect(offer.store).toBeTruthy();
      expect(offer.price).toBeGreaterThan(0);
      expect(offer.url).toMatch(/^https?:\/\//);
      expect(offer.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Verify price history lookup
    const rtx4060BrlHistory = getPriceHistory('rtx-4060', 'BRL');
    expect(rtx4060BrlHistory.length).toBeGreaterThan(0);
    expect(rtx4060BrlHistory[0].date).toBeDefined();
    expect(rtx4060BrlHistory[0].price).toBeGreaterThan(0);

    const nonExistentHistory = getPriceHistory('non-existent-sku', 'BRL');
    expect(nonExistentHistory).toEqual([]);
  });
});
