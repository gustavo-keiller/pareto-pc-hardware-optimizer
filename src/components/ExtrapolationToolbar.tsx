import React, { useMemo, useState } from 'react';
import {
  ExtrapolationConfig,
  isExtrapolationScalingModel,
  evaluateLinearExtrapolation,
} from '../lib/math/extrapolation';
import {
  METRIC_DEFINITIONS,
  MetricKey,
  RankedGpu,
  isMetricKey,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { UiMode } from '../hooks/useOptimizerState';
import {
  TrendingUp,
  Crosshair,
  Calculator,
  AlertTriangle,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from 'lucide-react';

interface ExtrapolationToolbarProps {
  gpus: RankedGpu[];
  xMetric: MetricKey;
  yMetric: MetricKey;
  uiMode: UiMode;
  extrapolation: ExtrapolationConfig;
  onChangeExtrapolation: React.Dispatch<
    React.SetStateAction<ExtrapolationConfig>
  >;
  onSelectAxes?: (x: MetricKey, y: MetricKey) => void;
}

type LabTabId = 'quick-rule' | 'gpu-benchmark' | 'pro-curves';

export const ExtrapolationToolbar: React.FC<ExtrapolationToolbarProps> = ({
  gpus,
  xMetric,
  yMetric,
  uiMode,
  extrapolation,
  onChangeExtrapolation,
  onSelectAxes,
}) => {
  // In 'simple' mode, keep detailed customization collapsed unless the user clicks "Customize"
  const [isSimpleExpanded, setIsSimpleExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<LabTabId>(() =>
    extrapolation.mode === 'custom' ? 'quick-rule' : 'gpu-benchmark'
  );

  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];

  const evalResult = useMemo(
    () => evaluateLinearExtrapolation(gpus, xMetric, yMetric, extrapolation),
    [gpus, xMetric, yMetric, extrapolation]
  );

  // Multi-metric "What-If" projections across all specs at `extrapolation.whatIfX`
  const multiMetricProjections = useMemo(() => {
    const otherKeys = ALL_METRIC_KEYS.filter((k) => k !== xMetric);
    return otherKeys.map((targetKey) => {
      const targetDef = METRIC_DEFINITIONS[targetKey];
      const res = evaluateLinearExtrapolation(
        gpus,
        xMetric,
        targetKey,
        extrapolation
      );
      return {
        key: targetKey,
        def: targetDef,
        projectedCutoff: res.whatIfCutoffY,
      };
    });
  }, [gpus, xMetric, extrapolation]);

  const passCount = gpus.length - evalResult.belowMarginIds.length;
  const failCount = evalResult.belowMarginIds.length;

  const fmtX = (v: number) =>
    xDef.unit === '$' ? `$${Math.round(v)}` : `${Math.round(v)} ${xDef.unit}`;

  const isPresetVram100 =
    extrapolation.enabled &&
    extrapolation.mode === 'custom' &&
    xMetric === 'price' &&
    yMetric === 'vramGb' &&
    extrapolation.customXValue === 1000 &&
    extrapolation.customYValue === 10;

  const isPresetFps5 =
    extrapolation.enabled &&
    extrapolation.mode === 'custom' &&
    xMetric === 'price' &&
    yMetric === 'rasterFps1440p' &&
    extrapolation.customXValue === 500 &&
    extrapolation.customYValue === 100;

  const isPresetGpuMatch =
    extrapolation.enabled && extrapolation.mode === 'gpu';

  // LEVEL 1 (SIMPLE BUYER MODE): Clean, zero-jargon 1-line Value Check Bar
  if (uiMode === 'simple' && !isSimpleExpanded) {
    return (
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-950/75 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1 mr-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Quick Value Rule:
          </span>

          <button
            type="button"
            onClick={() =>
              onChangeExtrapolation((prev) => ({ ...prev, enabled: false }))
            }
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
              !extrapolation.enabled
                ? 'border-slate-600 bg-slate-800 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Off
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAxes?.('price', 'rasterFps1440p');
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'custom',
                scalingModel: 'linear-ratio',
                customXValue: 500,
                customYValue: 100,
                exponent: 1.0,
                tolerancePct: 0,
                enforceAsTrap: true,
              }));
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
              isPresetFps5
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            Max $5 per FPS (1440p)
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAxes?.('price', 'vramGb');
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'custom',
                scalingModel: 'linear-ratio',
                customXValue: 1000,
                customYValue: 10,
                exponent: 1.0,
                tolerancePct: 0,
                enforceAsTrap: true,
              }));
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
              isPresetVram100
                ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            Max $100 per GB VRAM
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'gpu',
                scalingModel: 'diminishing-power',
                exponent: 0.75,
                tolerancePct: -8,
                enforceAsTrap: true,
              }));
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
              isPresetGpuMatch
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            Match {evalResult.anchorLabel} Value
          </button>
        </div>

        <div className="flex items-center gap-2">
          {extrapolation.enabled && (
            <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-[11px]">
              <strong className="text-emerald-400">{passCount} Good</strong> •{' '}
              <strong className="text-rose-400">
                {failCount} Below Margin
              </strong>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsSimpleExpanded(true);
              if (!extrapolation.enabled) {
                onChangeExtrapolation((prev) => ({ ...prev, enabled: true }));
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition"
          >
            Customize Rule
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // LEVEL 2 & LEVEL 3 (OR EXPANDED): Clean 3-Tab Proportional Interface
  return (
    <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-slate-950/85 p-3 text-xs shadow-lg">
      {/* Header Row: Master Toggle + 3 Separated Mode Tabs + Pass/Fail Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
              extrapolation.enabled
                ? 'border-amber-500/70 bg-amber-500/20 text-amber-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            Extrapolation Rule: {extrapolation.enabled ? 'ON' : 'OFF'}
          </button>

          {extrapolation.enabled && (
            /* 3 Clean Tabs so the user only sees ONE mode's controls at a time */
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('quick-rule');
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    mode: 'custom',
                    scalingModel: 'linear-ratio',
                    exponent: 1.0,
                  }));
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  activeTab === 'quick-rule'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="h-3 w-3" />
                1. Simple Target ($ / Spec)
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('gpu-benchmark');
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    mode: 'gpu',
                  }));
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  activeTab === 'gpu-benchmark'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crosshair className="h-3 w-3" />
                2. Compare to a GPU
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pro-curves')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  activeTab === 'pro-curves'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FlaskConical className="h-3 w-3" />
                3. Advanced Curves & What-If
              </button>
            </div>
          )}
        </div>

        {/* Right Status Badges & Collapse button if in Simple Mode */}
        <div className="flex items-center gap-2">
          {extrapolation.enabled && (
            <>
              <button
                type="button"
                onClick={() =>
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    enforceAsTrap: !prev.enforceAsTrap,
                  }))
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                  extrapolation.enforceAsTrap
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
                title="Paint GPUs falling below your rule red as bad deals"
              >
                <AlertTriangle className="h-3 w-3" />
                {extrapolation.enforceAsTrap
                  ? 'Paint Below as Bad: ON'
                  : 'Line Only'}
              </button>

              <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-[11px]">
                <strong className="text-emerald-400">{passCount} Pass</strong> •{' '}
                <strong className="text-rose-400">{failCount} Bad</strong>
              </span>
            </>
          )}

          {uiMode === 'simple' && (
            <button
              type="button"
              onClick={() => setIsSimpleExpanded(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:text-white"
            >
              Simple Bar
              <ChevronUp className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Body (only 1 clean row shown based on activeTab!) */}
      {extrapolation.enabled && (
        <div className="mt-2.5 border-t border-slate-800/80 pt-2.5">
          {activeTab === 'quick-rule' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Sentence-style input: "For every [$1000] of [Price], require at least [10] [VRAM GB]" */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-300">For every</span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-slate-900 px-2 py-1">
                  {xDef.unit === '$' && (
                    <span className="text-amber-400 font-mono">$</span>
                  )}
                  <input
                    aria-label={`Reference ${xDef.shortLabel}`}
                    type="number"
                    min={1}
                    step={10}
                    value={extrapolation.customXValue}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        mode: 'custom',
                        customXValue: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-16 bg-transparent font-mono font-bold text-amber-300 focus:outline-none"
                  />
                </div>
                <span className="text-slate-300">of</span>
                <select
                  aria-label="Rule Base Metric"
                  value={xMetric}
                  onChange={(e) =>
                    isMetricKey(e.target.value) && onSelectAxes?.(e.target.value, yMetric)
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-bold text-emerald-400 focus:outline-none cursor-pointer"
                >
                  {ALL_METRIC_KEYS.map((k) => (
                    <option
                      key={k}
                      value={k}
                      className="bg-slate-900 text-slate-100"
                    >
                      {METRIC_DEFINITIONS[k].shortLabel} (
                      {METRIC_DEFINITIONS[k].unit})
                    </option>
                  ))}
                </select>

                <span className="text-slate-300">, require at least</span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-slate-900 px-2 py-1">
                  <input
                    aria-label={`Reference ${yDef.shortLabel}`}
                    type="number"
                    min={1}
                    step={1}
                    value={extrapolation.customYValue}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        mode: 'custom',
                        customYValue: Math.max(
                          0.1,
                          Number(e.target.value) || 1
                        ),
                      }))
                    }
                    className="w-14 bg-transparent font-mono font-bold text-sky-300 focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Rule Target Metric"
                  value={yMetric}
                  onChange={(e) =>
                    isMetricKey(e.target.value) && onSelectAxes?.(xMetric, e.target.value)
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-bold text-sky-400 focus:outline-none cursor-pointer"
                >
                  {ALL_METRIC_KEYS.map((k) => (
                    <option
                      key={k}
                      value={k}
                      className="bg-slate-900 text-slate-100"
                    >
                      {METRIC_DEFINITIONS[k].shortLabel} (
                      {METRIC_DEFINITIONS[k].unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Examples:</span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectAxes?.('price', 'vramGb');
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      mode: 'custom',
                      scalingModel: 'linear-ratio',
                      customXValue: 1000,
                      customYValue: 10,
                      tolerancePct: 0,
                    }));
                  }}
                  className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20"
                >
                  $1000 → 10 GB ($100/GB)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectAxes?.('price', 'rasterFps1440p');
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      mode: 'custom',
                      scalingModel: 'linear-ratio',
                      customXValue: 500,
                      customYValue: 100,
                      tolerancePct: 0,
                    }));
                  }}
                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  $500 → 100 FPS ($5/FPS)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectAxes?.('tdpWatts', 'rasterFps1440p');
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      mode: 'custom',
                      scalingModel: 'linear-ratio',
                      customXValue: 200,
                      customYValue: 100,
                      tolerancePct: 0,
                    }));
                  }}
                  className="rounded border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/20"
                >
                  200W → 100 FPS (2 W/FPS)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gpu-benchmark' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="extrap-anchor-gpu"
                  className="text-xs font-medium text-slate-300"
                >
                  Benchmark GPU to Extrapolate:
                </label>
                <select
                  id="extrap-anchor-gpu"
                  value={extrapolation.anchorGpuId}
                  onChange={(e) =>
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      mode: 'gpu',
                      anchorGpuId: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-amber-300 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {gpus.map((g) => {
                    const gx = Math.max(1e-6, g[xMetric]);
                    const gy = Math.max(1e-6, g[yMetric]);
                    const ratio = (gx / gy).toFixed(2);
                    return (
                      <option
                        key={g.id}
                        value={g.id}
                        className="bg-slate-900 text-slate-100"
                      >
                        {g.name.replace(' [TRAP]', '')} — {fmtX(gx)} for {gy}{' '}
                        {yDef.unit} ({xDef.unit === '$' ? `$${ratio}` : ratio}/
                        {yDef.unit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="extrap-tolerance-simple"
                  className="text-xs text-slate-300"
                >
                  Higher-Tier Forgiveness (Slack):{' '}
                  <strong className="font-mono text-amber-300">
                    {extrapolation.tolerancePct <= 0
                      ? `Allow ${Math.abs(extrapolation.tolerancePct)}% worse`
                      : `Require +${extrapolation.tolerancePct}% better`}
                  </strong>
                </label>
                <input
                  id="extrap-tolerance-simple"
                  type="range"
                  min={-35}
                  max={25}
                  step={1}
                  value={extrapolation.tolerancePct}
                  onChange={(e) =>
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      tolerancePct: Number(e.target.value),
                    }))
                  }
                  className="w-28 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'pro-curves' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Curve Law Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-slate-300 font-medium">
                    Scaling Formula:
                  </span>
                  <select
                    aria-label="Extrapolation Mathematical Curve Law"
                    value={extrapolation.scalingModel}
                    onChange={(e) => {
                      const model = e.target.value;
                      if (!isExtrapolationScalingModel(model)) return;
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        scalingModel: model,
                        mode:
                          model === 'two-point-line'
                            ? 'two-gpu'
                            : prev.mode === 'two-gpu'
                            ? 'gpu'
                            : prev.mode,
                      }));
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-bold text-purple-300 focus:outline-none cursor-pointer"
                  >
                    <option
                      value="linear-ratio"
                      className="bg-slate-900 text-slate-100"
                    >
                      Linear Ratio Ray (y = k·x)
                    </option>
                    <option
                      value="diminishing-power"
                      className="bg-slate-900 text-slate-100"
                    >
                      Diminishing Returns Power Curve (y = Y₀·(x/X₀)^α)
                    </option>
                    <option
                      value="two-point-line"
                      className="bg-slate-900 text-slate-100"
                    >
                      2-GPU Secant Line (y = m·x + b)
                    </option>
                  </select>

                  {extrapolation.scalingModel === 'two-point-line' && (
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="First Secant GPU"
                        value={extrapolation.anchorGpuId}
                        onChange={(e) =>
                          onChangeExtrapolation((prev) => ({
                            ...prev,
                            mode: 'two-gpu',
                            anchorGpuId: e.target.value,
                          }))
                        }
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-emerald-300 font-semibold"
                      >
                        {gpus.map((g) => (
                          <option
                            key={g.id}
                            value={g.id}
                            className="bg-slate-900 text-slate-100"
                          >
                            {g.name.replace(' [TRAP]', '')}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-500">↔</span>
                      <select
                        aria-label="Second Secant GPU"
                        value={extrapolation.secondGpuId}
                        onChange={(e) =>
                          onChangeExtrapolation((prev) => ({
                            ...prev,
                            mode: 'two-gpu',
                            secondGpuId: e.target.value,
                          }))
                        }
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sky-300 font-semibold"
                      >
                        {gpus.map((g) => (
                          <option
                            key={g.id}
                            value={g.id}
                            className="bg-slate-900 text-slate-100"
                          >
                            {g.name.replace(' [TRAP]', '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {extrapolation.scalingModel === 'diminishing-power' && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">
                        Exponent α ={' '}
                        <strong className="font-mono text-sky-300">
                          {extrapolation.exponent.toFixed(2)}
                        </strong>
                      </span>
                      <input
                        aria-label="Power-Law Exponent Alpha"
                        type="range"
                        min={0.4}
                        max={1.4}
                        step={0.02}
                        value={extrapolation.exponent}
                        onChange={(e) =>
                          onChangeExtrapolation((prev) => ({
                            ...prev,
                            exponent: Number(e.target.value),
                          }))
                        }
                        className="w-24 accent-sky-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                  {evalResult.formulaLabel}
                </span>
              </div>

              {/* What-If Predictor Row */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Calculator className="h-3.5 w-3.5 text-amber-400" />
                  What-If Predictor at {xDef.shortLabel}:
                </span>
                <div className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-slate-950 px-2 py-0.5">
                  {xDef.unit === '$' && (
                    <span className="text-amber-400 font-mono">$</span>
                  )}
                  <input
                    aria-label="What-If Hypothetical X Value"
                    type="number"
                    min={10}
                    step={25}
                    value={extrapolation.whatIfX}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        whatIfX: Math.max(1, Number(e.target.value) || 100),
                      }))
                    }
                    className="w-16 bg-transparent font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <span className="text-slate-400">expects ≥</span>
                {multiMetricProjections.map((proj) => (
                  <span
                    key={proj.key}
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] ${
                      proj.key === yMetric
                        ? 'border-amber-500/50 bg-amber-500/20 font-bold text-amber-200'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300'
                    }`}
                  >
                    {proj.def.unit === '$'
                      ? `$${Math.round(proj.projectedCutoff)}`
                      : `${proj.projectedCutoff} ${proj.def.unit}`}{' '}
                    <span className="text-[10px] text-slate-400 font-sans">
                      {proj.def.shortLabel}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
