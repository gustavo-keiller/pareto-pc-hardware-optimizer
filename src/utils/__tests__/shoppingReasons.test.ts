import { describe, expect, it } from 'vitest';
import { GpuCandidate } from '../../lib/math/types';
import { PcBuild } from '../../lib/math/buildTypes';
import {
  generateGpuShoppingReasons,
  generateBuildShoppingReasons,
} from '../shoppingReasons';

const MOCK_TOP_GPU: GpuCandidate = {
  id: 'arc-b580',
  name: 'Intel Arc B580 12GB',
  price: 250,
  rasterFps1440p: 74,
  rtFps1440p: 52,
  vramGb: 12,
  tdpWatts: 190,
};

const MOCK_STEP_DOWN: GpuCandidate = {
  id: 'rx-6600',
  name: 'Radeon RX 6600 8GB',
  price: 195,
  rasterFps1440p: 51,
  rtFps1440p: 28,
  vramGb: 8,
  tdpWatts: 132,
};

const MOCK_STEP_UP: GpuCandidate = {
  id: 'rx-6750-xt',
  name: 'Radeon RX 6750 XT 12GB',
  price: 330,
  rasterFps1440p: 86,
  rtFps1440p: 44,
  vramGb: 12,
  tdpWatts: 250,
};

const MOCK_BUILD: PcBuild = {
  id: 'test-build',
  cpu: {
    id: 'r7-5700x3d',
    name: 'AMD Ryzen 7 5700X3D',
    vendor: 'AMD',
    socket: 'AM4',
    cores: 8,
    threads: 16,
    tdpWatts: 105,
    gamingScore: 82,
    price: 205,
  },
  gpu: MOCK_TOP_GPU,
  motherboard: {
    id: 'asrock-b550m-hdv',
    name: 'ASRock B550M-HDV',
    socket: 'AM4',
    chipset: 'B550',
    ramGeneration: 'DDR4',
    ramSlots: 2,
    formFactor: 'Micro-ATX',
    m2Slots: 1,
    price: 75,
  },
  ram: {
    id: 'sp-ddr4-16gb',
    name: 'Silicon Power 16GB (2x8GB) DDR4-3200 CL16',
    generation: 'DDR4',
    capacityGb: 16,
    speedMhz: 3200,
    casLatency: 16,
    modulesCount: 2,
    price: 32,
  },
  psu: {
    id: 'msi-a550bn',
    name: 'MSI MAG A550BN 550W',
    wattage: 550,
    efficiencyRating: '80+ Bronze',
    modular: 'Non',
    price: 55,
  },
  storage: {
    id: 'nv2-1tb',
    name: 'Kingston NV2 1TB M.2 NVMe',
    capacityGb: 1000,
    type: 'NVMe M.2',
    formFactor: 'M.2-2280',
    readSpeedMbps: 3500,
    price: 60,
  },
  case: {
    id: 'cc560',
    name: 'DeepCool CC560 V2 Mid-Tower',
    supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 370,
    maxCpuCoolerHeightMm: 163,
    price: 55,
  },
  cooler: {
    id: 'assassin-x',
    name: 'Thermalright Assassin X 120 SE',
    supportedSockets: ['AM4', 'AM5', 'LGA1700'],
    heightMm: 148,
    maxTdpWatts: 180,
    price: 20,
  },
  totalPrice: 747,
  rawGpuFps1440p: 74,
  effectiveFps1440p: 74,
  bottleneckPct: 0,
  bottleneckFactor: 1.0,
  estimatedPowerDrawWatts: 377,
  recommendedPsuWattage: 472,
  powerHeadroomWatts: 173,
  isCompatible: true,
  violations: [],
};

const BANNED_AI_WORDS = [
  'boast',
  'boasts',
  'crucial',
  'delve',
  'elevate',
  'game-changer',
  'cutting-edge',
  'seamless',
  'silky-smooth',
  'state-of-the-art',
  'testament',
];

describe('shoppingReasons utility', () => {
  it('generates unslop shopping reasons for top GPU pick and alternatives in pt-BR and en-US', () => {
    const reasonsPt = generateGpuShoppingReasons({
      topPick: MOCK_TOP_GPU,
      stepDownAlt: MOCK_STEP_DOWN,
      stepUpAlt: MOCK_STEP_UP,
      currency: 'BRL',
      locale: 'pt-BR',
    });

    expect(reasonsPt.topPickSummary).toBeDefined();
    expect(reasonsPt.topPickSummary.length).toBeGreaterThan(10);
    expect(reasonsPt.vramLongevity).toContain('12 GB');
    expect(reasonsPt.stepDownReason).toContain('RX 6600');
    expect(reasonsPt.stepDownReason).toContain('R$');
    expect(reasonsPt.stepUpReason).toContain('RX 6750 XT');
    expect(reasonsPt.stepUpReason).toContain('FPS');

    // Check no banned AI words
    const allText =
      `${reasonsPt.topPickSummary} ${reasonsPt.vramLongevity} ${reasonsPt.stepDownReason} ${reasonsPt.stepUpReason}`.toLowerCase();
    for (const banned of BANNED_AI_WORDS) {
      expect(allText).not.toContain(banned);
    }

    const reasonsEn = generateGpuShoppingReasons({
      topPick: MOCK_TOP_GPU,
      stepDownAlt: MOCK_STEP_DOWN,
      stepUpAlt: MOCK_STEP_UP,
      currency: 'USD',
      locale: 'en-US',
    });

    expect(reasonsEn.topPickSummary).toBeDefined();
    expect(reasonsEn.vramLongevity).toContain('12 GB');
    expect(reasonsEn.stepDownReason).toContain('$');
    expect(reasonsEn.stepUpReason).toContain('FPS');
  });

  it('generates component shopping reasons for whole PC build', () => {
    const buildReasonsPt = generateBuildShoppingReasons(
      MOCK_BUILD,
      'BRL',
      'pt-BR',
    );
    expect(buildReasonsPt.cpu).toContain('Ryzen 7 5700X3D');
    expect(buildReasonsPt.gpu).toContain('Arc B580');
    expect(buildReasonsPt.ram).toContain('Dual-Channel');
    expect(buildReasonsPt.psu).toContain('550W');
    expect(buildReasonsPt.storage).toContain('NVMe');

    const buildReasonsEn = generateBuildShoppingReasons(
      MOCK_BUILD,
      'USD',
      'en-US',
    );
    expect(buildReasonsEn.cpu).toContain('Ryzen 7 5700X3D');
    expect(buildReasonsEn.gpu).toContain('Arc B580');
    expect(buildReasonsEn.ram).toContain('Dual-channel');
    expect(buildReasonsEn.psu).toContain('headroom');
  });
});
