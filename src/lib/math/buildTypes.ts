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
  notes?: string;
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
  notes?: string;
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
  | 'EXCESSIVE_RAM_MODULES';

export interface CompatibilityViolation {
  code: CompatibilityViolationCode;
  message: string;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  violations: CompatibilityViolation[];
}

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
}): CompatibilityCheckResult {
  const violations: CompatibilityViolation[] = [];
  const { cpu, gpu, ram, motherboard, psu } = components;

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

  return {
    isCompatible: violations.length === 0,
    violations,
  };
}

/**
 * System Build Tuple representing a complete assembled PC.
 */
export interface PcBuild {
  id: string;
  name?: string;
  cpu: CpuCandidate;
  gpu: GpuCandidate;
  ram: RamCandidate;
  motherboard: MotherboardCandidate;
  psu: PsuCandidate;

  // Financial & Performance Aggregates
  totalPrice: number;
  rawGpuFps1440p: number;
  effectiveFps1440p: number;
  bottleneckFactor: number;
  bottleneckPct: number;
  estimatedPowerDrawWatts: number;
  recommendedPsuWattage: number;
  powerHeadroomWatts: number;

  // Compatibility
  isCompatible: boolean;
  violations: CompatibilityViolation[];
}

/**
 * Assembles 5 components into a fully evaluated PcBuild tuple.
 */
export function assemblePcBuild(
  cpu: CpuCandidate,
  gpu: GpuCandidate,
  ram: RamCandidate,
  motherboard: MotherboardCandidate,
  psu: PsuCandidate,
  elasticity = 0.5,
): PcBuild {
  const compatibility = checkBuildCompatibility({
    cpu,
    gpu,
    ram,
    motherboard,
    psu,
  });
  const requiredCpuScore = estimateGpuRequiredCpuScore(gpu);
  const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
    cpu.gamingScore,
    requiredCpuScore,
    elasticity,
  );

  const rawGpuFps1440p = Math.max(0, gpu.rasterFps1440p);
  const effectiveFps1440p =
    Math.round(rawGpuFps1440p * bottleneckFactor * 10) / 10;
  const totalPrice =
    cpu.price + gpu.price + ram.price + motherboard.price + psu.price;
  const estimatedPowerDrawWatts = calculateEstimatedPowerDraw(
    cpu.tdpWatts,
    gpu.tdpWatts,
  );
  const recommendedPsuWattage = calculateRecommendedPsuWattage(
    estimatedPowerDrawWatts,
  );
  const powerHeadroomWatts = psu.wattage - estimatedPowerDrawWatts;

  const id = `build-${cpu.id}-${gpu.id}-${ram.id}-${motherboard.id}-${psu.id}`;

  return {
    id,
    cpu,
    gpu,
    ram,
    motherboard,
    psu,
    totalPrice,
    rawGpuFps1440p,
    effectiveFps1440p,
    bottleneckFactor,
    bottleneckPct,
    estimatedPowerDrawWatts,
    recommendedPsuWattage,
    powerHeadroomWatts,
    isCompatible: compatibility.isCompatible,
    violations: compatibility.violations,
  };
}
