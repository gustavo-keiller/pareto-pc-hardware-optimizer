import React, { useEffect, useMemo, useState } from 'react';
import { Layers, AlertTriangle, Wrench } from 'lucide-react';
import {
  assemblePcBuild,
  BuildWorkloadProfile,
  CpuSocket,
  PcBuild,
  RamGeneration,
} from '../lib/math/buildTypes';
import { GpuCandidate, HardwareVendor } from '../lib/math/types';
import { BudgetPreset } from '../data/budgetPresets';
import {
  BuildFilterCriteria,
  optimizeFullSystemBuilds,
} from '../lib/math/combinatorial';
import { formatCurrency, getCurrencyAdjustedCatalogs } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { decodeBuildShareUrl } from '../utils/shareBuild';
import { BuildHeroCard } from './BuildHeroCard';
import { BuildAlternatives } from './BuildAlternatives';
import { BuildFilterControls } from './BuildFilterControls';
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
  const [dismissSharedNotice, setDismissSharedNotice] = useState(false);

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

  // Detect if any part from a shared link was not found in catalogs
  const sharedBuildMissingParts = useMemo(() => {
    if (!initialShare) return false;
    const hasAnyId = Boolean(
      initialShare.cpuId ||
      initialShare.gpuId ||
      initialShare.moboId ||
      initialShare.ramId ||
      initialShare.psuId ||
      initialShare.storageId ||
      initialShare.caseId ||
      initialShare.coolerId,
    );
    if (!hasAnyId) return false;

    if (
      initialShare.cpuId &&
      !activeCpus.some((c) => c.id === initialShare.cpuId)
    )
      return true;
    if (initialShare.gpuId && !gpus.some((g) => g.id === initialShare.gpuId))
      return true;
    if (
      initialShare.moboId &&
      !activeMotherboards.some((m) => m.id === initialShare.moboId)
    )
      return true;
    if (
      initialShare.ramId &&
      !activeRam.some((r) => r.id === initialShare.ramId)
    )
      return true;
    if (
      initialShare.psuId &&
      !activePsus.some((p) => p.id === initialShare.psuId)
    )
      return true;
    if (
      initialShare.storageId &&
      !activeStorages.some((s) => s.id === initialShare.storageId)
    )
      return true;
    if (
      initialShare.caseId &&
      !activeCases.some((c) => c.id === initialShare.caseId)
    )
      return true;
    if (
      initialShare.coolerId &&
      !activeCoolers.some((c) => c.id === initialShare.coolerId)
    )
      return true;

    return false;
  }, [
    initialShare,
    activeCpus,
    gpus,
    activeMotherboards,
    activeRam,
    activePsus,
    activeStorages,
    activeCases,
    activeCoolers,
  ]);

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

      // Reconstruct if all 8 parts are present in active catalogs
      const cpu = activeCpus.find((c) => c.id === initialShare.cpuId);
      const gpu = gpus.find((g) => g.id === initialShare.gpuId);
      const mobo = activeMotherboards.find((m) => m.id === initialShare.moboId);
      const ram = activeRam.find((r) => r.id === initialShare.ramId);
      const psu = activePsus.find((p) => p.id === initialShare.psuId);
      const storage = activeStorages.find(
        (s) => s.id === initialShare.storageId,
      );
      const pcCase = activeCases.find((c) => c.id === initialShare.caseId);
      const cooler = activeCoolers.find((c) => c.id === initialShare.coolerId);

      if (cpu && gpu && mobo && ram && psu && storage && pcCase && cooler) {
        return assemblePcBuild(
          cpu,
          gpu,
          ram,
          mobo,
          psu,
          storage,
          pcCase,
          cooler,
          0.5,
          selectedWorkload,
          false,
        );
      }
    }
    return topBuildUnderBudget;
  }, [
    selectedBuildId,
    initialShare,
    topBuildUnderBudget,
    optimalBuilds,
    allCompatibleBuilds,
    activeCpus,
    gpus,
    activeMotherboards,
    activeRam,
    activePsus,
    activeStorages,
    activeCases,
    activeCoolers,
    selectedWorkload,
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
                {t('btnSimpleGuide', locale)}
              </button>
            )}
            {onSwitchToExplorer && (
              <button
                type="button"
                onClick={onSwitchToExplorer}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                {t('btnGpuExplorer', locale)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 transition shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>{t('btnUpgradeMode', locale)}</span>
            </button>
          </div>
        </div>

        <BuildFilterControls
          currency={currency}
          locale={locale}
          maxBudget={maxBudget}
          onMaxBudgetChange={(budget) => {
            setMaxBudget(budget);
            setActivePresetId('');
            setSelectedBuildId(null);
          }}
          selectedWorkload={selectedWorkload}
          onWorkloadChange={(workload) => {
            setSelectedWorkload(workload);
            setSelectedBuildId(null);
          }}
          activePresetId={activePresetId}
          onApplyPreset={handleApplyPreset}
          totalCompatibleBuilds={totalCompatibleBuilds}
          selectedSocket={selectedSocket}
          onSocketChange={(socket) => {
            setSelectedSocket(socket);
            setSelectedBuildId(null);
          }}
          selectedRamGen={selectedRamGen}
          onRamGenChange={(ramGen) => {
            setSelectedRamGen(ramGen);
            setSelectedBuildId(null);
          }}
          selectedGpuVendor={selectedGpuVendor}
          onGpuVendorChange={(vendor) => {
            setSelectedGpuVendor(vendor);
            setSelectedBuildId(null);
          }}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Shared Build Fallback Notice */}
      {sharedBuildMissingParts && !dismissSharedNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{t('sharedMissingPartsNotice', locale)}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissSharedNotice(true)}
            className="text-amber-400 hover:text-white p-1 font-bold"
            title={t('sharedDismissNotice', locale)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Shared Build Over-Budget Notice */}
      {activeBuild && activeBuild.totalPrice > maxBudget && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-xs text-sky-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-sky-400" />
          <span>
            {t('sharedOverBudgetNotice', locale)}{' '}
            {formatCurrency(activeBuild.totalPrice, currency)}{' '}
            {t('sharedOverBudgetSuffix', locale)}{' '}
            {formatCurrency(maxBudget, currency)}.
          </span>
        </div>
      )}

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
            {t('noCompatibleBuildsFound', locale)}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {t('noCompatibleBuildsDesc', locale)}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            {t('resetAllFilters', locale)}
          </button>
        </div>
      )}

      {/* Step-Down & Step-Up Trade-Off Alternatives */}
      {activeBuild && (
        <BuildAlternatives
          activeBuild={activeBuild}
          stepDownBuild={stepDownBuild}
          stepUpBuild={stepUpBuild}
          currency={currency}
          locale={locale}
          onSelectBuild={(buildId) => setSelectedBuildId(buildId)}
        />
      )}

      {/* Complete Pareto Build Frontier Table */}
      <BuildLeaderboardTable
        optimalBuilds={optimalBuilds}
        activeBuildId={activeBuild?.id ?? null}
        maxBudget={maxBudget}
        currency={currency}
        locale={locale}
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
