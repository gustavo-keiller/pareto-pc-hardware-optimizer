import { GpuCandidate, HardwareVendor } from './types';

/**
 * Supported CPU sockets for modern desktop platforms.
 */
export type CpuSocket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851';

const CPU_SOCKET_MAP: Record<CpuSocket, true> = {
  AM4: true,
  AM5: true,
  LGA1700: true,
  LGA1851: true,
};

export function isCpuSocket(value: string): value is CpuSocket {
  return Object.prototype.hasOwnProperty.call(CPU_SOCKET_MAP, value);
}

/**
 * RAM generations in desktop gaming.
 */
export type RamGeneration = 'DDR4' | 'DDR5';

const RAM_GENERATION_MAP: Record<RamGeneration, true> = {
  DDR4: true,
  DDR5: true,
};

export function isRamGeneration(value: string): value is RamGeneration {
  return Object.prototype.hasOwnProperty.call(RAM_GENERATION_MAP, value);
}

/**
 * Motherboard form factor standards.
 */
export type MotherboardFormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX';

const FORM_FACTOR_MAP: Record<MotherboardFormFactor, true> = {
  ATX: true,
  'Micro-ATX': true,
  'Mini-ITX': true,
};

export function isMotherboardFormFactor(
  value: string,
): value is MotherboardFormFactor {
  return Object.prototype.hasOwnProperty.call(FORM_FACTOR_MAP, value);
}

/**
 * Enthusiast form factor preference:
 * - 'ALL': No restriction
 * - 'SFF': Small Form Factor (Mini-ITX motherboard and SFF-compatible case)
 * - 'Micro-ATX': Compact desktop (Micro-ATX motherboard)
 * - 'ATX': Standard full-size tower (ATX motherboard)
 */
export type FormFactorPreference = 'ALL' | 'SFF' | 'Micro-ATX' | 'ATX';

export function isFormFactorPreference(
  value: string,
): value is FormFactorPreference {
  return (
    value === 'ALL' ||
    value === 'SFF' ||
    value === 'Micro-ATX' ||
    value === 'ATX'
  );
}

/**
 * Cooler type preference:
 * - 'ALL': Any cooling solution
 * - 'Air': Traditional air heatsink
 * - 'AIO': All-In-One liquid cooler (radiator + pump)
 */
export type CoolerTypePreference = 'ALL' | 'Air' | 'AIO';

export function isCoolerTypePreference(
  value: string,
): value is CoolerTypePreference {
  return value === 'ALL' || value === 'Air' || value === 'AIO';
}

/**
 * Aesthetic theme preference:
 * - 'ALL': Any appearance
 * - 'RGB': Addressable RGB lighting components
 * - 'Stealth': Clean blackout / no-RGB aesthetic
 */
export type AestheticPreference = 'ALL' | 'RGB' | 'Stealth';

export function isAestheticPreference(
  value: string,
): value is AestheticPreference {
  return value === 'ALL' || value === 'RGB' || value === 'Stealth';
}

/**
 * CPU vendor preference:
 * - 'ALL': Any CPU manufacturer
 * - 'AMD': AMD Ryzen processors
 * - 'Intel': Intel Core processors
 */
export type CpuVendorPreference = 'ALL' | 'AMD' | 'Intel';

export function isCpuVendorPreference(
  value: string,
): value is CpuVendorPreference {
  return value === 'ALL' || value === 'AMD' || value === 'Intel';
}

/**
 * Power supply efficiency tier ratings.
 */
export type PsuEfficiencyRating =
  | '80+ White'
  | '80+ Bronze'
  | '80+ Silver'
  | '80+ Gold'
  | '80+ Platinum'
  | '80+ Titanium';

const PSU_EFFICIENCY_MAP: Record<PsuEfficiencyRating, true> = {
  '80+ White': true,
  '80+ Bronze': true,
  '80+ Silver': true,
  '80+ Gold': true,
  '80+ Platinum': true,
  '80+ Titanium': true,
};

export function isPsuEfficiencyRating(
  value: string,
): value is PsuEfficiencyRating {
  return Object.prototype.hasOwnProperty.call(PSU_EFFICIENCY_MAP, value);
}

export type PsuModularity = 'Non' | 'Semi' | 'Full';

/**
 * CPU candidate schema with socket, architecture, power, and gaming performance.
 */
export interface CpuCandidate {
  id: string;
  name: string;
  vendor: HardwareVendor;
  price: number;
  socket: CpuSocket;
  cores: number;
  threads: number;
  tdpWatts: number;
  /**
   * Relative gaming performance score (0–100 index).
   * E.g., Ryzen 7 7800X3D = 100, Core i5-13600K = 86, Ryzen 5 5600 = 65.
   */
  gamingScore: number;
  /**
   * RAM generations supported by the memory controller of this CPU.
   * AMD AM4 = ['DDR4'], AMD AM5 = ['DDR5'], Intel 12th-14th = ['DDR4', 'DDR5'].
   */
  supportedRamGenerations?: RamGeneration[];
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * Motherboard candidate schema with socket and RAM generation matching.
 */
export interface MotherboardCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  socket: CpuSocket;
  chipset?: string;
  ramGeneration: RamGeneration;
  ramSlots: number;
  formFactor: MotherboardFormFactor;
  pcieGeneration?: number;
  m2Slots?: number;
  rgb?: boolean;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * RAM candidate schema with memory generation, capacity, speed, and stick count.
 */
export interface RamCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  generation: RamGeneration;
  capacityGb: number;
  speedMhz: number;
  casLatency?: number;
  modulesCount: number;
  rgb?: boolean;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * Storage candidate schema (NVMe M.2 or SATA SSD).
 */
export type StorageType = 'NVMe M.2' | 'SATA 2.5"';
export type StorageFormFactor = 'M.2-2280' | '2.5-inch';

export interface StorageCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  type: StorageType;
  formFactor: StorageFormFactor;
  capacityGb: number;
  readSpeedMbps?: number;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * PC Case candidate schema with form factor compatibility and physical clearance limits.
 */
export interface CaseCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  supportedFormFactors: MotherboardFormFactor[];
  maxGpuLengthMm: number;
  maxCpuCoolerHeightMm: number;
  isSff?: boolean;
  rgb?: boolean;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * CPU Cooler candidate schema with socket bracket support, height, and cooling TDP.
 */
export type CoolerType = 'Air' | 'AIO';

export interface CoolerCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  supportedSockets: CpuSocket[];
  heightMm: number;
  maxTdpWatts: number;
  type?: CoolerType;
  rgb?: boolean;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * Power supply candidate schema with wattage and efficiency rating.
 */
export interface PsuCandidate {
  id: string;
  name: string;
  price: number;
  vendor?: string;
  wattage: number;
  efficiencyRating: PsuEfficiencyRating;
  modular: PsuModularity;
  notes?: string;
  source?: string;
  checkedAt?: string;
}

/**
 * GPU candidate with optional explicit CPU gaming score requirement.
 */
export interface BuildGpuCandidate extends GpuCandidate {
  gpuRequiredCpuScore?: number;
}

/**
 * Compatibility violation codes for explaining why a build is invalid.
 */
export type CompatibilityViolationCode =
  | 'SOCKET_MISMATCH'
  | 'RAM_GENERATION_MISMATCH'
  | 'CPU_RAM_MISMATCH'
  | 'INSUFFICIENT_PSU_WATTAGE'
  | 'EXCESSIVE_RAM_MODULES'
  | 'CASE_FORM_FACTOR_MISMATCH'
  | 'GPU_LENGTH_EXCEEDS_CASE'
  | 'COOLER_HEIGHT_EXCEEDS_CASE'
  | 'COOLER_SOCKET_MISMATCH'
  | 'INSUFFICIENT_COOLER_TDP'
  | 'INSUFFICIENT_M2_SLOTS';

export interface CompatibilityViolation {
  code: CompatibilityViolationCode;
  message: string;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  violations: CompatibilityViolation[];
}

/**
 * Baseline default components used when storage, case, or cooler are omitted.
 */
export const DEFAULT_STORAGE: StorageCandidate = {
  id: 'storage-nvme-1tb',
  name: '1TB NVMe PCIe 4.0 SSD',
  price: 65,
  type: 'NVMe M.2',
  formFactor: 'M.2-2280',
  capacityGb: 1000,
  readSpeedMbps: 5000,
  notes: 'High-speed mainstream PCIe 4.0 NVMe SSD.',
};

export const DEFAULT_CASE: CaseCandidate = {
  id: 'case-mid-tower-airflow',
  name: 'Mid-Tower Airflow Case',
  price: 70,
  supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
  maxGpuLengthMm: 360,
  maxCpuCoolerHeightMm: 165,
  notes: 'High-airflow mesh mid-tower case fitting standard hardware.',
};

export const DEFAULT_COOLER: CoolerCandidate = {
  id: 'cooler-tower-air',
  name: 'Tower Air Cooler 180W',
  price: 35,
  supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
  heightMm: 155,
  maxTdpWatts: 180,
  type: 'Air',
  notes: 'Dual-heatpipe tower cooler for mainstream processors.',
};

/**
 * Estimates the minimum CPU gaming score (0–100) needed to avoid bottlenecking a given GPU at 1440p.
 * Continuous monotonic model: 50 FPS -> 48; 70 FPS -> 57; 100 FPS -> 70; 140 FPS -> 88; 165+ FPS -> 99-100.
 */
export function estimateGpuRequiredCpuScore(gpu: BuildGpuCandidate): number {
  if (
    typeof gpu.gpuRequiredCpuScore === 'number' &&
    Number.isFinite(gpu.gpuRequiredCpuScore) &&
    gpu.gpuRequiredCpuScore > 0
  ) {
    return Math.min(100, Math.max(1, gpu.gpuRequiredCpuScore));
  }
  const fps = Math.max(0, gpu.rasterFps1440p);
  // Monotonic model: 25 + fps * 0.45, clamped between 30 and 100
  return Math.min(100, Math.max(30, Math.round(25 + fps * 0.45)));
}

/**
 * Computes the CPU-GPU throughput bottleneck factor and penalty percentage.
 * Formula: EffectiveFPS = GPU_FPS * min(1.0, (CPU_GamingScore / GPU_RequiredScore)^elasticity)
 */
export function computeCpuGpuBottleneck(
  cpuGamingScore: number,
  gpuRequiredCpuScore: number,
  elasticity = 0.5,
): { bottleneckFactor: number; bottleneckPct: number } {
  if (gpuRequiredCpuScore <= 0 || cpuGamingScore >= gpuRequiredCpuScore) {
    return { bottleneckFactor: 1.0, bottleneckPct: 0 };
  }
  if (cpuGamingScore <= 0) {
    return { bottleneckFactor: 0.0, bottleneckPct: 100 };
  }

  const ratio = Math.min(1.0, cpuGamingScore / gpuRequiredCpuScore);
  const factor = Math.min(1.0, Math.max(0.0, Math.pow(ratio, elasticity)));
  const penalty = Math.round((1.0 - factor) * 100 * 10) / 10;

  return {
    bottleneckFactor: factor,
    bottleneckPct: penalty,
  };
}

/**
 * Calculates estimated real-world peak system power draw in Watts.
 * Baseline: CPU TDP + GPU TDP + 75W (motherboard, fans, SSDs, RAM).
 */
export function calculateEstimatedPowerDraw(
  cpuTdpWatts: number,
  gpuTdpWatts: number,
  peripheralLoadWatts = 75,
): number {
  return (
    Math.max(0, cpuTdpWatts) +
    Math.max(0, gpuTdpWatts) +
    Math.max(0, peripheralLoadWatts)
  );
}

/**
 * Calculates recommended minimum PSU wattage with a 25% safety headroom multiplier.
 */
export function calculateRecommendedPsuWattage(
  estimatedPowerDrawWatts: number,
  safetyMultiplier = 1.25,
): number {
  if (estimatedPowerDrawWatts <= 0) return 0;
  return Math.ceil(estimatedPowerDrawWatts * safetyMultiplier);
}

/**
 * Stage 1 Hard-Constraint Compatibility Validator for Full PC Builds.
 */
export function checkBuildCompatibility(components: {
  cpu: CpuCandidate;
  gpu: GpuCandidate;
  ram: RamCandidate;
  motherboard: MotherboardCandidate;
  psu: PsuCandidate;
  storage?: StorageCandidate;
  case?: CaseCandidate;
  cooler?: CoolerCandidate;
}): CompatibilityCheckResult {
  const violations: CompatibilityViolation[] = [];
  const {
    cpu,
    gpu,
    ram,
    motherboard,
    psu,
    storage,
    case: pcCase,
    cooler,
  } = components;

  // 1. Socket match
  if (cpu.socket !== motherboard.socket) {
    violations.push({
      code: 'SOCKET_MISMATCH',
      message: `CPU socket (${cpu.socket}) does not match motherboard socket (${motherboard.socket}).`,
    });
  }

  // 2. RAM generation match with motherboard
  if (ram.generation !== motherboard.ramGeneration) {
    violations.push({
      code: 'RAM_GENERATION_MISMATCH',
      message: `RAM generation (${ram.generation}) does not match motherboard slot type (${motherboard.ramGeneration}).`,
    });
  }

  // 3. CPU memory controller support
  if (
    cpu.supportedRamGenerations &&
    cpu.supportedRamGenerations.length > 0 &&
    !cpu.supportedRamGenerations.includes(ram.generation)
  ) {
    violations.push({
      code: 'CPU_RAM_MISMATCH',
      message: `CPU ${cpu.name} does not support ${ram.generation} memory.`,
    });
  }

  // 4. Power supply capacity & safety headroom
  const systemLoad = calculateEstimatedPowerDraw(cpu.tdpWatts, gpu.tdpWatts);
  const recommendedMinPsu = calculateRecommendedPsuWattage(systemLoad);
  if (psu.wattage < recommendedMinPsu) {
    violations.push({
      code: 'INSUFFICIENT_PSU_WATTAGE',
      message: `PSU wattage (${psu.wattage}W) is below recommended safety minimum of ${recommendedMinPsu}W for ${systemLoad}W peak load.`,
    });
  }

  // 5. Physical RAM module slots
  if (ram.modulesCount > motherboard.ramSlots) {
    violations.push({
      code: 'EXCESSIVE_RAM_MODULES',
      message: `RAM kit has ${ram.modulesCount} modules, but motherboard only has ${motherboard.ramSlots} slots.`,
    });
  }

  // 6. Case motherboard form factor compatibility
  if (
    pcCase &&
    pcCase.supportedFormFactors &&
    !pcCase.supportedFormFactors.includes(motherboard.formFactor)
  ) {
    violations.push({
      code: 'CASE_FORM_FACTOR_MISMATCH',
      message: `Motherboard form factor (${motherboard.formFactor}) is not supported by case (${pcCase.name}, supports: ${pcCase.supportedFormFactors.join(', ')}).`,
    });
  }

  // 7. Case GPU length clearance
  const gpuLength = gpu.lengthMm ?? 260;
  if (pcCase && pcCase.maxGpuLengthMm && gpuLength > pcCase.maxGpuLengthMm) {
    const diff = gpuLength - pcCase.maxGpuLengthMm;
    violations.push({
      code: 'GPU_LENGTH_EXCEEDS_CASE',
      message: `GPU length (${gpuLength}mm) exceeds case max GPU clearance (${pcCase.maxGpuLengthMm}mm) by ${diff}mm.`,
    });
  }

  // 8. Case CPU cooler height clearance
  if (
    pcCase &&
    cooler &&
    cooler.heightMm &&
    pcCase.maxCpuCoolerHeightMm &&
    cooler.heightMm > pcCase.maxCpuCoolerHeightMm
  ) {
    const diff = cooler.heightMm - pcCase.maxCpuCoolerHeightMm;
    violations.push({
      code: 'COOLER_HEIGHT_EXCEEDS_CASE',
      message: `CPU cooler height (${cooler.heightMm}mm) exceeds case max cooler clearance (${pcCase.maxCpuCoolerHeightMm}mm) by ${diff}mm.`,
    });
  }

  // 9. CPU cooler socket bracket support
  if (
    cooler &&
    cooler.supportedSockets &&
    !cooler.supportedSockets.includes(cpu.socket)
  ) {
    violations.push({
      code: 'COOLER_SOCKET_MISMATCH',
      message: `CPU cooler bracket does not support ${cpu.socket} socket (supports: ${cooler.supportedSockets.join(', ')}).`,
    });
  }

  // 10. CPU cooler thermal dissipation capacity vs. CPU TDP
  if (cooler && cooler.maxTdpWatts && cooler.maxTdpWatts < cpu.tdpWatts) {
    violations.push({
      code: 'INSUFFICIENT_COOLER_TDP',
      message: `CPU cooler capacity (${cooler.maxTdpWatts}W) is insufficient for CPU TDP (${cpu.tdpWatts}W).`,
    });
  }

  // 11. Motherboard M.2 slots for NVMe storage
  const moboM2Slots = motherboard.m2Slots ?? 1;
  if (storage && storage.type === 'NVMe M.2' && moboM2Slots < 1) {
    violations.push({
      code: 'INSUFFICIENT_M2_SLOTS',
      message: `Motherboard (${motherboard.name}) has no M.2 slots for NVMe SSD (${storage.name}).`,
    });
  }

  return {
    isCompatible: violations.length === 0,
    violations,
  };
}

import {
  BuildWorkloadProfile,
  evaluateBuildForWorkload,
} from './workloadModels';

export type { BuildWorkloadProfile };
export { evaluateBuildForWorkload };

/**
 * System Build Tuple representing a complete assembled PC with all 8 components.
 */
export interface PcBuild {
  id: string;
  name?: string;
  cpu: CpuCandidate;
  gpu: GpuCandidate;
  ram: RamCandidate;
  motherboard: MotherboardCandidate;
  psu: PsuCandidate;
  storage: StorageCandidate;
  case: CaseCandidate;
  cooler: CoolerCandidate;

  // Financial & Performance Aggregates
  totalPrice: number;
  rawGpuFps1440p: number;
  effectiveFps1440p: number;
  bottleneckFactor: number;
  bottleneckPct: number;
  estimatedPowerDrawWatts: number;
  recommendedPsuWattage: number;
  powerHeadroomWatts: number;

  // Workload-Specific Telemetry (BLD-03)
  workloadScore?: number;
  workloadMetricLabel?: string;
  workloadProfile?: BuildWorkloadProfile;

  // Compatibility
  isCompatible: boolean;
  violations: CompatibilityViolation[];
}

export interface PrecomputedBuildMetrics {
  workloadScore: number;
  workloadMetricLabel: string;
  bottleneckFactor: number;
  bottleneckPct: number;
  effectiveFps1440p: number;
  rawGpuFps1440p: number;
  estimatedPowerDrawWatts: number;
  recommendedPsuWattage: number;
}

/**
 * Assembles 8 components into a fully evaluated PcBuild tuple.
 */
export function assemblePcBuild(
  cpu: CpuCandidate,
  gpu: GpuCandidate,
  ram: RamCandidate,
  motherboard: MotherboardCandidate,
  psu: PsuCandidate,
  storageOrElasticity?: StorageCandidate | number,
  pcCase?: CaseCandidate,
  cooler?: CoolerCandidate,
  elasticityArg?: number,
  profileArg?: BuildWorkloadProfile,
  knownCompatible = false,
  precomputed?: PrecomputedBuildMetrics,
): PcBuild {
  let storage = DEFAULT_STORAGE;
  let pcCaseActual = DEFAULT_CASE;
  let coolerActual = DEFAULT_COOLER;
  let elasticity = 0.5;
  const profile: BuildWorkloadProfile = profileArg ?? 'sweetspot-1440p';

  if (typeof storageOrElasticity === 'number') {
    elasticity = storageOrElasticity;
  } else {
    if (storageOrElasticity) storage = storageOrElasticity;
    if (pcCase) pcCaseActual = pcCase;
    if (cooler) coolerActual = cooler;
    if (typeof elasticityArg === 'number') elasticity = elasticityArg;
  }

  const compatibility = knownCompatible
    ? { isCompatible: true, violations: [] }
    : checkBuildCompatibility({
        cpu,
        gpu,
        ram,
        motherboard,
        psu,
        storage,
        case: pcCaseActual,
        cooler: coolerActual,
      });

  const bottleneckFactor =
    precomputed?.bottleneckFactor ??
    computeCpuGpuBottleneck(
      cpu.gamingScore,
      estimateGpuRequiredCpuScore(gpu),
      elasticity,
    ).bottleneckFactor;
  const bottleneckPct =
    precomputed?.bottleneckPct ??
    computeCpuGpuBottleneck(
      cpu.gamingScore,
      estimateGpuRequiredCpuScore(gpu),
      elasticity,
    ).bottleneckPct;
  const rawGpuFps1440p =
    precomputed?.rawGpuFps1440p ?? Math.max(0, gpu.rasterFps1440p);
  const effectiveFps1440p =
    precomputed?.effectiveFps1440p ??
    Math.round(rawGpuFps1440p * bottleneckFactor * 10) / 10;

  const totalPrice =
    cpu.price +
    gpu.price +
    ram.price +
    motherboard.price +
    psu.price +
    storage.price +
    pcCaseActual.price +
    coolerActual.price;

  const estimatedPowerDrawWatts =
    precomputed?.estimatedPowerDrawWatts ??
    calculateEstimatedPowerDraw(cpu.tdpWatts, gpu.tdpWatts);
  const recommendedPsuWattage =
    precomputed?.recommendedPsuWattage ??
    calculateRecommendedPsuWattage(estimatedPowerDrawWatts);
  const powerHeadroomWatts = psu.wattage - estimatedPowerDrawWatts;

  const workloadScore =
    precomputed?.workloadScore ??
    evaluateBuildForWorkload({ cpu, gpu, ram, storage }, profile).workloadScore;
  const workloadMetricLabel =
    precomputed?.workloadMetricLabel ??
    evaluateBuildForWorkload({ cpu, gpu, ram, storage }, profile).metricLabel;

  const id = `build-${cpu.id}-${gpu.id}-${ram.id}-${motherboard.id}-${psu.id}-${storage.id}-${pcCaseActual.id}-${coolerActual.id}`;

  return {
    id,
    cpu,
    gpu,
    ram,
    motherboard,
    psu,
    storage,
    case: pcCaseActual,
    cooler: coolerActual,
    totalPrice,
    rawGpuFps1440p,
    effectiveFps1440p,
    bottleneckFactor,
    bottleneckPct,
    estimatedPowerDrawWatts,
    recommendedPsuWattage,
    powerHeadroomWatts,
    workloadScore,
    workloadMetricLabel,
    workloadProfile: profile,
    isCompatible: compatibility.isCompatible,
    violations: compatibility.violations,
  };
}
