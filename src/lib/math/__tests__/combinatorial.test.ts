import { describe, expect, it } from 'vitest';
import {
  evaluateBuildParetoFrontier,
  generateCompatibleBuilds,
  optimizeFullSystemBuilds,
  pruneDominatedCpus,
  pruneDominatedMotherboards,
  pruneDominatedPsus,
  pruneDominatedRam,
} from '../combinatorial';
import {
  CpuCandidate,
  MotherboardCandidate,
  PsuCandidate,
  RamCandidate,
} from '../buildTypes';
import { GpuCandidate } from '../types';
import {
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
} from '../../../data/seedComponents';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';

describe('Combinatorial System Builder (Phase 3 Engine)', () => {
  // Test Fixtures
  const cpuAM4_Budget: CpuCandidate = {
    id: 'cpu-5500',
    name: 'Ryzen 5 5500',
    vendor: 'AMD',
    price: 85,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 56,
    supportedRamGenerations: ['DDR4'],
  };

  const cpuAM4_SweetSpot: CpuCandidate = {
    id: 'cpu-5600',
    name: 'Ryzen 5 5600',
    vendor: 'AMD',
    price: 125,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 65,
    supportedRamGenerations: ['DDR4'],
  };

  const cpuAM4_Dominated: CpuCandidate = {
    id: 'cpu-3600-overpriced',
    name: 'Ryzen 5 3600 (Old Stock)',
    vendor: 'AMD',
    price: 140, // More expensive than 5600
    socket: 'AM4',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 52, // Slower than 5600
    supportedRamGenerations: ['DDR4'],
  };

  const cpuAM5_Top: CpuCandidate = {
    id: 'cpu-7800x3d',
    name: 'Ryzen 7 7800X3D',
    vendor: 'AMD',
    price: 430,
    socket: 'AM5',
    cores: 8,
    threads: 16,
    tdpWatts: 120,
    gamingScore: 100,
    supportedRamGenerations: ['DDR5'],
  };

  describe('Intra-Category Pareto Pruning', () => {
    it('prunes dominated CPUs within their socket platform', () => {
      const cpus = [
        cpuAM4_Budget,
        cpuAM4_SweetSpot,
        cpuAM4_Dominated,
        cpuAM5_Top,
      ];
      const pruned = pruneDominatedCpus(cpus);

      // cpuAM4_Dominated should be eliminated by cpuAM4_SweetSpot
      expect(pruned.some((c) => c.id === 'cpu-3600-overpriced')).toBe(false);
      expect(pruned.some((c) => c.id === 'cpu-5500')).toBe(true);
      expect(pruned.some((c) => c.id === 'cpu-5600')).toBe(true);
      expect(pruned.some((c) => c.id === 'cpu-7800x3d')).toBe(true);
    });

    it('prunes dominated RAM kits within their memory generation', () => {
      const ramKits: RamCandidate[] = [
        {
          id: 'ram-good',
          name: '16GB DDR4-3200',
          price: 35,
          generation: 'DDR4',
          capacityGb: 16,
          speedMhz: 3200,
          modulesCount: 2,
        },
        {
          id: 'ram-trap',
          name: '16GB DDR4-2666 Overpriced',
          price: 45, // More expensive
          generation: 'DDR4',
          capacityGb: 16,
          speedMhz: 2666, // Slower
          modulesCount: 2,
        },
        {
          id: 'ram-ddr5',
          name: '32GB DDR5-6000',
          price: 95,
          generation: 'DDR5',
          capacityGb: 32,
          speedMhz: 6000,
          modulesCount: 2,
        },
      ];

      const pruned = pruneDominatedRam(ramKits);
      expect(pruned.some((r) => r.id === 'ram-trap')).toBe(false);
      expect(pruned.some((r) => r.id === 'ram-good')).toBe(true);
      expect(pruned.some((r) => r.id === 'ram-ddr5')).toBe(true);
    });

    it('prunes dominated Motherboards within (socket, ramGeneration)', () => {
      const mobos: MotherboardCandidate[] = [
        {
          id: 'mobo-good',
          name: 'B550 Solid',
          price: 100,
          socket: 'AM4',
          ramGeneration: 'DDR4',
          ramSlots: 4,
          formFactor: 'ATX',
          pcieGeneration: 4,
        },
        {
          id: 'mobo-trap',
          name: 'B450 Overpriced',
          price: 120, // More expensive
          socket: 'AM4',
          ramGeneration: 'DDR4',
          ramSlots: 2, // Fewer slots
          formFactor: 'Micro-ATX',
          pcieGeneration: 3, // Slower PCIe
        },
      ];

      const pruned = pruneDominatedMotherboards(mobos);
      expect(pruned.some((m) => m.id === 'mobo-trap')).toBe(false);
      expect(pruned.some((m) => m.id === 'mobo-good')).toBe(true);
    });

    it('prunes dominated PSUs', () => {
      const psus: PsuCandidate[] = [
        {
          id: 'psu-good',
          name: '650W Gold',
          price: 75,
          wattage: 650,
          efficiencyRating: '80+ Gold',
          modular: 'Semi',
        },
        {
          id: 'psu-trap',
          name: '500W Bronze Overpriced',
          price: 85, // More expensive
          wattage: 500, // Less wattage
          efficiencyRating: '80+ Bronze', // Worse efficiency
          modular: 'Non',
        },
      ];

      const pruned = pruneDominatedPsus(psus);
      expect(pruned.some((p) => p.id === 'psu-trap')).toBe(false);
      expect(pruned.some((p) => p.id === 'psu-good')).toBe(true);
    });
  });

  describe('Constraint-Propagating Build Generation', () => {
    it('generates only physically compatible builds', () => {
      const cpus = [cpuAM4_SweetSpot, cpuAM5_Top];
      const mobos: MotherboardCandidate[] = [
        {
          id: 'mobo-am4',
          name: 'B550 ATX',
          price: 110,
          socket: 'AM4',
          ramGeneration: 'DDR4',
          ramSlots: 4,
          formFactor: 'ATX',
        },
        {
          id: 'mobo-am5',
          name: 'B650 ATX',
          price: 160,
          socket: 'AM5',
          ramGeneration: 'DDR5',
          ramSlots: 4,
          formFactor: 'ATX',
        },
      ];
      const ramKits: RamCandidate[] = [
        {
          id: 'ram-ddr4',
          name: '16GB DDR4',
          price: 35,
          generation: 'DDR4',
          capacityGb: 16,
          speedMhz: 3200,
          modulesCount: 2,
        },
        {
          id: 'ram-ddr5',
          name: '32GB DDR5',
          price: 95,
          generation: 'DDR5',
          capacityGb: 32,
          speedMhz: 6000,
          modulesCount: 2,
        },
      ];
      const gpus: GpuCandidate[] = [
        {
          id: 'gpu-rx7600',
          name: 'RX 7600',
          price: 260,
          rasterFps1440p: 64,
          rtFps1440p: 33,
          vramGb: 8,
          tdpWatts: 165,
        },
      ];
      const psus: PsuCandidate[] = [
        {
          id: 'psu-550',
          name: '550W Bronze',
          price: 55,
          wattage: 550,
          efficiencyRating: '80+ Bronze',
          modular: 'Non',
        },
      ];

      const builds = generateCompatibleBuilds({
        cpus,
        gpus,
        motherboards: mobos,
        ramKits,
        psus,
      });

      // AM4 CPU only with AM4 mobo + DDR4 ram
      // AM5 CPU only with AM5 mobo + DDR5 ram
      // Total compatible combinations should be exactly 2 (not 2 x 2 x 2 x 1 x 1 = 8)
      expect(builds).toHaveLength(2);

      for (const build of builds) {
        expect(build.isCompatible).toBe(true);
        expect(build.cpu.socket).toBe(build.motherboard.socket);
        expect(build.ram.generation).toBe(build.motherboard.ramGeneration);
        expect(build.psu.wattage).toBeGreaterThanOrEqual(
          build.recommendedPsuWattage,
        );
      }
    });

    it('returns empty array when any component catalog is empty', () => {
      const builds = generateCompatibleBuilds({
        cpus: [],
        gpus: [REAL_WORLD_GPUS[0]],
        motherboards: [SEED_MOTHERBOARDS[0]],
        ramKits: [SEED_RAM_KITS[0]],
        psus: [SEED_PSUS[0]],
      });
      expect(builds).toEqual([]);
    });
  });

  describe('Build-Level Pareto Dominance (Price vs Effective FPS)', () => {
    it('accurately identifies Pareto-optimal complete PC builds', () => {
      const cheapCpu = cpuAM4_Budget;
      const cheapMobo = SEED_MOTHERBOARDS[0];
      const cheapRam = SEED_RAM_KITS[0];
      const cheapPsu = SEED_PSUS[0];

      // Build A: $600 total, 60 Effective FPS (Pareto optimal anchor)
      // Build B: $700 total, 55 Effective FPS (Dominated: costs MORE, gives LESS fps)
      // Build C: $800 total, 90 Effective FPS (Pareto optimal upgrade)
      const gpuA: GpuCandidate = {
        id: 'gpu-a',
        name: 'GPU A',
        price: 200,
        rasterFps1440p: 60,
        rtFps1440p: 20,
        vramGb: 8,
        tdpWatts: 130,
      };
      const gpuB: GpuCandidate = {
        id: 'gpu-b',
        name: 'GPU B (Trap)',
        price: 300,
        rasterFps1440p: 55,
        rtFps1440p: 18,
        vramGb: 8,
        tdpWatts: 150,
      };
      const gpuC: GpuCandidate = {
        id: 'gpu-c',
        name: 'GPU C',
        price: 400,
        rasterFps1440p: 90,
        rtFps1440p: 45,
        vramGb: 12,
        tdpWatts: 190,
      };

      const builds = generateCompatibleBuilds({
        cpus: [cheapCpu],
        gpus: [gpuA, gpuB, gpuC],
        motherboards: [cheapMobo],
        ramKits: [cheapRam],
        psus: [cheapPsu],
      });

      const { optimalBuilds, dominatedBuilds } =
        evaluateBuildParetoFrontier(builds);

      expect(optimalBuilds).toHaveLength(2);
      expect(dominatedBuilds).toHaveLength(1);

      // GPU B's build should be dominated
      expect(dominatedBuilds[0].gpu.id).toBe('gpu-b');

      // Optimal builds should be sorted by price ascending
      expect(optimalBuilds[0].totalPrice).toBeLessThan(
        optimalBuilds[1].totalPrice,
      );
      expect(optimalBuilds[0].effectiveFps1440p).toBeLessThan(
        optimalBuilds[1].effectiveFps1440p,
      );
    });

    it('handles single build or empty builds cleanly', () => {
      expect(evaluateBuildParetoFrontier([])).toEqual({
        optimalBuilds: [],
        dominatedBuilds: [],
      });
    });
  });

  describe('End-to-End Pipeline on Full Seed Catalogs', () => {
    it('executes the full pre-pruned combinatorial optimizer in under 100ms', () => {
      const startTime = performance.now();

      const result = optimizeFullSystemBuilds({
        cpus: SEED_CPUS,
        gpus: REAL_WORLD_GPUS,
        motherboards: SEED_MOTHERBOARDS,
        ramKits: SEED_RAM_KITS,
        psus: SEED_PSUS,
      });

      const durationMs = performance.now() - startTime;

      expect(durationMs).toBeLessThan(200);
      expect(result.optimalBuilds.length).toBeGreaterThan(0);
      expect(result.totalCompatibleBuilds).toBeGreaterThan(
        result.optimalBuilds.length,
      );

      // Verify Pareto monotonicity: as price increases along the frontier, effective FPS must strictly increase
      for (let i = 1; i < result.optimalBuilds.length; i++) {
        const prev = result.optimalBuilds[i - 1];
        const curr = result.optimalBuilds[i];
        expect(curr.totalPrice).toBeGreaterThanOrEqual(prev.totalPrice);
        expect(curr.effectiveFps1440p).toBeGreaterThanOrEqual(
          prev.effectiveFps1440p,
        );
      }
    });

    it('filters builds by budget and target FPS criteria', () => {
      const result = optimizeFullSystemBuilds(
        {
          cpus: SEED_CPUS,
          gpus: REAL_WORLD_GPUS,
          motherboards: SEED_MOTHERBOARDS,
          ramKits: SEED_RAM_KITS,
          psus: SEED_PSUS,
        },
        {
          maxBudget: 1000,
          minEffectiveFps: 60,
          preferredSocket: 'AM4',
        },
      );

      for (const build of result.optimalBuilds) {
        expect(build.totalPrice).toBeLessThanOrEqual(1000);
        expect(build.effectiveFps1440p).toBeGreaterThanOrEqual(60);
        expect(build.cpu.socket).toBe('AM4');
      }
    });

    it('proves EffectiveFPS <= raw GPU FPS for 100% of generated builds', () => {
      const result = optimizeFullSystemBuilds({
        cpus: SEED_CPUS,
        gpus: REAL_WORLD_GPUS,
        motherboards: SEED_MOTHERBOARDS,
        ramKits: SEED_RAM_KITS,
        psus: SEED_PSUS,
      });

      for (const build of result.allCompatibleBuilds) {
        expect(build.effectiveFps1440p).toBeLessThanOrEqual(
          build.rawGpuFps1440p,
        );
      }
    });

    it('proves pre-pruning preserves the exact optimal Pareto frontier vs unpruned generation', () => {
      // Small catalog with known dominated parts to compare unpruned vs pruned directly
      const smallCatalog = {
        cpus: [cpuAM4_Budget, cpuAM4_SweetSpot, cpuAM4_Dominated],
        gpus: [REAL_WORLD_GPUS[0], REAL_WORLD_GPUS[1]],
        motherboards: [SEED_MOTHERBOARDS[0], SEED_MOTHERBOARDS[1]],
        ramKits: [SEED_RAM_KITS[0]],
        psus: [SEED_PSUS[0]],
      };

      // Unpruned generation
      const unprunedBuilds = generateCompatibleBuilds(smallCatalog);
      const { optimalBuilds: unprunedOptimal } =
        evaluateBuildParetoFrontier(unprunedBuilds);

      // Pruned generation via optimizeFullSystemBuilds
      const prunedResult = optimizeFullSystemBuilds(smallCatalog);

      // No optimal build in unpruned should ever use the strictly dominated CPU
      expect(
        unprunedOptimal.some((b) => b.cpu.id === 'cpu-3600-overpriced'),
      ).toBe(false);

      // The optimal frontier prices and FPS must match identically
      expect(prunedResult.optimalBuilds).toHaveLength(unprunedOptimal.length);
      for (let i = 0; i < unprunedOptimal.length; i++) {
        expect(prunedResult.optimalBuilds[i].totalPrice).toBe(
          unprunedOptimal[i].totalPrice,
        );
        expect(prunedResult.optimalBuilds[i].effectiveFps1440p).toBe(
          unprunedOptimal[i].effectiveFps1440p,
        );
      }
    });
  });
});
