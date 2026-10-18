import React from 'react';
import { RankedGpu } from '../lib/math/types';
import {
  CheckCircle2,
  ShieldAlert,
  Check,
  Plus,
  TrendingDown,
  TrendingUp,
  Award,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface GpuLeaderboardTableProps {
  gpus: RankedGpu[];
  topWinnerId: string | null;
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  hideTrapsInTable: boolean;
  trapCount: number;
  uiMode: 'simple' | 'explorer' | 'pro';
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
  onToggleHideTraps: (hide: boolean) => void;
}

export const GpuLeaderboardTable: React.FC<GpuLeaderboardTableProps> = ({
  gpus,
  topWinnerId,
  hoveredGpuId,
  selectedGpuIds,
  hideTrapsInTable,
  trapCount,
  uiMode,
  onHoverGpu,
  onToggleSelectGpu,
  onToggleHideTraps,
}) => {
  return (
    <section className="dashboard-region mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white">
            {uiMode === 'simple'
              ? 'Ranked GPU Recommendations & Value Traps to Avoid'
              : 'Live-Sorted TOPSIS Leaderboard, Pareto Dominance & OLS Fair-Value Matrix'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {uiMode === 'simple'
              ? 'Sorted automatically for your budget and gaming style. Click any row to compare up to 4 cards side-by-side.'
              : 'Ranked dynamically by Relative Closeness Cᵢ = dᵢ⁻ / (dᵢ⁺ + dᵢ⁻) alongside Hedonic log-linear OLS Fair Market Value.'}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
          <input
            type="checkbox"
            checked={hideTrapsInTable}
            onChange={(e) => onToggleHideTraps(e.target.checked)}
            className="rounded accent-emerald-500"
          />
          Hide Dominated "Trap" GPUs ({trapCount})
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Rank</th>
              <th className="py-3 px-3">GPU Model</th>
              <th className="py-3 px-3">Verdict</th>
              <th className="py-3 px-3">Match Score</th>
              <th className="py-3 px-3 text-right">Price</th>
              <th className="py-3 px-3 text-right">Fair Value (OLS)</th>
              <th className="py-3 px-3 text-right">1440p Raster</th>
              <th className="py-3 px-3 text-right">1440p RT</th>
              <th className="py-3 px-3 text-right">VRAM</th>
              <th className="py-3 px-3 text-right">Power</th>
              <th className="py-3 px-3 text-center">Compare</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {gpus.map((gpu) => {
              const isWinner = gpu.id === topWinnerId;
              const isHovered = gpu.id === hoveredGpuId;
              const isSelected = selectedGpuIds.includes(gpu.id);
              const val = gpu.valuation;

              return (
                <tr
                  key={gpu.id}
                  onMouseEnter={() => onHoverGpu(gpu.id)}
                  onMouseLeave={() => onHoverGpu(null)}
                  className={`transition cursor-pointer ${
                    isWinner
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : gpu.isDominated
                        ? 'opacity-65 bg-rose-950/10 hover:opacity-100 hover:bg-rose-950/20'
                        : 'hover:bg-slate-800/50'
                  } ${
                    isHovered ? 'ring-1 ring-inset ring-emerald-500/50' : ''
                  }`}
                  onClick={() => onToggleSelectGpu(gpu.id)}
                >
                  <td className="py-3 px-3 font-mono font-bold">
                    {isWinner ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-amber-300 border border-amber-500/40">
                        <Award className="h-3 w-3" /> #1
                      </span>
                    ) : (
                      <span className="text-slate-400">#{gpu.rank}</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <span>{gpu.name}</span>
                      {gpu.vendor && gpu.vendor !== 'Synthetic' && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-300">
                          {gpu.vendor}
                        </span>
                      )}
                      {gpu.store && (
                        <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300">
                          {gpu.store}
                        </span>
                      )}
                      {gpu.url && (
                        <a
                          href={gpu.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sky-400 hover:text-sky-300 p-0.5"
                          title="Open Store Listing"
                        >
                          <ExternalLink className="h-3 w-3 inline" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {gpu.isDominated && gpu.dominanceReasons[0]
                        ? gpu.dominanceReasons[0].summaryText
                        : gpu.notes}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {gpu.isParetoOptimal ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {uiMode === 'simple' ? 'Smart Buy' : 'Frontier Optimal'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                        <ShieldAlert className="h-3 w-3" />
                        {uiMode === 'simple'
                          ? 'Bad Value Trap'
                          : `Dominated (${gpu.dominatedBy.length})`}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 w-40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-amber-400">
                        {gpu.topsisScorePct.toFixed(1)}%
                      </span>
                      {uiMode === 'pro' && (
                        <span className="font-mono text-[10px] text-slate-500">
                          {gpu.topsisScore.toFixed(3)}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isWinner
                            ? 'bg-amber-400'
                            : gpu.isParetoOptimal
                              ? 'bg-emerald-500'
                              : 'bg-rose-500/60'
                        }`}
                        style={{ width: `${gpu.topsisScorePct}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {formatCurrency(gpu.price, gpu.currency)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono">
                    {val ? (
                      <div className="flex flex-col items-end">
                        <span className="text-slate-200">
                          {formatCurrency(val.fairPrice, gpu.currency)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                            val.residualUsd <= -15
                              ? 'text-emerald-400'
                              : val.residualUsd >= 15
                                ? 'text-rose-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {val.residualUsd <= 0 ? (
                            <>
                              <TrendingDown className="h-2.5 w-2.5" />-
                              {formatCurrency(
                                Math.abs(val.residualUsd),
                                gpu.currency,
                              )}
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-2.5 w-2.5" />+
                              {formatCurrency(val.residualUsd, gpu.currency)}
                            </>
                          )}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-200">
                    {gpu.rasterFps1440p} FPS
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">
                    {gpu.rtFps1440p} FPS
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-sky-400">
                    {gpu.vramGb} GB
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {gpu.tdpWatts} W
                  </td>

                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(gpu.id);
                    }}
                  >
                    <button
                      type="button"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                      title={
                        isSelected
                          ? 'Remove from multi-metric comparison'
                          : 'Add to multi-metric comparison (up to 4)'
                      }
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  function handleToggle(id: string) {
    onToggleSelectGpu(id);
  }
};
