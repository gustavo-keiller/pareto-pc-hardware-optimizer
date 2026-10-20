import { describe, expect, it } from 'vitest';
import {
  optimizeFullSystemBuilds,
  pruneDominatedCases,
  pruneDominatedCoolers,
  pruneDominatedMotherboards,
} from '../combinatorial';
import {
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from '../buildTypes';
import { GpuCandidate } from '../types';

describe('Enthusiast Constraints Engine [BLD-08]', () => {
  // Test Fixtures
  const cpuAmd: CpuCandidate = {
    id: 'cpu-r5-7600',
    name: 'AMD Ryzen 5 7600',
    vendor: 'AMD',
    price: 195,
    socket: 'AM5',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 88,
    supportedRamGenerations: ['DDR5'],
  };

  const cpuIntel: CpuCandidate = {
    id: 'cpu-i5-13600k',
    name: 'Intel Core i5-13600K',
    vendor: 'Intel',
    price: 260,
    socket: 'LGA1700',
    cores: 14,
    threads: 20,
    tdpWatts: 125,
    gamingScore: 89,
    supportedRamGenerations: ['DDR4', 'DDR5'],
  };

  const gpuMid: GpuCandidate = {
    id: 'gpu-rtx4070',
    name: 'GeForce RTX 4070 12GB',
    vendor: 'NVIDIA',
    price: 549,
    rasterFps1440p: 105,
    rtFps1440p: 68,
    vramGb: 12,
    tdpWatts: 200,
    lengthMm: 242,
  };

  const moboAtxAm5: MotherboardCandidate = {
    id: 'mobo-b650-atx',
    name: 'B650 ATX Gaming',
    price: 160,
    socket: 'AM5',
    ramGeneration: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    m2Slots: 3,
  };

  const moboItxAm5: MotherboardCandidate = {
    id: 'mobo-b650i-itx',
    name: 'B650I Mini-ITX',
    price: 190,
    socket: 'AM5',
    ramGeneration: 'DDR5',
    ramSlots: 2,
    formFactor: 'Mini-ITX',
    m2Slots: 2,
  };

  const moboAtxIntel: MotherboardCandidate = {
    id: 'mobo-z790-atx',
    name: 'Z790 ATX Pro',
    price: 190,
    socket: 'LGA1700',
    ramGeneration: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
    m2Slots: 4,
  };

  const ramD5: RamCandidate = {
    id: 'ram-32gb-d5',
    name: '32GB DDR5-6000 CL30',
    price: 105,
    generation: 'DDR5',
    capacityGb: 32,
    speedMhz: 6000,
    modulesCount: 2,
    rgb: false,
  };

  const ramD5Rgb: RamCandidate = {
    id: 'ram-32gb-d5-rgb',
    name: '32GB DDR5-6000 CL30 RGB',
    price: 115,
    generation: 'DDR5',
    capacityGb: 32,
    speedMhz: 6000,
    modulesCount: 2,
    rgb: true,
  };

  const psu750: PsuCandidate = {
    id: 'psu-750w-gold',
    name: '750W 80+ Gold Modular',
    price: 100,
    wattage: 750,
    efficiencyRating: '80+ Gold',
    modular: 'Full',
  };

  const storageNvme: StorageCandidate = {
    id: 'nvme-1tb',
    name: '1TB Gen4 NVMe',
    price: 70,
    type: 'NVMe M.2',
    capacityGb: 1000,
    readSpeedMbps: 5000,
    formFactor: 'M.2-2280',
  };

  const caseAtxMesh: CaseCandidate = {
    id: 'case-atx-black',
    name: 'Mid-Tower ATX Blackout',
    price: 70,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 380,
    maxCpuCoolerHeightMm: 165,
    isSff: false,
    rgb: false,
  };

  const caseSffItx: CaseCandidate = {
    id: 'case-sff-itx',
    name: 'Compact Mini-ITX SFF',
    price: 95,
    supportedFormFactors: ['Mini-ITX'],
    maxGpuLengthMm: 330,
    maxCpuCoolerHeightMm: 155,
    isSff: true,
    rgb: false,
  };

  const caseAtxRgb: CaseCandidate = {
    id: 'case-atx-rgb',
    name: 'Mid-Tower ATX ARGB',
    price: 85,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 380,
    maxCpuCoolerHeightMm: 165,
    isSff: false,
    rgb: true,
  };

  const coolerAir: CoolerCandidate = {
    id: 'cooler-air-stealth',
    name: 'Dual Tower Air Cooler',
    price: 35,
    supportedSockets: ['AM5', 'LGA1700'],
    heightMm: 155,
    maxTdpWatts: 240,
    type: 'Air',
    rgb: false,
  };

  const coolerAioRgb: CoolerCandidate = {
    id: 'cooler-aio-240-rgb',
    name: '240mm AIO Liquid Cooler ARGB',
    price: 75,
    supportedSockets: ['AM5', 'LGA1700'],
    heightMm: 52,
    maxTdpWatts: 260,
    type: 'AIO',
    rgb: true,
  };

  const testCatalog = {
    cpus: [cpuAmd, cpuIntel],
    gpus: [gpuMid],
    motherboards: [moboAtxAm5, moboItxAm5, moboAtxIntel],
    ramKits: [ramD5, ramD5Rgb],
    psus: [psu750],
    storages: [storageNvme],
    cases: [caseAtxMesh, caseSffItx, caseAtxRgb],
    coolers: [coolerAir, coolerAioRgb],
  };

  it('filters builds strictly by CPU Vendor preference (AMD vs Intel)', () => {
    const amdResult = optimizeFullSystemBuilds(testCatalog, {
      preferredCpuVendor: 'AMD',
    });
    expect(amdResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of amdResult.optimalBuilds) {
      expect(build.cpu.vendor).toBe('AMD');
    }

    const intelResult = optimizeFullSystemBuilds(testCatalog, {
      preferredCpuVendor: 'Intel',
    });
    expect(intelResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of intelResult.optimalBuilds) {
      expect(build.cpu.vendor).toBe('Intel');
    }
  });

  it('filters builds strictly by Form Factor preference (SFF)', () => {
    const sffResult = optimizeFullSystemBuilds(testCatalog, {
      preferredFormFactor: 'SFF',
    });
    expect(sffResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of sffResult.optimalBuilds) {
      expect(build.motherboard.formFactor).toBe('Mini-ITX');
      expect(build.case.isSff).toBe(true);
    }
  });

  it('filters builds strictly by Cooler Type preference (Air vs AIO)', () => {
    const airResult = optimizeFullSystemBuilds(testCatalog, {
      preferredCoolerType: 'Air',
    });
    expect(airResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of airResult.optimalBuilds) {
      expect(build.cooler.type).toBe('Air');
    }

    const aioResult = optimizeFullSystemBuilds(testCatalog, {
      preferredCoolerType: 'AIO',
    });
    expect(aioResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of aioResult.optimalBuilds) {
      expect(build.cooler.type).toBe('AIO');
    }
  });

  it('filters builds strictly by Aesthetic preference (RGB vs Stealth)', () => {
    const stealthResult = optimizeFullSystemBuilds(testCatalog, {
      preferredAesthetic: 'Stealth',
    });
    expect(stealthResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of stealthResult.optimalBuilds) {
      expect(build.case.rgb).toBeFalsy();
      expect(build.cooler.rgb).toBeFalsy();
      expect(build.ram.rgb).toBeFalsy();
    }

    const rgbResult = optimizeFullSystemBuilds(testCatalog, {
      preferredAesthetic: 'RGB',
    });
    expect(rgbResult.optimalBuilds.length).toBeGreaterThan(0);
    for (const build of rgbResult.optimalBuilds) {
      const hasRgb = Boolean(
        build.case.rgb || build.cooler.rgb || build.ram.rgb,
      );
      expect(hasRgb).toBe(true);
    }
  });

  it('preserves Mini-ITX motherboards during intra-category pruning without ATX domination', () => {
    const mobos = [moboAtxAm5, moboItxAm5];
    const pruned = pruneDominatedMotherboards(mobos);
    // Mini-ITX motherboard must survive because ATX cannot fit SFF enclosures
    expect(pruned.some((m) => m.formFactor === 'Mini-ITX')).toBe(true);
  });

  it('preserves AIO coolers during intra-category pruning without Air cooler domination', () => {
    const coolers = [coolerAir, coolerAioRgb];
    const pruned = pruneDominatedCoolers(coolers);
    // Both Air and AIO must survive because they belong to different thermal/aesthetic partitions
    expect(pruned.some((c) => c.type === 'Air')).toBe(true);
    expect(pruned.some((c) => c.type === 'AIO')).toBe(true);
  });

  it('preserves SFF cases during intra-category pruning without ATX case domination', () => {
    const cases = [caseAtxMesh, caseSffItx];
    const pruned = pruneDominatedCases(cases);
    // SFF case must survive because full-size ATX cases cannot satisfy SFF constraints
    expect(pruned.some((c) => c.isSff)).toBe(true);
  });
});
