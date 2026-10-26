import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GpuCandidate,
  HardConstraints,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
} from '../lib/math/types';
import { Compass } from 'lucide-react';
import { PriorityEntry, PriorityProfile } from '../lib/math/priorityModel';
import {
  FlipPoint,
  TopChangeReason,
  explainTopChange,
} from '../lib/math/priorityInsights';
import {
  PriorityUseCase,
  profileForUseCase,
} from '../lib/math/priorityProfiles';
import { usePriorityRanking } from '../hooks/usePriorityRanking';
import { PriorityPanel } from './PriorityPanel';
import { PickInsights, PickScoreBadges } from './PickInsights';
import { tp } from '../utils/i18n';
import {
  BeginnerIntakeCard,
  BeginnerGoal,
  BeginnerUseCase,
} from './BeginnerIntakeCard';
import { SimpleGuidePickHero } from './SimpleGuidePickHero';
import { FullBuildPickHero } from './FullBuildPickHero';
import { SimpleGuideMathWalkthrough } from './SimpleGuideMathWalkthrough';
import { useFullSystemOptimizer } from '../hooks/useFullSystemOptimizer';
import { AppLocale, t } from '../utils/i18n';
import { getCurrencyAdjustedCatalogs } from '../utils/currency';

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
  priorityProfile: PriorityProfile;
  onChangePriorityProfile: (
    updater: (prev: PriorityProfile) => PriorityProfile,
  ) => void;
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

const USE_CASE_AXES: Record<
  BeginnerUseCase,
  [MetricKey, MetricKey, MetricKey]
> = {
  'esports-1080p': ['price', 'rasterFps1440p', 'tdpWatts'],
  'sweetspot-1440p': ['price', 'rasterFps1440p', 'vramGb'],
  'enthusiast-4k': ['price', 'rtFps1440p', 'vramGb'],
  'creator-ai': ['price', 'vramGb', 'rtFps1440p'],
};

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
  weights,
  priorityProfile,
  onChangePriorityProfile,
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
  // Use cases are presets: they fill the visible priorities (and the walkthrough's chart axes).
  const handleSelectUseCase = (uc: BeginnerUseCase) => {
    setBeginnerUseCase(uc);
    const [x, y, z] = USE_CASE_AXES[uc];
    onSelectXMetric(x);
    onSelectYMetric(y);
    onSelectZMetric(z);
    const useCase: PriorityUseCase = uc;
    onChangePriorityProfile((prev) => {
      const preset = profileForUseCase(useCase, prev.custom);
      const customEntries = prev.entries.filter((e) =>
        prev.custom.some((c) => c.id === e.id),
      );
      return { ...preset, entries: [...preset.entries, ...customEntries] };
    });
  };

  const handleSelectBudget = (amount: number) => {
    onChangeConstraints((prev) => ({
      ...prev,
      maxPrice: amount,
    }));
  };

  // Top pick + Step-Down & Step-Up alternatives, scored on the user's priorities (PRI-04).
  const budgetGpus = useMemo(
    () => gpus.filter((g) => g.price <= constraints.maxPrice),
    [gpus, constraints.maxPrice],
  );
  const priorityRanking = usePriorityRanking(
    budgetGpus,
    priorityProfile,
    constraints.maxPrice,
    currency,
  );
  const { topPick, stepDownAlt, stepUpAlt } = useMemo(() => {
    const ranked = priorityRanking.ranked.map((s) => s.gpu);
    const current = ranked[0] ?? null;
    if (!current) return { topPick: null, stepDownAlt: null, stepUpAlt: null };
    // Ranked is best-first, so the first match is the best-scoring option of its kind.
    const stepDown = ranked.find((g) => g.price < current.price) ?? null;
    const stepUp =
      ranked.find(
        (g) =>
          g.price > current.price && g.rasterFps1440p > current.rasterFps1440p,
      ) ??
      ranked.find((g) => g.price > current.price) ??
      null;
    return { topPick: current, stepDownAlt: stepDown, stepUpAlt: stepUp };
  }, [priorityRanking.ranked]);

  // "X is now #1 because you raised Y" (PRI-10): compare against the last top pick.
  const lastTop = useRef<{ id: string | null; entries: PriorityEntry[] }>({
    id: null,
    entries: priorityProfile.entries,
  });
  const [rankChange, setRankChange] = useState<TopChangeReason | null>(null);
  useEffect(() => {
    const prev = lastTop.current;
    // Search every eligible card: the old #1 may now be set aside.
    const newTopFirst = [
      ...priorityRanking.ranked.slice(0, 1),
      ...priorityRanking.eligible,
    ];
    const reason = explainTopChange(
      prev.id,
      newTopFirst,
      prev.entries,
      priorityProfile.entries,
    );
    if (prev.id !== (topPick?.id ?? null)) setRankChange(reason);
    lastTop.current = {
      id: topPick?.id ?? null,
      entries: priorityProfile.entries,
    };
  }, [
    topPick,
    priorityRanking.ranked,
    priorityRanking.eligible,
    priorityProfile.entries,
  ]);

  const applyFlip = (flip: FlipPoint) =>
    onChangePriorityProfile((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === flip.paramId ? { ...e, weight: flip.toWeight } : e,
      ),
    }));

  // Combinatorial PC build optimization for Whole PC Goal (UX-11)
  const {
    cpus: effectiveCpus,
    motherboards: effectiveMotherboards,
    ramKits: effectiveRam,
    psus: effectivePsus,
    storages: effectiveStorages,
    cases: effectiveCases,
    coolers: effectiveCoolers,
  } = useMemo(() => getCurrencyAdjustedCatalogs(currency), [currency]);

  const fullSystemCatalogs = useMemo(
    () => ({
      cpus: effectiveCpus,
      gpus: rawCatalog ?? gpus,
      motherboards: effectiveMotherboards,
      ramKits: effectiveRam,
      psus: effectivePsus,
      storages: effectiveStorages,
      cases: effectiveCases,
      coolers: effectiveCoolers,
    }),
    [
      effectiveCpus,
      rawCatalog,
      gpus,
      effectiveMotherboards,
      effectiveRam,
      effectivePsus,
      effectiveStorages,
      effectiveCases,
      effectiveCoolers,
    ],
  );

  const effectiveMaxBudget =
    beginnerGoal === 'pc' &&
    constraints.maxPrice < (currency === 'BRL' ? 4500 : 750)
      ? currency === 'BRL'
        ? 6000
        : 1000
      : constraints.maxPrice;

  const pcBuildFilterCriteria = useMemo(
    () => ({
      maxBudget: effectiveMaxBudget,
      workloadProfile: beginnerUseCase,
    }),
    [effectiveMaxBudget, beginnerUseCase],
  );

  const { optimizationResult: pcBuildsResult } = useFullSystemOptimizer({
    catalogs: fullSystemCatalogs,
    filterCriteria: pcBuildFilterCriteria,
    enabled: beginnerGoal === 'pc',
  });

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
        priorityPanel={
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3 sm:p-4">
            <PriorityPanel
              profile={priorityProfile}
              onChangeProfile={onChangePriorityProfile}
              gpus={budgetGpus}
              locale={locale}
            />
            {beginnerGoal === 'pc' && (
              <p className="mt-2 text-[11px] text-slate-400">
                {tp('pcGoalNote', locale)}
              </p>
            )}
          </div>
        }
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
          scoreBadges={
            priorityRanking.ranked[0] && (
              <PickScoreBadges
                top={priorityRanking.ranked[0]}
                confidence={priorityRanking.confidence}
                locale={locale}
              />
            )
          }
          insights={
            <PickInsights
              ranked={priorityRanking.ranked}
              profile={priorityProfile}
              flips={priorityRanking.flips}
              rankChange={rankChange}
              setAsideCount={priorityRanking.setAsideCount}
              locale={locale}
              onApplyFlip={applyFlip}
            />
          }
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
            weights={weights}
            priorityTargets={priorityProfile.targets}
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
