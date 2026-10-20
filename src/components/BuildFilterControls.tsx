import React from 'react';
import { DollarSign, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  AestheticPreference,
  BuildWorkloadProfile,
  CoolerTypePreference,
  CpuSocket,
  CpuVendorPreference,
  FormFactorPreference,
  isAestheticPreference,
  isCoolerTypePreference,
  isCpuSocket,
  isCpuVendorPreference,
  isFormFactorPreference,
  isRamGeneration,
  RamGeneration,
} from '../lib/math/buildTypes';
import { HardwareVendor } from '../lib/math/types';
import {
  BUDGET_PRESETS_BRL,
  BUDGET_PRESETS_USD,
  BudgetPreset,
} from '../data/budgetPresets';
import { formatCurrency, getEstimatedPriceNotice } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';

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

function parseCpuVendorFilter(value: string): CpuVendorPreference {
  return isCpuVendorPreference(value) ? value : 'ALL';
}

function parseFormFactorFilter(value: string): FormFactorPreference {
  return isFormFactorPreference(value) ? value : 'ALL';
}

function parseCoolerTypeFilter(value: string): CoolerTypePreference {
  return isCoolerTypePreference(value) ? value : 'ALL';
}

function parseAestheticFilter(value: string): AestheticPreference {
  return isAestheticPreference(value) ? value : 'ALL';
}

export interface BuildFilterControlsProps {
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  maxBudget: number;
  onMaxBudgetChange: (budget: number) => void;
  selectedWorkload: BuildWorkloadProfile;
  onWorkloadChange: (workload: BuildWorkloadProfile) => void;
  activePresetId: string;
  onApplyPreset: (preset: BudgetPreset) => void;
  totalCompatibleBuilds: number;
  selectedSocket: CpuSocket | 'ALL';
  onSocketChange: (socket: CpuSocket | 'ALL') => void;
  selectedRamGen: RamGeneration | 'ALL';
  onRamGenChange: (ramGen: RamGeneration | 'ALL') => void;
  selectedGpuVendor: HardwareVendor | 'ALL';
  onGpuVendorChange: (vendor: HardwareVendor | 'ALL') => void;
  selectedCpuVendor?: CpuVendorPreference;
  onCpuVendorChange?: (vendor: CpuVendorPreference) => void;
  selectedFormFactor?: FormFactorPreference;
  onFormFactorChange?: (formFactor: FormFactorPreference) => void;
  selectedCoolerType?: CoolerTypePreference;
  onCoolerTypeChange?: (coolerType: CoolerTypePreference) => void;
  selectedAesthetic?: AestheticPreference;
  onAestheticChange?: (aesthetic: AestheticPreference) => void;
  onResetFilters: () => void;
}

export const BuildFilterControls: React.FC<BuildFilterControlsProps> = ({
  currency,
  locale = 'pt-BR',
  maxBudget,
  onMaxBudgetChange,
  selectedWorkload,
  onWorkloadChange,
  activePresetId,
  onApplyPreset,
  totalCompatibleBuilds,
  selectedSocket,
  onSocketChange,
  selectedRamGen,
  onRamGenChange,
  selectedGpuVendor,
  onGpuVendorChange,
  selectedCpuVendor = 'ALL',
  onCpuVendorChange,
  selectedFormFactor = 'ALL',
  onFormFactorChange,
  selectedCoolerType = 'ALL',
  onCoolerTypeChange,
  selectedAesthetic = 'ALL',
  onAestheticChange,
  onResetFilters,
}) => {
  const isBrl = currency === 'BRL';
  const budgetPresets = isBrl ? BUDGET_PRESETS_BRL : BUDGET_PRESETS_USD;
  const minSlider = isBrl ? 3500 : 600;
  const maxSlider = isBrl ? 22000 : 3500;
  const stepSlider = isBrl ? 250 : 50;

  return (
    <>
      {/* Performance Target & Workload Presets */}
      <div className="mt-6 border-t border-slate-800/80 pt-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>{t('filterPerformanceTarget', locale)}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {selectedWorkload === 'esports-1080p' &&
              t('filterEsportsSub', locale)}
            {selectedWorkload === 'sweetspot-1440p' &&
              t('filterSweetspotSub', locale)}
            {selectedWorkload === 'enthusiast-4k' &&
              t('filterEnthusiastSub', locale)}
            {selectedWorkload === 'creator-ai' && t('filterCreatorSub', locale)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              id: 'sweetspot-1440p' as const,
              label: t('wlSweetspotLabel', locale),
              icon: '🎯',
              desc: t('wlSweetspotDesc', locale),
            },
            {
              id: 'esports-1080p' as const,
              label: t('wlEsportsLabel', locale),
              icon: '⚡',
              desc: t('wlEsportsDesc', locale),
            },
            {
              id: 'enthusiast-4k' as const,
              label: t('wlEnthusiastLabel', locale),
              icon: '💎',
              desc: t('wlEnthusiastDesc', locale),
            },
            {
              id: 'creator-ai' as const,
              label: t('wlCreatorLabel', locale),
              icon: '🧠',
              desc: t('wlCreatorDesc', locale),
            },
          ].map((wl) => (
            <button
              key={wl.id}
              type="button"
              onClick={() => onWorkloadChange(wl.id)}
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
          <span>{t('filterQuickPresets', locale)}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {totalCompatibleBuilds} {t('filterEvaluatedSuffix', locale)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {budgetPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
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
            onChange={(e) => onMaxBudgetChange(Number(e.target.value))}
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
              {t('filterPlatformSocket', locale)}
            </label>
            <select
              value={selectedSocket}
              onChange={(e) =>
                onSocketChange(parseSocketFilter(e.target.value))
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">{t('filterAllSockets', locale)}</option>
              <option value="AM4">{t('filterSocketAm4', locale)}</option>
              <option value="AM5">{t('filterSocketAm5', locale)}</option>
              <option value="LGA1700">
                {t('filterSocketLga1700', locale)}
              </option>
              <option value="LGA1851">
                {t('filterSocketLga1851', locale)}
              </option>
            </select>
          </div>

          {/* RAM Generation Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {t('filterRamGen', locale)}
            </label>
            <select
              value={selectedRamGen}
              onChange={(e) =>
                onRamGenChange(parseRamGenFilter(e.target.value))
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">{t('filterAllRam', locale)}</option>
              <option value="DDR4">{t('filterRamDdr4', locale)}</option>
              <option value="DDR5">{t('filterRamDdr5', locale)}</option>
            </select>
          </div>

          {/* GPU Vendor Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {t('filterGpuVendor', locale)}
            </label>
            <select
              value={selectedGpuVendor}
              onChange={(e) =>
                onGpuVendorChange(parseVendorFilter(e.target.value))
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">{t('filterAllGpus', locale)}</option>
              <option value="NVIDIA">NVIDIA</option>
              <option value="AMD">AMD</option>
              <option value="Intel">Intel</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition"
            title={t('filterResetTooltip', locale)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('filterResetButton', locale)}
          </button>
        </div>

        {/* Enthusiast Hardware Filters Row [BLD-08] */}
        <div className="md:col-span-12 border-t border-slate-800/80 pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
              {t('buildFiltersEnthusiastHeading', locale)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CPU Vendor */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {t('buildFiltersCpuVendor', locale)}
              </label>
              <select
                aria-label={t('buildFiltersCpuVendor', locale)}
                value={selectedCpuVendor}
                onChange={(e) =>
                  onCpuVendorChange?.(parseCpuVendorFilter(e.target.value))
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">
                  {t('buildFiltersCpuVendorAll', locale)}
                </option>
                <option value="AMD">
                  {t('buildFiltersCpuVendorAmd', locale)}
                </option>
                <option value="Intel">
                  {t('buildFiltersCpuVendorIntel', locale)}
                </option>
              </select>
            </div>

            {/* Form Factor / Case Size */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {t('buildFiltersFormFactor', locale)}
              </label>
              <select
                aria-label={t('buildFiltersFormFactor', locale)}
                value={selectedFormFactor}
                onChange={(e) =>
                  onFormFactorChange?.(parseFormFactorFilter(e.target.value))
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">
                  {t('buildFiltersFormFactorAll', locale)}
                </option>
                <option value="SFF">
                  {t('buildFiltersFormFactorSff', locale)}
                </option>
                <option value="Micro-ATX">
                  {t('buildFiltersFormFactorMatx', locale)}
                </option>
                <option value="ATX">
                  {t('buildFiltersFormFactorAtx', locale)}
                </option>
              </select>
            </div>

            {/* Cooler Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {t('buildFiltersCoolerType', locale)}
              </label>
              <select
                aria-label={t('buildFiltersCoolerType', locale)}
                value={selectedCoolerType}
                onChange={(e) =>
                  onCoolerTypeChange?.(parseCoolerTypeFilter(e.target.value))
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">
                  {t('buildFiltersCoolerTypeAll', locale)}
                </option>
                <option value="Air">
                  {t('buildFiltersCoolerTypeAir', locale)}
                </option>
                <option value="AIO">
                  {t('buildFiltersCoolerTypeAio', locale)}
                </option>
              </select>
            </div>

            {/* Aesthetic / RGB */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {t('buildFiltersAesthetic', locale)}
              </label>
              <select
                aria-label={t('buildFiltersAesthetic', locale)}
                value={selectedAesthetic}
                onChange={(e) =>
                  onAestheticChange?.(parseAestheticFilter(e.target.value))
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">
                  {t('buildFiltersAestheticAll', locale)}
                </option>
                <option value="RGB">
                  {t('buildFiltersAestheticRgb', locale)}
                </option>
                <option value="Stealth">
                  {t('buildFiltersAestheticStealth', locale)}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
