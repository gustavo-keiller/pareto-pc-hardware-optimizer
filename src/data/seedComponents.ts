import {
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
  isCpuSocket,
  isMotherboardFormFactor,
  isPsuEfficiencyRating,
  isRamGeneration,
} from '../lib/math/buildTypes';
import { HardwareVendor } from '../lib/math/types';
import cpusJson from './catalogs/cpus.json';
import motherboardsJson from './catalogs/motherboards.json';
import ramJson from './catalogs/ram.json';
import psusJson from './catalogs/psus.json';
import storagesJson from './catalogs/storage.json';
import casesJson from './catalogs/cases.json';
import coolersJson from './catalogs/coolers.json';

function parseCpu(item: (typeof cpusJson)[number]): CpuCandidate {
  if (!isCpuSocket(item.socket)) {
    throw new Error(`Invalid CPU socket: ${item.socket}`);
  }
  const vendor: HardwareVendor =
    item.vendor === 'AMD' || item.vendor === 'Intel' ? item.vendor : 'Other';
  const supportedRamGenerations =
    item.supportedRamGenerations.filter(isRamGeneration);
  return {
    ...item,
    socket: item.socket,
    vendor,
    supportedRamGenerations,
  };
}

function parseMotherboard(
  item: (typeof motherboardsJson)[number],
): MotherboardCandidate {
  if (!isCpuSocket(item.socket)) {
    throw new Error(`Invalid Motherboard socket: ${item.socket}`);
  }
  if (!isRamGeneration(item.ramGeneration)) {
    throw new Error(`Invalid RAM generation: ${item.ramGeneration}`);
  }
  if (!isMotherboardFormFactor(item.formFactor)) {
    throw new Error(`Invalid form factor: ${item.formFactor}`);
  }
  return {
    ...item,
    socket: item.socket,
    ramGeneration: item.ramGeneration,
    formFactor: item.formFactor,
  };
}

function parseRam(item: (typeof ramJson)[number]): RamCandidate {
  if (!isRamGeneration(item.generation)) {
    throw new Error(`Invalid RAM generation: ${item.generation}`);
  }
  return {
    ...item,
    generation: item.generation,
  };
}

function parseStorage(item: (typeof storagesJson)[number]): StorageCandidate {
  const type =
    item.type === 'NVMe M.2' || item.type === 'SATA 2.5"'
      ? item.type
      : 'NVMe M.2';
  const formFactor =
    item.formFactor === 'M.2-2280' || item.formFactor === '2.5-inch'
      ? item.formFactor
      : 'M.2-2280';
  return {
    ...item,
    type,
    formFactor,
  };
}

function parseCase(item: (typeof casesJson)[number]): CaseCandidate {
  const supportedFormFactors = item.supportedFormFactors.filter(
    isMotherboardFormFactor,
  );
  return {
    ...item,
    supportedFormFactors,
  };
}

function parseCooler(item: (typeof coolersJson)[number]): CoolerCandidate {
  const supportedSockets = item.supportedSockets.filter(isCpuSocket);
  const type =
    item.type === 'Air' || item.type === 'AIO' ? item.type : undefined;
  return {
    ...item,
    supportedSockets,
    type,
  };
}

function parsePsu(item: (typeof psusJson)[number]): PsuCandidate {
  if (!isPsuEfficiencyRating(item.efficiencyRating)) {
    throw new Error(`Invalid efficiency rating: ${item.efficiencyRating}`);
  }
  const modular =
    item.modular === 'Non' || item.modular === 'Semi' || item.modular === 'Full'
      ? item.modular
      : 'Non';
  return {
    ...item,
    efficiencyRating: item.efficiencyRating,
    modular,
  };
}

/**
 * Phase 3 Seed Hardware Catalogs.
 * Loaded from versioned JSON files in src/data/catalogs/ with schema validation.
 */
export const SEED_CPUS: CpuCandidate[] = cpusJson.map(parseCpu);
export const SEED_MOTHERBOARDS: MotherboardCandidate[] =
  motherboardsJson.map(parseMotherboard);
export const SEED_RAM_KITS: RamCandidate[] = ramJson.map(parseRam);
export const SEED_STORAGES: StorageCandidate[] = storagesJson.map(parseStorage);
export const SEED_CASES: CaseCandidate[] = casesJson.map(parseCase);
export const SEED_COOLERS: CoolerCandidate[] = coolersJson.map(parseCooler);
export const SEED_PSUS: PsuCandidate[] = psusJson.map(parsePsu);

/**
 * All seed components bundled by hardware category.
 */
export const SEED_COMPONENTS = {
  cpus: SEED_CPUS,
  motherboards: SEED_MOTHERBOARDS,
  ramKits: SEED_RAM_KITS,
  psus: SEED_PSUS,
  storages: SEED_STORAGES,
  cases: SEED_CASES,
  coolers: SEED_COOLERS,
} as const;
