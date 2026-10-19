import {
  assemblePcBuild,
  BuildWorkloadProfile,
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  DEFAULT_CASE,
  DEFAULT_COOLER,
  DEFAULT_STORAGE,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from './buildTypes';
import {
  ComponentCatalogs,
  generateCompatibleBuilds,
  pruneDominatedCases,
  pruneDominatedCoolers,
  pruneDominatedCpus,
  pruneDominatedMotherboards,
  pruneDominatedPsus,
  pruneDominatedRam,
  pruneDominatedStorage,
} from './combinatorial';
import { GpuCandidate, HardwareVendor } from './types';

export type ComponentCategory =
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'ram'
  | 'psu'
  | 'storage'
  | 'pcCase'
  | 'cooler';

export interface OwnedHardwareProfile {
  cpu?: CpuCandidate;
  gpu?: GpuCandidate;
  motherboard?: MotherboardCandidate;
  ram?: RamCandidate;
  psu?: PsuCandidate;
  storage?: StorageCandidate;
  pcCase?: CaseCandidate;
  cooler?: CoolerCandidate;
}

export interface UpgradeBuild {
  build: PcBuild;
  upgradeCost: number;
  retainedPartCategories: ComponentCategory[];
  upgradedPartCategories: ComponentCategory[];
  baselineScore?: number;
  scoreGain?: number;
  percentGain?: number;
  costPerScoreGained?: number;
}

export interface UpgradeFilterCriteria {
  maxUpgradeBudget?: number;
  minEffectiveFps?: number;
  workloadProfile?: BuildWorkloadProfile;
  preferredGpuVendor?: HardwareVendor;
  lockedCategories?: ComponentCategory[];
}

export interface UpgradeOptimizationResult {
  optimalUpgrades: UpgradeBuild[];
  allCompatibleUpgrades: UpgradeBuild[];
  totalCompatibleUpgrades: number;
  baselineBuild?: PcBuild;
  baselineScore?: number;
}

/**
 * Calculates net upgrade cost by checking which parts in candidate build match owned parts.
 */
export function calculateUpgradeCostAndParts(
  build: PcBuild,
  owned: OwnedHardwareProfile,
): {
  upgradeCost: number;
  retainedPartCategories: ComponentCategory[];
  upgradedPartCategories: ComponentCategory[];
} {
  let upgradeCost = 0;
  const retainedPartCategories: ComponentCategory[] = [];
  const upgradedPartCategories: ComponentCategory[] = [];

  // CPU
  if (owned.cpu && build.cpu.id === owned.cpu.id) {
    retainedPartCategories.push('cpu');
  } else {
    upgradedPartCategories.push('cpu');
    upgradeCost += build.cpu.price;
  }

  // GPU
  if (owned.gpu && build.gpu.id === owned.gpu.id) {
    retainedPartCategories.push('gpu');
  } else {
    upgradedPartCategories.push('gpu');
    upgradeCost += build.gpu.price;
  }

  // Motherboard
  if (owned.motherboard && build.motherboard.id === owned.motherboard.id) {
    retainedPartCategories.push('motherboard');
  } else {
    upgradedPartCategories.push('motherboard');
    upgradeCost += build.motherboard.price;
  }

  // RAM
  if (owned.ram && build.ram.id === owned.ram.id) {
    retainedPartCategories.push('ram');
  } else {
    upgradedPartCategories.push('ram');
    upgradeCost += build.ram.price;
  }

  // PSU
  if (owned.psu && build.psu.id === owned.psu.id) {
    retainedPartCategories.push('psu');
  } else {
    upgradedPartCategories.push('psu');
    upgradeCost += build.psu.price;
  }

  // Storage
  if (owned.storage && build.storage.id === owned.storage.id) {
    retainedPartCategories.push('storage');
  } else {
    upgradedPartCategories.push('storage');
    upgradeCost += build.storage.price;
  }

  // Case
  if (owned.pcCase && build.case.id === owned.pcCase.id) {
    retainedPartCategories.push('pcCase');
  } else {
    upgradedPartCategories.push('pcCase');
    upgradeCost += build.case.price;
  }

  // Cooler
  if (owned.cooler && build.cooler.id === owned.cooler.id) {
    retainedPartCategories.push('cooler');
  } else {
    upgradedPartCategories.push('cooler');
    upgradeCost += build.cooler.price;
  }

  return {
    upgradeCost,
    retainedPartCategories,
    upgradedPartCategories,
  };
}

/**
 * Extracts the 2D Pareto frontier of upgrades minimizing upgradeCost and maximizing workload performance.
 */
export function evaluateUpgradeParetoFrontier(
  upgrades: readonly UpgradeBuild[],
): UpgradeBuild[] {
  if (upgrades.length <= 1) return [...upgrades];

  // O(n log n) 2D Pareto sweep: sort by upgradeCost ascending; tie-break by workload score descending
  const sorted = [...upgrades].sort((a, b) => {
    if (a.upgradeCost !== b.upgradeCost) return a.upgradeCost - b.upgradeCost;
    const aScore = a.build.workloadScore ?? a.build.effectiveFps1440p;
    const bScore = b.build.workloadScore ?? b.build.effectiveFps1440p;
    if (aScore !== bScore) return bScore - aScore;
    return a.build.id.localeCompare(b.build.id);
  });

  const optimalUpgrades: UpgradeBuild[] = [];
  let maxScore = -Infinity;

  for (const upgrade of sorted) {
    const score =
      upgrade.build.workloadScore ?? upgrade.build.effectiveFps1440p;
    if (score > maxScore) {
      optimalUpgrades.push(upgrade);
      maxScore = score;
    } else if (
      optimalUpgrades.length > 0 &&
      score === maxScore &&
      upgrade.upgradeCost ===
        optimalUpgrades[optimalUpgrades.length - 1].upgradeCost
    ) {
      optimalUpgrades.push(upgrade);
    }
  }

  return optimalUpgrades;
}

/**
 * Main Upgrade Optimizer Engine (BLD-06):
 * Recommends optimal upgrade paths for users who already own hardware components.
 */
export function optimizeUpgradePaths(
  catalogs: ComponentCatalogs,
  owned: OwnedHardwareProfile,
  criteria?: UpgradeFilterCriteria,
): UpgradeOptimizationResult {
  const profile = criteria?.workloadProfile ?? 'sweetspot-1440p';

  // 1. Determine baseline build if user provided at least CPU and GPU
  let baselineBuild: PcBuild | undefined;
  let baselineScore: number | undefined;

  if (owned.cpu && owned.gpu) {
    const baseStorage = owned.storage ?? DEFAULT_STORAGE;
    const baseCase = owned.pcCase ?? DEFAULT_CASE;
    const baseCooler = owned.cooler ?? DEFAULT_COOLER;
    const baseRam = owned.ram ?? catalogs.ramKits[0];
    const baseMobo = owned.motherboard ?? catalogs.motherboards[0];
    const basePsu = owned.psu ?? catalogs.psus[0];

    baselineBuild = assemblePcBuild(
      owned.cpu,
      owned.gpu,
      baseRam,
      baseMobo,
      basePsu,
      baseStorage,
      baseCase,
      baseCooler,
      0.5,
      profile,
    );
    baselineScore =
      baselineBuild.workloadScore ?? baselineBuild.effectiveFps1440p;
  }

  // 2. Prepare candidate component lists
  // If user explicitly specifies lockedCategories, strictly lock those categories to [owned[cat]].
  // By default, if a category is owned, motherboard/ram/psu/case/cooler/storage are locked,
  // while CPU and GPU are upgradeable (retained owned part + catalog parts).
  const defaultLockedCategories: ComponentCategory[] = [
    'motherboard',
    'ram',
    'psu',
    'pcCase',
    'cooler',
    'storage',
  ];

  const lockedCategories = new Set<ComponentCategory>(
    criteria?.lockedCategories ??
      defaultLockedCategories.filter((cat) => owned[cat] !== undefined),
  );

  // CPU candidates
  let candidateCpus: CpuCandidate[];
  if (lockedCategories.has('cpu') && owned.cpu) {
    candidateCpus = [owned.cpu];
  } else {
    const prunedCpus = pruneDominatedCpus(catalogs.cpus);
    candidateCpus = owned.cpu
      ? [owned.cpu, ...prunedCpus.filter((c) => c.id !== owned.cpu?.id)]
      : prunedCpus;
  }

  // Motherboard candidates
  let candidateMobos: MotherboardCandidate[];
  if (lockedCategories.has('motherboard') && owned.motherboard) {
    candidateMobos = [owned.motherboard];
  } else {
    const prunedMobos = pruneDominatedMotherboards(catalogs.motherboards);
    candidateMobos = owned.motherboard
      ? [
          owned.motherboard,
          ...prunedMobos.filter((m) => m.id !== owned.motherboard?.id),
        ]
      : prunedMobos;
  }

  // RAM candidates
  let candidateRam: RamCandidate[];
  if (lockedCategories.has('ram') && owned.ram) {
    candidateRam = [owned.ram];
  } else {
    const prunedRam = pruneDominatedRam(catalogs.ramKits);
    candidateRam = owned.ram
      ? [owned.ram, ...prunedRam.filter((r) => r.id !== owned.ram?.id)]
      : prunedRam;
  }

  // PSU candidates
  let candidatePsus: PsuCandidate[];
  if (lockedCategories.has('psu') && owned.psu) {
    candidatePsus = [owned.psu];
  } else {
    const prunedPsus = pruneDominatedPsus(catalogs.psus);
    candidatePsus = owned.psu
      ? [owned.psu, ...prunedPsus.filter((p) => p.id !== owned.psu?.id)]
      : prunedPsus;
  }

  // Storage candidates
  let candidateStorages: StorageCandidate[];
  if (lockedCategories.has('storage') && owned.storage) {
    candidateStorages = [owned.storage];
  } else {
    const prunedStorages = catalogs.storages
      ? pruneDominatedStorage(catalogs.storages)
      : [DEFAULT_STORAGE];
    candidateStorages = owned.storage
      ? [
          owned.storage,
          ...prunedStorages.filter((s) => s.id !== owned.storage?.id),
        ]
      : prunedStorages;
  }

  // Case candidates
  let candidateCases: CaseCandidate[];
  if (lockedCategories.has('pcCase') && owned.pcCase) {
    candidateCases = [owned.pcCase];
  } else {
    const prunedCases = catalogs.cases
      ? pruneDominatedCases(catalogs.cases)
      : [DEFAULT_CASE];
    candidateCases = owned.pcCase
      ? [owned.pcCase, ...prunedCases.filter((c) => c.id !== owned.pcCase?.id)]
      : prunedCases;
  }

  // Cooler candidates
  let candidateCoolers: CoolerCandidate[];
  if (lockedCategories.has('cooler') && owned.cooler) {
    candidateCoolers = [owned.cooler];
  } else {
    const prunedCoolers = catalogs.coolers
      ? pruneDominatedCoolers(catalogs.coolers)
      : [DEFAULT_COOLER];
    candidateCoolers = owned.cooler
      ? [
          owned.cooler,
          ...prunedCoolers.filter((c) => c.id !== owned.cooler?.id),
        ]
      : prunedCoolers;
  }

  // GPU candidates
  let candidateGpus: GpuCandidate[];
  if (lockedCategories.has('gpu') && owned.gpu) {
    candidateGpus = [owned.gpu];
  } else {
    candidateGpus = owned.gpu
      ? [owned.gpu, ...catalogs.gpus.filter((g) => g.id !== owned.gpu?.id)]
      : [...catalogs.gpus];
  }

  if (criteria?.preferredGpuVendor) {
    candidateGpus = candidateGpus.filter(
      (g) => g.id === owned.gpu?.id || g.vendor === criteria.preferredGpuVendor,
    );
  }

  const upgradeCatalogs: ComponentCatalogs = {
    cpus: candidateCpus,
    gpus: candidateGpus,
    motherboards: candidateMobos,
    ramKits: candidateRam,
    psus: candidatePsus,
    storages: candidateStorages,
    cases: candidateCases,
    coolers: candidateCoolers,
  };

  // 3. Generate compatible builds using backtracking generator
  const rawCompatibleBuilds = generateCompatibleBuilds(upgradeCatalogs, {
    profile,
  });

  // 4. Map to UpgradeBuild with upgradeCost and performance gains
  const candidateUpgrades: UpgradeBuild[] = [];

  for (const build of rawCompatibleBuilds) {
    const { upgradeCost, retainedPartCategories, upgradedPartCategories } =
      calculateUpgradeCostAndParts(build, owned);

    // Apply criteria filters
    if (
      typeof criteria?.maxUpgradeBudget === 'number' &&
      upgradeCost > criteria.maxUpgradeBudget
    ) {
      continue;
    }

    const currentScore = build.workloadScore ?? build.effectiveFps1440p;
    if (
      typeof criteria?.minEffectiveFps === 'number' &&
      currentScore < criteria.minEffectiveFps
    ) {
      continue;
    }

    let scoreGain: number | undefined;
    let percentGain: number | undefined;
    let costPerScoreGained: number | undefined;

    if (typeof baselineScore === 'number') {
      scoreGain = Math.max(0, currentScore - baselineScore);
      percentGain = baselineScore > 0 ? (scoreGain / baselineScore) * 100 : 0;
      costPerScoreGained = scoreGain > 0 ? upgradeCost / scoreGain : undefined;
    }

    candidateUpgrades.push({
      build,
      upgradeCost,
      retainedPartCategories,
      upgradedPartCategories,
      baselineScore,
      scoreGain,
      percentGain,
      costPerScoreGained,
    });
  }

  // 5. Evaluate Upgrade Pareto Frontier
  const optimalUpgrades = evaluateUpgradeParetoFrontier(candidateUpgrades);

  return {
    optimalUpgrades,
    allCompatibleUpgrades: candidateUpgrades,
    totalCompatibleUpgrades: candidateUpgrades.length,
    baselineBuild,
    baselineScore,
  };
}
