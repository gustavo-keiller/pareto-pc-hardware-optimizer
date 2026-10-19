import { describe, expect, it } from 'vitest';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../../../data/seedComponents';
import { ComponentCatalogs } from '../combinatorial';
import { CaseCandidate } from '../buildTypes';
import {
  optimizeUpgradePaths,
  OwnedHardwareProfile,
} from '../upgradeOptimizer';

describe('Upgrade Optimizer Engine (BLD-06)', () => {
  const testCatalogs: ComponentCatalogs = {
    cpus: SEED_CPUS,
    gpus: REAL_WORLD_GPUS,
    motherboards: SEED_MOTHERBOARDS,
    ramKits: SEED_RAM_KITS,
    psus: SEED_PSUS,
    storages: SEED_STORAGES,
    cases: SEED_CASES,
    coolers: SEED_COOLERS,
  };

  const am4Mobo = SEED_MOTHERBOARDS.find((m) => m.socket === 'AM4')!;
  const ddr4Ram = SEED_RAM_KITS.find((r) => r.generation === 'DDR4')!;
  const ryzen5500 = SEED_CPUS.find((c) => c.id === 'cpu-ryzen-5500')!;
  const psu550w = SEED_PSUS.find((p) => p.wattage === 550)!;
  const rx6600 = REAL_WORLD_GPUS.find((g) => g.id === 'rx-6600')!;
  const standardCase = SEED_CASES[0];
  const standardCooler = SEED_COOLERS.find((c) =>
    c.supportedSockets.includes('AM4'),
  )!;
  const standardStorage = SEED_STORAGES[0];

  it('calculates zero upgrade cost when all parts are retained', () => {
    const owned: OwnedHardwareProfile = {
      cpu: ryzen5500,
      gpu: rx6600,
      motherboard: am4Mobo,
      ram: ddr4Ram,
      psu: psu550w,
      storage: standardStorage,
      pcCase: standardCase,
      cooler: standardCooler,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 0,
    });

    expect(result.optimalUpgrades.length).toBeGreaterThan(0);
    const retainedBuild = result.optimalUpgrades[0];
    expect(retainedBuild.upgradeCost).toBe(0);
    expect(retainedBuild.upgradedPartCategories).toHaveLength(0);
    expect(retainedBuild.retainedPartCategories).toHaveLength(8);
  });

  it('subtracts owned parts from upgrade cost when upgrading a single component (GPU)', () => {
    const owned: OwnedHardwareProfile = {
      cpu: ryzen5500,
      motherboard: am4Mobo,
      ram: ddr4Ram,
      psu: psu550w,
      storage: standardStorage,
      pcCase: standardCase,
      cooler: standardCooler,
      gpu: rx6600,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 350,
      workloadProfile: 'sweetspot-1440p',
    });

    expect(result.optimalUpgrades.length).toBeGreaterThan(0);
    for (const upgrade of result.optimalUpgrades) {
      expect(upgrade.upgradeCost).toBeLessThanOrEqual(350);
      // Retained parts must include motherboard, ram, etc.
      expect(upgrade.retainedPartCategories).toContain('motherboard');
      expect(upgrade.retainedPartCategories).toContain('ram');
      expect(upgrade.build.motherboard.id).toBe(am4Mobo.id);
      expect(upgrade.build.ram.id).toBe(ddr4Ram.id);
    }
  });

  it('strictly preserves motherboard socket when motherboard is owned', () => {
    const owned: OwnedHardwareProfile = {
      motherboard: am4Mobo,
      ram: ddr4Ram,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 600,
    });

    expect(result.optimalUpgrades.length).toBeGreaterThan(0);
    for (const upgrade of result.optimalUpgrades) {
      expect(upgrade.build.motherboard.socket).toBe('AM4');
      expect(upgrade.build.cpu.socket).toBe('AM4');
      expect(upgrade.build.ram.generation).toBe('DDR4');
    }
  });

  it('enforces owned PSU wattage limit on candidate GPU upgrades', () => {
    const owned: OwnedHardwareProfile = {
      cpu: ryzen5500,
      motherboard: am4Mobo,
      ram: ddr4Ram,
      psu: psu550w, // 550W PSU limit
      storage: standardStorage,
      pcCase: standardCase,
      cooler: standardCooler,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 1200,
    });

    for (const upgrade of result.optimalUpgrades) {
      if (upgrade.retainedPartCategories.includes('psu')) {
        // Retained 550W PSU must be sufficient for recommended wattage
        expect(upgrade.build.psu.wattage).toBe(550);
        expect(upgrade.build.powerHeadroomWatts).toBeGreaterThanOrEqual(0);
        expect(upgrade.build.isCompatible).toBe(true);
      }
    }
  });

  it('computes positive performance delta against user baseline setup', () => {
    const owned: OwnedHardwareProfile = {
      cpu: ryzen5500,
      gpu: rx6600,
      motherboard: am4Mobo,
      ram: ddr4Ram,
      psu: psu550w,
      storage: standardStorage,
      pcCase: standardCase,
      cooler: standardCooler,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 400,
      workloadProfile: 'sweetspot-1440p',
    });

    expect(result.baselineScore).toBeDefined();
    expect(result.baselineScore).toBeGreaterThan(0);

    const betterUpgrades = result.optimalUpgrades.filter(
      (u) => u.upgradeCost > 0,
    );
    if (betterUpgrades.length > 0) {
      const best = betterUpgrades[betterUpgrades.length - 1];
      expect(best.scoreGain).toBeGreaterThan(0);
      expect(best.percentGain).toBeGreaterThan(0);
    }
  });

  it('guarantees Pareto optimality across upgrade cost and workload performance', () => {
    const owned: OwnedHardwareProfile = {
      motherboard: am4Mobo,
      ram: ddr4Ram,
      psu: psu550w,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 800,
    });

    const { optimalUpgrades } = result;
    for (let i = 0; i < optimalUpgrades.length - 1; i++) {
      const current = optimalUpgrades[i];
      const next = optimalUpgrades[i + 1];

      // Next upgrade should cost more and deliver higher or equal performance
      expect(next.upgradeCost).toBeGreaterThanOrEqual(current.upgradeCost);
      const currentScore =
        current.build.workloadScore ?? current.build.effectiveFps1440p;
      const nextScore =
        next.build.workloadScore ?? next.build.effectiveFps1440p;
      expect(nextScore).toBeGreaterThanOrEqual(currentScore);
    }
  });

  it('handles empty catalogs and missing components cleanly without throwing', () => {
    const emptyCatalogs: ComponentCatalogs = {
      cpus: [],
      gpus: [],
      motherboards: [],
      ramKits: [],
      psus: [],
    };

    const result = optimizeUpgradePaths(emptyCatalogs, {});
    expect(result.optimalUpgrades).toEqual([]);
    expect(result.totalCompatibleUpgrades).toBe(0);
  });

  it('strictly rejects GPUs exceeding retained compact case clearance', () => {
    const compactCase: CaseCandidate = {
      id: 'case-sff-compact',
      name: 'Ultra Compact Case',
      price: 60,
      supportedFormFactors: ['Micro-ATX', 'Mini-ITX'],
      maxGpuLengthMm: 270, // Standard dual-fan fits, triple-fan 300mm+ rejected
      maxCpuCoolerHeightMm: 155,
      notes: 'SFF compact case with 270mm GPU limit',
    };

    const longGpu: (typeof REAL_WORLD_GPUS)[number] = {
      ...REAL_WORLD_GPUS[0],
      id: 'gpu-oversized-triple-fan',
      name: 'Oversized Triple Fan GPU',
      lengthMm: 330,
      rasterFps1440p: 120,
    };

    const catalogsWithLongGpu: ComponentCatalogs = {
      ...testCatalogs,
      gpus: [...testCatalogs.gpus, longGpu],
    };

    const owned: OwnedHardwareProfile = {
      motherboard: am4Mobo,
      ram: ddr4Ram,
      pcCase: compactCase,
    };

    const result = optimizeUpgradePaths(catalogsWithLongGpu, owned, {
      maxUpgradeBudget: 900,
    });

    expect(result.optimalUpgrades.length).toBeGreaterThan(0);
    for (const upgrade of result.optimalUpgrades) {
      if (upgrade.retainedPartCategories.includes('pcCase')) {
        const gpuLength = upgrade.build.gpu.lengthMm ?? 260;
        expect(gpuLength).toBeLessThanOrEqual(270);
        expect(upgrade.build.gpu.id).not.toBe('gpu-oversized-triple-fan');
      }
    }
  });

  it('preserves Intel LGA1700 platform when LGA1700 motherboard is owned', () => {
    const lga1700Mobo = SEED_MOTHERBOARDS.find((m) => m.socket === 'LGA1700')!;
    const lga1700Ram = SEED_RAM_KITS.find(
      (r) => r.generation === lga1700Mobo.ramGeneration,
    )!;

    const owned: OwnedHardwareProfile = {
      motherboard: lga1700Mobo,
      ram: lga1700Ram,
    };

    const result = optimizeUpgradePaths(testCatalogs, owned, {
      maxUpgradeBudget: 600,
    });

    expect(result.optimalUpgrades.length).toBeGreaterThan(0);
    for (const upgrade of result.optimalUpgrades) {
      expect(upgrade.build.motherboard.socket).toBe('LGA1700');
      expect(upgrade.build.cpu.socket).toBe('LGA1700');
    }
  });
});
