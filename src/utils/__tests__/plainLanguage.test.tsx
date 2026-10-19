// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BeginnerIntakeCard } from '../../components/BeginnerIntakeCard';
import { SimpleGuidePickHero } from '../../components/SimpleGuidePickHero';
import { FullBuildPickHero } from '../../components/FullBuildPickHero';
import { RankedGpu } from '../../lib/math/types';
import { assemblePcBuild, PcBuild } from '../../lib/math/buildTypes';
import { TRANSLATIONS } from '../i18n';

const MOCK_GPU: RankedGpu = {
  id: 'arc-b580',
  name: 'Intel Arc B580 12GB',
  price: 249,
  rasterFps1440p: 74,
  rtFps1440p: 48,
  vramGb: 12,
  tdpWatts: 190,
  architecture: 'Battlemage',
  brand: 'Intel',
  vendor: 'Intel',
  features: ['Hardware Ray Tracing', 'AV1 Video Encode'],
  isDominated: false,
  dominatedBy: [],
  paretoDominatedBy: [],
  dominanceReasons: [],
  isParetoOptimal: true,
  topsisScore: 0.85,
  topsisScorePct: 85,
  distanceToBest: 0.1,
  distanceToWorst: 0.9,
  normalizedMetrics: {
    price: 0.2,
    rasterFps1440p: 0.8,
    rtFps1440p: 0.6,
    vramGb: 0.75,
    tdpWatts: 0.3,
  },
  weightedMetrics: {
    price: 0.05,
    rasterFps1440p: 0.2,
    rtFps1440p: 0.15,
    vramGb: 0.18,
    tdpWatts: 0.07,
  },
  rank: 1,
  frontierRank: 1,
  isBenchmarkRef: true,
};

const MOCK_ALT: RankedGpu = {
  ...MOCK_GPU,
  id: 'rx-7600',
  name: 'Radeon RX 7600 8GB',
  price: 259,
  rasterFps1440p: 68,
};

const MOCK_BUILD: PcBuild = assemblePcBuild(
  {
    id: 'r5-5600',
    name: 'AMD Ryzen 5 5600',
    vendor: 'AMD',
    price: 130,
    socket: 'AM4',
    cores: 6,
    threads: 12,
    tdpWatts: 65,
    gamingScore: 82,
  },
  MOCK_GPU,
  {
    id: 'ddr4-32gb',
    name: '32GB DDR4-3600 CL16',
    price: 65,
    generation: 'DDR4',
    capacityGb: 32,
    speedMhz: 3600,
    modulesCount: 2,
  },
  {
    id: 'b550-atx',
    name: 'B550 ATX Motherboard',
    price: 110,
    socket: 'AM4',
    ramGeneration: 'DDR4',
    ramSlots: 4,
    formFactor: 'ATX',
    m2Slots: 2,
  },
  {
    id: '650w-gold',
    name: '650W 80+ Gold Semi-Modular',
    price: 85,
    wattage: 650,
    efficiencyRating: '80+ Gold',
    modular: 'Semi',
  },
);

const FORBIDDEN_MATH_TERMS = [
  /\bpareto\b/i,
  /\btopsis\b/i,
  /\bdominated\b/i,
  /\bhyperplane\b/i,
];

describe('Plain-Language Buyer Copy [UX-03]', () => {
  it('SimpleGuidePickHero contains zero mathematical jargon in both pt-BR and en-US', () => {
    const { container: ptContainer } = render(
      <SimpleGuidePickHero
        topPick={MOCK_GPU}
        stepDownAlt={MOCK_ALT}
        stepUpAlt={MOCK_ALT}
        currency="BRL"
        locale="pt-BR"
        selectedGpuIds={[]}
        onToggleSelectGpu={() => {}}
        onOpenAccordion={() => {}}
      />,
    );

    const ptText = ptContainer.textContent ?? '';
    for (const term of FORBIDDEN_MATH_TERMS) {
      expect(ptText).not.toMatch(term);
    }
    expect(ptText).toContain('Bom Negócio');
    expect(ptText).toContain('Combina');

    const { container: enContainer } = render(
      <SimpleGuidePickHero
        topPick={MOCK_GPU}
        stepDownAlt={MOCK_ALT}
        stepUpAlt={MOCK_ALT}
        currency="USD"
        locale="en-US"
        selectedGpuIds={[]}
        onToggleSelectGpu={() => {}}
        onOpenAccordion={() => {}}
      />,
    );

    const enText = enContainer.textContent ?? '';
    for (const term of FORBIDDEN_MATH_TERMS) {
      expect(enText).not.toMatch(term);
    }
    expect(enText).toContain('Good Deal');
    expect(enText).toContain('Match');
  });

  it('BeginnerIntakeCard contains zero mathematical jargon in both locales', () => {
    const { container: ptContainer } = render(
      <BeginnerIntakeCard
        goal="gpu"
        useCase="sweetspot-1440p"
        budget={2500}
        currency="BRL"
        locale="pt-BR"
        maxBudgetBound={8000}
        onSelectGoal={() => {}}
        onSelectUseCase={() => {}}
        onSelectBudget={() => {}}
      />,
    );

    const ptText = ptContainer.textContent ?? '';
    for (const term of FORBIDDEN_MATH_TERMS) {
      expect(ptText).not.toMatch(term);
    }

    const { container: enContainer } = render(
      <BeginnerIntakeCard
        goal="gpu"
        useCase="sweetspot-1440p"
        budget={550}
        currency="USD"
        locale="en-US"
        maxBudgetBound={1200}
        onSelectGoal={() => {}}
        onSelectUseCase={() => {}}
        onSelectBudget={() => {}}
      />,
    );

    const enText = enContainer.textContent ?? '';
    for (const term of FORBIDDEN_MATH_TERMS) {
      expect(enText).not.toMatch(term);
    }
  });

  it('FullBuildPickHero contains zero mathematical jargon', () => {
    const { container } = render(
      <FullBuildPickHero
        topBuild={MOCK_BUILD}
        stepDownBuild={MOCK_BUILD}
        stepUpBuild={null}
        currency="BRL"
        locale="pt-BR"
        onSwitchToBuilds={() => {}}
      />,
    );

    const text = container.textContent ?? '';
    for (const term of FORBIDDEN_MATH_TERMS) {
      expect(text).not.toMatch(term);
    }
  });

  it('Beginner translations dictionary in i18n has zero math jargon', () => {
    const beginnerKeys = [
      'intakeStep1Title',
      'intakeGoalGpu',
      'intakeGoalPc',
      'intakeStep2Title',
      'intakeStep3Title',
      'heroTopPickBadge',
      'heroTopBuildBadge',
      'heroStepDownTitle',
      'heroStepUpTitle',
      'heroGoodDealBadge',
      'heroMatchScore',
    ] as const;

    for (const locale of ['pt-BR', 'en-US'] as const) {
      for (const key of beginnerKeys) {
        const val = TRANSLATIONS[locale][key];
        for (const term of FORBIDDEN_MATH_TERMS) {
          expect(val).not.toMatch(term);
        }
      }
    }
  });
});
