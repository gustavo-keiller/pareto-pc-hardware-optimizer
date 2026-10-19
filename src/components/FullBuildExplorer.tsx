import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from 'lucide-react';
import {
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
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../data/seedComponents';
import {
  BuildFilterCriteria,
  optimizeFullSystemBuilds,
} from '../lib/math/combinatorial';
import { convertUsdToBrl, formatCurrency } from '../utils/currency';
import { AppLocale } from '../utils/i18n';
import { BuildHeroCard } from './BuildHeroCard';
import { BuildLeaderboardTable } from './BuildLeaderboardTable';

interface FullBuildExplorerProps {
  gpus: GpuCandidate[];
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  onSwitchToSimple?: () => void;
  onSwitchToExplorer?: () => void;
}

interface BudgetPreset {
  id: string;
  label: string;
  budget: number;
  shortDesc: string;
}

const BUDGET_PRESETS_USD: BudgetPreset[] = [
  {
    id: 'entry-750',
    label: '$750 Entry',
    budget: 750,
    shortDesc: 'Smooth 1080p / 1440p entry gaming',
  },
  {
    id: 'sweet-1000',
    label: '$1,000 Sweet Spot',
    budget: 1000,
    shortDesc: 'Maximum value-per-dollar 1440p',
  },
  {
    id: 'high-1500',
    label: '$1,500 High-FPS',
    budget: 1500,
    shortDesc: 'High-refresh 1440p & modern Ray Tracing',
  },
  {
    id: 'enthusiast-2200',
    label: '$2,200 Enthusiast',
    budget: 2200,
    shortDesc: 'Ryzen 7800X3D + Tier-1 GPU powerhouse',
  },
  {
    id: 'extreme-3200',
    label: '$3,200 Extreme',
    budget: 3200,
    shortDesc: 'Unconstrained 4K / high-fps flagship setup',
  },
];

const BUDGET_PRESETS_BRL: BudgetPreset[] = [
  {
    id: 'entry-4500',
    label: 'R$ 4.500 Entrada',
    budget: 4500,
    shortDesc: '1080p / 1440p econômico balanceado',
  },
  {
    id: 'sweet-6000',
    label: 'R$ 6.000 Ponto Ideal',
    budget: 6000,
    shortDesc: 'Melhor custo-benefício em 1440p',
  },
  {
    id: 'high-8500',
    label: 'R$ 8.500 Alto FPS',
    budget: 8500,
    shortDesc: 'Alto FPS 1440p e Ray Tracing',
  },
  {
    id: 'enthusiast-12000',
    label: 'R$ 12.000 Entusiasta',
    budget: 12000,
    shortDesc: 'Ryzen 7800X3D + GPU topo de linha',
  },
  {
    id: 'extreme-18000',
    label: 'R$ 18.000 Extremo',
    budget: 18000,
    shortDesc: 'Máximo 4K e alto FPS sem concessões',
  },
];

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
  const [maxBudget, setMaxBudget] = useState<number>(() =>
    isBrl ? 6000 : 1000,
  );
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
  const [activePresetId, setActivePresetId] = useState<string>(() =>
    isBrl ? 'sweet-6000' : 'sweet-1000',
  );
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  useEffect(() => {
    if (isBrl && maxBudget < 3500) {
      setMaxBudget(6000);
      setActivePresetId('sweet-6000');
    } else if (!isBrl && maxBudget > 3500) {
      setMaxBudget(1000);
      setActivePresetId('sweet-1000');
    }
  }, [isBrl, maxBudget]);

  const activeCpus = useMemo(
    () =>
      isBrl
        ? SEED_CPUS.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_CPUS,
    [isBrl],
  );
  const activeMotherboards = useMemo(
    () =>
      isBrl
        ? SEED_MOTHERBOARDS.map((m) => ({
            ...m,
            price: convertUsdToBrl(m.price),
          }))
        : SEED_MOTHERBOARDS,
    [isBrl],
  );
  const activeRam = useMemo(
    () =>
      isBrl
        ? SEED_RAM_KITS.map((r) => ({ ...r, price: convertUsdToBrl(r.price) }))
        : SEED_RAM_KITS,
    [isBrl],
  );
  const activePsus = useMemo(
    () =>
      isBrl
        ? SEED_PSUS.map((p) => ({ ...p, price: convertUsdToBrl(p.price) }))
        : SEED_PSUS,
    [isBrl],
  );
  const activeStorages = useMemo(
    () =>
      isBrl
        ? SEED_STORAGES.map((s) => ({ ...s, price: convertUsdToBrl(s.price) }))
        : SEED_STORAGES,
    [isBrl],
  );
  const activeCases = useMemo(
    () =>
      isBrl
        ? SEED_CASES.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_CASES,
    [isBrl],
  );
  const activeCoolers = useMemo(
    () =>
      isBrl
        ? SEED_COOLERS.map((c) => ({ ...c, price: convertUsdToBrl(c.price) }))
        : SEED_COOLERS,
    [isBrl],
  );

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
    };
  }, [
    maxBudget,
    selectedSocket,
    selectedRamGen,
    selectedGpuVendor,
    minEffectiveFps,
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
    if (!selectedBuildId) return topBuildUnderBudget;
    return (
      optimalBuilds.find((b) => b.id === selectedBuildId) ??
      allCompatibleBuilds.find((b) => b.id === selectedBuildId) ??
      topBuildUnderBudget
    );
  }, [
    selectedBuildId,
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
                Combinatorial Full-System Builder
              </h2>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-300">
                Mario Kart Mode
              </span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              We assemble all 5 critical components (
              <span className="text-emerald-400 font-semibold">CPU</span> +{' '}
              <span className="text-indigo-400 font-semibold">GPU</span> +{' '}
              <span className="text-sky-400 font-semibold">RAM</span> +{' '}
              <span className="text-amber-400 font-semibold">Motherboard</span>{' '}
              + <span className="text-teal-400 font-semibold">PSU</span>
              ), prune out inferior individual parts, eliminate physical
              incompatibilities, and calculate CPU-GPU bottlenecks to deliver
              the pure Pareto Frontier of complete PC builds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToSimple && (
              <button
                type="button"
                onClick={onSwitchToSimple}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                Simple Guide
              </button>
            )}
            {onSwitchToExplorer && (
              <button
                type="button"
                onClick={onSwitchToExplorer}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                GPU Explorer
              </button>
            )}
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
                Maximum System Budget
              </span>
              <span className="text-base font-black text-emerald-400">
                {formatCurrency(maxBudget, currency)}
              </span>
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
    </div>
  );
};
