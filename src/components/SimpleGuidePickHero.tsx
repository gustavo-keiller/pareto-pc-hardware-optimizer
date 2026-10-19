import React from 'react';
import {
  Award,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { RankedGpu } from '../lib/math/types';
import { formatCurrency } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';

export interface SimpleGuidePickHeroProps {
  topPick: RankedGpu | null;
  stepDownAlt: RankedGpu | null;
  stepUpAlt: RankedGpu | null;
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  onOpenAccordion: () => void;
}

export const SimpleGuidePickHero: React.FC<SimpleGuidePickHeroProps> = ({
  topPick,
  stepDownAlt,
  stepUpAlt,
  currency,
  locale = 'pt-BR',
  selectedGpuIds,
  onToggleSelectGpu,
  onOpenAccordion,
}) => {
  if (!topPick) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-400">
        <p className="text-sm font-semibold">
          No graphics cards found matching your budget and criteria. Try
          selecting a higher budget limit.
        </p>
      </div>
    );
  }

  const isSelected = selectedGpuIds.includes(topPick.id);
  const fpsPer100 = ((topPick.rasterFps1440p / topPick.price) * 100).toFixed(1);

  return (
    <div data-testid="simple-pick-hero" className="space-y-4">
      {/* #1 Top Pick Hero Card */}
      <section
        data-testid="top-choice"
        className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-lg shadow-amber-500/10">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-xs font-black uppercase text-slate-950">
                  {t('heroTopPickBadge', locale)}
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  {topPick.topsisScorePct.toFixed(0)}%{' '}
                  {t('heroMatchScore', locale)}
                </span>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('heroGoodDealBadge', locale)}
                </span>
              </div>
              <h4 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {topPick.name}
              </h4>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatCurrency(topPick.price, currency)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-medium">
              {fpsPer100} FPS per {currency === 'BRL' ? 'R$ 100' : '$100'}
            </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-slate-400 font-medium">1440p Raster FPS</div>
            <div className="text-lg font-black text-white mt-0.5">
              {topPick.rasterFps1440p} FPS
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              Smooth High-Refresh
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-slate-400 font-medium">Ray Tracing FPS</div>
            <div className="text-lg font-black text-sky-300 mt-0.5">
              {topPick.rtFps1440p} FPS
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              1440p Ultra RT
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-slate-400 font-medium">VRAM Capacity</div>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {topPick.vramGb} GB
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Future-Proof Buffer
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-slate-400 font-medium">Power Consumption</div>
            <div className="text-lg font-black text-slate-200 mt-0.5">
              {topPick.tdpWatts} W
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Rated Board Power
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={onOpenAccordion}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition"
          >
            <ChevronDown className="h-4 w-4" />
            {t('heroWhyThisPickInspect', locale)}
          </button>

          <button
            type="button"
            onClick={() => onToggleSelectGpu(topPick.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              isSelected
                ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4 text-amber-300" />
                {t('heroSelectedComparison', locale)}
              </>
            ) : (
              t('heroCompareSpecs', locale)
            )}
          </button>
        </div>
      </section>

      {/* 2 Trade-Off Alternatives */}
      {(stepDownAlt || stepUpAlt) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step-Down Bargain */}
          {stepDownAlt && (
            <div
              data-testid="top-choice"
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-sky-400">
                  <ArrowDownRight className="h-4 w-4" />
                  {t('heroStepDownTitle', locale)}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Save{' '}
                  {formatCurrency(
                    Math.max(0, topPick.price - stepDownAlt.price),
                    currency,
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-bold text-white">
                  {stepDownAlt.name}
                </h4>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(stepDownAlt.price, currency)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Delivers {stepDownAlt.rasterFps1440p} FPS ({stepDownAlt.vramGb}{' '}
                GB VRAM) for budget-conscious builders.
              </p>
              <button
                type="button"
                onClick={() => onToggleSelectGpu(stepDownAlt.id)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition"
              >
                {selectedGpuIds.includes(stepDownAlt.id)
                  ? t('heroInComparison', locale)
                  : t('heroCompareSpecs', locale)}
              </button>
            </div>
          )}

          {/* Step-Up Boost */}
          {stepUpAlt && (
            <div
              data-testid="top-choice"
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <ArrowUpRight className="h-4 w-4" />
                  {t('heroStepUpTitle', locale)}
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  +
                  {formatCurrency(
                    Math.max(0, stepUpAlt.price - topPick.price),
                    currency,
                  )}{' '}
                  More
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-bold text-white">
                  {stepUpAlt.name}
                </h4>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(stepUpAlt.price, currency)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Boosts performance to {stepUpAlt.rasterFps1440p} FPS (+
                {Math.max(
                  0,
                  stepUpAlt.rasterFps1440p - topPick.rasterFps1440p,
                )}{' '}
                FPS) with {stepUpAlt.vramGb} GB VRAM.
              </p>
              <button
                type="button"
                onClick={() => onToggleSelectGpu(stepUpAlt.id)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition"
              >
                {selectedGpuIds.includes(stepUpAlt.id)
                  ? t('heroInComparison', locale)
                  : t('heroCompareSpecs', locale)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
