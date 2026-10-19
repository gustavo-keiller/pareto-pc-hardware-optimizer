import {
  assemblePcBuild,
  BuildWorkloadProfile,
  calculateEstimatedPowerDraw,
  calculateRecommendedPsuWattage,
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  CpuSocket,
  DEFAULT_CASE,
  DEFAULT_COOLER,
  DEFAULT_STORAGE,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  PsuEfficiencyRating,
  RamCandidate,
  RamGeneration,
  StorageCandidate,
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
 * Prunes strictly dominated Storage SSDs.
 * An SSD is dominated if another SSD is cheaper or equal in price,
 * has greater or equal capacity, and higher or equal read speed, with at least one strictly better.
 */
export function pruneDominatedStorage(
  storages: readonly StorageCandidate[],
): StorageCandidate[] {
  if (storages.length <= 1) return [...storages];

  return storages.filter((candidate) => {
    return !storages.some((other) => {
      if (other.id === candidate.id) return false;

      const otherSpeed = other.readSpeedMbps ?? 0;
      const candSpeed = candidate.readSpeedMbps ?? 0;

      const priceBetterOrEqual = other.price <= candidate.price;
      const capBetterOrEqual = other.capacityGb >= candidate.capacityGb;
      const speedBetterOrEqual = otherSpeed >= candSpeed;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.capacityGb > candidate.capacityGb ||
        otherSpeed > candSpeed;

      return (
        priceBetterOrEqual &&
        capBetterOrEqual &&
        speedBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated PC Cases.
 * A case is dominated if another case has lower or equal price,
 * supports a superset of form factors, and has greater or equal GPU and cooler clearances.
 */
export function pruneDominatedCases(
  cases: readonly CaseCandidate[],
): CaseCandidate[] {
  if (cases.length <= 1) return [...cases];

  return cases.filter((candidate) => {
    return !cases.some((other) => {
      if (other.id === candidate.id) return false;

      const formFactorsSuperset = candidate.supportedFormFactors.every((f) =>
        other.supportedFormFactors.includes(f),
      );
      if (!formFactorsSuperset) return false;

      const priceBetterOrEqual = other.price <= candidate.price;
      const gpuBetterOrEqual = other.maxGpuLengthMm >= candidate.maxGpuLengthMm;
      const coolerBetterOrEqual =
        other.maxCpuCoolerHeightMm >= candidate.maxCpuCoolerHeightMm;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.maxGpuLengthMm > candidate.maxGpuLengthMm ||
        other.maxCpuCoolerHeightMm > candidate.maxCpuCoolerHeightMm ||
        other.supportedFormFactors.length >
          candidate.supportedFormFactors.length;

      return (
        priceBetterOrEqual &&
        gpuBetterOrEqual &&
        coolerBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated CPU Coolers.
 * A cooler is dominated if another cooler has lower or equal price,
 * greater or equal cooling TDP, lower or equal height (easier case fit),
 * and supports a superset of CPU sockets.
 */
export function pruneDominatedCoolers(
  coolers: readonly CoolerCandidate[],
): CoolerCandidate[] {
  if (coolers.length <= 1) return [...coolers];

  return coolers.filter((candidate) => {
    return !coolers.some((other) => {
      if (other.id === candidate.id) return false;

      const socketsSuperset = candidate.supportedSockets.every((s) =>
        other.supportedSockets.includes(s),
      );
      if (!socketsSuperset) return false;

      const priceBetterOrEqual = other.price <= candidate.price;
      const tdpBetterOrEqual = other.maxTdpWatts >= candidate.maxTdpWatts;
      const heightBetterOrEqual = other.heightMm <= candidate.heightMm;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.maxTdpWatts > candidate.maxTdpWatts ||
        other.heightMm < candidate.heightMm ||
        other.supportedSockets.length > candidate.supportedSockets.length;

      return (
        priceBetterOrEqual &&
        tdpBetterOrEqual &&
        heightBetterOrEqual &&
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
  storages?: readonly StorageCandidate[];
  cases?: readonly CaseCandidate[];
  coolers?: readonly CoolerCandidate[];
}

/**
 * Generates all physically compatible PC build tuples across all 8 components
 * using constraint propagation (backtracking search) to discard invalid combinations.
 */
export function generateCompatibleBuilds(
  catalogs: ComponentCatalogs,
  options?: { elasticity?: number; profile?: BuildWorkloadProfile },
): PcBuild[] {
  const { cpus, gpus, motherboards, ramKits, psus } = catalogs;
  const storages =
    catalogs.storages && catalogs.storages.length > 0
      ? catalogs.storages
      : [DEFAULT_STORAGE];
  const cases =
    catalogs.cases && catalogs.cases.length > 0
      ? catalogs.cases
      : [DEFAULT_CASE];
  const coolers =
    catalogs.coolers && catalogs.coolers.length > 0
      ? catalogs.coolers
      : [DEFAULT_COOLER];

  if (
    cpus.length === 0 ||
    gpus.length === 0 ||
    motherboards.length === 0 ||
    ramKits.length === 0 ||
    psus.length === 0 ||
    storages.length === 0 ||
    cases.length === 0 ||
    coolers.length === 0
  ) {
    return [];
  }

  const elasticity = options?.elasticity ?? 0.5;
  const profile = options?.profile ?? 'sweetspot-1440p';
  const compatibleBuilds: PcBuild[] = [];

  for (const cpu of cpus) {
    // Level 1 Pruning: Socket match for motherboards & coolers
    const matchingMobos = motherboards.filter((m) => m.socket === cpu.socket);
    if (matchingMobos.length === 0) continue;

    const matchingCoolers = coolers.filter((c) => {
      if (!c.supportedSockets.includes(cpu.socket)) return false;
      if (c.maxTdpWatts < cpu.tdpWatts) return false;
      return true;
    });
    if (matchingCoolers.length === 0) continue;

    for (const mobo of matchingMobos) {
      // Level 2 Pruning: RAM generation and slot count, plus M.2 storage match
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

      const matchingStorages = storages.filter((storage) => {
        const moboM2 = mobo.m2Slots ?? 1;
        if (storage.type === 'NVMe M.2' && moboM2 < 1) return false;
        return true;
      });
      if (matchingStorages.length === 0) continue;

      // Filter cases that fit motherboard form factor
      const moboCases = cases.filter((c) =>
        c.supportedFormFactors.includes(mobo.formFactor),
      );
      if (moboCases.length === 0) continue;

      for (const ram of matchingRams) {
        for (const storage of matchingStorages) {
          for (const gpu of gpus) {
            // Level 3 Pruning: PSU wattage headroom & GPU case length clearance
            const systemLoad = calculateEstimatedPowerDraw(
              cpu.tdpWatts,
              gpu.tdpWatts,
            );
            const minPsuWattage = calculateRecommendedPsuWattage(systemLoad);
            const matchingPsus = psus.filter((p) => p.wattage >= minPsuWattage);
            if (matchingPsus.length === 0) continue;

            const gpuLength = gpu.lengthMm ?? 260;
            const gpuCases = moboCases.filter(
              (c) => c.maxGpuLengthMm >= gpuLength,
            );
            if (gpuCases.length === 0) continue;

            for (const cooler of matchingCoolers) {
              // Level 4 Pruning: Cooler height clearance in case
              const validCases = gpuCases.filter(
                (c) => c.maxCpuCoolerHeightMm >= cooler.heightMm,
              );
              if (validCases.length === 0) continue;

              for (const pcCase of validCases) {
                for (const psu of matchingPsus) {
                  compatibleBuilds.push(
                    assemblePcBuild(
                      cpu,
                      gpu,
                      ram,
                      mobo,
                      psu,
                      storage,
                      pcCase,
                      cooler,
                      elasticity,
                      profile,
                    ),
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  return compatibleBuilds;
}

/**
 * 2D Pareto frontier evaluation for complete PC builds (Total Price vs. Effective Workload Performance).
 * Build A dominates Build B iff:
 * 1. A.totalPrice <= B.totalPrice AND A.score >= B.score
 * 2. At least one inequality is strictly better.
 */
export function evaluateBuildParetoFrontier(
  builds: readonly PcBuild[],
  _profile?: BuildWorkloadProfile,
): {
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
    const candidateScore =
      candidate.workloadScore ?? candidate.effectiveFps1440p;
    let isDominated = false;

    for (let j = 0; j < builds.length; j++) {
      if (i === j) continue;
      const other = builds[j];
      const otherScore = other.workloadScore ?? other.effectiveFps1440p;

      const priceBetterOrEqual = other.totalPrice <= candidate.totalPrice;
      const scoreBetterOrEqual = otherScore >= candidateScore;
      const atLeastOneStrict =
        other.totalPrice < candidate.totalPrice || otherScore > candidateScore;

      if (priceBetterOrEqual && scoreBetterOrEqual && atLeastOneStrict) {
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

  // Sort optimal builds by price ascending, breaking ties by higher workload score
  optimalBuilds.sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    const aScore = a.workloadScore ?? a.effectiveFps1440p;
    const bScore = b.workloadScore ?? b.effectiveFps1440p;
    return bScore - aScore;
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
  workloadProfile?: BuildWorkloadProfile;
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
    storages?: number;
    cases?: number;
    coolers?: number;
  };
}

/**
 * End-to-end full system optimizer pipeline:
 * 1. Intra-category Pareto pre-pruning to eliminate inferior individual parts across all 8 categories.
 * 2. Backtracking constraint-propagating generation of physically valid systems.
 * 3. Filter by user budget, workload profile, and platform preferences.
 * 4. Multi-objective Pareto evaluation across total price vs. effective workload performance.
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
  const prunedStorages = catalogs.storages
    ? pruneDominatedStorage(catalogs.storages)
    : [DEFAULT_STORAGE];
  const prunedCases = catalogs.cases
    ? pruneDominatedCases(catalogs.cases)
    : [DEFAULT_CASE];
  const prunedCoolers = catalogs.coolers
    ? pruneDominatedCoolers(catalogs.coolers)
    : [DEFAULT_COOLER];

  const prunedCatalogs: ComponentCatalogs = {
    cpus: prunedCpus,
    gpus: prunedGpus,
    motherboards: prunedMobos,
    ramKits: prunedRam,
    psus: prunedPsus,
    storages: prunedStorages,
    cases: prunedCases,
    coolers: prunedCoolers,
  };

  const profile = criteria?.workloadProfile ?? 'sweetspot-1440p';

  // Step 2: Generate compatible builds with active workload profile
  const allCompatible = generateCompatibleBuilds(prunedCatalogs, { profile });

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
      const score = build.workloadScore ?? build.effectiveFps1440p;
      if (
        typeof criteria.minEffectiveFps === 'number' &&
        score < criteria.minEffectiveFps
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
  const { optimalBuilds, dominatedBuilds } = evaluateBuildParetoFrontier(
    filteredBuilds,
    profile,
  );

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
      storages: prunedStorages.length,
      cases: prunedCases.length,
      coolers: prunedCoolers.length,
    },
  };
}
