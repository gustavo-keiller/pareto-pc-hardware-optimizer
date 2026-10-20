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

describe('DATA-01: Versioned JSON Catalogs & Schema Integrity', () => {
  it('loads all hardware categories from versioned JSON with expected catalog counts', () => {
    expect(SEED_CPUS.length).toBe(12);
    expect(SEED_MOTHERBOARDS.length).toBe(13);
    expect(SEED_RAM_KITS.length).toBe(9);
    expect(SEED_STORAGES.length).toBe(3);
    expect(SEED_COOLERS.length).toBe(5);
    expect(SEED_CASES.length).toBe(5);
    expect(SEED_PSUS.length).toBe(7);
    expect(REAL_WORLD_GPUS.length).toBe(18);

    expect(SEED_COMPONENTS.cpus).toBe(SEED_CPUS);
    expect(SEED_COMPONENTS.motherboards).toBe(SEED_MOTHERBOARDS);
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

    expect(allItems.length).toBe(72);

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
});
