import { describe, expect, it } from 'vitest';
import {
  assemblePcBuild,
  BuildWorkloadProfile,
  evaluateBuildForWorkload,
} from '../buildTypes';
import { optimizeFullSystemBuilds } from '../combinatorial';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../../../data/seedComponents';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';

describe('Workload Performance Models (BLD-03)', () => {
  const cpuBudget = SEED_CPUS.find((c) => c.id === 'cpu-ryzen-5600')!; // Ryzen 5 5600, score 65
  const cpuFlagship = SEED_CPUS.find((c) => c.id === 'cpu-ryzen-7800x3d')!; // 7800X3D, score 100
  const moboAM4 = SEED_MOTHERBOARDS.find((m) => m.socket === 'AM4')!;
  const gpuMid = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4060')!; // 8GB
  const gpuHighVram = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4070-super')!; // 12GB
  const gpuFlagship = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4080-super')!; // 16GB
  const ram16Gb = SEED_RAM_KITS.find(
    (r) => r.capacityGb === 16 && r.generation === 'DDR4',
  )!;
  const ram32Gb = SEED_RAM_KITS.find(
    (r) => r.capacityGb === 32 && r.generation === 'DDR4',
  )!;
  const storageFast = SEED_STORAGES.find(
    (s) => (s.readSpeedMbps ?? 0) >= 5000,
  )!;

  describe('Mathematical invariants', () => {
    const profiles: BuildWorkloadProfile[] = [
      'esports-1080p',
      'sweetspot-1440p',
      'enthusiast-4k',
      'creator-ai',
    ];

    it('guarantees workloadScore > 0, bottleneckFactor in [0, 1] across all 4 profiles', () => {
      for (const profile of profiles) {
        const result = evaluateBuildForWorkload(
          {
            cpu: cpuBudget,
            gpu: gpuMid,
            ram: ram16Gb,
            storage: storageFast,
          },
          profile,
        );

        expect(result.workloadScore).toBeGreaterThan(0);
        expect(result.bottleneckFactor).toBeGreaterThanOrEqual(0);
        expect(result.bottleneckFactor).toBeLessThanOrEqual(1.0);
        expect(result.bottleneckPct).toBeGreaterThanOrEqual(0);
        expect(result.bottleneckPct).toBeLessThanOrEqual(100);
        expect(result.metricLabel.length).toBeGreaterThan(0);
      }
    });
  });

  describe('1080p Esports profile', () => {
    it('applies steeper CPU bottleneck elasticity (alpha = 0.70) than 1440p (alpha = 0.50)', () => {
      // Pair a fast GPU (RTX 4080 Super) with a budget CPU
      const eval1080p = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuFlagship, ram: ram16Gb },
        'esports-1080p',
      );
      const eval1440p = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuFlagship, ram: ram16Gb },
        'sweetspot-1440p',
      );

      // Bottleneck penalty must be strictly higher in 1080p high refresh than 1440p
      expect(eval1080p.bottleneckPct).toBeGreaterThan(eval1440p.bottleneckPct);
      expect(eval1080p.bottleneckFactor).toBeLessThan(
        eval1440p.bottleneckFactor,
      );
    });

    it('rewards high single-core / cache gaming CPU (7800X3D) with minimal bottleneck', () => {
      const evalFlagship = evaluateBuildForWorkload(
        { cpu: cpuFlagship, gpu: gpuFlagship, ram: ram16Gb },
        'esports-1080p',
      );

      expect(evalFlagship.bottleneckPct).toBeLessThan(10);
      expect(evalFlagship.bottleneckFactor).toBeGreaterThan(0.9);
    });
  });

  describe('4K Enthusiast profile', () => {
    it('features milder CPU bottleneck elasticity (alpha = 0.30) due to GPU saturation', () => {
      const eval4k = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuFlagship, ram: ram16Gb },
        'enthusiast-4k',
      );
      const eval1440p = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuFlagship, ram: ram16Gb },
        'sweetspot-1440p',
      );

      // CPU penalty is milder at 4K because the GPU is the dominant bottleneck
      expect(eval4k.bottleneckPct).toBeLessThan(eval1440p.bottleneckPct);
    });

    it('penalizes 8GB GPUs for 4K texture buffer paging', () => {
      const eval8gb = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuMid, ram: ram16Gb }, // 8GB VRAM
        'enthusiast-4k',
      );
      const eval12gb = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: gpuHighVram, ram: ram16Gb }, // 12GB VRAM
        'enthusiast-4k',
      );

      // 8GB card gets lower 4K score relative to its raster speed than 12GB card
      const ratio8gb = eval8gb.workloadScore / gpuMid.rasterFps1440p;
      const ratio12gb = eval12gb.workloadScore / gpuHighVram.rasterFps1440p;
      expect(ratio8gb).toBeLessThan(ratio12gb);
    });
  });

  describe('Creator & AI profile', () => {
    it('scores 32GB RAM kits higher than 16GB RAM kits in Creator & AI', () => {
      const eval16gb = evaluateBuildForWorkload(
        {
          cpu: cpuBudget,
          gpu: gpuHighVram,
          ram: ram16Gb,
          storage: storageFast,
        },
        'creator-ai',
      );
      const eval32gb = evaluateBuildForWorkload(
        {
          cpu: cpuBudget,
          gpu: gpuHighVram,
          ram: ram32Gb,
          storage: storageFast,
        },
        'creator-ai',
      );

      expect(eval32gb.workloadScore).toBeGreaterThan(eval16gb.workloadScore);
    });

    it('rewards NVIDIA GPUs with CUDA/Tensor creator bonus', () => {
      const rtx4070s = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4070-super')!; // NVIDIA, 12GB
      const rx7800xt = REAL_WORLD_GPUS.find((g) => g.id === 'rx-7800-xt')!; // AMD, 16GB

      const evalNvidia = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: rtx4070s, ram: ram32Gb, storage: storageFast },
        'creator-ai',
      );
      const evalAmd = evaluateBuildForWorkload(
        { cpu: cpuBudget, gpu: rx7800xt, ram: ram32Gb, storage: storageFast },
        'creator-ai',
      );

      // Both are high-productivity options, but NVIDIA gets CUDA bonus
      expect(evalNvidia.workloadScore).toBeGreaterThan(50);
      expect(evalAmd.workloadScore).toBeGreaterThan(50);
    });
  });

  describe('Combinatorial Pareto Frontier per Workload', () => {
    it('proves 32GB RAM builds are Pareto-optimal in Creator & AI mode instead of being dominated', () => {
      const catalog = {
        cpus: [cpuBudget],
        gpus: [gpuMid],
        motherboards: [SEED_MOTHERBOARDS.find((m) => m.socket === 'AM4')!],
        ramKits: [
          SEED_RAM_KITS.find(
            (r) => r.capacityGb === 16 && r.generation === 'DDR4',
          )!,
          SEED_RAM_KITS.find(
            (r) => r.capacityGb === 32 && r.generation === 'DDR4',
          )!,
        ],
        psus: [SEED_PSUS[0]],
        storages: [SEED_STORAGES[0]],
        cases: [SEED_CASES[0]],
        coolers: [SEED_COOLERS[0]],
      };

      const result = optimizeFullSystemBuilds(catalog, {
        workloadProfile: 'creator-ai',
      });

      // Under Creator & AI, the 32GB RAM build MUST be Pareto optimal
      const has32GbOptimal = result.optimalBuilds.some(
        (b) => b.ram.capacityGb === 32,
      );
      expect(has32GbOptimal).toBe(true);

      // The 32GB build must have a strictly higher workload score than the 16GB build
      const build32 = result.optimalBuilds.find(
        (b) => b.ram.capacityGb === 32,
      )!;
      const build16 = result.allCompatibleBuilds.find(
        (b) => b.ram.capacityGb === 16,
      )!;
      expect(build32.workloadScore!).toBeGreaterThan(build16.workloadScore!);
    });

    it('assembles builds with correct workloadMetricLabel and workloadProfile', () => {
      const build = assemblePcBuild(
        cpuBudget,
        gpuMid,
        ram16Gb,
        moboAM4,
        SEED_PSUS[0],
        SEED_STORAGES[0],
        SEED_CASES[0],
        SEED_COOLERS[0],
        0.5,
        'creator-ai',
      );

      expect(build.workloadProfile).toBe('creator-ai');
      expect(build.workloadMetricLabel).toContain('Creator & AI');
      expect(build.workloadScore).toBeGreaterThan(0);
    });
  });
});
