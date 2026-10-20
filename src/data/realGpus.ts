import { GpuCandidate, HardwareVendor } from '../lib/math/types';
import gpusJson from './catalogs/gpus.json';

function parseGpu(item: (typeof gpusJson)[number]): GpuCandidate {
  const vendor: HardwareVendor =
    item.vendor === 'NVIDIA' ||
    item.vendor === 'AMD' ||
    item.vendor === 'Intel' ||
    item.vendor === 'Synthetic'
      ? item.vendor
      : 'Other';
  return {
    ...item,
    vendor,
  };
}

/**
 * Phase 2 & 3: Real-World GPU Benchmark Dataset (18 Desktop GPUs)
 * Loaded from versioned JSON in src/data/catalogs/gpus.json with schema validation.
 */
export const REAL_WORLD_GPUS: GpuCandidate[] = gpusJson.map(parseGpu);
