import React, { useEffect, useMemo } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
  assemblePcBuild,
  checkBuildCompatibility,
} from '../lib/math/buildTypes';
import { GpuCandidate } from '../lib/math/types';
import { ComponentCatalogs } from '../lib/math/combinatorial';
import { AppLocale, t } from '../utils/i18n';
import { formatCurrency } from '../utils/currency';

export type SwappableCategory =
  'cpu' | 'gpu' | 'motherboard' | 'ram' | 'storage' | 'cooler' | 'case' | 'psu';

export type SwappableSelection =
  | { category: 'cpu'; component: CpuCandidate }
  | { category: 'gpu'; component: GpuCandidate }
  | { category: 'motherboard'; component: MotherboardCandidate }
  | { category: 'ram'; component: RamCandidate }
  | { category: 'storage'; component: StorageCandidate }
  | { category: 'cooler'; component: CoolerCandidate }
  | { category: 'case'; component: CaseCandidate }
  | { category: 'psu'; component: PsuCandidate };

export type AnyCandidate =
  | CpuCandidate
  | GpuCandidate
  | MotherboardCandidate
  | RamCandidate
  | StorageCandidate
  | CoolerCandidate
  | CaseCandidate
  | PsuCandidate;

interface EvaluatedCandidate {
  item: AnyCandidate;
  selection: SwappableSelection;
  isCurrent: boolean;
  priceDelta: number;
  fpsDelta: number | null;
  compatibility: ReturnType<typeof checkBuildCompatibility>;
}

export interface PartSwapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: SwappableCategory | null;
  activeBuild: PcBuild;
  catalogs: ComponentCatalogs;
  currency: 'USD' | 'BRL';
  locale: AppLocale;
  onSelectComponent: (selection: SwappableSelection) => void;
}

export const PartSwapperModal: React.FC<PartSwapperModalProps> = ({
  isOpen,
  onClose,
  category,
  activeBuild,
  catalogs,
  currency,
  locale,
  onSelectComponent,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentPart = useMemo((): AnyCandidate | null => {
    if (!category) return null;
    switch (category) {
      case 'cpu':
        return activeBuild.cpu;
      case 'gpu':
        return activeBuild.gpu;
      case 'motherboard':
        return activeBuild.motherboard;
      case 'ram':
        return activeBuild.ram;
      case 'storage':
        return activeBuild.storage;
      case 'cooler':
        return activeBuild.cooler;
      case 'case':
        return activeBuild.case;
      case 'psu':
        return activeBuild.psu;
      default: {
        const _exhaustive: never = category;
        return _exhaustive;
      }
    }
  }, [category, activeBuild]);

  const categoryName = useMemo(() => {
    if (!category) return '';
    switch (category) {
      case 'cpu':
        return t('partCpu', locale);
      case 'gpu':
        return t('partGpu', locale);
      case 'motherboard':
        return t('partMotherboard', locale);
      case 'ram':
        return t('partRam', locale);
      case 'storage':
        return t('partStorage', locale);
      case 'cooler':
        return t('partCooler', locale);
      case 'case':
        return t('partCase', locale);
      case 'psu':
        return t('partPsu', locale);
      default: {
        const _exhaustive: never = category;
        return _exhaustive;
      }
    }
  }, [category, locale]);

  // Evaluate compatibility, price delta, and FPS delta for each candidate cleanly without type assertions
  const evaluatedCandidates = useMemo((): EvaluatedCandidate[] => {
    if (!category || !currentPart) return [];

    switch (category) {
      case 'cpu': {
        return catalogs.cpus.map((cpu): EvaluatedCandidate => {
          const isCurrent = cpu.id === activeBuild.cpu.id;
          const priceDelta = cpu.price - activeBuild.cpu.price;
          const compat = checkBuildCompatibility({
            cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          let fpsDelta: number | null = null;
          if (compat.isCompatible) {
            try {
              const testBuild = assemblePcBuild(
                cpu,
                activeBuild.gpu,
                activeBuild.ram,
                activeBuild.motherboard,
                activeBuild.psu,
                activeBuild.storage,
                activeBuild.case,
                activeBuild.cooler,
                undefined,
                activeBuild.workloadProfile,
              );
              fpsDelta =
                testBuild.effectiveFps1440p - activeBuild.effectiveFps1440p;
            } catch {
              fpsDelta = null;
            }
          }
          return {
            item: cpu,
            selection: { category: 'cpu', component: cpu },
            isCurrent,
            priceDelta,
            fpsDelta,
            compatibility: compat,
          };
        });
      }
      case 'gpu': {
        return catalogs.gpus.map((gpu): EvaluatedCandidate => {
          const isCurrent = gpu.id === activeBuild.gpu.id;
          const priceDelta = gpu.price - activeBuild.gpu.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          let fpsDelta: number | null = null;
          if (compat.isCompatible) {
            try {
              const testBuild = assemblePcBuild(
                activeBuild.cpu,
                gpu,
                activeBuild.ram,
                activeBuild.motherboard,
                activeBuild.psu,
                activeBuild.storage,
                activeBuild.case,
                activeBuild.cooler,
                undefined,
                activeBuild.workloadProfile,
              );
              fpsDelta =
                testBuild.effectiveFps1440p - activeBuild.effectiveFps1440p;
            } catch {
              fpsDelta = null;
            }
          }
          return {
            item: gpu,
            selection: { category: 'gpu', component: gpu },
            isCurrent,
            priceDelta,
            fpsDelta,
            compatibility: compat,
          };
        });
      }
      case 'motherboard': {
        return catalogs.motherboards.map((mobo): EvaluatedCandidate => {
          const isCurrent = mobo.id === activeBuild.motherboard.id;
          const priceDelta = mobo.price - activeBuild.motherboard.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: mobo,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          return {
            item: mobo,
            selection: { category: 'motherboard', component: mobo },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      case 'ram': {
        return catalogs.ramKits.map((ram): EvaluatedCandidate => {
          const isCurrent = ram.id === activeBuild.ram.id;
          const priceDelta = ram.price - activeBuild.ram.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          return {
            item: ram,
            selection: { category: 'ram', component: ram },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      case 'storage': {
        const storages = catalogs.storages ?? [];
        return storages.map((storage): EvaluatedCandidate => {
          const isCurrent = storage.id === activeBuild.storage.id;
          const priceDelta = storage.price - activeBuild.storage.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          return {
            item: storage,
            selection: { category: 'storage', component: storage },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      case 'cooler': {
        const coolers = catalogs.coolers ?? [];
        return coolers.map((cooler): EvaluatedCandidate => {
          const isCurrent = cooler.id === activeBuild.cooler.id;
          const priceDelta = cooler.price - activeBuild.cooler.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler,
          });
          return {
            item: cooler,
            selection: { category: 'cooler', component: cooler },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      case 'case': {
        const cases = catalogs.cases ?? [];
        return cases.map((pcCase): EvaluatedCandidate => {
          const isCurrent = pcCase.id === activeBuild.case.id;
          const priceDelta = pcCase.price - activeBuild.case.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu: activeBuild.psu,
            storage: activeBuild.storage,
            case: pcCase,
            cooler: activeBuild.cooler,
          });
          return {
            item: pcCase,
            selection: { category: 'case', component: pcCase },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      case 'psu': {
        return catalogs.psus.map((psu): EvaluatedCandidate => {
          const isCurrent = psu.id === activeBuild.psu.id;
          const priceDelta = psu.price - activeBuild.psu.price;
          const compat = checkBuildCompatibility({
            cpu: activeBuild.cpu,
            gpu: activeBuild.gpu,
            ram: activeBuild.ram,
            motherboard: activeBuild.motherboard,
            psu,
            storage: activeBuild.storage,
            case: activeBuild.case,
            cooler: activeBuild.cooler,
          });
          return {
            item: psu,
            selection: { category: 'psu', component: psu },
            isCurrent,
            priceDelta,
            fpsDelta: null,
            compatibility: compat,
          };
        });
      }
      default: {
        const _exhaustive: never = category;
        return _exhaustive;
      }
    }
  }, [category, currentPart, catalogs, activeBuild]);

  if (!isOpen || !category || !currentPart) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swapper-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                {categoryName}
              </span>
              <h2
                id="swapper-modal-title"
                className="text-lg sm:text-xl font-extrabold text-white"
              >
                {t('swapPartModalTitle', locale)}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {t('swapPartModalSubtitle', locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Part Showcase Banner */}
        <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-slate-400">
              {t('swapCurrentPart', locale)}
            </span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
              {t('swapActiveBadge', locale)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white text-sm sm:text-base">
                {currentPart.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {'vendor' in currentPart && currentPart.vendor}
                {'notes' in currentPart && currentPart.notes
                  ? ` • ${currentPart.notes}`
                  : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-sm sm:text-base font-extrabold text-emerald-400">
                {formatCurrency(currentPart.price, currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Alternatives List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {evaluatedCandidates.map(
            ({
              item,
              selection,
              isCurrent,
              priceDelta,
              fpsDelta,
              compatibility,
            }) => {
              const isCompatible = compatibility.isCompatible;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    isCurrent
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : isCompatible
                        ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        : 'border-amber-500/30 bg-amber-500/5 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">
                          {item.name}
                        </span>
                        {isCurrent && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            {t('swapActiveBadge', locale)}
                          </span>
                        )}
                        {isCompatible ? (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('swapCompatible', locale)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {t('swapIncompatible', locale)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>{formatCurrency(item.price, currency)}</span>

                        {/* Price Delta Badge */}
                        {!isCurrent && (
                          <span
                            className={`font-semibold ${
                              priceDelta < 0
                                ? 'text-emerald-400'
                                : priceDelta > 0
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {priceDelta < 0
                              ? `-${formatCurrency(Math.abs(priceDelta), currency)} ${t('swapPriceDeltaCheaper', locale)}`
                              : priceDelta > 0
                                ? `+${formatCurrency(priceDelta, currency)} ${t('swapPriceDeltaMoreExpensive', locale)}`
                                : '0'}
                          </span>
                        )}

                        {/* FPS Delta Badge for CPU / GPU */}
                        {fpsDelta !== null &&
                          Math.abs(fpsDelta) >= 0.5 &&
                          !isCurrent && (
                            <span
                              className={`font-semibold ${
                                fpsDelta > 0
                                  ? 'text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {fpsDelta > 0
                                ? `+${fpsDelta.toFixed(1)} FPS (${t('swapFpsDeltaFaster', locale)})`
                                : `${fpsDelta.toFixed(1)} FPS (${t('swapFpsDeltaSlower', locale)})`}
                            </span>
                          )}
                      </div>

                      {/* Incompatibility Reasons */}
                      {!isCompatible && compatibility.violations.length > 0 && (
                        <div className="mt-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                          {compatibility.violations[0].message}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      {isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 opacity-80 cursor-default"
                        >
                          <Check className="h-3.5 w-3.5 inline mr-1" />
                          {t('swapActiveBadge', locale)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isCompatible}
                          onClick={() => {
                            onSelectComponent(selection);
                            onClose();
                          }}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                            isCompatible
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span>{t('swapSelectPart', locale)}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
};
