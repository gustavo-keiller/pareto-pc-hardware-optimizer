import React from 'react';
import { Award } from 'lucide-react';
import { RankedGpu } from '../lib/math/types';
import { formatCurrency } from '../utils/currency';

interface TopWinnerBannerProps {
  topWinner: RankedGpu;
  uiMode: 'simple' | 'explorer' | 'pro' | 'builds';
}

export const TopWinnerBanner: React.FC<TopWinnerBannerProps> = ({
  topWinner,
  uiMode,
}) => {
  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 p-4 sm:p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Stage 3 Optimal Recommendation (#1 TOPSIS Match)
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                Closeness Cᵢ = {topWinner.topsisScore.toFixed(3)} (
                {topWinner.topsisScorePct.toFixed(1)}%)
              </span>
              {topWinner.valuation && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold border ${
                    topWinner.valuation.residualUsd <= 0
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {topWinner.valuation.residualUsd <= 0
                    ? `${formatCurrency(Math.abs(topWinner.valuation.residualUsd), topWinner.currency)} Below Fair Market Price (${formatCurrency(topWinner.valuation.fairPrice, topWinner.currency)})`
                    : `${formatCurrency(topWinner.valuation.residualUsd, topWinner.currency)} Above Fair Market Price (${formatCurrency(topWinner.valuation.fairPrice, topWinner.currency)})`}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              {topWinner.name}{' '}
              <span className="text-emerald-400 font-bold">
                — {formatCurrency(topWinner.price, topWinner.currency)}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {topWinner.notes}
              {uiMode === 'pro' &&
                ` • Ideal Distance d⁺ = ${topWinner.distanceToBest.toFixed(4)}, Anti-Ideal d⁻ = ${topWinner.distanceToWorst.toFixed(4)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
            <div className="text-slate-400">1440p Gaming</div>
            <div className="text-sm font-bold text-white">
              {topWinner.rasterFps1440p} FPS
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
            <div className="text-slate-400">Ray Tracing</div>
            <div className="text-sm font-bold text-white">
              {topWinner.rtFps1440p} FPS
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
            <div className="text-slate-400">VRAM</div>
            <div className="text-sm font-bold text-sky-400">
              {topWinner.vramGb} GB
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
            <div className="text-slate-400">Power Draw</div>
            <div className="text-sm font-bold text-slate-200">
              {topWinner.tdpWatts} W
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
