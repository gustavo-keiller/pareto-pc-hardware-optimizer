import React, { useMemo } from 'react';
import {
  PreferenceWeights,
  RankedGpu,
  METRIC_DEFINITIONS,
} from '../lib/math/types';
import {
  computeTopsisBreakdown,
  DEFAULT_PREFERENCE_WEIGHTS,
} from '../lib/math/topsis';
import { AppLocale, t } from '../utils/i18n';
import { formatCurrency } from '../utils/currency';

interface TopsisScoreBreakdownViewProps {
  selectedGpus: RankedGpu[];
  allGpus: RankedGpu[];
  weights?: PreferenceWeights;
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
}

const GPU_COLORS = ['#10b981', '#f59e0b', '#38bdf8', '#a855f7'];

export const TopsisScoreBreakdownView: React.FC<
  TopsisScoreBreakdownViewProps
> = ({
  selectedGpus,
  allGpus,
  weights = DEFAULT_PREFERENCE_WEIGHTS,
  currency = 'USD',
  locale = 'pt-BR',
}) => {
  const breakdowns = useMemo(() => {
    return selectedGpus.map((gpu) =>
      computeTopsisBreakdown(gpu, allGpus, weights),
    );
  }, [selectedGpus, allGpus, weights]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 italic">
        {t('drawerBreakdownSummary', locale)}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {breakdowns.map((b, idx) => {
          const color = GPU_COLORS[idx % GPU_COLORS.length];
          return (
            <div
              key={b.gpuId}
              className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[240px]">
                    {b.gpuName}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-400">
                    Cᵢ = {b.topsisScorePct.toFixed(1)}%
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">
                    d⁺: {b.distanceToBest.toFixed(3)} | d⁻:{' '}
                    {b.distanceToWorst.toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Metrics Breakdown Table */}
              <div className="space-y-2">
                {b.metrics.map((m) => {
                  const def = METRIC_DEFINITIONS[m.metric];
                  let rawFormatted = String(m.rawVal);
                  if (m.metric === 'price') {
                    rawFormatted = formatCurrency(
                      m.rawVal,
                      currency,
                      false,
                      locale,
                    );
                  } else if (
                    m.metric === 'rasterFps1440p' ||
                    m.metric === 'rtFps1440p'
                  ) {
                    rawFormatted = `${m.rawVal} FPS`;
                  } else if (m.metric === 'vramGb') {
                    rawFormatted = `${m.rawVal} GB`;
                  } else if (m.metric === 'tdpWatts') {
                    rawFormatted = `${m.rawVal} W`;
                  }

                  return (
                    <div key={m.metric} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <span>{def.shortLabel}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            (w: {Math.round(m.weight * 100)}%)
                          </span>
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-200">{rawFormatted}</span>
                          <span
                            className={`font-semibold ${
                              m.closenessPct >= 75
                                ? 'text-emerald-400'
                                : m.closenessPct >= 40
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {m.closenessPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar to ideal best */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            m.closenessPct >= 75
                              ? 'bg-emerald-500'
                              : m.closenessPct >= 40
                                ? 'bg-amber-500'
                                : 'bg-slate-500'
                          }`}
                          style={{ width: `${Math.max(4, m.closenessPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
