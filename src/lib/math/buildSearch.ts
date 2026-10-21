import {
  BuildWorkloadProfile,
  calculateEstimatedPowerDraw,
  calculateRecommendedPsuWattage,
  CaseCandidate,
  CoolerCandidate,
  computeCpuGpuBottleneck,
  CpuCandidate,
  estimateGpuRequiredCpuScore,
  evaluateBuildForWorkload,
  MotherboardCandidate,
  PrecomputedBuildMetrics,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from './buildTypes';
import { GpuCandidate } from './types';

/**
 * Lightweight tuple representation of a compatible PC build candidate.
 * Avoids eagerly allocating full PcBuild objects and string IDs during combinatorial exploration.
 */
export interface CandidateBuildTuple {
  cpu: CpuCandidate;
  gpu: GpuCandidate;
  ram: RamCandidate;
  mobo: MotherboardCandidate;
  psu: PsuCandidate;
  storage: StorageCandidate;
  pcCase: CaseCandidate;
  cooler: CoolerCandidate;
  totalPrice: number;
  score: number;
  precomputed: PrecomputedBuildMetrics;
}

export interface BuildSearchCatalogs {
  cpus: readonly CpuCandidate[];
  motherboards: readonly MotherboardCandidate[];
  ramKits: readonly RamCandidate[];
  storages: readonly StorageCandidate[];
  gpus: readonly GpuCandidate[];
  coolers: readonly CoolerCandidate[];
  cases: readonly CaseCandidate[];
  psus: readonly PsuCandidate[];
}

export interface BuildSearchOptions {
  maxBudget?: number;
  minBudget?: number;
  minEffectiveFps?: number;
  elasticity: number;
  profile: BuildWorkloadProfile;
}

export interface BuildSearchResult {
  optimalTuples: CandidateBuildTuple[];
  sampleTuples: CandidateBuildTuple[];
  totalCompatibleBuilds: number;
}

/**
 * High-performance 8-component combinatorial traversal.
 * Uses branch-and-bound lower bound budget pruning and price-point bucketing
 * to identify the 2D Pareto frontier (Price vs. Workload Score) without allocating
 * hundreds of thousands of full object structures.
 */
export function searchOptimalBuildTuples(
  catalogs: BuildSearchCatalogs,
  options: BuildSearchOptions,
): BuildSearchResult {
  const { cpus, motherboards, ramKits, storages, gpus, coolers, cases, psus } =
    catalogs;
  const { maxBudget, minBudget, minEffectiveFps, elasticity, profile } =
    options;
  const hasBudgetCap = typeof maxBudget === 'number';

  // Branch-and-bound lower bound estimators: cheapest component in each category
  const sortedPsus = [...psus].sort((a, b) => a.price - b.price);
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
  const minPsu =
    hasBudgetCap && sortedPsus.length > 0 ? sortedPsus[0].price : 0;

  const bestByPrice = new Map<
    number,
    { maxScore: number; tuples: CandidateBuildTuple[] }
  >();
  const sampleTuples: CandidateBuildTuple[] = [];
  let totalCompatibleBuilds = 0;

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

        for (const gpu of gpus) {
          const costWithGpu = costWithRam + gpu.price;
          if (
            hasBudgetCap &&
            costWithGpu + minStorage + minCooler + minCase + minPsu > maxBudget
          ) {
            continue;
          }

          const systemLoad = calculateEstimatedPowerDraw(
            cpu.tdpWatts,
            gpu.tdpWatts,
          );
          const minPsuWattage = calculateRecommendedPsuWattage(systemLoad);
          const matchingPsus = sortedPsus.filter(
            (p) => p.wattage >= minPsuWattage,
          );
          if (matchingPsus.length === 0) continue;

          const minRequiredPsuPrice = matchingPsus[0].price;

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

          for (const storage of matchingStorages) {
            const costWithStorage = costWithGpu + storage.price;
            if (
              hasBudgetCap &&
              costWithStorage + minCooler + minCase + minRequiredPsuPrice >
                maxBudget
            ) {
              continue;
            }

            const workloadEval = evaluateBuildForWorkload(
              { cpu, gpu, ram, storage },
              profile,
            );
            const score = workloadEval.workloadScore;

            if (
              typeof minEffectiveFps === 'number' &&
              score < minEffectiveFps
            ) {
              continue;
            }

            const precomputed: PrecomputedBuildMetrics = {
              workloadScore: score,
              workloadMetricLabel: workloadEval.metricLabel,
              bottleneckFactor,
              bottleneckPct,
              effectiveFps1440p,
              rawGpuFps1440p,
              estimatedPowerDrawWatts: systemLoad,
              recommendedPsuWattage: minPsuWattage,
            };

            for (const cooler of matchingCoolers) {
              const costWithCooler = costWithStorage + cooler.price;
              if (
                hasBudgetCap &&
                costWithCooler + minCase + minRequiredPsuPrice > maxBudget
              ) {
                continue;
              }

              for (const pcCase of moboCases) {
                if (pcCase.maxGpuLengthMm < gpuLength) continue;
                if (pcCase.maxCpuCoolerHeightMm < cooler.heightMm) continue;

                const costWithCase = costWithCooler + pcCase.price;
                if (
                  hasBudgetCap &&
                  costWithCase + minRequiredPsuPrice > maxBudget
                ) {
                  continue;
                }

                let minPsuPriceSeen = Infinity;

                for (const psu of matchingPsus) {
                  const totalPrice = costWithCase + psu.price;
                  if (hasBudgetCap && totalPrice > maxBudget) {
                    // Since matchingPsus is sorted by price ascending, any further PSUs will also exceed maxBudget
                    break;
                  }
                  if (typeof minBudget === 'number' && totalPrice < minBudget) {
                    continue;
                  }

                  totalCompatibleBuilds++;

                  // Only the cheapest PSU(s) for a given (cpu, gpu, ram, mobo, storage, cooler, case)
                  // can be Pareto-optimal. Any more expensive PSU with identical components
                  // produces a strictly dominated build with higher cost and identical score.
                  if (psu.price > minPsuPriceSeen) {
                    if (sampleTuples.length < 100) {
                      sampleTuples.push({
                        cpu,
                        gpu,
                        ram,
                        mobo,
                        psu,
                        storage,
                        pcCase,
                        cooler,
                        totalPrice,
                        score,
                        precomputed,
                      });
                    }
                    continue;
                  }
                  minPsuPriceSeen = psu.price;

                  const existing = bestByPrice.get(totalPrice);
                  if (existing && score < existing.maxScore) {
                    if (sampleTuples.length < 100) {
                      sampleTuples.push({
                        cpu,
                        gpu,
                        ram,
                        mobo,
                        psu,
                        storage,
                        pcCase,
                        cooler,
                        totalPrice,
                        score,
                        precomputed,
                      });
                    }
                    continue;
                  }

                  const tuple: CandidateBuildTuple = {
                    cpu,
                    gpu,
                    ram,
                    mobo,
                    psu,
                    storage,
                    pcCase,
                    cooler,
                    totalPrice,
                    score,
                    precomputed,
                  };

                  if (!existing) {
                    bestByPrice.set(totalPrice, {
                      maxScore: score,
                      tuples: [tuple],
                    });
                  } else if (score > existing.maxScore) {
                    existing.maxScore = score;
                    existing.tuples = [tuple];
                  } else if (score === existing.maxScore) {
                    existing.tuples.push(tuple);
                  }

                  if (sampleTuples.length < 100) {
                    sampleTuples.push(tuple);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Extract cross-price 2D Pareto frontier from bestByPrice
  const candidateTuples: CandidateBuildTuple[] = [];
  for (const entry of bestByPrice.values()) {
    for (const t of entry.tuples) {
      candidateTuples.push(t);
    }
  }

  candidateTuples.sort((a, b) => {
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    if (a.score !== b.score) return b.score - a.score;
    const aKey = `${a.cpu.id}_${a.gpu.id}_${a.ram.id}_${a.mobo.id}_${a.psu.id}_${a.storage.id}_${a.pcCase.id}_${a.cooler.id}`;
    const bKey = `${b.cpu.id}_${b.gpu.id}_${b.ram.id}_${b.mobo.id}_${b.psu.id}_${b.storage.id}_${b.pcCase.id}_${b.cooler.id}`;
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });

  const optimalTuples: CandidateBuildTuple[] = [];
  let maxScoreSeen = -Infinity;

  for (const t of candidateTuples) {
    if (t.score > maxScoreSeen) {
      optimalTuples.push(t);
      maxScoreSeen = t.score;
    } else if (
      optimalTuples.length > 0 &&
      t.score === maxScoreSeen &&
      t.totalPrice === optimalTuples[optimalTuples.length - 1].totalPrice
    ) {
      optimalTuples.push(t);
    }
  }

  return {
    optimalTuples,
    sampleTuples,
    totalCompatibleBuilds,
  };
}
