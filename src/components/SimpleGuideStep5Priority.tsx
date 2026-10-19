import React from 'react';
import {
  MetricKey,
  isMetricKey,
  METRIC_DEFINITIONS,
  RankedGpu,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { Sliders, Award } from 'lucide-react';
import { MiniWeightBar } from './SimpleGuideWidgets';
import { StoryStep } from './SimpleGuideScatterPlot';

export interface SimpleGuideStep5PriorityProps {
  activeStep: StoryStep;
  setActiveStep: (step: StoryStep) => void;
  showAllSteps: boolean;
  useThreeVars: boolean;
  setUseThreeVars: (use: boolean) => void;
  twoVarAlpha: number;
  setTwoVarAlpha: (alpha: number) => void;
  priorityShares: { w1: number; w2: number; w3: number };
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  onSelectXMetric: (m: MetricKey) => void;
  onSelectYMetric: (m: MetricKey) => void;
  onSelectZMetric: (m: MetricKey) => void;
  syncGlobalWeights: (w1: number, w2: number, w3: number) => void;
  xDef: { shortLabel: string };
  yDef: { shortLabel: string };
  bestChoice: { gpu: RankedGpu; matchPct: number } | null;
}

export const SimpleGuideStep5Priority: React.FC<
  SimpleGuideStep5PriorityProps
> = ({
  activeStep,
  setActiveStep,
  showAllSteps,
  useThreeVars,
  setUseThreeVars,
  twoVarAlpha,
  setTwoVarAlpha,
  priorityShares,
  xMetric,
  yMetric,
  zMetric,
  onSelectXMetric,
  onSelectYMetric,
  onSelectZMetric,
  syncGlobalWeights,
  xDef,
  yDef,
  bestChoice,
}) => {
  if (!showAllSteps && activeStep !== 5) return null;

  return (
    <div
      onClick={() => setActiveStep(5)}
      className={`rounded-2xl border-2 p-4 transition-all ${
        activeStep === 5
          ? 'border-amber-400 bg-slate-900 shadow-xl shadow-amber-500/15'
          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Step 5 • Choose Variables &amp; Priority
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStep(5);
              setUseThreeVars(false);
              syncGlobalWeights(1 - twoVarAlpha, twoVarAlpha, 0);
            }}
            className={`rounded px-2 py-0.5 font-bold transition ${
              !useThreeVars
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2 Variables
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStep(5);
              setUseThreeVars(true);
              syncGlobalWeights(0.4, 0.35, 0.25);
            }}
            className={`rounded px-2 py-0.5 font-bold transition ${
              useThreeVars
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3 Variables (3D Split)
          </button>
        </div>
      </div>

      {!useThreeVars ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <MiniWeightBar pct={priorityShares.w1 * 100} color="#10b981" />
              <span className="font-mono font-bold text-emerald-400">
                {Math.round(priorityShares.w1 * 100)}%
              </span>
              <select
                aria-label="Priority Variable 1"
                value={xMetric}
                onChange={(e) => {
                  if (isMetricKey(e.target.value))
                    onSelectXMetric(e.target.value);
                  setActiveStep(5);
                }}
                className="rounded border border-emerald-500/40 bg-slate-900 px-2 py-1 font-bold text-emerald-300 focus:outline-none"
              >
                {ALL_METRIC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {METRIC_DEFINITIONS[k].shortLabel}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] font-bold text-slate-500">VS</span>
            <div className="flex items-center gap-1.5">
              <MiniWeightBar pct={priorityShares.w2 * 100} color="#38bdf8" />
              <span className="font-mono font-bold text-sky-400">
                {Math.round(priorityShares.w2 * 100)}%
              </span>
              <select
                aria-label="Priority Variable 2"
                value={yMetric}
                onChange={(e) => {
                  if (isMetricKey(e.target.value))
                    onSelectYMetric(e.target.value);
                  setActiveStep(5);
                }}
                className="rounded border border-sky-500/40 bg-slate-900 px-2 py-1 font-bold text-sky-300 focus:outline-none"
              >
                {ALL_METRIC_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {METRIC_DEFINITIONS[k].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800 flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${priorityShares.w1 * 100}%` }}
              />
              <div
                className="h-full bg-sky-400 transition-all duration-75"
                style={{ width: `${priorityShares.w2 * 100}%` }}
              />
            </div>
            <input
              type="range"
              aria-label="Balance priority between Variable 1 and Variable 2"
              min={0.05}
              max={0.95}
              step={0.05}
              value={twoVarAlpha}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTwoVarAlpha(val);
                setActiveStep(5);
                syncGlobalWeights(1 - val, val, 0);
              }}
              className="-mt-3 w-full cursor-pointer accent-amber-400 relative z-10"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>← Favor {xDef.shortLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setTwoVarAlpha(0.5);
                  syncGlobalWeights(0.5, 0.5, 0);
                }}
                className="text-amber-400 hover:underline font-semibold"
              >
                50 / 50 Balance
              </button>
              <span>Favor {yDef.shortLabel} →</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
            <div className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 p-1.5">
              <MiniWeightBar pct={priorityShares.w1 * 100} color="#10b981" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] font-bold text-emerald-400">
                  {Math.round(priorityShares.w1 * 100)}%
                </div>
                <select
                  aria-label="3-Var Priority 1"
                  value={xMetric}
                  onChange={(e) =>
                    isMetricKey(e.target.value) &&
                    onSelectXMetric(e.target.value)
                  }
                  className="w-full bg-transparent font-bold text-emerald-200 text-[11px] focus:outline-none"
                >
                  {ALL_METRIC_KEYS.map((k) => (
                    <option
                      key={k}
                      value={k}
                      className="bg-slate-900 text-white"
                    >
                      {METRIC_DEFINITIONS[k].shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 p-1.5">
              <MiniWeightBar pct={priorityShares.w2 * 100} color="#38bdf8" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] font-bold text-sky-400">
                  {Math.round(priorityShares.w2 * 100)}%
                </div>
                <select
                  aria-label="3-Var Priority 2"
                  value={yMetric}
                  onChange={(e) =>
                    isMetricKey(e.target.value) &&
                    onSelectYMetric(e.target.value)
                  }
                  className="w-full bg-transparent font-bold text-sky-200 text-[11px] focus:outline-none"
                >
                  {ALL_METRIC_KEYS.map((k) => (
                    <option
                      key={k}
                      value={k}
                      className="bg-slate-900 text-white"
                    >
                      {METRIC_DEFINITIONS[k].shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 p-1.5">
              <MiniWeightBar pct={priorityShares.w3 * 100} color="#fbbf24" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] font-bold text-amber-400">
                  {Math.round(priorityShares.w3 * 100)}%
                </div>
                <select
                  aria-label="3-Var Priority 3"
                  value={zMetric}
                  onChange={(e) =>
                    isMetricKey(e.target.value) &&
                    onSelectZMetric(e.target.value)
                  }
                  className="w-full bg-transparent font-bold text-amber-200 text-[11px] focus:outline-none"
                >
                  {ALL_METRIC_KEYS.map((k) => (
                    <option
                      key={k}
                      value={k}
                      className="bg-slate-900 text-white"
                    >
                      {METRIC_DEFINITIONS[k].shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full flex border border-slate-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${priorityShares.w1 * 100}%` }}
              />
              <div
                className="h-full bg-sky-400 transition-all duration-75"
                style={{ width: `${priorityShares.w2 * 100}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${priorityShares.w3 * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {bestChoice && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-400/50 bg-amber-500/15 px-3.5 py-2.5">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Award className="h-3.5 w-3.5" /> Best Match For Your Priorities
            </div>
            <div className="text-base font-extrabold text-white">
              {bestChoice.gpu.name}{' '}
              <span className="text-emerald-400">
                (${bestChoice.gpu.price})
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-950">
              {bestChoice.matchPct.toFixed(0)}% Score
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
