import React, { useMemo } from 'react';
import {
  ExtrapolationConfig,
  ExtrapolationScalingModel,
  evaluateLinearExtrapolation,
} from '../lib/math/extrapolation';
import { METRIC_DEFINITIONS, MetricKey, RankedGpu } from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import {
  TrendingUp,
  Crosshair,
  Calculator,
  AlertTriangle,
  GitCommitHorizontal,
  Sliders,
  Sparkles,
  Compass,
} from 'lucide-react';

interface ExtrapolationToolbarProps {
  gpus: RankedGpu[];
  xMetric: MetricKey;
  yMetric: MetricKey;
  extrapolation: ExtrapolationConfig;
  onChangeExtrapolation: React.Dispatch<
    React.SetStateAction<ExtrapolationConfig>
  >;
  onSelectAxes?: (x: MetricKey, y: MetricKey) => void;
}

export const ExtrapolationToolbar: React.FC<ExtrapolationToolbarProps> = ({
  gpus,
  xMetric,
  yMetric,
  extrapolation,
  onChangeExtrapolation,
  onSelectAxes,
}) => {
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
        projectedAnchor: res.whatIfAnchorY,
        projectedCutoff: res.whatIfCutoffY,
      };
    });
  }, [gpus, xMetric, extrapolation]);

  const passCount = gpus.length - evalResult.belowMarginIds.length;
  const failCount = evalResult.belowMarginIds.length;

  const fmtX = (v: number) =>
    xDef.unit === '$' ? `$${Math.round(v)}` : `${Math.round(v)} ${xDef.unit}`;

  return (
    <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-slate-950/85 p-3 text-xs shadow-lg">
      {/* Row 1: Master Toggle + Quick Multi-Domain Presets */}
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
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              extrapolation.enabled
                ? 'border-amber-500/70 bg-amber-500/20 text-amber-300 shadow-sm'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            Value Extrapolation Lab: {extrapolation.enabled ? 'ON' : 'OFF'}
          </button>

          {extrapolation.enabled && (
            <button
              type="button"
              onClick={() =>
                onChangeExtrapolation((prev) => ({
                  ...prev,
                  enforceAsTrap: !prev.enforceAsTrap,
                }))
              }
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                extrapolation.enforceAsTrap
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="When ON, GPUs falling below the extrapolated cutoff curve are repainted red as value traps"
            >
              <AlertTriangle className="h-3 w-3" />
              {extrapolation.enforceAsTrap
                ? 'Repaint Below Cutoff as Bad: ON'
                : 'Repaint Below Cutoff: OFF'}
            </button>
          )}
        </div>

        {/* One-Click Extrapolation Presets Beyond Just $/GB */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-0.5">
            <Sparkles className="h-3 w-3 text-amber-400" />
            Presets:
          </span>
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
                whatIfX: 600,
                enforceAsTrap: true,
              }));
            }}
            className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20 transition"
            title="10 GB for $1000 ($100/GB linear cutoff on Price vs VRAM)"
          >
            $100/GB VRAM
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
                whatIfX: 600,
                enforceAsTrap: true,
              }));
            }}
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
            title="100 FPS for $500 ($5.00/FPS linear value cutoff on Price vs 1440p FPS)"
          >
            $5.00/FPS Gaming
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAxes?.('price', 'rasterFps1440p');
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'gpu',
                scalingModel: 'diminishing-power',
                anchorGpuId:
                  gpus.find((g) => g.id === 'rx-7800-xt')?.id ??
                  gpus[0]?.id ??
                  'arc-b580',
                exponent: 0.72,
                tolerancePct: -8,
                whatIfX: 750,
                enforceAsTrap: true,
              }));
            }}
            className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition"
            title="Diminishing-returns power curve (alpha = 0.72) anchored on RX 7800 XT with 8% slack"
          >
            Diminishing Returns (α=0.72)
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAxes?.('price', 'rasterFps1440p');
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'two-gpu',
                scalingModel: 'two-point-line',
                anchorGpuId:
                  gpus.find((g) => g.id === 'arc-b580')?.id ??
                  gpus[0]?.id ??
                  'gpu-1',
                secondGpuId:
                  gpus.find((g) => g.id === 'rx-7800-xt')?.id ??
                  gpus[Math.min(2, gpus.length - 1)]?.id ??
                  'gpu-6',
                tolerancePct: -5,
                whatIfX: 800,
                enforceAsTrap: true,
              }));
            }}
            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            title="Connect two GPUs (Budget to Mid-Range) and extrapolate their secant line across the catalog"
          >
            2-GPU Secant Line
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectAxes?.('tdpWatts', 'rasterFps1440p');
              onChangeExtrapolation((prev) => ({
                ...prev,
                enabled: true,
                mode: 'custom',
                scalingModel: 'linear-ratio',
                customXValue: 200,
                customYValue: 100,
                exponent: 1.0,
                tolerancePct: 0,
                whatIfX: 250,
                enforceAsTrap: true,
              }));
            }}
            className="rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/20 transition"
            title="Performance-per-Watt Efficiency Extrapolation: 100 FPS at 200W (2.0 W/FPS)"
          >
            Perf-per-Watt (2.0 W/FPS)
          </button>
        </div>
      </div>

      {/* Expanded Customization Controls when Extrapolation Lab is ON */}
      {extrapolation.enabled && (
        <div className="mt-3 space-y-2.5 border-t border-slate-800/90 pt-3">
          {/* Row 2: Axis Pair Selector + Anchor Source Mode + Mathematical Scaling Law */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
            {/* 1. Extrapolated Axis Pair Selector (3 cols) */}
            <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5">
              <Compass className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Axes:</span>
              <select
                aria-label="Extrapolation Base X Metric"
                value={xMetric}
                onChange={(e) =>
                  onSelectAxes?.(e.target.value as MetricKey, yMetric)
                }
                className="bg-transparent font-bold text-emerald-400 focus:outline-none cursor-pointer"
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
              <span className="text-slate-500">→</span>
              <select
                aria-label="Extrapolation Target Y Metric"
                value={yMetric}
                onChange={(e) =>
                  onSelectAxes?.(xMetric, e.target.value as MetricKey)
                }
                className="bg-transparent font-bold text-sky-400 focus:outline-none cursor-pointer"
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

            {/* 2. Anchor Mode Switcher: 1-GPU vs 2-GPU Secant vs Custom Ratio (4 cols) */}
            <div className="lg:col-span-4 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() =>
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    mode: 'gpu',
                    scalingModel:
                      prev.scalingModel === 'two-point-line'
                        ? 'linear-ratio'
                        : prev.scalingModel,
                  }))
                }
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  extrapolation.mode === 'gpu'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crosshair className="h-3 w-3" />1 GPU Anchor
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    mode: 'two-gpu',
                    scalingModel: 'two-point-line',
                  }))
                }
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  extrapolation.mode === 'two-gpu'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCommitHorizontal className="h-3 w-3" />2 GPUs Line
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeExtrapolation((prev) => ({
                    ...prev,
                    mode: 'custom',
                    scalingModel:
                      prev.scalingModel === 'two-point-line'
                        ? 'linear-ratio'
                        : prev.scalingModel,
                  }))
                }
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  extrapolation.mode === 'custom'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="h-3 w-3" />
                Custom Target
              </button>
            </div>

            {/* 3. Mathematical Scaling Law Selector (4 cols) */}
            <div className="lg:col-span-4 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5">
              <Sliders className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Curve Law:</span>
              <select
                aria-label="Extrapolation Mathematical Curve Law"
                value={extrapolation.scalingModel}
                onChange={(e) => {
                  const model = e.target.value as ExtrapolationScalingModel;
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
                className="bg-transparent font-bold text-amber-300 focus:outline-none cursor-pointer flex-1"
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
                  Power Scaling Curve (y = Y₀·(x/X₀)^α)
                </option>
                <option
                  value="two-point-line"
                  className="bg-slate-900 text-slate-100"
                >
                  2-GPU Secant Line (y = m·x + b)
                </option>
              </select>
            </div>
          </div>

          {/* Row 3: Anchor Inputs (GPU Dropdown / 2-GPU Dropdowns / Custom X & Y) + Exponent & Tolerance Sliders */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2">
            {/* Anchor Specification */}
            <div className="flex flex-wrap items-center gap-2">
              {extrapolation.mode === 'gpu' && (
                <>
                  <label
                    htmlFor="extrap-anchor-gpu"
                    className="text-[11px] font-medium text-slate-300"
                  >
                    Anchor GPU:
                  </label>
                  <select
                    id="extrap-anchor-gpu"
                    value={extrapolation.anchorGpuId}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        anchorGpuId: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-amber-300 focus:border-amber-500 focus:outline-none cursor-pointer"
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
                          {g.name.replace(' [TRAP]', '')} ({fmtX(gx)} → {gy}{' '}
                          {yDef.unit} |{' '}
                          {xDef.unit === '$' ? `$${ratio}` : ratio}/{yDef.unit})
                        </option>
                      );
                    })}
                  </select>
                </>
              )}

              {extrapolation.mode === 'two-gpu' && (
                <>
                  <span className="text-[11px] font-medium text-slate-300">
                    Connect:
                  </span>
                  <select
                    aria-label="First Secant GPU"
                    value={extrapolation.anchorGpuId}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        anchorGpuId: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold text-emerald-300 focus:outline-none cursor-pointer"
                  >
                    {gpus.map((g) => (
                      <option
                        key={g.id}
                        value={g.id}
                        className="bg-slate-900 text-slate-100"
                      >
                        {g.name.replace(' [TRAP]', '')} ({fmtX(g[xMetric])},{' '}
                        {g[yMetric]} {yDef.unit})
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 font-bold">↔</span>
                  <select
                    aria-label="Second Secant GPU"
                    value={extrapolation.secondGpuId}
                    onChange={(e) =>
                      onChangeExtrapolation((prev) => ({
                        ...prev,
                        secondGpuId: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold text-sky-300 focus:outline-none cursor-pointer"
                  >
                    {gpus.map((g) => (
                      <option
                        key={g.id}
                        value={g.id}
                        className="bg-slate-900 text-slate-100"
                      >
                        {g.name.replace(' [TRAP]', '')} ({fmtX(g[xMetric])},{' '}
                        {g[yMetric]} {yDef.unit})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {extrapolation.mode === 'custom' && (
                <>
                  <span className="text-[11px] font-medium text-slate-300">
                    Target Ratio:
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
                    <span className="text-slate-400">
                      {xDef.shortLabel} ({xDef.unit}):
                    </span>
                    <input
                      aria-label={`Reference ${xDef.shortLabel}`}
                      type="number"
                      min={1}
                      step={10}
                      value={extrapolation.customXValue}
                      onChange={(e) =>
                        onChangeExtrapolation((prev) => ({
                          ...prev,
                          customXValue: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        }))
                      }
                      className="w-20 bg-transparent font-mono font-bold text-amber-300 focus:outline-none"
                    />
                  </div>
                  <span className="text-slate-500 font-bold">for</span>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
                    <span className="text-slate-400">
                      {yDef.shortLabel} ({yDef.unit}):
                    </span>
                    <input
                      aria-label={`Reference ${yDef.shortLabel}`}
                      type="number"
                      min={1}
                      step={1}
                      value={extrapolation.customYValue}
                      onChange={(e) =>
                        onChangeExtrapolation((prev) => ({
                          ...prev,
                          customYValue: Math.max(
                            0.1,
                            Number(e.target.value) || 1
                          ),
                        }))
                      }
                      className="w-16 bg-transparent font-mono font-bold text-sky-300 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Power-Law Exponent Slider (when scalingModel === 'diminishing-power') + Tolerance Band Slider */}
            <div className="flex flex-wrap items-center gap-4">
              {extrapolation.scalingModel === 'diminishing-power' && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="extrap-exponent"
                    className="text-[11px] text-slate-300"
                    title="Exponent < 1.0 models realistic hardware diminishing returns; 1.0 = strict linear"
                  >
                    Curve Exponent α:{' '}
                    <strong className="font-mono text-sky-300">
                      {extrapolation.exponent.toFixed(2)}
                    </strong>
                  </label>
                  <input
                    id="extrap-exponent"
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

              <div className="flex items-center gap-2">
                <label
                  htmlFor="extrap-tolerance"
                  className="text-[11px] text-slate-300"
                  title="Negative % allows diminishing-returns slack below the anchor curve; Positive % requires beating the anchor curve"
                >
                  Margin Slack:{' '}
                  <strong
                    className={`font-mono ${
                      extrapolation.tolerancePct < 0
                        ? 'text-emerald-300'
                        : extrapolation.tolerancePct > 0
                        ? 'text-rose-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {extrapolation.tolerancePct > 0
                      ? `+${extrapolation.tolerancePct}% (Stricter)`
                      : extrapolation.tolerancePct < 0
                      ? `${extrapolation.tolerancePct}% (Slack)`
                      : '0% (Exact)'}
                  </strong>
                </label>
                <input
                  id="extrap-tolerance"
                  type="range"
                  min={-35}
                  max={35}
                  step={1}
                  value={extrapolation.tolerancePct}
                  onChange={(e) =>
                    onChangeExtrapolation((prev) => ({
                      ...prev,
                      tolerancePct: Number(e.target.value),
                    }))
                  }
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Interactive "What-If" Multi-Metric Target Predictor & Live Pass/Fail Telemetry */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-300">
                🔮 What-If Predictor at {xDef.shortLabel}:
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
                {xDef.unit !== '$' && (
                  <span className="text-amber-400 font-mono text-[10px]">
                    {xDef.unit}
                  </span>
                )}
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

            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                {evalResult.formulaLabel}
              </span>
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-0.5 font-mono text-[11px]">
                <strong className="text-emerald-400">{passCount} Pass</strong> •{' '}
                <strong className="text-rose-400">{failCount} Flagged</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
