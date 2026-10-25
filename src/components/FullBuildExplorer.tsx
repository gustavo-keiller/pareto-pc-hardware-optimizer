import React, { useEffect, useMemo, useState } from 'react';
import { Layers, AlertTriangle, Wrench } from 'lucide-react';
import {
  AestheticPreference,
  assemblePcBuild,
  BuildWorkloadProfile,
  CaseCandidate,
  CoolerCandidate,
  CoolerTypePreference,
  CpuCandidate,
  CpuSocket,
  CpuVendorPreference,
  FormFactorPreference,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  RamCandidate,
  RamGeneration,
  StorageCandidate,
} from '../lib/math/buildTypes';
import { GpuCandidate, HardwareVendor } from '../lib/math/types';
import { BudgetPreset } from '../data/budgetPresets';
import { BuildFilterCriteria } from '../lib/math/combinatorial';
import { useFullSystemOptimizer } from '../hooks/useFullSystemOptimizer';
import { useUserPrices } from '../hooks/useUserPrices';
import { formatCurrency, getCurrencyAdjustedCatalogs } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { decodeBuildShareUrl } from '../utils/shareBuild';
import { BuildHeroCard } from './BuildHeroCard';
import { BuildAlternatives } from './BuildAlternatives';
import { BuildFilterControls } from './BuildFilterControls';
import { BuildLeaderboardTable } from './BuildLeaderboardTable';
import { UpgradePlannerModal } from './UpgradePlannerModal';
import {
  PartSwapperModal,
  SwappableCategory,
  SwappableSelection,
} from './PartSwapperModal';

export interface CustomOverrideParts {
  cpu?: CpuCandidate;
  gpu?: GpuCandidate;
  motherboard?: MotherboardCandidate;
  ram?: RamCandidate;
  storage?: StorageCandidate;
  cooler?: CoolerCandidate;
  case?: CaseCandidate;
  psu?: PsuCandidate;
}

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
  const [selectedCpuVendor, setSelectedCpuVendor] =
    useState<CpuVendorPreference>(() => initialShare?.cpuVendor ?? 'ALL');
  const [selectedFormFactor, setSelectedFormFactor] =
    useState<FormFactorPreference>(() => initialShare?.formFactor ?? 'ALL');
  const [selectedCoolerType, setSelectedCoolerType] =
    useState<CoolerTypePreference>(() => initialShare?.coolerType ?? 'ALL');
  const [selectedAesthetic, setSelectedAesthetic] =
    useState<AestheticPreference>(() => initialShare?.aesthetic ?? 'ALL');
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
  const [swappingCategory, setSwappingCategory] =
    useState<SwappableCategory | null>(null);
  const [customOverrides, setCustomOverrides] =
    useState<CustomOverrideParts | null>(null);

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

  const { userPrices } = useUserPrices(currency);
  const {
    cpus: activeCpus,
    motherboards: activeMotherboards,
    ramKits: activeRam,
    psus: activePsus,
    storages: activeStorages,
    cases: activeCases,
    coolers: activeCoolers,
  } = useMemo(
    () => getCurrencyAdjustedCatalogs(currency, undefined, userPrices),
    [currency, userPrices],
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
      preferredCpuVendor:
        selectedCpuVendor === 'ALL' ? undefined : selectedCpuVendor,
      preferredFormFactor:
        selectedFormFactor === 'ALL' ? undefined : selectedFormFactor,
      preferredCoolerType:
        selectedCoolerType === 'ALL' ? undefined : selectedCoolerType,
      preferredAesthetic:
        selectedAesthetic === 'ALL' ? undefined : selectedAesthetic,
      minEffectiveFps: minEffectiveFps > 0 ? minEffectiveFps : undefined,
      workloadProfile: selectedWorkload,
    };
  }, [
    maxBudget,
    selectedSocket,
    selectedRamGen,
    selectedGpuVendor,
    selectedCpuVendor,
    selectedFormFactor,
    selectedCoolerType,
    selectedAesthetic,
    minEffectiveFps,
    selectedWorkload,
  ]);

  const fullCatalogs = useMemo(
    () => ({
      cpus: activeCpus,
      gpus,
      motherboards: activeMotherboards,
      ramKits: activeRam,
      psus: activePsus,
      storages: activeStorages,
      cases: activeCases,
      coolers: activeCoolers,
    }),
    [
      activeCpus,
      gpus,
      activeMotherboards,
      activeRam,
      activePsus,
      activeStorages,
      activeCases,
      activeCoolers,
    ],
  );

  const { optimizationResult, isCalculating } = useFullSystemOptimizer({
    catalogs: fullCatalogs,
    filterCriteria,
  });

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
  const baseBuild = useMemo(() => {
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

  // Apply user component swaps on top of the base recommended build [BLD-05]
  const activeBuild = useMemo(() => {
    if (!baseBuild) return null;
    if (!customOverrides || Object.keys(customOverrides).length === 0) {
      return baseBuild;
    }

    const cpu = customOverrides.cpu ?? baseBuild.cpu;
    const gpu = customOverrides.gpu ?? baseBuild.gpu;
    const mobo = customOverrides.motherboard ?? baseBuild.motherboard;
    const ram = customOverrides.ram ?? baseBuild.ram;
    const psu = customOverrides.psu ?? baseBuild.psu;
    const storage = customOverrides.storage ?? baseBuild.storage;
    const pcCase = customOverrides.case ?? baseBuild.case;
    const cooler = customOverrides.cooler ?? baseBuild.cooler;

    try {
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
      );
    } catch {
      return baseBuild;
    }
  }, [baseBuild, customOverrides, selectedWorkload]);

  const isCustomized = Boolean(
    customOverrides && Object.keys(customOverrides).length > 0,
  );

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
    setCustomOverrides(null);
  };

  const handleResetFilters = () => {
    setMaxBudget(isBrl ? 6000 : 1000);
    setSelectedSocket('ALL');
    setSelectedRamGen('ALL');
    setSelectedGpuVendor('ALL');
    setSelectedCpuVendor('ALL');
    setSelectedFormFactor('ALL');
    setSelectedCoolerType('ALL');
    setSelectedAesthetic('ALL');
    setSelectedWorkload('sweetspot-1440p');
    setMinEffectiveFps(0);
    setActivePresetId(isBrl ? 'sweet-6000' : 'sweet-1000');
    setSelectedBuildId(null);
    setCustomOverrides(null);
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
          selectedCpuVendor={selectedCpuVendor}
          onCpuVendorChange={(vendor) => {
            setSelectedCpuVendor(vendor);
            setSelectedBuildId(null);
          }}
          selectedFormFactor={selectedFormFactor}
          onFormFactorChange={(formFactor) => {
            setSelectedFormFactor(formFactor);
            setSelectedBuildId(null);
          }}
          selectedCoolerType={selectedCoolerType}
          onCoolerTypeChange={(coolerType) => {
            setSelectedCoolerType(coolerType);
            setSelectedBuildId(null);
          }}
          selectedAesthetic={selectedAesthetic}
          onAestheticChange={(aesthetic) => {
            setSelectedAesthetic(aesthetic);
            setSelectedBuildId(null);
          }}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Web Worker Background Optimizer Activity Badge [BLD-04] */}
      {isCalculating && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 animate-pulse"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{t('calculatingOptimizer', locale)}</span>
        </div>
      )}

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
          onSwapPart={(cat) => setSwappingCategory(cat)}
          isCustomized={isCustomized}
          onResetCustomization={() => setCustomOverrides(null)}
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
          onSelectBuild={(buildId) => {
            setSelectedBuildId(buildId);
            setCustomOverrides(null);
          }}
        />
      )}

      {/* Complete Pareto Build Frontier Table */}
      <BuildLeaderboardTable
        optimalBuilds={optimalBuilds}
        activeBuildId={activeBuild?.id ?? null}
        maxBudget={maxBudget}
        currency={currency}
        locale={locale}
        onSelectBuild={(buildId) => {
          setSelectedBuildId(buildId);
          setCustomOverrides(null);
        }}
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
            setCustomOverrides(null);
            setIsUpgradeModalOpen(false);
          }}
        />
      )}

      {/* Interactive Part Swapper Modal [BLD-05] */}
      {swappingCategory && activeBuild && (
        <PartSwapperModal
          isOpen={Boolean(swappingCategory)}
          onClose={() => setSwappingCategory(null)}
          category={swappingCategory}
          activeBuild={activeBuild}
          catalogs={fullCatalogs}
          currency={currency}
          locale={locale}
          onSelectComponent={(sel: SwappableSelection) => {
            setCustomOverrides((prev) => {
              const base = prev ?? {};
              switch (sel.category) {
                case 'cpu':
                  return { ...base, cpu: sel.component };
                case 'gpu':
                  return { ...base, gpu: sel.component };
                case 'motherboard':
                  return { ...base, motherboard: sel.component };
                case 'ram':
                  return { ...base, ram: sel.component };
                case 'storage':
                  return { ...base, storage: sel.component };
                case 'cooler':
                  return { ...base, cooler: sel.component };
                case 'case':
                  return { ...base, case: sel.component };
                case 'psu':
                  return { ...base, psu: sel.component };
                default: {
                  const _exhaustive: never = sel;
                  return _exhaustive;
                }
              }
            });
          }}
        />
      )}
    </div>
  );
};
