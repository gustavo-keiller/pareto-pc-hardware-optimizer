import {
  FilterFacet,
  GpuCandidate,
  HardConstraints,
  HardwareVendor,
} from './types';

export interface TechnologyDefinition {
  id: string;
  label: string;
  badge: string;
  description: string;
  vendorAttached?: HardwareVendor;
}

export const KNOWN_GPU_TECHNOLOGIES: TechnologyDefinition[] = [
  {
    id: 'DLSS 3+ Frame Gen',
    label: 'DLSS 3/4 Frame Gen',
    badge: 'NVIDIA RTX 40/50',
    description: 'AI optical flow frame generation (Ada Lovelace & Blackwell)',
    vendorAttached: 'NVIDIA',
  },
  {
    id: 'FSR 3 Frame Gen',
    label: 'FSR 3 Frame Gen',
    badge: 'AMD RDNA 2/3/4',
    description: 'AMD Fluid Motion Frames driver/game-level frame generation',
    vendorAttached: 'AMD',
  },
  {
    id: 'AV1 Video Encode',
    label: 'AV1 Video Encoding',
    badge: 'Next-Gen Media',
    description:
      'Hardware AV1 encoder for high-efficiency OBS streaming & recording',
  },
  {
    id: 'Hardware Ray Tracing',
    label: 'Hardware Ray Tracing',
    badge: 'RT Accelerated',
    description:
      'Dedicated BVH hardware ray-triangle intersection units (excludes older cards)',
  },
  {
    id: 'CUDA / OptiX AI & 3D',
    label: 'CUDA / OptiX AI & 3D',
    badge: 'NVIDIA Ecosystem',
    description:
      'Industry standard acceleration for Blender Cycles, PyTorch, and local AI',
    vendorAttached: 'NVIDIA',
  },
];

/**
 * Pure, deterministic vendor inference from GPU metadata, chip name, or listing title.
 */
export function inferGpuVendor(gpu: Partial<GpuCandidate>): HardwareVendor {
  if (gpu.vendor) {
    return gpu.vendor;
  }
  const text = `${gpu.chip ?? ''} ${gpu.name ?? ''}`.toLowerCase();
  if (
    text.includes('geforce') ||
    text.includes('rtx') ||
    text.includes('gtx') ||
    text.includes('nvidia') ||
    text.includes('apex')
  ) {
    return 'NVIDIA';
  }
  if (
    text.includes('radeon') ||
    text.includes('rx ') ||
    text.includes('rx-') ||
    text.includes('amd') ||
    text.includes('vortex')
  ) {
    return 'AMD';
  }
  if (
    text.includes('arc') ||
    text.includes('intel') ||
    text.includes('battlemage') ||
    text.includes('alchemist') ||
    text.includes('nova')
  ) {
    return 'Intel';
  }
  return 'Other';
}

/**
 * Pure, deterministic architecture inference from GPU metadata.
 */
export function inferGpuArchitecture(gpu: Partial<GpuCandidate>): string {
  if (gpu.architecture) {
    return gpu.architecture;
  }
  const text = `${gpu.chip ?? ''} ${gpu.name ?? ''}`.toLowerCase();

  // NVIDIA
  if (
    text.includes('5090') ||
    text.includes('5080') ||
    text.includes('5070') ||
    text.includes('5060') ||
    text.includes('blackwell')
  ) {
    return 'Blackwell (RTX 50)';
  }
  if (
    text.includes('4090') ||
    text.includes('4080') ||
    text.includes('4070') ||
    text.includes('4060') ||
    text.includes('ada')
  ) {
    return 'Ada Lovelace (RTX 40)';
  }
  if (
    text.includes('3090') ||
    text.includes('3080') ||
    text.includes('3070') ||
    text.includes('3060') ||
    text.includes('3050') ||
    text.includes('ampere')
  ) {
    return 'Ampere (RTX 30)';
  }
  if (
    text.includes('1660') ||
    text.includes('1650') ||
    text.includes('2060') ||
    text.includes('2070') ||
    text.includes('2080') ||
    text.includes('turing')
  ) {
    return 'Turing';
  }

  // AMD
  if (
    text.includes('9070') ||
    text.includes('9060') ||
    text.includes('rdna 4') ||
    text.includes('rdna4')
  ) {
    return 'RDNA 4 (RX 9000)';
  }
  if (
    text.includes('7900') ||
    text.includes('7800') ||
    text.includes('7700') ||
    text.includes('7600') ||
    text.includes('rdna 3') ||
    text.includes('rdna3')
  ) {
    return 'RDNA 3 (RX 7000)';
  }
  if (
    text.includes('6950') ||
    text.includes('6900') ||
    text.includes('6800') ||
    text.includes('6750') ||
    text.includes('6700') ||
    text.includes('6650') ||
    text.includes('6600') ||
    text.includes('rdna 2') ||
    text.includes('rdna2')
  ) {
    return 'RDNA 2 (RX 6000)';
  }

  // Intel
  if (
    text.includes('b580') ||
    text.includes('b570') ||
    text.includes('battlemage') ||
    text.includes('xe2')
  ) {
    return 'Battlemage (Xe2)';
  }
  if (
    text.includes('a770') ||
    text.includes('a750') ||
    text.includes('a580') ||
    text.includes('a380') ||
    text.includes('alchemist')
  ) {
    return 'Alchemist (Xe)';
  }

  return 'Standard Architecture';
}

/**
 * Pure, deterministic feature inference from GPU metadata.
 * Flags ecosystem capabilities attached to brands (DLSS, FSR, AV1, CUDA, Ray Tracing).
 */
export function inferGpuFeatures(gpu: Partial<GpuCandidate>): string[] {
  if (gpu.features && gpu.features.length > 0) {
    return gpu.features;
  }
  const vendor = inferGpuVendor(gpu);
  const arch = inferGpuArchitecture(gpu);
  const features: string[] = [];

  if (vendor === 'NVIDIA') {
    features.push('CUDA / OptiX AI & 3D');
    if (arch.includes('Blackwell') || arch.includes('Ada Lovelace')) {
      features.push(
        'DLSS 3+ Frame Gen',
        'AV1 Video Encode',
        'Hardware Ray Tracing',
      );
    } else if (arch.includes('Ampere') || arch.includes('RTX')) {
      features.push('Hardware Ray Tracing');
    }
  } else if (vendor === 'AMD') {
    if (arch.includes('RDNA 4') || arch.includes('RDNA 3')) {
      features.push(
        'FSR 3 Frame Gen',
        'AV1 Video Encode',
        'Hardware Ray Tracing',
      );
    } else if (arch.includes('RDNA 2')) {
      features.push('FSR 3 Frame Gen', 'Hardware Ray Tracing');
    }
  } else if (vendor === 'Intel') {
    features.push('AV1 Video Encode', 'Hardware Ray Tracing');
  }

  // Synthetic or custom card check by RT fps
  if (
    typeof gpu.rtFps1440p === 'number' &&
    gpu.rtFps1440p > 20 &&
    !features.includes('Hardware Ray Tracing')
  ) {
    features.push('Hardware Ray Tracing');
  }

  return features;
}

/**
 * Computes live filter facets (Brand, Technologies) with candidate counts.
 * Counts reflect candidates that meet the other active constraints.
 */
export function computeGpuFacets(
  allCandidates: GpuCandidate[],
  constraints: Partial<HardConstraints>,
): FilterFacet[] {
  // Pre-filter candidates by numeric bounds only, so counts show how many fit
  const maxPrice = constraints.maxPrice ?? Infinity;
  const minVram = constraints.minVram ?? 0;
  const maxWatts = constraints.maxWatts ?? Infinity;

  const budgetFitting = allCandidates.filter(
    (g) => g.price <= maxPrice && g.vramGb >= minVram && g.tdpWatts <= maxWatts,
  );

  // 1. Vendor Facet
  const vendors: HardwareVendor[] = ['NVIDIA', 'AMD', 'Intel'];
  const vendorCounts: Record<HardwareVendor, number> = {
    NVIDIA: 0,
    AMD: 0,
    Intel: 0,
    Synthetic: 0,
    Other: 0,
  };

  for (const gpu of budgetFitting) {
    const v = inferGpuVendor(gpu);
    vendorCounts[v] = (vendorCounts[v] ?? 0) + 1;
  }

  const vendorFacet: FilterFacet = {
    id: 'vendors',
    label: 'Brand / Manufacturer',
    description: 'Filter by chip vendor ecosystem',
    options: vendors
      .filter((v) => (vendorCounts[v] ?? 0) > 0)
      .map((v) => ({
        id: v,
        label:
          v === 'NVIDIA'
            ? 'NVIDIA GeForce'
            : v === 'AMD'
              ? 'AMD Radeon'
              : 'Intel Arc',
        badge:
          v === 'NVIDIA'
            ? 'DLSS / CUDA'
            : v === 'AMD'
              ? 'FSR / RDNA'
              : 'XeSS / AV1',
        count: vendorCounts[v] ?? 0,
      })),
  };

  // 2. Technologies / Ecosystem Facet
  const techCounts: Record<string, number> = {};
  for (const tech of KNOWN_GPU_TECHNOLOGIES) {
    techCounts[tech.id] = 0;
  }

  for (const gpu of budgetFitting) {
    const feats = inferGpuFeatures(gpu);
    for (const f of feats) {
      techCounts[f] = (techCounts[f] ?? 0) + 1;
    }
  }

  const techFacet: FilterFacet = {
    id: 'technologies',
    label: 'Ecosystem & Proprietary Technologies',
    description:
      'Hardware features attached to brands that cannot be compared purely on raw FPS',
    options: KNOWN_GPU_TECHNOLOGIES.filter(
      (t) => (techCounts[t.id] ?? 0) > 0,
    ).map((t) => ({
      id: t.id,
      label: t.label,
      badge: t.badge,
      count: techCounts[t.id] ?? 0,
    })),
  };

  return [vendorFacet, techFacet];
}
