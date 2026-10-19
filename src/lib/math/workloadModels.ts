import { GpuCandidate } from './types';
import {
  CpuCandidate,
  RamCandidate,
  StorageCandidate,
  computeCpuGpuBottleneck,
  estimateGpuRequiredCpuScore,
} from './buildTypes';

/**
 * Supported beginner and enthusiast workload profiles for full-system optimization.
 */
export type BuildWorkloadProfile =
  'esports-1080p' | 'sweetspot-1440p' | 'enthusiast-4k' | 'creator-ai';

export interface WorkloadEvaluationResult {
  workloadScore: number;
  bottleneckFactor: number;
  bottleneckPct: number;
  metricLabel: string;
}

/**
 * Computes workload-specific throughput, bottleneck elasticity, and composite productivity index.
 */
export function evaluateBuildForWorkload(
  components: {
    cpu: CpuCandidate;
    gpu: GpuCandidate;
    ram: RamCandidate;
    storage?: StorageCandidate;
  },
  profile: BuildWorkloadProfile = 'sweetspot-1440p',
): WorkloadEvaluationResult {
  const { cpu, gpu, ram, storage } = components;

  switch (profile) {
    case 'esports-1080p': {
      // 1080p High-Refresh: CPU draw-call bound, steeper elasticity alpha = 0.70
      const rawFps1080p =
        Math.round(Math.max(0, gpu.rasterFps1440p) * 1.38 * 10) / 10;
      const requiredCpuScore = Math.min(
        100,
        Math.max(35, Math.round(30 + rawFps1080p * 0.4)),
      );
      const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
        cpu.gamingScore,
        requiredCpuScore,
        0.7,
      );
      const workloadScore =
        Math.round(rawFps1080p * bottleneckFactor * 10) / 10;
      return {
        workloadScore,
        bottleneckFactor,
        bottleneckPct,
        metricLabel: 'FPS (1080p Esports)',
      };
    }

    case 'sweetspot-1440p': {
      // 1440p Balanced Gaming: standard baseline elasticity alpha = 0.50
      const rawFps1440p = Math.max(0, gpu.rasterFps1440p);
      const requiredCpuScore = estimateGpuRequiredCpuScore(gpu);
      const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
        cpu.gamingScore,
        requiredCpuScore,
        0.5,
      );
      const workloadScore =
        Math.round(rawFps1440p * bottleneckFactor * 10) / 10;
      return {
        workloadScore,
        bottleneckFactor,
        bottleneckPct,
        metricLabel: 'FPS (1440p Ultra)',
      };
    }

    case 'enthusiast-4k': {
      // 4K Ultra RT: heavily GPU-bound (alpha = 0.30), VRAM texture paging sensitivity
      const raw4kRaster = Math.max(0, gpu.rasterFps1440p) * 0.58;
      const raw4kRt = Math.max(0, gpu.rtFps1440p) * 0.55;
      let blended4k = raw4kRaster * 0.65 + raw4kRt * 0.35;

      // VRAM buffer penalty: 4K textures overflow under 12GB
      if (gpu.vramGb < 10) {
        blended4k *= 0.75;
      } else if (gpu.vramGb < 16) {
        blended4k *= 0.92;
      }

      const requiredCpuScore = Math.min(
        100,
        Math.max(25, Math.round(15 + blended4k * 0.35)),
      );
      const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
        cpu.gamingScore,
        requiredCpuScore,
        0.3,
      );
      const workloadScore = Math.round(blended4k * bottleneckFactor * 10) / 10;
      return {
        workloadScore,
        bottleneckFactor,
        bottleneckPct,
        metricLabel: 'FPS (4K Ultra RT)',
      };
    }

    case 'creator-ai': {
      // Multi-dimensional productivity index (RAM capacity, VRAM buffer, CUDA/Tensor, Multi-core CPU)
      const ramScore =
        ram.capacityGb >= 64
          ? 25
          : ram.capacityGb >= 32
            ? 22
            : ram.capacityGb >= 16
              ? 10
              : 2;

      const vramScore =
        gpu.vramGb >= 24
          ? 30
          : gpu.vramGb >= 16
            ? 24
            : gpu.vramGb >= 12
              ? 18
              : 8;

      const vendorBonus = gpu.vendor === 'NVIDIA' ? 10 : 4;
      const gpuCompute = Math.min(
        15,
        Math.round(Math.max(0, gpu.rasterFps1440p) * 0.1),
      );
      const cpuCores = cpu.cores ?? 6;
      const cpuScore = Math.min(
        18,
        Math.round(
          cpu.gamingScore * 0.1 + (cpuCores >= 8 ? 8 : cpuCores * 0.9),
        ),
      );
      const storageSpeed = storage?.readSpeedMbps ?? 3500;
      const storageBonus = storageSpeed >= 5000 ? 5 : 2;

      const workloadScore =
        Math.round(
          (ramScore +
            vramScore +
            vendorBonus +
            gpuCompute +
            cpuScore +
            storageBonus) *
            10,
        ) / 10;

      return {
        workloadScore,
        bottleneckFactor: 1.0,
        bottleneckPct: 0,
        metricLabel: 'Creator & AI Index',
      };
    }

    default: {
      const _exhaustive: never = profile;
      throw new Error(`Unhandled workload profile: ${_exhaustive}`);
    }
  }
}
