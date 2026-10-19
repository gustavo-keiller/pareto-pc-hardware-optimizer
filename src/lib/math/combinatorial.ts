import {
  assemblePcBuild,
  calculateEstimatedPowerDraw,
  calculateRecommendedPsuWattage,
  CpuCandidate,
  CpuSocket,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  PsuEfficiencyRating,
  RamCandidate,
  RamGeneration,
} from './buildTypes';
import { GpuCandidate, HardwareVendor } from './types';

/**
 * Numeric efficiency tier for comparing PSU energy efficiency ratings.
 */
const PSU_EFFICIENCY_TIER: Record<PsuEfficiencyRating, number> = {
  '80+ White': 1,
  '80+ Bronze': 2,
  '80+ Silver': 3,
  '80+ Gold': 4,
  '80+ Platinum': 5,
  '80+ Titanium': 6,
};

/**
 * Prunes strictly dominated CPUs within each platform socket.
 * A CPU is dominated if another CPU in the same socket is cheaper or equal in price
 * and faster or equal in gaming performance, with at least one strictly better.
 */
export function pruneDominatedCpus(
  cpus: readonly CpuCandidate[],
  partitionBySocket = true,
): CpuCandidate[] {
  if (cpus.length <= 1) return [...cpus];

  return cpus.filter((candidate) => {
    return !cpus.some((other) => {
      if (other.id === candidate.id) return false;
      if (partitionBySocket && other.socket !== candidate.socket) return false;

      const priceBetterOrEqual = other.price <= candidate.price;
      const scoreBetterOrEqual = other.gamingScore >= candidate.gamingScore;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.gamingScore > candidate.gamingScore;

      return priceBetterOrEqual && scoreBetterOrEqual && atLeastOneStrict;
    });
  });
}

/**
 * Prunes strictly dominated RAM kits within the same generation (DDR4 vs DDR5).
 * A kit is dominated if another kit is cheaper/equal, has greater/equal capacity,
 * and higher/equal speed, with at least one strictly better.
 */
export function pruneDominatedRam(
  ramKits: readonly RamCandidate[],
  partitionByGeneration = true,
): RamCandidate[] {
  if (ramKits.length <= 1) return [...ramKits];

  return ramKits.filter((candidate) => {
    return !ramKits.some((other) => {
      if (other.id === candidate.id) return false;
      if (partitionByGeneration && other.generation !== candidate.generation) {
        return false;
      }

      const priceBetterOrEqual = other.price <= candidate.price;
      const capacityBetterOrEqual = other.capacityGb >= candidate.capacityGb;
      const speedBetterOrEqual = other.speedMhz >= candidate.speedMhz;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.capacityGb > candidate.capacityGb ||
        other.speedMhz > candidate.speedMhz;

      return (
        priceBetterOrEqual &&
        capacityBetterOrEqual &&
        speedBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated Motherboards within each (socket, ramGeneration) platform.
 * A board is dominated if another board has lower/equal price, greater/equal RAM slots,
 * and greater/equal PCIe gen, with at least one strictly better.
 */
export function pruneDominatedMotherboards(
  motherboards: readonly MotherboardCandidate[],
): MotherboardCandidate[] {
  if (motherboards.length <= 1) return [...motherboards];

  return motherboards.filter((candidate) => {
    return !motherboards.some((other) => {
      if (other.id === candidate.id) return false;
      if (
        other.socket !== candidate.socket ||
        other.ramGeneration !== candidate.ramGeneration
      ) {
        return false;
      }

      const otherPcie = other.pcieGeneration ?? 3;
      const candPcie = candidate.pcieGeneration ?? 3;

      const priceBetterOrEqual = other.price <= candidate.price;
      const slotsBetterOrEqual = other.ramSlots >= candidate.ramSlots;
      const pcieBetterOrEqual = otherPcie >= candPcie;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.ramSlots > candidate.ramSlots ||
        otherPcie > candPcie;

      return (
        priceBetterOrEqual &&
        slotsBetterOrEqual &&
        pcieBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated PSUs.
 * A PSU is dominated if another PSU has lower/equal price, greater/equal wattage,
 * and greater/equal efficiency rating tier, with at least one strictly better.
 */
export function pruneDominatedPsus(
  psus: readonly PsuCandidate[],
): PsuCandidate[] {
  if (psus.length <= 1) return [...psus];

  return psus.filter((candidate) => {
    return !psus.some((other) => {
      if (other.id === candidate.id) return false;

      const otherEff = PSU_EFFICIENCY_TIER[other.efficiencyRating];
      const candEff = PSU_EFFICIENCY_TIER[candidate.efficiencyRating];

      const priceBetterOrEqual = other.price <= candidate.price;
      const wattageBetterOrEqual = other.wattage >= candidate.wattage;
      const effBetterOrEqual = otherEff >= candEff;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.wattage > candidate.wattage ||
        otherEff > candEff;

      return (
        priceBetterOrEqual &&
        wattageBetterOrEqual &&
        effBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Component Catalogs input container.
 */
export interface ComponentCatalogs {
  cpus: readonly CpuCandidate[];
  gpus: readonly GpuCandidate[];
  motherboards: readonly MotherboardCandidate[];
  ramKits: readonly RamCandidate[];
  psus: readonly PsuCandidate[];
}

/**
 * Generates all physically compatible PC build tuples using constraint propagation
 * (backtracking search) to discard invalid combinations at each nesting tier.
 */
export function generateCompatibleBuilds(
  catalogs: ComponentCatalogs,
  options?: { elasticity?: number },
): PcBuild[] {
  const { cpus, gpus, motherboards, ramKits, psus } = catalogs;
  if (
    cpus.length === 0 ||
    gpus.length === 0 ||
    motherboards.length === 0 ||
    ramKits.length === 0 ||
    psus.length === 0
  ) {
    return [];
  }

  const elasticity = options?.elasticity ?? 0.5;
  const compatibleBuilds: PcBuild[] = [];

  for (const cpu of cpus) {
    // Level 1 Pruning: Socket match
    const matchingMobos = motherboards.filter((m) => m.socket === cpu.socket);
    if (matchingMobos.length === 0) continue;

    for (const mobo of matchingMobos) {
      // Level 2 Pruning: RAM generation and slot count
      const matchingRams = ramKits.filter((ram) => {
        if (ram.generation !== mobo.ramGeneration) return false;
        if (ram.modulesCount > mobo.ramSlots) return false;
        if (
          cpu.supportedRamGenerations &&
          cpu.supportedRamGenerations.length > 0 &&
          !cpu.supportedRamGenerations.includes(ram.generation)
        ) {
          return false;
        }
        return true;
      });
      if (matchingRams.length === 0) continue;

      for (const ram of matchingRams) {
        for (const gpu of gpus) {
          // Level 3 Pruning: PSU wattage headroom
          const systemLoad = calculateEstimatedPowerDraw(
            cpu.tdpWatts,
            gpu.tdpWatts,
          );
          const minPsuWattage = calculateRecommendedPsuWattage(systemLoad);
          const matchingPsus = psus.filter((p) => p.wattage >= minPsuWattage);
          if (matchingPsus.length === 0) continue;

          for (const psu of matchingPsus) {
            compatibleBuilds.push(
              assemblePcBuild(cpu, gpu, ram, mobo, psu, elasticity),
            );
          }
        }
      }
    }
  }

  return compatibleBuilds;
}

/**
 * 2D Pareto frontier evaluation for complete PC builds (Total Price vs. Effective FPS).
 * Build A dominates Build B iff:
 * 1. A.totalPrice <= B.totalPrice AND A.effectiveFps1440p >= B.effectiveFps1440p
 * 2. At least one inequality is strictly better.
 */
export function evaluateBuildParetoFrontier(builds: readonly PcBuild[]): {
  optimalBuilds: PcBuild[];
  dominatedBuilds: PcBuild[];
} {
  if (builds.length === 0) {
    return { optimalBuilds: [], dominatedBuilds: [] };
  }
  if (builds.length === 1) {
    return { optimalBuilds: [...builds], dominatedBuilds: [] };
  }

  const optimalBuilds: PcBuild[] = [];
  const dominatedBuilds: PcBuild[] = [];

  for (let i = 0; i < builds.length; i++) {
    const candidate = builds[i];
    let isDominated = false;

    for (let j = 0; j < builds.length; j++) {
      if (i === j) continue;
      const other = builds[j];

      const priceBetterOrEqual = other.totalPrice <= candidate.totalPrice;
      const fpsBetterOrEqual =
        other.effectiveFps1440p >= candidate.effectiveFps1440p;
      const atLeastOneStrict =
        other.totalPrice < candidate.totalPrice ||
        other.effectiveFps1440p > candidate.effectiveFps1440p;

      if (priceBetterOrEqual && fpsBetterOrEqual && atLeastOneStrict) {
        isDominated = true;
        break;
      }
    }

    if (isDominated) {
      dominatedBuilds.push(candidate);
    } else {
      optimalBuilds.push(candidate);
    }
  }

  // Sort optimal builds by price ascending, breaking ties by higher effective FPS
  optimalBuilds.sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    return b.effectiveFps1440p - a.effectiveFps1440p;
  });

  return { optimalBuilds, dominatedBuilds };
}

/**
 * User filtering criteria for full system optimization.
 */
export interface BuildFilterCriteria {
  minBudget?: number;
  maxBudget?: number;
  minEffectiveFps?: number;
  preferredSocket?: CpuSocket;
  preferredRamGeneration?: RamGeneration;
  preferredGpuVendor?: HardwareVendor;
}

export interface OptimizationResult {
  optimalBuilds: PcBuild[];
  allCompatibleBuilds: PcBuild[];
  dominatedBuilds: PcBuild[];
  totalCompatibleBuilds: number;
  prunedPartCounts: {
    cpus: number;
    gpus: number;
    motherboards: number;
    ramKits: number;
    psus: number;
  };
}

/**
 * End-to-end full system optimizer pipeline:
 * 1. Intra-category Pareto pre-pruning to eliminate inferior individual parts.
 * 2. Backtracking constraint-propagating generation of physically valid systems.
 * 3. Filter by user budget and platform preferences.
 * 4. Multi-objective Pareto evaluation across total price vs. effective FPS.
 */
export function optimizeFullSystemBuilds(
  catalogs: ComponentCatalogs,
  criteria?: BuildFilterCriteria,
): OptimizationResult {
  // Step 1: Pre-prune intra-category candidates
  const prunedCpus = pruneDominatedCpus(catalogs.cpus);
  const prunedRam = pruneDominatedRam(catalogs.ramKits);
  const prunedMobos = pruneDominatedMotherboards(catalogs.motherboards);
  const prunedPsus = pruneDominatedPsus(catalogs.psus);
  const prunedGpus = [...catalogs.gpus];

  const prunedCatalogs: ComponentCatalogs = {
    cpus: prunedCpus,
    gpus: prunedGpus,
    motherboards: prunedMobos,
    ramKits: prunedRam,
    psus: prunedPsus,
  };

  // Step 2: Generate compatible builds
  const allCompatible = generateCompatibleBuilds(prunedCatalogs);

  // Step 3: Filter builds according to user criteria
  let filteredBuilds = allCompatible;
  if (criteria) {
    filteredBuilds = allCompatible.filter((build) => {
      if (
        typeof criteria.minBudget === 'number' &&
        build.totalPrice < criteria.minBudget
      ) {
        return false;
      }
      if (
        typeof criteria.maxBudget === 'number' &&
        build.totalPrice > criteria.maxBudget
      ) {
        return false;
      }
      if (
        typeof criteria.minEffectiveFps === 'number' &&
        build.effectiveFps1440p < criteria.minEffectiveFps
      ) {
        return false;
      }
      if (
        criteria.preferredSocket &&
        build.cpu.socket !== criteria.preferredSocket
      ) {
        return false;
      }
      if (
        criteria.preferredRamGeneration &&
        build.ram.generation !== criteria.preferredRamGeneration
      ) {
        return false;
      }
      if (
        criteria.preferredGpuVendor &&
        build.gpu.vendor !== criteria.preferredGpuVendor
      ) {
        return false;
      }
      return true;
    });
  }

  // Step 4: Pareto frontier extraction
  const { optimalBuilds, dominatedBuilds } =
    evaluateBuildParetoFrontier(filteredBuilds);

  return {
    optimalBuilds,
    allCompatibleBuilds: filteredBuilds,
    dominatedBuilds,
    totalCompatibleBuilds: filteredBuilds.length,
    prunedPartCounts: {
      cpus: prunedCpus.length,
      gpus: prunedGpus.length,
      motherboards: prunedMobos.length,
      ramKits: prunedRam.length,
      psus: prunedPsus.length,
    },
  };
}
