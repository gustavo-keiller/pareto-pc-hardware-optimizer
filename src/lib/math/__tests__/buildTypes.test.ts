import { describe, expect, it } from 'vitest';
import {
  assemblePcBuild,
  calculateEstimatedPowerDraw,
  calculateRecommendedPsuWattage,
  CaseCandidate,
  checkBuildCompatibility,
  computeCpuGpuBottleneck,
  CoolerCandidate,
  CpuCandidate,
  estimateGpuRequiredCpuScore,
  isCpuSocket,
  isRamGeneration,
  MotherboardCandidate,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from '../buildTypes';
import { GpuCandidate } from '../types';

describe('buildTypes & Phase 3 Multi-Component Math Engine', () => {
  const mockCpuAM4: CpuCandidate = {
    id: 'cpu-5600',
    name: 'Ryzen 5 5600',
    vendor: 'AMD',
    price: 130,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 65,
    supportedRamGenerations: ['DDR4'],
  };

  const mockCpuAM5: CpuCandidate = {
    id: 'cpu-7800x3d',
    name: 'Ryzen 7 7800X3D',
    vendor: 'AMD',
    price: 420,
    socket: 'AM5',
    cores: 8,
    threads: 16,
    tdpWatts: 120,
    gamingScore: 100,
    supportedRamGenerations: ['DDR5'],
  };

  const mockCpuIntel13: CpuCandidate = {
    id: 'cpu-13600k',
    name: 'Core i5-13600K',
    vendor: 'Intel',
    price: 270,
    socket: 'LGA1700',
    cores: 14,
    threads: 20,
    tdpWatts: 125,
    gamingScore: 86,
    supportedRamGenerations: ['DDR4', 'DDR5'],
  };

  const mockMoboAM4: MotherboardCandidate = {
    id: 'mobo-b550',
    name: 'MSI B550-A PRO',
    price: 110,
    socket: 'AM4',
    ramGeneration: 'DDR4',
    ramSlots: 4,
    formFactor: 'ATX',
  };

  const mockMoboAM5: MotherboardCandidate = {
    id: 'mobo-b650',
    name: 'Gigabyte B650 Gaming X',
    price: 160,
    socket: 'AM5',
    ramGeneration: 'DDR5',
    ramSlots: 4,
    formFactor: 'ATX',
  };

  const mockRamDdr4: RamCandidate = {
    id: 'ram-ddr4-16',
    name: '16GB DDR4-3200',
    price: 35,
    generation: 'DDR4',
    capacityGb: 16,
    speedMhz: 3200,
    modulesCount: 2,
  };

  const mockRamDdr5: RamCandidate = {
    id: 'ram-ddr5-32',
    name: '32GB DDR5-6000',
    price: 95,
    generation: 'DDR5',
    capacityGb: 32,
    speedMhz: 6000,
    modulesCount: 2,
  };

  const mockPsu550: PsuCandidate = {
    id: 'psu-550',
    name: 'MSI MAG A550BN 550W',
    price: 55,
    wattage: 550,
    efficiencyRating: '80+ Bronze',
    modular: 'Non',
  };

  const mockPsu850: PsuCandidate = {
    id: 'psu-850',
    name: 'Corsair RM850x 850W',
    price: 130,
    wattage: 850,
    efficiencyRating: '80+ Gold',
    modular: 'Full',
  };

  const mockGpuMid: GpuCandidate = {
    id: 'gpu-rx7600',
    name: 'Radeon RX 7600',
    price: 260,
    rasterFps1440p: 64,
    rtFps1440p: 33,
    vramGb: 8,
    tdpWatts: 165,
  };

  const mockGpuTop: GpuCandidate = {
    id: 'gpu-rtx4080',
    name: 'GeForce RTX 4080 Super',
    price: 980,
    rasterFps1440p: 162,
    rtFps1440p: 118,
    vramGb: 16,
    tdpWatts: 320,
    lengthMm: 304,
  };

  const mockCaseATX: CaseCandidate = {
    id: 'case-atx',
    name: 'Mid-Tower ATX Case',
    price: 65,
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 360,
    maxCpuCoolerHeightMm: 165,
  };

  const mockCaseMiniITX: CaseCandidate = {
    id: 'case-itx',
    name: 'Compact Mini-ITX Case',
    price: 90,
    supportedFormFactors: ['Mini-ITX'],
    maxGpuLengthMm: 310,
    maxCpuCoolerHeightMm: 75,
  };

  const mockCoolerTower: CoolerCandidate = {
    id: 'cooler-tower',
    name: 'Tower Air Cooler',
    price: 35,
    supportedSockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
    heightMm: 155,
    maxTdpWatts: 200,
    type: 'Air',
  };

  const mockCoolerLowProfile: CoolerCandidate = {
    id: 'cooler-low-profile',
    name: 'Low Profile 65W Cooler',
    price: 25,
    supportedSockets: ['AM4', 'AM5'],
    heightMm: 45,
    maxTdpWatts: 65,
    type: 'Air',
  };

  const mockStorageNvme: StorageCandidate = {
    id: 'storage-nvme-1tb',
    name: '1TB NVMe SSD',
    price: 60,
    type: 'NVMe M.2',
    formFactor: 'M.2-2280',
    capacityGb: 1000,
    readSpeedMbps: 5000,
  };

  describe('Compatibility Rules (Stage 1 / Hard Constraints)', () => {
    it('approves a fully matched, adequately powered AM4 build', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM4,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects socket mismatch when AM4 CPU is placed on AM5 motherboard', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRamDdr5,
        motherboard: mockMoboAM5,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(false);
      expect(result.violations.some((v) => v.code === 'SOCKET_MISMATCH')).toBe(
        true,
      );
    });

    it('rejects RAM generation mismatch when DDR4 RAM is placed on DDR5 motherboard', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM5,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM5,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(false);
      expect(
        result.violations.some((v) => v.code === 'RAM_GENERATION_MISMATCH'),
      ).toBe(true);
    });

    it('rejects CPU RAM incompatibility if CPU does not support DDR4 (AM5 with DDR4)', () => {
      // Mock hypothetical board that erroneously allowed DDR4 on AM5
      const mockMoboAM5Ddr4: MotherboardCandidate = {
        ...mockMoboAM5,
        ramGeneration: 'DDR4',
      };

      const result = checkBuildCompatibility({
        cpu: mockCpuAM5,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM5Ddr4,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(false);
      expect(result.violations.some((v) => v.code === 'CPU_RAM_MISMATCH')).toBe(
        true,
      );
    });

    it('allows Intel LGA1700 CPUs with either DDR4 or DDR5 depending on motherboard', () => {
      const moboLGA1700D4: MotherboardCandidate = {
        id: 'mobo-b760-d4',
        name: 'MSI B760 DDR4',
        price: 130,
        socket: 'LGA1700',
        ramGeneration: 'DDR4',
        ramSlots: 4,
        formFactor: 'ATX',
      };

      const resultD4 = checkBuildCompatibility({
        cpu: mockCpuIntel13,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: moboLGA1700D4,
        psu: mockPsu550,
      });
      expect(resultD4.isCompatible).toBe(true);

      const moboLGA1700D5: MotherboardCandidate = {
        id: 'mobo-b760-d5',
        name: 'MSI B760 DDR5',
        price: 150,
        socket: 'LGA1700',
        ramGeneration: 'DDR5',
        ramSlots: 4,
        formFactor: 'ATX',
      };

      const resultD5 = checkBuildCompatibility({
        cpu: mockCpuIntel13,
        gpu: mockGpuMid,
        ram: mockRamDdr5,
        motherboard: moboLGA1700D5,
        psu: mockPsu550,
      });
      expect(resultD5.isCompatible).toBe(true);
    });

    it('rejects build with insufficient PSU wattage', () => {
      // CPU TDP 120W + GPU TDP 320W + 75W base = 515W.
      // Recommended minimum = 515W * 1.25 = 643.75W -> 644W.
      // 550W PSU is underpowered for this 515W load.
      const result = checkBuildCompatibility({
        cpu: mockCpuAM5,
        gpu: mockGpuTop,
        ram: mockRamDdr5,
        motherboard: mockMoboAM5,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(false);
      expect(
        result.violations.some((v) => v.code === 'INSUFFICIENT_PSU_WATTAGE'),
      ).toBe(true);
    });

    it('approves same high-power build with 850W PSU', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM5,
        gpu: mockGpuTop,
        ram: mockRamDdr5,
        motherboard: mockMoboAM5,
        psu: mockPsu850,
      });

      expect(result.isCompatible).toBe(true);
    });

    it('rejects RAM kit requiring more slots than the motherboard provides', () => {
      const mockMobo2Slots: MotherboardCandidate = {
        ...mockMoboAM4,
        ramSlots: 2,
      };

      const mockRam4Sticks: RamCandidate = {
        ...mockRamDdr4,
        modulesCount: 4,
      };

      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRam4Sticks,
        motherboard: mockMobo2Slots,
        psu: mockPsu550,
      });

      expect(result.isCompatible).toBe(false);
      expect(
        result.violations.some((v) => v.code === 'EXCESSIVE_RAM_MODULES'),
      ).toBe(true);
    });

    it('rejects ATX motherboard when paired with Mini-ITX case', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM4, // ATX
        psu: mockPsu550,
        case: mockCaseMiniITX, // Mini-ITX only
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'CASE_FORM_FACTOR_MISMATCH',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('ATX');
      expect(violation?.message).toContain('Compact Mini-ITX Case');
    });

    it('rejects GPU whose length exceeds case clearance with exact delta in message', () => {
      const longGpu: GpuCandidate = {
        ...mockGpuTop,
        lengthMm: 340,
      };
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: longGpu,
        ram: mockRamDdr4,
        motherboard: mockMoboAM4,
        psu: mockPsu850,
        case: mockCaseMiniITX, // max 310mm
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'GPU_LENGTH_EXCEEDS_CASE',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('340mm');
      expect(violation?.message).toContain('310mm');
      expect(violation?.message).toContain('by 30mm');
    });

    it('rejects CPU cooler whose height exceeds case cooler clearance with delta in message', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM4,
        psu: mockPsu550,
        case: mockCaseMiniITX, // max 75mm cooler
        cooler: mockCoolerTower, // 155mm
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'COOLER_HEIGHT_EXCEEDS_CASE',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('155mm');
      expect(violation?.message).toContain('75mm');
      expect(violation?.message).toContain('by 80mm');
    });

    it('rejects CPU cooler bracket that does not support CPU socket', () => {
      const result = checkBuildCompatibility({
        cpu: mockCpuIntel13, // LGA1700
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: {
          ...mockMoboAM4,
          socket: 'LGA1700',
        },
        psu: mockPsu550,
        cooler: mockCoolerLowProfile, // AM4/AM5 only
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'COOLER_SOCKET_MISMATCH',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('LGA1700');
    });

    it('rejects CPU cooler whose TDP capacity is insufficient for high-TDP CPU', () => {
      const highTdpCpu: CpuCandidate = {
        ...mockCpuAM4,
        tdpWatts: 105,
      };
      const result = checkBuildCompatibility({
        cpu: highTdpCpu,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: mockMoboAM4,
        psu: mockPsu550,
        cooler: mockCoolerLowProfile, // 65W max TDP
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'INSUFFICIENT_COOLER_TDP',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('65W');
      expect(violation?.message).toContain('105W');
    });

    it('rejects NVMe SSD when motherboard has no M.2 slots', () => {
      const moboNoM2: MotherboardCandidate = {
        ...mockMoboAM4,
        m2Slots: 0,
      };
      const result = checkBuildCompatibility({
        cpu: mockCpuAM4,
        gpu: mockGpuMid,
        ram: mockRamDdr4,
        motherboard: moboNoM2,
        psu: mockPsu550,
        storage: mockStorageNvme,
      });

      expect(result.isCompatible).toBe(false);
      const violation = result.violations.find(
        (v) => v.code === 'INSUFFICIENT_M2_SLOTS',
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('no M.2 slots');
    });
  });

  describe('Power Calculations', () => {
    it('calculates total estimated power draw and recommended PSU wattage', () => {
      const load = calculateEstimatedPowerDraw(65, 165, 75);
      expect(load).toBe(305);

      const recommended = calculateRecommendedPsuWattage(load, 1.25);
      expect(recommended).toBe(382);
    });

    it('guards against negative inputs gracefully', () => {
      const load = calculateEstimatedPowerDraw(-10, -50, -5);
      expect(load).toBe(0);
      expect(calculateRecommendedPsuWattage(load)).toBe(0);
    });
  });

  describe('Bottleneck & Effective FPS Engine', () => {
    it('estimates required CPU gaming score monotonically with GPU raster performance', () => {
      const score60 = estimateGpuRequiredCpuScore({
        ...mockGpuMid,
        rasterFps1440p: 60,
      });
      const score120 = estimateGpuRequiredCpuScore({
        ...mockGpuMid,
        rasterFps1440p: 120,
      });
      const score180 = estimateGpuRequiredCpuScore({
        ...mockGpuMid,
        rasterFps1440p: 180,
      });

      expect(score60).toBeLessThan(score120);
      expect(score120).toBeLessThan(score180);
      expect(score180).toBeLessThanOrEqual(100);
      expect(score60).toBeGreaterThanOrEqual(30);
    });

    it('returns 100% throughput (no bottleneck) when CPU gaming score exceeds GPU demand', () => {
      const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
        100,
        70,
        0.5,
      );
      expect(bottleneckFactor).toBe(1.0);
      expect(bottleneckPct).toBe(0);
    });

    it('calculates expected bottleneck factor and percent when CPU is underpowered', () => {
      // ratio = 50 / 80 = 0.625; factor = sqrt(0.625) approx 0.7906
      const { bottleneckFactor, bottleneckPct } = computeCpuGpuBottleneck(
        50,
        80,
        0.5,
      );
      expect(bottleneckFactor).toBeCloseTo(Math.sqrt(50 / 80), 3);
      expect(bottleneckPct).toBeGreaterThan(0);
      expect(bottleneckPct).toBeLessThan(30);
    });

    it('guards degenerate zero or negative scores without NaN or throwing', () => {
      expect(computeCpuGpuBottleneck(0, 80).bottleneckFactor).toBe(0);
      expect(computeCpuGpuBottleneck(80, 0).bottleneckFactor).toBe(1.0);
      expect(computeCpuGpuBottleneck(-10, -20).bottleneckFactor).toBe(1.0);
    });
  });

  describe('PcBuild System Assembly', () => {
    it('assembles a full PcBuild with totals, bottleneck metrics, and headroom', () => {
      const build = assemblePcBuild(
        mockCpuAM4,
        mockGpuMid,
        mockRamDdr4,
        mockMoboAM4,
        mockPsu550,
      );

      expect(build.id).toContain('cpu-5600');
      // 130 + 260 + 35 + 110 + 55 + defaultStorage(65) + defaultCase(70) + defaultCooler(35) = 760
      expect(build.totalPrice).toBe(130 + 260 + 35 + 110 + 55 + 65 + 70 + 35); // 760
      expect(build.rawGpuFps1440p).toBe(64);
      expect(build.effectiveFps1440p).toBeGreaterThan(0);
      expect(build.effectiveFps1440p).toBeLessThanOrEqual(build.rawGpuFps1440p);
      expect(build.estimatedPowerDrawWatts).toBe(65 + 165 + 75); // 305W
      expect(build.powerHeadroomWatts).toBe(550 - 305); // 245W
      expect(build.storage).toBeDefined();
      expect(build.case).toBeDefined();
      expect(build.cooler).toBeDefined();
      expect(build.isCompatible).toBe(true);
    });

    it('assembles with custom storage, case, and cooler candidates explicitly', () => {
      const build = assemblePcBuild(
        mockCpuAM4,
        mockGpuMid,
        mockRamDdr4,
        mockMoboAM4,
        mockPsu550,
        mockStorageNvme,
        mockCaseATX,
        mockCoolerTower,
      );

      expect(build.storage.id).toBe('storage-nvme-1tb');
      expect(build.case.id).toBe('case-atx');
      expect(build.cooler.id).toBe('cooler-tower');
      expect(build.totalPrice).toBe(
        130 + 260 + 35 + 110 + 55 + 60 + 65 + 35, // 750
      );
      expect(build.isCompatible).toBe(true);
    });
  });

  describe('Type Guards', () => {
    it('validates CpuSocket values accurately', () => {
      expect(isCpuSocket('AM4')).toBe(true);
      expect(isCpuSocket('AM5')).toBe(true);
      expect(isCpuSocket('LGA1700')).toBe(true);
      expect(isCpuSocket('LGA1851')).toBe(true);
      expect(isCpuSocket('LGA1200')).toBe(false);
      expect(isCpuSocket('')).toBe(false);
    });

    it('validates RamGeneration values accurately', () => {
      expect(isRamGeneration('DDR4')).toBe(true);
      expect(isRamGeneration('DDR5')).toBe(true);
      expect(isRamGeneration('DDR3')).toBe(false);
      expect(isRamGeneration('')).toBe(false);
    });
  });

  describe('Seed Components Catalog Integrity', () => {
    it('contains non-empty catalogs for all 4 secondary categories', async () => {
      const { SEED_COMPONENTS } = await import('../../../data/seedComponents');

      expect(SEED_COMPONENTS.cpus.length).toBeGreaterThanOrEqual(10);
      expect(SEED_COMPONENTS.motherboards.length).toBeGreaterThanOrEqual(8);
      expect(SEED_COMPONENTS.ramKits.length).toBeGreaterThanOrEqual(6);
      expect(SEED_COMPONENTS.psus.length).toBeGreaterThanOrEqual(5);
    });

    it('ensures every seed component has positive prices and valid specs', async () => {
      const { SEED_CPUS, SEED_MOTHERBOARDS, SEED_RAM_KITS, SEED_PSUS } =
        await import('../../../data/seedComponents');

      for (const cpu of SEED_CPUS) {
        expect(cpu.price).toBeGreaterThan(0);
        expect(cpu.tdpWatts).toBeGreaterThan(0);
        expect(cpu.gamingScore).toBeGreaterThan(0);
        expect(cpu.gamingScore).toBeLessThanOrEqual(100);
        expect(isCpuSocket(cpu.socket)).toBe(true);
      }

      for (const mobo of SEED_MOTHERBOARDS) {
        expect(mobo.price).toBeGreaterThan(0);
        expect(mobo.ramSlots).toBeGreaterThanOrEqual(2);
        expect(isCpuSocket(mobo.socket)).toBe(true);
        expect(isRamGeneration(mobo.ramGeneration)).toBe(true);
      }

      for (const ram of SEED_RAM_KITS) {
        expect(ram.price).toBeGreaterThan(0);
        expect(ram.capacityGb).toBeGreaterThanOrEqual(8);
        expect(ram.speedMhz).toBeGreaterThan(1000);
        expect(ram.modulesCount).toBeGreaterThanOrEqual(1);
        expect(isRamGeneration(ram.generation)).toBe(true);
      }

      for (const psu of SEED_PSUS) {
        expect(psu.price).toBeGreaterThan(0);
        expect(psu.wattage).toBeGreaterThanOrEqual(450);
      }
    });

    it('can assemble at least one valid, compatible build for each socket ecosystem', async () => {
      const { SEED_CPUS, SEED_MOTHERBOARDS, SEED_RAM_KITS, SEED_PSUS } =
        await import('../../../data/seedComponents');

      const sockets: Array<'AM4' | 'AM5' | 'LGA1700' | 'LGA1851'> = [
        'AM4',
        'AM5',
        'LGA1700',
        'LGA1851',
      ];

      for (const socket of sockets) {
        const cpu = SEED_CPUS.find((c) => c.socket === socket);
        const mobo = SEED_MOTHERBOARDS.find((m) => m.socket === socket);
        expect(cpu).toBeDefined();
        expect(mobo).toBeDefined();

        if (!cpu || !mobo) continue;

        const ram = SEED_RAM_KITS.find(
          (r) =>
            r.generation === mobo.ramGeneration &&
            r.modulesCount <= mobo.ramSlots,
        );
        expect(ram).toBeDefined();
        if (!ram) continue;

        const psu = SEED_PSUS.find((p) => p.wattage >= 650);
        expect(psu).toBeDefined();
        if (!psu) continue;

        const build = assemblePcBuild(cpu, mockGpuMid, ram, mobo, psu);
        expect(build.isCompatible).toBe(true);
        expect(build.violations).toHaveLength(0);
      }
    });
  });
});
