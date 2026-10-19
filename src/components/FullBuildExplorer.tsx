import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import {
  BuildWorkloadProfile,
  CpuSocket,
  isCpuSocket,
  isRamGeneration,
  PcBuild,
  RamGeneration,
} from '../lib/math/buildTypes';
import { GpuCandidate, HardwareVendor } from '../lib/math/types';

function parseSocketFilter(value: string): CpuSocket | 'ALL' {
  return isCpuSocket(value) ? value : 'ALL';
}

function parseRamGenFilter(value: string): RamGeneration | 'ALL' {
  return isRamGeneration(value) ? value : 'ALL';
}

function parseVendorFilter(value: string): HardwareVendor | 'ALL' {
  if (
    value === 'NVIDIA' ||
    value === 'AMD' ||
    value === 'Intel' ||
    value === 'Synthetic' ||
    value === 'Other'
  ) {
    return value;
  }
  return 'ALL';
}
import {
  BUDGET_PRESETS_BRL,
  BUDGET_PRESETS_USD,
  BudgetPreset,
} from '../data/budgetPresets';
import {
  BuildFilterCriteria,
  optimizeFullSystemBuilds,
} from '../lib/math/combinatorial';
import {
  formatCurrency,
  getCurrencyAdjustedCatalogs,
  getEstimatedPriceNotice,
} from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { decodeBuildShareUrl } from '../utils/shareBuild';
import { BuildHeroCard } from './BuildHeroCard';
import { BuildLeaderboardTable } from './BuildLeaderboardTable';
import { UpgradePlannerModal } from './UpgradePlannerModal';

interface FullBuildExplorerProps {
  gpus: GpuCandidate[];
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  onSwitchToSimple?: () => void;
  onSwitchToExplorer?: () => void;
}

export const FullBuildExplorer: React.FC<FullBuildExplorerProps> = ({
  gpus,
  currency = 'USD',
  locale = 'pt-BR',
  onSwitchToSimple,
  onSwitchToExplorer,
}) => {
  const isBrl = currency === 'BRL';
  const budgetPresets = isBrl ? BUDGET_PRESETS_BRL : BUDGET_PRESETS_USD;
  const minSlider = isBrl ? 3500 : 600;
  const maxSlider = isBrl ? 22000 : 3500;
  const stepSlider = isBrl ? 250 : 50;

  // State
  const initialShare = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      return decodeBuildShareUrl(window.location.search);
    }
    return null;
  }, []);

  const [maxBudget, setMaxBudget] = useState<number>(() => {
    if (initialShare?.budget && initialShare.budget > 0)
      return initialShare.budget;
    return isBrl ? 6000 : 1000;
  });
  const [selectedSocket, setSelectedSocket] = useState<CpuSocket | 'ALL'>(
    'ALL',
  );
  const [selectedRamGen, setSelectedRamGen] = useState<RamGeneration | 'ALL'>(
    'ALL',
  );
  const [selectedGpuVendor, setSelectedGpuVendor] = useState<
    HardwareVendor | 'ALL'
  >('ALL');
  const [minEffectiveFps, setMinEffectiveFps] = useState<number>(0);
  const [selectedWorkload, setSelectedWorkload] =
    useState<BuildWorkloadProfile>(
      () => initialShare?.workload ?? 'sweetspot-1440p',
    );
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    if (initialShare?.budget) return '';
    return isBrl ? 'sweet-6000' : 'sweet-1000';
  });
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(
    () => initialShare?.buildId ?? null,
  );
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    if (initialShare?.budget) return;
    if (isBrl && maxBudget < 3500) {
      setMaxBudget(6000);
      setActivePresetId('sweet-6000');
    } else if (!isBrl && maxBudget > 3500) {
      setMaxBudget(1000);
      setActivePresetId('sweet-1000');
    }
  }, [isBrl, maxBudget, initialShare]);

  const {
    cpus: activeCpus,
    motherboards: activeMotherboards,
    ramKits: activeRam,
    psus: activePsus,
    storages: activeStorages,
    cases: activeCases,
    coolers: activeCoolers,
  } = useMemo(() => getCurrencyAdjustedCatalogs(currency), [currency]);

  // Compute Full Systems using combinatorial optimization
  const filterCriteria: BuildFilterCriteria = useMemo(() => {
    return {
      maxBudget,
      preferredSocket: selectedSocket === 'ALL' ? undefined : selectedSocket,
      preferredRamGeneration:
        selectedRamGen === 'ALL' ? undefined : selectedRamGen,
      preferredGpuVendor:
        selectedGpuVendor === 'ALL' ? undefined : selectedGpuVendor,
      minEffectiveFps: minEffectiveFps > 0 ? minEffectiveFps : undefined,
      workloadProfile: selectedWorkload,
    };
  }, [
    maxBudget,
    selectedSocket,
    selectedRamGen,
    selectedGpuVendor,
    minEffectiveFps,
    selectedWorkload,
  ]);

  const optimizationResult = useMemo(() => {
    return optimizeFullSystemBuilds(
      {
        cpus: activeCpus,
        gpus,
        motherboards: activeMotherboards,
        ramKits: activeRam,
        psus: activePsus,
        storages: activeStorages,
        cases: activeCases,
        coolers: activeCoolers,
      },
      filterCriteria,
    );
  }, [
    activeCpus,
    gpus,
    activeMotherboards,
    activeRam,
    activePsus,
    activeStorages,
    activeCases,
    activeCoolers,
    filterCriteria,
  ]);

  const { optimalBuilds, allCompatibleBuilds, totalCompatibleBuilds } =
    optimizationResult;

  // The #1 top build under budget is the build on the Pareto frontier with highest effective FPS
  const topBuildUnderBudget: PcBuild | null = useMemo(() => {
    if (optimalBuilds.length === 0) return null;
    const underBudget = optimalBuilds.filter((b) => b.totalPrice <= maxBudget);
    if (underBudget.length === 0) return optimalBuilds[0];
    return underBudget[underBudget.length - 1];
  }, [optimalBuilds, maxBudget]);

  // If user clicked a specific build, inspect that; otherwise inspect top build
  const activeBuild = useMemo(() => {
    if (selectedBuildId) {
      const match =
        optimalBuilds.find((b) => b.id === selectedBuildId) ??
        allCompatibleBuilds.find((b) => b.id === selectedBuildId);
      if (match) return match;
    }
    if (
      initialShare &&
      (initialShare.cpuId ||
        initialShare.gpuId ||
        initialShare.moboId ||
        initialShare.ramId ||
        initialShare.psuId ||
        initialShare.storageId ||
        initialShare.caseId ||
        initialShare.coolerId)
    ) {
      const match = allCompatibleBuilds.find(
        (b) =>
          (!initialShare.cpuId || b.cpu.id === initialShare.cpuId) &&
          (!initialShare.gpuId || b.gpu.id === initialShare.gpuId) &&
          (!initialShare.moboId || b.motherboard.id === initialShare.moboId) &&
          (!initialShare.ramId || b.ram.id === initialShare.ramId) &&
          (!initialShare.psuId || b.psu.id === initialShare.psuId) &&
          (!initialShare.storageId ||
            b.storage.id === initialShare.storageId) &&
          (!initialShare.caseId || b.case.id === initialShare.caseId) &&
          (!initialShare.coolerId || b.cooler.id === initialShare.coolerId),
      );
      if (match) return match;
    }
    return topBuildUnderBudget;
  }, [
    selectedBuildId,
    initialShare,
    topBuildUnderBudget,
    optimalBuilds,
    allCompatibleBuilds,
  ]);

  // Step-Down and Step-Up alternatives along the frontier
  const { stepDownBuild, stepUpBuild } = useMemo(() => {
    if (!activeBuild || optimalBuilds.length <= 1) {
      return { stepDownBuild: null, stepUpBuild: null };
    }
    const currentIndex = optimalBuilds.findIndex(
      (b) => b.id === activeBuild.id,
    );
    const stepDown = currentIndex > 0 ? optimalBuilds[currentIndex - 1] : null;
    const stepUp =
      currentIndex >= 0 && currentIndex < optimalBuilds.length - 1
        ? optimalBuilds[currentIndex + 1]
        : null;
    return { stepDownBuild: stepDown, stepUpBuild: stepUp };
  }, [activeBuild, optimalBuilds]);

  const handleApplyPreset = (preset: BudgetPreset) => {
    setActivePresetId(preset.id);
    setMaxBudget(preset.budget);
    setSelectedBuildId(null);
  };

  const handleResetFilters = () => {
    setMaxBudget(isBrl ? 6000 : 1000);
    setSelectedSocket('ALL');
    setSelectedRamGen('ALL');
    setSelectedGpuVendor('ALL');
    setSelectedWorkload('sweetspot-1440p');
    setMinEffectiveFps(0);
    setActivePresetId(isBrl ? 'sweet-6000' : 'sweet-1000');
    setSelectedBuildId(null);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('buildFullTitle', locale)}
              </h2>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-300">
                {t('buildFullSubtitle', locale)}
              </span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {t('buildFullDescription', locale)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToSimple && (
              <button
                type="button"
                onClick={onSwitchToSimple}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                {locale === 'pt-BR' ? 'Guia Simples' : 'Simple Guide'}
              </button>
            )}
            {onSwitchToExplorer && (
              <button
                type="button"
                onClick={onSwitchToExplorer}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                {locale === 'pt-BR' ? 'Explorador de GPUs' : 'GPU Explorer'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 transition shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>
                {locale === 'pt-BR' ? 'Modo Upgrade' : 'Upgrade Mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Performance Target & Workload Presets */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>
              {locale === 'pt-BR'
                ? 'Objetivo de Desempenho'
                : 'Performance Target'}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {selectedWorkload === 'esports-1080p' &&
                (locale === 'pt-BR'
                  ? 'Foco em CPU e taxa de quadros competitiva'
                  : 'CPU-bound high-refresh esports')}
              {selectedWorkload === 'sweetspot-1440p' &&
                (locale === 'pt-BR'
                  ? 'Equilíbrio ideal entre GPU e CPU em 1440p'
                  : 'Optimal 1440p raster and 12GB+ VRAM')}
              {selectedWorkload === 'enthusiast-4k' &&
                (locale === 'pt-BR'
                  ? 'Carga pesada de GPU, Ray Tracing e 16GB+ VRAM'
                  : 'Heavy GPU/RT throughput and 16GB+ VRAM')}
              {selectedWorkload === 'creator-ai' &&
                (locale === 'pt-BR'
                  ? 'Aceleração CUDA/Tensor e 32GB de RAM para IA e criação'
                  : 'CUDA/Tensor acceleration & 32GB RAM for creator/AI')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'sweetspot-1440p' as const,
                label: '1440p Sweet Spot',
                icon: '🎯',
                desc:
                  locale === 'pt-BR'
                    ? 'Equilibrado (Custo-Benefício)'
                    : 'Balanced Value',
              },
              {
                id: 'esports-1080p' as const,
                label: '1080p Esports',
                icon: '⚡',
                desc:
                  locale === 'pt-BR'
                    ? 'Alto FPS / Foco em CPU'
                    : 'High Refresh / CPU Bound',
              },
              {
                id: 'enthusiast-4k' as const,
                label: '4K RT Enthusiast',
                icon: '💎',
                desc:
                  locale === 'pt-BR'
                    ? 'Ray Tracing & 16GB+ VRAM'
                    : 'Ray Tracing & 16GB+ VRAM',
              },
              {
                id: 'creator-ai' as const,
                label: 'Creator & AI',
                icon: '🧠',
                desc:
                  locale === 'pt-BR'
                    ? 'CUDA / Tensor + 32GB RAM'
                    : 'CUDA / Tensor + 32GB RAM',
              },
            ].map((wl) => (
              <button
                key={wl.id}
                type="button"
                onClick={() => {
                  setSelectedWorkload(wl.id);
                  setSelectedBuildId(null);
                }}
                className={`rounded-xl border p-2.5 text-left transition ${
                  selectedWorkload === wl.id
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-white">
                  <span>{wl.icon}</span>
                  <span>{wl.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {wl.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Budget Presets */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Quick Budget Presets</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {totalCompatibleBuilds} compatible builds evaluated
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {budgetPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`rounded-xl border p-3 text-left transition ${
                  activePresetId === preset.id && maxBudget === preset.budget
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="text-sm font-black text-white">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {preset.shortDesc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget Slider & Ecosystem Controls */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-5">
          {/* Slider Column */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                {t('buildMaxBudget', locale)}
              </span>
              <div className="text-right">
                <span className="text-base font-black text-emerald-400">
                  {formatCurrency(maxBudget, currency)}
                </span>
                {currency === 'BRL' && (
                  <span className="block text-[10px] text-amber-300/80 font-normal">
                    {getEstimatedPriceNotice(locale, currency)}
                  </span>
                )}
              </div>
            </div>
            <input
              type="range"
              min={minSlider}
              max={maxSlider}
              step={stepSlider}
              value={maxBudget}
              onChange={(e) => {
                setMaxBudget(Number(e.target.value));
                setActivePresetId('');
                setSelectedBuildId(null);
              }}
              className="w-full accent-emerald-500 h-2 rounded-lg bg-slate-800 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{formatCurrency(minSlider, currency)}</span>
              <span>
                {formatCurrency(
                  Math.round((minSlider + maxSlider) / 2),
                  currency,
                )}
              </span>
              <span>{formatCurrency(maxSlider, currency)}</span>
            </div>
          </div>

          {/* Platform Filters Column */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-3">
            {/* Socket Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Platform Socket
              </label>
              <select
                value={selectedSocket}
                onChange={(e) => {
                  setSelectedSocket(parseSocketFilter(e.target.value));
                  setSelectedBuildId(null);
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Platforms (AM4, AM5, Intel)</option>
                <option value="AM4">AMD AM4 (Budget DDR4)</option>
                <option value="AM5">AMD AM5 (DDR5 & Upgradeable)</option>
                <option value="LGA1700">Intel LGA1700 (12th–14th Gen)</option>
                <option value="LGA1851">Intel LGA1851 (Arrow Lake)</option>
              </select>
            </div>

            {/* RAM Generation Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                RAM Gen
              </label>
              <select
                value={selectedRamGen}
                onChange={(e) => {
                  setSelectedRamGen(parseRamGenFilter(e.target.value));
                  setSelectedBuildId(null);
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All RAM (DDR4 & DDR5)</option>
                <option value="DDR4">DDR4 Only</option>
                <option value="DDR5">DDR5 Only</option>
              </select>
            </div>

            {/* GPU Vendor Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                GPU Vendor
              </label>
              <select
                value={selectedGpuVendor}
                onChange={(e) => {
                  setSelectedGpuVendor(parseVendorFilter(e.target.value));
                  setSelectedBuildId(null);
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All GPUs</option>
                <option value="NVIDIA">NVIDIA</option>
                <option value="AMD">AMD</option>
                <option value="Intel">Intel</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Reset full build filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Hero Build Recommendation */}
      {activeBuild ? (
        <BuildHeroCard
          build={activeBuild}
          currency={currency}
          locale={locale}
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white">
            No Compatible Builds Found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try raising the maximum budget or relaxing socket and RAM generation
            filters to find valid hardware combinations.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Step-Down & Step-Up Trade-Off Alternatives */}
      {(stepDownBuild || stepUpBuild) && activeBuild && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stepDownBuild && (
            <div
              onClick={() => setSelectedBuildId(stepDownBuild.id)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900 transition flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                  <ArrowDownRight className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Step Down (Save Money)
                  </div>
                  <div className="text-sm font-bold text-white">
                    {formatCurrency(stepDownBuild.totalPrice, currency)} ·{' '}
                    {stepDownBuild.effectiveFps1440p} FPS
                  </div>
                  <div className="text-xs text-emerald-400 font-medium">
                    Save{' '}
                    {formatCurrency(
                      activeBuild.totalPrice - stepDownBuild.totalPrice,
                      currency,
                    )}{' '}
                    (lose{' '}
                    {(
                      activeBuild.effectiveFps1440p -
                      stepDownBuild.effectiveFps1440p
                    ).toFixed(1)}{' '}
                    FPS)
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                Inspect
              </button>
            </div>
          )}

          {stepUpBuild && (
            <div
              onClick={() => setSelectedBuildId(stepUpBuild.id)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900 transition flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                  <ArrowUpRight className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Step Up (Next Performance Tier)
                  </div>
                  <div className="text-sm font-bold text-white">
                    {formatCurrency(stepUpBuild.totalPrice, currency)} ·{' '}
                    {stepUpBuild.effectiveFps1440p} FPS
                  </div>
                  <div className="text-xs text-indigo-300 font-medium">
                    +
                    {formatCurrency(
                      stepUpBuild.totalPrice - activeBuild.totalPrice,
                      currency,
                    )}{' '}
                    for +
                    {(
                      stepUpBuild.effectiveFps1440p -
                      activeBuild.effectiveFps1440p
                    ).toFixed(1)}{' '}
                    FPS
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                Inspect
              </button>
            </div>
          )}
        </div>
      )}

      {/* Complete Pareto Build Frontier Table */}
      <BuildLeaderboardTable
        optimalBuilds={optimalBuilds}
        activeBuildId={activeBuild?.id ?? null}
        maxBudget={maxBudget}
        currency={currency}
        onSelectBuild={(buildId) => setSelectedBuildId(buildId)}
      />

      {isUpgradeModalOpen && (
        <UpgradePlannerModal
          catalogs={{
            cpus: activeCpus,
            gpus,
            motherboards: activeMotherboards,
            ramKits: activeRam,
            psus: activePsus,
            storages: activeStorages,
            cases: activeCases,
            coolers: activeCoolers,
          }}
          currency={currency}
          locale={locale}
          workloadProfile={selectedWorkload}
          onClose={() => setIsUpgradeModalOpen(false)}
          onSelectBuild={(build) => {
            setSelectedBuildId(build.id);
            setIsUpgradeModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
