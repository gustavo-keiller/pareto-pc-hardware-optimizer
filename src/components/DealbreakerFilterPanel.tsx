import React from 'react';
import { HardConstraints, GpuCandidate } from '../lib/math/types';
import { DatasetMode } from '../hooks/useOptimizerState';
import { formatCurrency } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { HardwareFilterPanel } from './HardwareFilterPanel';
import { Filter, DollarSign, Zap } from 'lucide-react';

export interface DealbreakerFilterPanelProps {
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints,
  ) => void;
  rawCatalog: GpuCandidate[];
  validGpus: GpuCandidate[];
  activeCurrency: 'USD' | 'BRL';
  maxBudgetBound: number;
  maxWattsBound: number;
  datasetMode: DatasetMode;
  locale?: AppLocale;
}

export const DealbreakerFilterPanel: React.FC<DealbreakerFilterPanelProps> = ({
  constraints,
  onChangeConstraints,
  rawCatalog,
  validGpus,
  activeCurrency,
  maxBudgetBound,
  maxWattsBound,
  datasetMode,
  locale = 'pt-BR',
}) => {
  const minBudget =
    activeCurrency === 'BRL' ? 1000 : datasetMode === 'custom' ? 500 : 200;
  const budgetStep =
    activeCurrency === 'BRL' || datasetMode === 'custom' ? 50 : 10;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            {t('xpStage1Title', locale)}
          </h2>
        </div>
        <span className="text-[11px] font-medium text-emerald-400">
          {validGpus.length}/{rawCatalog.length} {t('xpGpusFit', locale)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {/* Max Budget Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <label
              htmlFor="max-budget-slider"
              className="font-medium text-slate-300 flex items-center gap-1"
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              {t('xpMaxBudget', locale)}
            </label>
            <span className="font-mono font-bold text-emerald-400">
              {formatCurrency(constraints.maxPrice, activeCurrency)}
            </span>
          </div>
          <input
            id="max-budget-slider"
            type="range"
            min={minBudget}
            max={maxBudgetBound}
            step={budgetStep}
            value={Math.min(constraints.maxPrice, maxBudgetBound)}
            onChange={(e) =>
              onChangeConstraints((prev) => ({
                ...prev,
                maxPrice: Number(e.target.value),
              }))
            }
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>{formatCurrency(minBudget, activeCurrency)}</span>
            <span>
              {formatCurrency(Math.round(maxBudgetBound / 2), activeCurrency)}
            </span>
            <span>
              {formatCurrency(maxBudgetBound, activeCurrency)} (
              {t('xpAll', locale)})
            </span>
          </div>
        </div>

        {/* Min VRAM Floor Selector */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-300">
              {t('xpMinVram', locale)}
            </span>
            <span className="font-mono font-bold text-sky-400">
              {constraints.minVram} GB+
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[8, 12, 16, 20].map((vram) => (
              <button
                key={vram}
                type="button"
                aria-pressed={constraints.minVram === vram}
                onClick={() =>
                  onChangeConstraints((prev) => ({
                    ...prev,
                    minVram: vram,
                  }))
                }
                className={`rounded-lg py-1.5 text-xs font-semibold transition border ${
                  constraints.minVram === vram
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {vram} GB+
              </button>
            ))}
          </div>
        </div>

        {/* Max Power TDP Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <label
              htmlFor="max-watts-slider"
              className="font-medium text-slate-300 flex items-center gap-1"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {t('xpMaxPower', locale)}
            </label>
            <span className="font-mono font-bold text-amber-400">
              {constraints.maxWatts} W
            </span>
          </div>
          <input
            id="max-watts-slider"
            type="range"
            min={120}
            max={maxWattsBound}
            step={5}
            value={Math.min(constraints.maxWatts, maxWattsBound)}
            onChange={(e) =>
              onChangeConstraints((prev) => ({
                ...prev,
                maxWatts: Number(e.target.value),
              }))
            }
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>120W ({t('xpLowPower', locale)})</span>
            <span>260W</span>
            <span>
              {maxWattsBound}W ({t('xpNoLimit', locale)})
            </span>
          </div>
        </div>

        {/* Brand & Ecosystem Filters */}
        <div className="pt-2 border-t border-slate-800/80">
          <HardwareFilterPanel
            candidates={rawCatalog}
            constraints={constraints}
            onChangeConstraints={onChangeConstraints}
            locale={locale}
          />
        </div>
      </div>
    </section>
  );
};
