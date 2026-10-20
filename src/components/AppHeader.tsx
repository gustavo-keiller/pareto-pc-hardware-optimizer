import React from 'react';
import {
  Cpu,
  RotateCcw,
  Eye,
  Compass,
  Wrench,
  Layers,
  Database,
  Store,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { DatasetMode, UiMode } from '../hooks/useOptimizerState';
import { AppLocale, getHeaderBadge, getHeaderSubtitle, t } from '../utils/i18n';

export interface AppHeaderProps {
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  locale: AppLocale;
  onToggleLocale: (locale: AppLocale) => void;
  onResetAll: () => void;
  datasetMode: DatasetMode;
  onSwitchDataset: (mode: DatasetMode) => void;
  customGpuCount: number;
  exchangeRateUsdToBrl: number;
  onChangeExchangeRate: (rate: number) => void;
  onOpenDealImporter: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  uiMode,
  setUiMode,
  locale,
  onToggleLocale,
  onResetAll,
  datasetMode,
  onSwitchDataset,
  customGpuCount,
  exchangeRateUsdToBrl,
  onChangeExchangeRate,
  onOpenDealImporter,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        {/* Top Row: Brand & Quick Language/Reset Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Cpu className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  ParetoPC
                </h1>
                <span className="hidden sm:inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 truncate">
                  {getHeaderBadge(uiMode, locale)}
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-400 truncate max-w-xl">
                {getHeaderSubtitle(uiMode, locale)}
              </p>
            </div>
          </div>

          {/* Quick Actions: Language Toggle + Reset Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs">
            {/* Language / Currency Toggle (UX-06) */}
            <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => onToggleLocale('pt-BR')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                  locale === 'pt-BR'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mudar para Português (Preços em Reais R$)"
              >
                🇧🇷 PT
              </button>
              <button
                type="button"
                onClick={() => onToggleLocale('en-US')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                  locale === 'en-US'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to English (Prices in USD $)"
              >
                🇺🇸 EN
              </button>
            </div>

            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 sm:px-2.5 py-1 sm:py-1.5 font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
              title={t('appResetTitle', locale)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t('appResetButton', locale)}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation & Controls Bar: Level Buttons + Expert Controls */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-2 text-xs">
          {/* 4 Proportional Experience Level Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setUiMode('simple')}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                uiMode === 'simple'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {t('modeSimple', locale)}
            </button>
            <button
              type="button"
              onClick={() => setUiMode('explorer')}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                uiMode === 'explorer'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              {t('modeExplorer', locale)}
            </button>
            <button
              type="button"
              onClick={() => setUiMode('pro')}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                uiMode === 'pro'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              {t('modePro', locale)}
            </button>
            <button
              type="button"
              onClick={() => setUiMode('builds')}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                uiMode === 'builds'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t('modeBuilds', locale)}
            </button>
          </div>

          {/* Expert Controls: Dataset Switcher + Import Deals (Visible only in Explorer and Pro modes) */}
          {(uiMode === 'explorer' || uiMode === 'pro') && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Dataset Toggle */}
              <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => onSwitchDataset('real')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                    datasetMode === 'real'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Real GPUs (18)
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDataset('custom')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                    datasetMode === 'custom'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="View your custom imported deals from Pichau, Terabyte, KaBuM, etc."
                >
                  <Store className="h-3.5 w-3.5" />
                  My Deals ({customGpuCount})
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDataset('combined')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                    datasetMode === 'combined'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Combined Sandbox: Compare live store deals directly against converted US benchmark baselines in BRL"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Combined Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDataset('synthetic')}
                  className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                    datasetMode === 'synthetic'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Synthetic testbed with mathematically verified anchors and trap cards"
                >
                  Synthetic (10)
                </button>
              </div>

              {/* Exchange Rate Control for Combined Sandbox Mode */}
              {datasetMode === 'combined' && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs">
                  <span className="text-slate-400 font-medium">USD/BRL:</span>
                  <span className="font-mono font-bold text-amber-300">
                    $1 = R$
                  </span>
                  <input
                    aria-label="USD to BRL Exchange Rate"
                    type="number"
                    min={1}
                    max={20}
                    step={0.1}
                    value={exchangeRateUsdToBrl}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) onChangeExchangeRate(val);
                    }}
                    className="w-14 rounded bg-slate-900 px-1 py-0.5 text-center font-mono font-bold text-amber-300 focus:outline-none border border-slate-700"
                    title="Exchange rate used to convert US benchmark MSRP to BRL"
                  />
                </div>
              )}

              {/* Import Deals Button */}
              <button
                type="button"
                onClick={onOpenDealImporter}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 font-bold text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400 transition shadow-sm"
                title="Paste listings from Pichau, Terabyte, KaBuM, PCYes, Amazon, etc."
              >
                <PlusCircle className="h-3.5 w-3.5" />+ Import Deals
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
