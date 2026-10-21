import {
  AestheticPreference,
  assemblePcBuild,
  BuildWorkloadProfile,
  calculateEstimatedPowerDraw,
  calculateRecommendedPsuWattage,
  CaseCandidate,
  CoolerCandidate,
  CoolerTypePreference,
  computeCpuGpuBottleneck,
  CpuCandidate,
  CpuSocket,
  CpuVendorPreference,
  DEFAULT_CASE,
  DEFAULT_COOLER,
  DEFAULT_STORAGE,
  estimateGpuRequiredCpuScore,
  evaluateBuildForWorkload,
  FormFactorPreference,
  MotherboardCandidate,
  PcBuild,
  PrecomputedBuildMetrics,
  PsuCandidate,
  RamCandidate,
  RamGeneration,
  StorageCandidate,
} from './buildTypes';
import { GpuCandidate, HardwareVendor } from './types';
import { searchOptimalBuildTuples } from './buildSearch';

import {
  pruneDominatedCases,
  pruneDominatedCoolers,
  pruneDominatedCpus,
  pruneDominatedGpus,
  pruneDominatedMotherboards,
  pruneDominatedPsus,
  pruneDominatedRam,
  pruneDominatedStorage,
} from './intraCategoryPruning';

export {
  pruneDominatedCases,
  pruneDominatedCoolers,
  pruneDominatedCpus,
  pruneDominatedGpus,
  pruneDominatedMotherboards,
  pruneDominatedPsus,
  pruneDominatedRam,
  pruneDominatedStorage,
};

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

export interface GenerateCompatibleBuildsOptions {
  elasticity?: number;
  profile?: BuildWorkloadProfile;
  maxBudget?: number;
  preferredSocket?: CpuSocket;
  preferredRamGeneration?: RamGeneration;
  preferredGpuVendor?: HardwareVendor;
  preferredCpuVendor?: CpuVendorPreference;
  preferredFormFactor?: FormFactorPreference;
  preferredCoolerType?: CoolerTypePreference;
  preferredAesthetic?: AestheticPreference;
}

/**
 * Generates all physically compatible PC build tuples across all 8 components
 * using constraint propagation (backtracking search) and branch-and-bound budget pruning
 * to discard invalid or over-budget combinations early.
 */
export function generateCompatibleBuilds(
  catalogs: ComponentCatalogs,
  options?: GenerateCompatibleBuildsOptions,
): PcBuild[] {
  let cpus = catalogs.cpus;
  let gpus = catalogs.gpus;
  let motherboards = catalogs.motherboards;
  let ramKits = catalogs.ramKits;
  const psus = catalogs.psus;
  const storages =
    catalogs.storages && catalogs.storages.length > 0
      ? catalogs.storages
      : [DEFAULT_STORAGE];
  let cases =
    catalogs.cases && catalogs.cases.length > 0
      ? catalogs.cases
      : [DEFAULT_CASE];
  let coolers =
    catalogs.coolers && catalogs.coolers.length > 0
      ? catalogs.coolers
      : [DEFAULT_COOLER];

  if (options?.preferredSocket) {
    cpus = cpus.filter((c) => c.socket === options.preferredSocket);
    motherboards = motherboards.filter(
      (m) => m.socket === options.preferredSocket,
    );
  }
  if (options?.preferredRamGeneration) {
    ramKits = ramKits.filter(
      (r) => r.generation === options.preferredRamGeneration,
    );
    motherboards = motherboards.filter(
      (m) => m.ramGeneration === options.preferredRamGeneration,
    );
  }
  if (options?.preferredGpuVendor) {
    gpus = gpus.filter((g) => g.vendor === options.preferredGpuVendor);
  }
  if (options?.preferredCpuVendor && options.preferredCpuVendor !== 'ALL') {
    cpus = cpus.filter((c) => c.vendor === options.preferredCpuVendor);
  }
  if (options?.preferredFormFactor && options.preferredFormFactor !== 'ALL') {
    if (options.preferredFormFactor === 'SFF') {
      motherboards = motherboards.filter((m) => m.formFactor === 'Mini-ITX');
      cases = cases.filter((c) => c.isSff === true);
    } else if (options.preferredFormFactor === 'Micro-ATX') {
      motherboards = motherboards.filter((m) => m.formFactor === 'Micro-ATX');
      cases = cases.filter(
        (c) => c.supportedFormFactors.includes('Micro-ATX') && !c.isSff,
      );
    } else if (options.preferredFormFactor === 'ATX') {
      motherboards = motherboards.filter((m) => m.formFactor === 'ATX');
      cases = cases.filter((c) => c.supportedFormFactors.includes('ATX'));
    }
  }
  if (options?.preferredCoolerType && options.preferredCoolerType !== 'ALL') {
    coolers = coolers.filter((c) => c.type === options.preferredCoolerType);
  }
  if (options?.preferredAesthetic && options.preferredAesthetic !== 'ALL') {
    if (options.preferredAesthetic === 'RGB') {
      cases = cases.filter((c) => c.rgb === true);
    } else if (options.preferredAesthetic === 'Stealth') {
      cases = cases.filter((c) => c.rgb !== true);
      coolers = coolers.filter((c) => c.rgb !== true);
      ramKits = ramKits.filter((r) => r.rgb !== true);
    }
  }

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
  const maxBudget = options?.maxBudget;
  const hasBudgetCap = typeof maxBudget === 'number';

  // Branch-and-bound lower bound estimators: cheapest component in each category
  const minMobo = hasBudgetCap
    ? Math.min(...motherboards.map((m) => m.price))
    : 0;
  const minRam = hasBudgetCap ? Math.min(...ramKits.map((r) => r.price)) : 0;
  const minStorage = hasBudgetCap
    ? Math.min(...storages.map((s) => s.price))
    : 0;
  const minGpu = hasBudgetCap ? Math.min(...gpus.map((g) => g.price)) : 0;
  const minCooler = hasBudgetCap ? Math.min(...coolers.map((c) => c.price)) : 0;
  const minCase = hasBudgetCap ? Math.min(...cases.map((c) => c.price)) : 0;
  const minPsu = hasBudgetCap ? Math.min(...psus.map((p) => p.price)) : 0;

  const compatibleBuilds: PcBuild[] = [];

  for (const cpu of cpus) {
    if (
      hasBudgetCap &&
      cpu.price +
        minMobo +
        minRam +
        minStorage +
        minGpu +
        minCooler +
        minCase +
        minPsu >
        maxBudget
    ) {
      continue;
    }

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
      const costCpuMobo = cpu.price + mobo.price;
      if (
        hasBudgetCap &&
        costCpuMobo +
          minRam +
          minStorage +
          minGpu +
          minCooler +
          minCase +
          minPsu >
          maxBudget
      ) {
        continue;
      }

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
        const costWithRam = costCpuMobo + ram.price;
        if (
          hasBudgetCap &&
          costWithRam + minStorage + minGpu + minCooler + minCase + minPsu >
            maxBudget
        ) {
          continue;
        }

        for (const storage of matchingStorages) {
          const costWithStorage = costWithRam + storage.price;
          if (
            hasBudgetCap &&
            costWithStorage + minGpu + minCooler + minCase + minPsu > maxBudget
          ) {
            continue;
          }

          for (const gpu of gpus) {
            const costWithGpu = costWithStorage + gpu.price;
            if (
              hasBudgetCap &&
              costWithGpu + minCooler + minCase + minPsu > maxBudget
            ) {
              continue;
            }

            // Level 3 Pruning: PSU wattage headroom & GPU case length clearance
            const systemLoad = calculateEstimatedPowerDraw(
              cpu.tdpWatts,
              gpu.tdpWatts,
            );
            const minPsuWattage = calculateRecommendedPsuWattage(systemLoad);
            const matchingPsus = psus.filter((p) => p.wattage >= minPsuWattage);
            if (matchingPsus.length === 0) continue;

            const gpuLength = gpu.lengthMm ?? 260;

            const requiredCpu = estimateGpuRequiredCpuScore(gpu);
            const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
              cpu.gamingScore,
              requiredCpu,
              elasticity,
            );
            const rawGpuFps1440p = Math.max(0, gpu.rasterFps1440p);
            const effectiveFps1440p =
              Math.round(rawGpuFps1440p * bottleneckFactor * 10) / 10;
            const workloadEval = evaluateBuildForWorkload(
              { cpu, gpu, ram, storage },
              profile,
            );

            const precomputed: PrecomputedBuildMetrics = {
              workloadScore: workloadEval.workloadScore,
              workloadMetricLabel: workloadEval.metricLabel,
              bottleneckFactor,
              bottleneckPct,
              effectiveFps1440p,
              rawGpuFps1440p,
              estimatedPowerDrawWatts: systemLoad,
              recommendedPsuWattage: minPsuWattage,
            };

            for (const cooler of matchingCoolers) {
              const costWithCooler = costWithGpu + cooler.price;
              if (
                hasBudgetCap &&
                costWithCooler + minCase + minPsu > maxBudget
              ) {
                continue;
              }

              for (const pcCase of moboCases) {
                if (pcCase.maxGpuLengthMm < gpuLength) continue;
                if (pcCase.maxCpuCoolerHeightMm < cooler.heightMm) continue;

                const costWithCase = costWithCooler + pcCase.price;
                if (hasBudgetCap && costWithCase + minPsu > maxBudget) {
                  continue;
                }

                for (const psu of matchingPsus) {
                  if (hasBudgetCap && costWithCase + psu.price > maxBudget) {
                    continue;
                  }

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
                      true,
                      precomputed,
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

  // O(N) linear bucketing by price: at any identical price point,
  // builds with strictly lower score are dominated by the price-point champion.
  const bestByPrice = new Map<
    number,
    { maxScore: number; builds: PcBuild[] }
  >();
  const dominatedBuilds: PcBuild[] = [];

  for (const build of builds) {
    const score = build.workloadScore ?? build.effectiveFps1440p;
    const existing = bestByPrice.get(build.totalPrice);
    if (!existing) {
      bestByPrice.set(build.totalPrice, { maxScore: score, builds: [build] });
    } else if (score > existing.maxScore) {
      for (const d of existing.builds) dominatedBuilds.push(d);
      existing.maxScore = score;
      existing.builds = [build];
    } else if (score === existing.maxScore) {
      existing.builds.push(build);
    } else {
      dominatedBuilds.push(build);
    }
  }

  // Extract candidate builds for cross-price Pareto frontier sweep
  const candidates: PcBuild[] = [];
  for (const entry of bestByPrice.values()) {
    for (const b of entry.builds) candidates.push(b);
  }

  candidates.sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    const aScore = a.workloadScore ?? a.effectiveFps1440p;
    const bScore = b.workloadScore ?? b.effectiveFps1440p;
    if (aScore !== bScore) return bScore - aScore;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const optimalBuilds: PcBuild[] = [];
  let maxScore = -Infinity;

  for (const build of candidates) {
    const score = build.workloadScore ?? build.effectiveFps1440p;
    if (score > maxScore) {
      optimalBuilds.push(build);
      maxScore = score;
    } else if (
      optimalBuilds.length > 0 &&
      score === maxScore &&
      build.totalPrice === optimalBuilds[optimalBuilds.length - 1].totalPrice
    ) {
      optimalBuilds.push(build);
    } else {
      dominatedBuilds.push(build);
    }
  }

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
  preferredCpuVendor?: CpuVendorPreference;
  preferredFormFactor?: FormFactorPreference;
  preferredCoolerType?: CoolerTypePreference;
  preferredAesthetic?: AestheticPreference;
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
  const prunedMobos = pruneDominatedMotherboards(
    catalogs.motherboards,
    Boolean(criteria?.preferredFormFactor),
  );
  const prunedPsus = pruneDominatedPsus(catalogs.psus);
  const prunedGpus = pruneDominatedGpus(
    catalogs.gpus,
    Boolean(criteria?.preferredGpuVendor),
  );
  const prunedStorages = catalogs.storages
    ? pruneDominatedStorage(catalogs.storages)
    : [DEFAULT_STORAGE];
  const prunedCases = catalogs.cases
    ? pruneDominatedCases(catalogs.cases)
    : [DEFAULT_CASE];
  const prunedCoolers = catalogs.coolers
    ? pruneDominatedCoolers(catalogs.coolers)
    : [DEFAULT_COOLER];

  const profile = criteria?.workloadProfile ?? 'sweetspot-1440p';
  const elasticity = 0.5;
  const maxBudget = criteria?.maxBudget;
  const minBudget = criteria?.minBudget;
  const minEffectiveFps = criteria?.minEffectiveFps;

  // Filter catalogs by user preferences upfront to avoid examining non-matching subtrees
  let cpus = prunedCpus;
  let motherboards = prunedMobos;
  let ramKits = prunedRam;
  let gpus = prunedGpus;
  const psus = prunedPsus;
  const storages = prunedStorages;
  let cases = prunedCases;
  let coolers = prunedCoolers;

  if (criteria?.preferredSocket) {
    cpus = cpus.filter((c) => c.socket === criteria.preferredSocket);
    motherboards = motherboards.filter(
      (m) => m.socket === criteria.preferredSocket,
    );
  }
  if (criteria?.preferredRamGeneration) {
    ramKits = ramKits.filter(
      (r) => r.generation === criteria.preferredRamGeneration,
    );
    motherboards = motherboards.filter(
      (m) => m.ramGeneration === criteria.preferredRamGeneration,
    );
  }
  if (criteria?.preferredGpuVendor) {
    gpus = gpus.filter((g) => g.vendor === criteria.preferredGpuVendor);
  }
  if (criteria?.preferredCpuVendor && criteria.preferredCpuVendor !== 'ALL') {
    cpus = cpus.filter((c) => c.vendor === criteria.preferredCpuVendor);
  }
  if (criteria?.preferredFormFactor && criteria.preferredFormFactor !== 'ALL') {
    if (criteria.preferredFormFactor === 'SFF') {
      motherboards = motherboards.filter((m) => m.formFactor === 'Mini-ITX');
      cases = cases.filter((c) => c.isSff === true);
    } else if (criteria.preferredFormFactor === 'Micro-ATX') {
      motherboards = motherboards.filter((m) => m.formFactor === 'Micro-ATX');
      cases = cases.filter(
        (c) => c.supportedFormFactors.includes('Micro-ATX') && !c.isSff,
      );
    } else if (criteria.preferredFormFactor === 'ATX') {
      motherboards = motherboards.filter((m) => m.formFactor === 'ATX');
      cases = cases.filter((c) => c.supportedFormFactors.includes('ATX'));
    }
  }
  if (criteria?.preferredCoolerType && criteria.preferredCoolerType !== 'ALL') {
    coolers = coolers.filter((c) => c.type === criteria.preferredCoolerType);
  }
  if (criteria?.preferredAesthetic && criteria.preferredAesthetic !== 'ALL') {
    if (criteria.preferredAesthetic === 'RGB') {
      cases = cases.filter((c) => c.rgb === true);
    } else if (criteria.preferredAesthetic === 'Stealth') {
      cases = cases.filter((c) => c.rgb !== true);
      coolers = coolers.filter((c) => c.rgb !== true);
      ramKits = ramKits.filter((r) => r.rgb !== true);
    }
  }

  const prunedPartCounts = {
    cpus: prunedCpus.length,
    gpus: prunedGpus.length,
    motherboards: prunedMobos.length,
    ramKits: prunedRam.length,
    psus: prunedPsus.length,
    storages: prunedStorages.length,
    cases: prunedCases.length,
    coolers: prunedCoolers.length,
  };

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
    return {
      optimalBuilds: [],
      allCompatibleBuilds: [],
      dominatedBuilds: [],
      totalCompatibleBuilds: 0,
      prunedPartCounts,
    };
  }

  const { optimalTuples, sampleTuples, totalCompatibleBuilds } =
    searchOptimalBuildTuples(
      {
        cpus,
        motherboards,
        ramKits,
        storages,
        gpus,
        coolers,
        cases,
        psus,
      },
      {
        maxBudget,
        minBudget,
        minEffectiveFps,
        elasticity,
        profile,
      },
    );

  // Assemble full PcBuild objects strictly for optimal builds and samples
  const optimalBuilds = optimalTuples.map((t) =>
    assemblePcBuild(
      t.cpu,
      t.gpu,
      t.ram,
      t.mobo,
      t.psu,
      t.storage,
      t.pcCase,
      t.cooler,
      elasticity,
      profile,
      true,
      t.precomputed,
    ),
  );

  const allCompatibleBuilds =
    totalCompatibleBuilds <= 100
      ? sampleTuples.map((t) =>
          assemblePcBuild(
            t.cpu,
            t.gpu,
            t.ram,
            t.mobo,
            t.psu,
            t.storage,
            t.pcCase,
            t.cooler,
            elasticity,
            profile,
            true,
            t.precomputed,
          ),
        )
      : optimalBuilds.slice(0, 100);

  const dominatedBuilds: PcBuild[] = [];

  return {
    optimalBuilds,
    allCompatibleBuilds,
    dominatedBuilds,
    totalCompatibleBuilds,
    prunedPartCounts,
  };
}
