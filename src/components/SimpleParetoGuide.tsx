import { useState, useMemo } from 'react';
import {
  GpuCandidate,
  HardConstraints,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
} from '../lib/math/types';
import { Compass } from 'lucide-react';
import {
  BeginnerIntakeCard,
  BeginnerGoal,
  BeginnerUseCase,
} from './BeginnerIntakeCard';
import { SimpleGuidePickHero } from './SimpleGuidePickHero';
import { FullBuildPickHero } from './FullBuildPickHero';
import { SimpleGuideMathWalkthrough } from './SimpleGuideMathWalkthrough';
import { optimizeFullSystemBuilds } from '../lib/math/combinatorial';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../data/seedComponents';
import { AppLocale, t } from '../utils/i18n';
import { convertUsdToBrl } from '../utils/currency';

interface SimpleParetoGuideProps {
  gpus: RankedGpu[];
  rawCatalog?: GpuCandidate[];
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints,
  ) => void;
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  onSelectXMetric: (m: MetricKey) => void;
  onSelectYMetric: (m: MetricKey) => void;
  onSelectZMetric: (m: MetricKey) => void;
  weights: PreferenceWeights;
  onChangeWeights: (
    updater: (prev: PreferenceWeights) => PreferenceWeights,
  ) => void;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  onSwitchToExplorer: () => void;
  onInspectInExplorer?: (id: string) => void;
  onSwitchTo3D: () => void;
  onSwitchToHyper: () => void;
  onSwitchToBuilds?: () => void;
  maxBudgetBound: number;
}

export function SimpleParetoGuide({
  gpus,
  rawCatalog,
  currency = 'USD',
  locale = 'pt-BR',
  constraints,
  onChangeConstraints,
  xMetric,
  yMetric,
  zMetric,
  onSelectXMetric,
  onSelectYMetric,
  onSelectZMetric,
  onChangeWeights,
  selectedGpuIds,
  onToggleSelectGpu,
  onSwitchToExplorer,
  onInspectInExplorer,
  onSwitchTo3D,
  onSwitchToHyper,
  onSwitchToBuilds,
  maxBudgetBound,
}: SimpleParetoGuideProps) {
  // Beginner Intake Flow State (UX-01 & UX-11)
  const [beginnerGoal, setBeginnerGoal] = useState<BeginnerGoal>('gpu');
  const [beginnerUseCase, setBeginnerUseCase] =
    useState<BeginnerUseCase>('sweetspot-1440p');
  const [showDeepMath, setShowDeepMath] = useState<boolean>(false);

  // Handlers for Beginner Intake
  const handleSelectUseCase = (uc: BeginnerUseCase) => {
    setBeginnerUseCase(uc);
    if (uc === 'esports-1080p') {
      onSelectXMetric('price');
      onSelectYMetric('rasterFps1440p');
      onSelectZMetric('tdpWatts');
      onChangeWeights(() => ({
        price: 40,
        rasterFps1440p: 50,
        rtFps1440p: 5,
        vramGb: 5,
        tdpWatts: 0,
      }));
    } else if (uc === 'sweetspot-1440p') {
      onSelectXMetric('price');
      onSelectYMetric('rasterFps1440p');
      onSelectZMetric('vramGb');
      onChangeWeights(() => ({
        price: 30,
        rasterFps1440p: 40,
        vramGb: 25,
        rtFps1440p: 5,
        tdpWatts: 0,
      }));
    } else if (uc === 'enthusiast-4k') {
      onSelectXMetric('price');
      onSelectYMetric('rtFps1440p');
      onSelectZMetric('vramGb');
      onChangeWeights(() => ({
        price: 15,
        rtFps1440p: 40,
        rasterFps1440p: 25,
        vramGb: 20,
        tdpWatts: 0,
      }));
    } else if (uc === 'creator-ai') {
      onSelectXMetric('price');
      onSelectYMetric('vramGb');
      onSelectZMetric('rtFps1440p');
      onChangeWeights(() => ({
        price: 20,
        vramGb: 45,
        rtFps1440p: 20,
        rasterFps1440p: 15,
        tdpWatts: 0,
      }));
    }
  };

  const handleSelectBudget = (amount: number) => {
    onChangeConstraints((prev) => ({
      ...prev,
      maxPrice: amount,
    }));
  };

  // Top pick + Step-Down & Step-Up alternatives for SimpleGuidePickHero (UX-01 & UX-12)
  const { topPick, stepDownAlt, stepUpAlt } = useMemo(() => {
    const validChoices = gpus.filter(
      (g) =>
        !g.name.includes('[TRAP]') &&
        !g.isDominated &&
        g.price <= constraints.maxPrice,
    );
    if (validChoices.length === 0) {
      return { topPick: null, stepDownAlt: null, stepUpAlt: null };
    }

    const currentGpu = validChoices[0];
    const cheaper = validChoices
      .filter((g) => g.id !== currentGpu.id && g.price < currentGpu.price)
      .sort((a, b) => b.price - a.price);
    const upgrade = validChoices
      .filter(
        (g) =>
          g.id !== currentGpu.id &&
          (g.rasterFps1440p > currentGpu.rasterFps1440p ||
            g.price > currentGpu.price),
      )
      .sort((a, b) => a.price - b.price);

    const otherChoices = validChoices.filter((g) => g.id !== currentGpu.id);
    const stepDown = cheaper[0] ?? otherChoices[0] ?? null;
    const stepUp =
      upgrade[0] ??
      otherChoices.find((g) => g.id !== stepDown?.id) ??
      otherChoices[1] ??
      null;

    return {
      topPick: currentGpu,
      stepDownAlt: stepDown,
      stepUpAlt: stepUp,
    };
  }, [gpus, constraints.maxPrice]);

  // Combinatorial PC build optimization for Whole PC Goal (UX-11)
  const isBrl = currency === 'BRL';
  const effectiveCpus = useMemo(
    () =>
      isBrl
        ? SEED_CPUS.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_CPUS,
    [isBrl],
  );
  const effectiveMotherboards = useMemo(
    () =>
      isBrl
        ? SEED_MOTHERBOARDS.map((m) => ({
            ...m,
            price: convertUsdToBrl(m.price),
          }))
        : SEED_MOTHERBOARDS,
    [isBrl],
  );
  const effectiveRam = useMemo(
    () =>
      isBrl
        ? SEED_RAM_KITS.map((r) => ({ ...r, price: convertUsdToBrl(r.price) }))
        : SEED_RAM_KITS,
    [isBrl],
  );
  const effectivePsus = useMemo(
    () =>
      isBrl
        ? SEED_PSUS.map((p) => ({ ...p, price: convertUsdToBrl(p.price) }))
        : SEED_PSUS,
    [isBrl],
  );
  const effectiveStorages = useMemo(
    () =>
      isBrl
        ? SEED_STORAGES.map((s) => ({ ...s, price: convertUsdToBrl(s.price) }))
        : SEED_STORAGES,
    [isBrl],
  );
  const effectiveCases = useMemo(
    () =>
      isBrl
        ? SEED_CASES.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_CASES,
    [isBrl],
  );
  const effectiveCoolers = useMemo(
    () =>
      isBrl
        ? SEED_COOLERS.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_COOLERS,
    [isBrl],
  );

  const pcBuildsResult = useMemo(() => {
    const catalog = rawCatalog ?? gpus;
    const effectiveMaxBudget =
      beginnerGoal === 'pc' &&
      constraints.maxPrice < (currency === 'BRL' ? 4500 : 750)
        ? currency === 'BRL'
          ? 6000
          : 1000
        : constraints.maxPrice;
    return optimizeFullSystemBuilds(
      {
        cpus: effectiveCpus,
        gpus: catalog,
        motherboards: effectiveMotherboards,
        ramKits: effectiveRam,
        psus: effectivePsus,
        storages: effectiveStorages,
        cases: effectiveCases,
        coolers: effectiveCoolers,
      },
      { maxBudget: effectiveMaxBudget, workloadProfile: beginnerUseCase },
    );
  }, [
    rawCatalog,
    gpus,
    beginnerGoal,
    beginnerUseCase,
    constraints.maxPrice,
    currency,
    effectiveCpus,
    effectiveMotherboards,
    effectiveRam,
    effectivePsus,
    effectiveStorages,
    effectiveCases,
    effectiveCoolers,
  ]);

  const { topBuild, stepDownBuild, stepUpBuild } = useMemo(() => {
    const { optimalBuilds } = pcBuildsResult;
    if (optimalBuilds.length === 0) {
      return { topBuild: null, stepDownBuild: null, stepUpBuild: null };
    }
    const underBudget = optimalBuilds.filter(
      (b) => b.totalPrice <= constraints.maxPrice,
    );
    const top =
      underBudget.length > 0
        ? underBudget[underBudget.length - 1]
        : optimalBuilds[0];
    const topIdx = optimalBuilds.findIndex((b) => b.id === top.id);
    const stepDown = topIdx > 0 ? optimalBuilds[topIdx - 1] : null;
    const stepUp =
      topIdx >= 0 && topIdx < optimalBuilds.length - 1
        ? optimalBuilds[topIdx + 1]
        : null;

    return { topBuild: top, stepDownBuild: stepDown, stepUpBuild: stepUp };
  }, [pcBuildsResult, constraints.maxPrice]);

  return (
    <div className="space-y-6">
      {/* 1. Answer-First Beginner Intake Card */}
      <BeginnerIntakeCard
        goal={beginnerGoal}
        useCase={beginnerUseCase}
        budget={constraints.maxPrice}
        currency={currency}
        locale={locale}
        maxBudgetBound={maxBudgetBound}
        onSelectGoal={setBeginnerGoal}
        onSelectUseCase={handleSelectUseCase}
        onSelectBudget={handleSelectBudget}
      />

      {/* 2. Top Pick Recommendation Hero Area */}
      {beginnerGoal === 'gpu' ? (
        <SimpleGuidePickHero
          topPick={topPick}
          stepDownAlt={stepDownAlt}
          stepUpAlt={stepUpAlt}
          currency={currency}
          locale={locale}
          selectedGpuIds={selectedGpuIds}
          onToggleSelectGpu={onToggleSelectGpu}
          onOpenAccordion={() => setShowDeepMath(true)}
          onInspectInExplorer={onInspectInExplorer}
        />
      ) : (
        <FullBuildPickHero
          topBuild={topBuild}
          stepDownBuild={stepDownBuild}
          stepUpBuild={stepUpBuild}
          currency={currency}
          locale={locale}
          onSwitchToBuilds={onSwitchToBuilds ?? (() => {})}
        />
      )}

      {/* 3. Collapsible 5-Step Deep Value Guide & Interactive Graph */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg">
        <button
          type="button"
          onClick={() => setShowDeepMath((prev) => !prev)}
          className="flex w-full items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                {t('mathGuideHeading', locale)}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('mathGuideSubheading', locale)}
              </p>
            </div>
          </div>
          <span className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 group-hover:bg-slate-700 transition">
            {showDeepMath
              ? t('mathGuideToggleHide', locale)
              : t('mathGuideToggleShow', locale)}
          </span>
        </button>

        {showDeepMath && (
          <SimpleGuideMathWalkthrough
            gpus={gpus}
            rawCatalog={rawCatalog}
            currency={currency}
            constraints={constraints}
            onChangeConstraints={onChangeConstraints}
            xMetric={xMetric}
            yMetric={yMetric}
            zMetric={zMetric}
            onSelectXMetric={onSelectXMetric}
            onSelectYMetric={onSelectYMetric}
            onSelectZMetric={onSelectZMetric}
            onChangeWeights={onChangeWeights}
            selectedGpuIds={selectedGpuIds}
            onToggleSelectGpu={onToggleSelectGpu}
            onSwitchToExplorer={onSwitchToExplorer}
            onSwitchTo3D={onSwitchTo3D}
            onSwitchToHyper={onSwitchToHyper}
            maxBudgetBound={maxBudgetBound}
          />
        )}
      </div>
    </div>
  );
}
