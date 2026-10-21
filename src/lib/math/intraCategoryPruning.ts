import {
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PsuCandidate,
  PsuEfficiencyRating,
  RamCandidate,
  StorageCandidate,
} from './buildTypes';
import { GpuCandidate } from './types';

/**
 * Numeric efficiency tier for comparing PSU energy efficiency ratings.
 */
export const PSU_EFFICIENCY_TIER: Record<PsuEfficiencyRating, number> = {
  '80+ White': 1,
  '80+ Bronze': 2,
  '80+ Silver': 3,
  '80+ Gold': 4,
  '80+ Platinum': 5,
  '80+ Titanium': 6,
};

/**
 * Prunes strictly dominated CPUs within each platform socket.
 * A CPU is dominated if another CPU in the SAME socket is cheaper or equal in price,
 * faster or equal in gaming performance, and draws less or equal TDP,
 * with at least one strictly better.
 *
 * NOTE: Pruning is ALWAYS partitioned by socket. A CPU on socket A cannot dominate
 * a CPU on socket B because motherboard and RAM platform costs differ.
 * Parts are NEVER pruned by name (e.g. [TRAP]).
 */
export function pruneDominatedCpus(
  cpus: readonly CpuCandidate[],
  _partitionBySocket = true,
): CpuCandidate[] {
  if (cpus.length <= 1) return [...cpus];

  return cpus.filter((candidate) => {
    return !cpus.some((other) => {
      if (other.id === candidate.id) return false;
      // Socket compatibility partition: never prune across sockets
      if (other.socket !== candidate.socket) return false;

      const priceBetterOrEqual = other.price <= candidate.price;
      const scoreBetterOrEqual = other.gamingScore >= candidate.gamingScore;
      const coresBetterOrEqual = (other.cores ?? 6) >= (candidate.cores ?? 6);
      const tdpBetterOrEqual = other.tdpWatts <= candidate.tdpWatts;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.gamingScore > candidate.gamingScore ||
        (other.cores ?? 6) > (candidate.cores ?? 6);

      return (
        priceBetterOrEqual &&
        scoreBetterOrEqual &&
        coresBetterOrEqual &&
        tdpBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated RAM kits within the same generation (DDR4 vs DDR5).
 * A kit is dominated if another kit in the SAME generation is cheaper/equal,
 * has greater/equal capacity, higher/equal speed, and requires fewer/equal modules,
 * with at least one strictly better.
 *
 * NOTE: Pruning is ALWAYS partitioned by generation. DDR4 cannot fit DDR5 boards and vice versa.
 */
export function pruneDominatedRam(
  ramKits: readonly RamCandidate[],
  _partitionByGeneration = true,
): RamCandidate[] {
  if (ramKits.length <= 1) return [...ramKits];

  return ramKits.filter((candidate) => {
    return !ramKits.some((other) => {
      if (other.id === candidate.id) return false;
      // RAM generation compatibility partition: never prune across DDR4 / DDR5
      if (other.generation !== candidate.generation) {
        return false;
      }
      // Aesthetic partition: never prune RGB against non-RGB
      if (Boolean(candidate.rgb) !== Boolean(other.rgb)) {
        return false;
      }

      const priceBetterOrEqual = other.price <= candidate.price;
      const capacityBetterOrEqual = other.capacityGb >= candidate.capacityGb;
      const speedBetterOrEqual = other.speedMhz >= candidate.speedMhz;
      const modulesBetterOrEqual = other.modulesCount <= candidate.modulesCount;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.capacityGb > candidate.capacityGb ||
        other.speedMhz > candidate.speedMhz;

      return (
        priceBetterOrEqual &&
        capacityBetterOrEqual &&
        speedBetterOrEqual &&
        modulesBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}

/**
 * Prunes strictly dominated Motherboards within each (socket, ramGeneration, formFactor) platform.
 * A board is dominated if another board has lower/equal price, greater/equal RAM slots,
 * greater/equal PCIe gen, and greater/equal M.2 slots, with at least one strictly better.
 */
export function pruneDominatedMotherboards(
  motherboards: readonly MotherboardCandidate[],
  partitionByFormFactor = false,
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
      if (partitionByFormFactor && other.formFactor !== candidate.formFactor) {
        return false;
      }
      // Mini-ITX boards can fit in SFF enclosures where ATX cannot fit.
      // An ATX or Micro-ATX board cannot safely dominate a Mini-ITX board.
      if (
        candidate.formFactor === 'Mini-ITX' &&
        other.formFactor !== 'Mini-ITX'
      ) {
        return false;
      }

      const otherPcie = other.pcieGeneration ?? 3;
      const candPcie = candidate.pcieGeneration ?? 3;
      const otherM2 = other.m2Slots ?? 1;
      const candM2 = candidate.m2Slots ?? 1;

      const priceBetterOrEqual = other.price <= candidate.price;
      const slotsBetterOrEqual = other.ramSlots >= candidate.ramSlots;
      const pcieBetterOrEqual = otherPcie >= candPcie;
      const m2BetterOrEqual = otherM2 >= candM2;
      const atLeastOneStrict =
        other.price < candidate.price ||
        other.ramSlots > candidate.ramSlots ||
        otherPcie > candPcie ||
        otherM2 > candM2;

      return (
        priceBetterOrEqual &&
        slotsBetterOrEqual &&
        pcieBetterOrEqual &&
        m2BetterOrEqual &&
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

      // SFF partition: an ATX case cannot dominate a dedicated Small Form Factor case
      if (Boolean(candidate.isSff) !== Boolean(other.isSff)) return false;
      // Aesthetic partition: never prune RGB against non-RGB
      if (Boolean(candidate.rgb) !== Boolean(other.rgb)) return false;

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

      // Cooler type partition: Air coolers cannot dominate AIO liquid coolers and vice versa
      if (candidate.type && other.type && candidate.type !== other.type) {
        return false;
      }
      // Aesthetic partition: never prune RGB against non-RGB
      if (Boolean(candidate.rgb) !== Boolean(other.rgb)) return false;

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
 * Prunes strictly dominated GPUs within the combinatorial builder.
 * A GPU is dominated if another GPU is cheaper or equal in price,
 * faster or equal in both raster and ray tracing, has greater or equal VRAM,
 * draws less or equal power (strict TDP <= candidate TDP),
 * and has lower or equal length (strict lengthMm <= candidate lengthMm),
 * with at least one strictly better.
 *
 * NOTE: Parts are NEVER pruned by name (e.g. [TRAP]).
 * Vendors are partitioned if partitionByVendor is requested, or if other is non-NVIDIA
 * when candidate is NVIDIA (because creator-ai grants NVIDIA CUDA/Tensor bonus).
 */
export function pruneDominatedGpus(
  gpus: readonly GpuCandidate[],
  partitionByVendor = false,
): GpuCandidate[] {
  if (gpus.length <= 1) return [...gpus];

  return gpus.filter((candidate) => {
    return !gpus.some((other) => {
      if (other.id === candidate.id) return false;
      if (partitionByVendor && other.vendor !== candidate.vendor) return false;

      // Creator-AI gives NVIDIA a vendor bonus (10 vs 4).
      // A non-NVIDIA card cannot safely dominate an NVIDIA card across all workloads.
      if (candidate.vendor === 'NVIDIA' && other.vendor !== 'NVIDIA') {
        return false;
      }

      const otherLength = other.lengthMm ?? 260;
      const candLength = candidate.lengthMm ?? 260;

      const priceBetterOrEqual = other.price <= candidate.price;
      const rasterBetterOrEqual =
        other.rasterFps1440p >= candidate.rasterFps1440p;
      const rtBetterOrEqual = other.rtFps1440p >= candidate.rtFps1440p;
      const vramBetterOrEqual = other.vramGb >= candidate.vramGb;
      const tdpBetterOrEqual = other.tdpWatts <= candidate.tdpWatts;
      const lengthBetterOrEqual = otherLength <= candLength;

      const atLeastOneStrict =
        other.price < candidate.price ||
        other.rasterFps1440p > candidate.rasterFps1440p ||
        other.rtFps1440p > candidate.rtFps1440p ||
        other.vramGb > candidate.vramGb;

      return (
        priceBetterOrEqual &&
        rasterBetterOrEqual &&
        rtBetterOrEqual &&
        vramBetterOrEqual &&
        tdpBetterOrEqual &&
        lengthBetterOrEqual &&
        atLeastOneStrict
      );
    });
  });
}
