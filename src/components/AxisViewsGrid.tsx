import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  METRIC_DEFINITIONS,
  MetricKey,
  RankedGpu,
  isMetricKey,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { get2DParetoFrontierCurve } from '../lib/math/pareto';
import {
  ExtrapolationConfig,
  evaluateLinearExtrapolation,
  getExtrapolationCurvePoints,
} from '../lib/math/extrapolation';
import { Anchor } from 'lucide-react';

interface AxisViewsGridProps {
  gpus: RankedGpu[];
  baseMetric: MetricKey; // Personalizable base axis anchored at Bottom-Left (defaults to 'price' / Money $)
  onChangeBaseMetric: (m: MetricKey) => void;
  extrapolation: ExtrapolationConfig;
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded?: boolean;
  hideDominatedNodes?: boolean;
  showDominatedZoneMesh?: boolean;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

const ACCENT_PALETTE: Record<MetricKey, string> = {
  price: '#10b981',
  rasterFps1440p: '#10b981',
  rtFps1440p: '#38bdf8',
  vramGb: '#c084fc',
  tdpWatts: '#f59e0b',
};

export const AxisViewsGrid: React.FC<AxisViewsGridProps> = ({
  gpus,
  baseMetric,
  onChangeBaseMetric,
  extrapolation,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded = false,
  hideDominatedNodes = false,
  showDominatedZoneMesh = true,
  onHoverGpu,
  onToggleSelectGpu,
}) => {
  const [subMode, setSubMode] = useState<'slices-2x2' | 'single-axis'>(
    'slices-2x2',
  );
  const [activeSingleAxis, setActiveSingleAxis] =
    useState<MetricKey>('rasterFps1440p');

  const baseDef = METRIC_DEFINITIONS[baseMetric];

  // The 4 other metrics compared against `baseMetric` (which sits on the Bottom-Left -> Right X axis)
  const sliceMetrics = useMemo(
    () => ALL_METRIC_KEYS.filter((k) => k !== baseMetric),
    [baseMetric],
  );

  // Ensure activeSingleAxis is distinct from baseMetric when baseMetric changes
  const effectiveSingleAxis =
    activeSingleAxis === baseMetric
      ? (sliceMetrics[0] ?? 'rasterFps1440p')
      : activeSingleAxis;

  // Build ECharts option for any 2D slice (baseMetric on Bottom-Left -> Right vs. yMetric on Bottom-Left -> Top)
  const buildSliceOption = (
    yMetric: MetricKey,
    accentColor: string,
    isLargeInspector = false,
  ) => {
    const yDef = METRIC_DEFINITIONS[yMetric];
    const { frontierGpus, stepLineCoords } = get2DParetoFrontierCurve(
      gpus,
      baseMetric,
      yMetric,
    );
    const frontierIdSet = new Set(frontierGpus.map((g) => g.id));

    const extrapEval = evaluateLinearExtrapolation(
      gpus,
      baseMetric,
      yMetric,
      extrapolation,
    );
    const belowMarginSet = new Set(extrapEval.belowMarginIds);

    const isSliceOptimal = (g: RankedGpu) =>
      frontierIdSet.has(g.id) &&
      (!extrapolation.enabled ||
        !extrapolation.enforceAsTrap ||
        !belowMarginSet.has(g.id));

    const sliceWinner =
      gpus.find((g) => isSliceOptimal(g)) ?? frontierGpus[0] ?? null;

    const xVals = gpus.map((g) => g[baseMetric]);
    const yVals = gpus.map((g) => g[yMetric]);
    const minX = Math.max(0, Math.floor(Math.min(...xVals) * 0.92));
    const maxX = Math.ceil(Math.max(...xVals) * 1.06);
    const minY = Math.max(0, Math.floor(Math.min(...yVals) * 0.88));
    const maxY = Math.ceil(Math.max(...yVals) * 1.08);

    const extendedCoords = [...stepLineCoords];
    if (extendedCoords.length > 0) {
      const last = extendedCoords[extendedCoords.length - 1];
      if (baseDef.direction === 'min' && maxX > last[0]) {
        extendedCoords.push([maxX, last[1]]);
      } else if (baseDef.direction === 'max' && minX < last[0]) {
        extendedCoords.unshift([minX, extendedCoords[0][1]]);
      }
    }

    const extrapLineCoords = extrapolation.enabled
      ? getExtrapolationCurvePoints(
          extrapEval.evaluateCutoffY,
          minX,
          maxX,
          minY,
          maxY,
        )
      : [];

    const visibleGpus = hideDominatedNodes
      ? gpus.filter((g) => isSliceOptimal(g))
      : gpus;

    const scatterData = visibleGpus.map((g) => {
      const isOpt = isSliceOptimal(g);
      const isWinner = g.id === sliceWinner?.id;
      const isHov = g.id === hoveredGpuId;
      const isSel = selectedGpuIds.includes(g.id);
      return {
        name: g.name,
        value: [g[baseMetric], g[yMetric], g.vramGb],
        gpu: g,
        symbolSize: isWinner
          ? isLargeInspector
            ? 22
            : 16
          : isHov || isSel
            ? isLargeInspector
              ? 19
              : 14
            : isOpt
              ? isLargeInspector
                ? 15
                : 11
              : isLargeInspector
                ? 11
                : 8,
        itemStyle: {
          color: isWinner
            ? '#f59e0b'
            : isOpt
              ? accentColor
              : 'rgba(244, 63, 94, 0.55)',
          borderColor:
            isWinner || isHov || isSel
              ? '#ffffff'
              : isOpt
                ? '#a7f3d0'
                : '#fb7185',
          borderWidth: isWinner || isHov || isSel ? 2 : 1,
        },
      };
    });

    const fmtBase = (v: number) =>
      baseDef.unit === '$' ? `$${v}` : `${v} ${baseDef.unit}`;

    return {
      backgroundColor: 'transparent',
      animationDuration: 220,
      grid: isLargeInspector
        ? { top: 34, right: 32, bottom: 48, left: 62 }
        : { top: 28, right: 20, bottom: 36, left: 50 },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 11 },
        formatter: (params: { data?: { gpu?: RankedGpu } }) => {
          const g = params.data?.gpu;
          if (!g) return '';
          const isOpt = isSliceOptimal(g);
          const diag = extrapEval.diagnostics[g.id];
          const ratio = (g[baseMetric] / Math.max(1e-6, g[yMetric])).toFixed(2);
          const ratioStr =
            baseDef.unit === '$'
              ? `$${ratio} / ${yDef.unit}`
              : `${ratio} ${baseDef.unit} / ${yDef.unit}`;
          return `
            <div style="font-weight:700;margin-bottom:3px;color:${
              isOpt ? '#34d399' : '#fb7185'
            }">
              ${g.name.replace(' [TRAP]', '')} (${
                isOpt ? 'Optimal on this Axis' : 'Unoptimized on this Axis'
              })
            </div>
            <div>Base (${baseDef.shortLabel}): <b>${fmtBase(
              g[baseMetric],
            )}</b> • ${yDef.shortLabel}: <b>${g[yMetric]} ${yDef.unit}</b></div>
            <div style="color:#38bdf8;margin-top:2px;">Rate: <b>${ratioStr}</b></div>
            ${
              extrapolation.enabled && diag
                ? `<div style="margin-top:3px;color:${
                    diag.isBelowMargin ? '#fda4af' : '#6ee7b7'
                  };font-size:10px;">${diag.summaryText}</div>`
                : ''
            }
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: `Base Axis (Bottom-Left): ${baseDef.shortLabel} (${baseDef.unit}) →`,
        nameLocation: 'middle',
        nameGap: isLargeInspector ? 30 : 22,
        min: minX,
        max: maxX,
        nameTextStyle: {
          color: '#34d399',
          fontSize: isLargeInspector ? 11.5 : 10,
          fontWeight: 700,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: isLargeInspector ? 11 : 9,
          formatter: (v: number) =>
            baseDef.unit === '$' ? `$${v}` : `${v}${baseDef.unit}`,
        },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: `↑ ${yDef.shortLabel} (${yDef.unit}) [${yDef.direction.toUpperCase()}]`,
        nameLocation: 'middle',
        nameGap: isLargeInspector ? 44 : 35,
        min: minY,
        max: maxY,
        nameTextStyle: {
          color: '#e2e8f0',
          fontSize: isLargeInspector ? 11.5 : 10,
          fontWeight: 700,
        },
        axisLabel: { color: '#94a3b8', fontSize: isLargeInspector ? 11 : 9 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: 'Frontier',
          type: 'line',
          data: extendedCoords,
          symbol: 'none',
          lineStyle: { color: accentColor, width: 2.2, type: 'dashed' },
          areaStyle: showDominatedZoneMesh
            ? {
                origin: yDef.direction === 'max' ? 'start' : 'end',
                color: 'rgba(244, 63, 94, 0.14)',
              }
            : undefined,
          z: 1,
          silent: true,
        },
        ...(extrapolation.enabled
          ? [
              {
                name: 'Linear Extrapolation Margin',
                type: 'line',
                data: extrapLineCoords,
                symbol: 'none',
                lineStyle: {
                  color: '#f59e0b',
                  width: 2,
                  type: 'solid',
                },
                areaStyle: showDominatedZoneMesh
                  ? {
                      origin: yDef.direction === 'max' ? 'start' : 'end',
                      color: 'rgba(245, 158, 11, 0.10)',
                    }
                  : undefined,
                z: 2,
                silent: true,
              },
            ]
          : []),
        {
          name: 'GPUs',
          type: 'scatter',
          data: scatterData,
          z: 5,
          labelLayout: { hideOverlap: true },
          label: {
            show: true,
            position: 'top',
            formatter: (p: { data: { name: string } }) =>
              p.data.name
                .replace('GeForce ', '')
                .replace('Radeon ', '')
                .replace(' [TRAP]', ''),
            color: '#cbd5e1',
            fontSize: isLargeInspector ? 10.5 : 9,
          },
        },
      ],
    };
  };

  // Efficiency Leaderboard for the Single-Axis Inspector (sorted by Spec per Base unit)
  const efficiencyRanking = useMemo(() => {
    const yDef = METRIC_DEFINITIONS[effectiveSingleAxis];
    const { frontierGpus } = get2DParetoFrontierCurve(
      gpus,
      baseMetric,
      effectiveSingleAxis,
    );
    const frontierIds = new Set(frontierGpus.map((g) => g.id));
    const extrapEval = evaluateLinearExtrapolation(
      gpus,
      baseMetric,
      effectiveSingleAxis,
      extrapolation,
    );
    const belowSet = new Set(extrapEval.belowMarginIds);

    return [...gpus]
      .map((g) => {
        const bx = Math.max(1e-6, g[baseMetric]);
        const sy = Math.max(1e-6, g[effectiveSingleAxis]);
        const costPerSpec = bx / sy;
        const isOpt =
          frontierIds.has(g.id) &&
          (!extrapolation.enabled ||
            !extrapolation.enforceAsTrap ||
            !belowSet.has(g.id));
        return { gpu: g, costPerSpec, isOpt, yDef };
      })
      .sort((a, b) =>
        yDef.direction === 'max'
          ? a.costPerSpec - b.costPerSpec
          : a.gpu[effectiveSingleAxis] - b.gpu[effectiveSingleAxis],
      );
  }, [gpus, baseMetric, effectiveSingleAxis, extrapolation]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onHoverGpu(id);
      },
      mouseout: () => onHoverGpu(null),
      click: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onToggleSelectGpu(id);
      },
    }),
    [onHoverGpu, onToggleSelectGpu],
  );

  return (
    <div className="w-full space-y-3">
      {/* Top Bar: Sub-mode switcher + Personalizable Base Axis (Bottom-Left) Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setSubMode('slices-2x2')}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                subMode === 'slices-2x2'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Axis Matrix ({baseDef.shortLabel} on Bottom-Left)
            </button>
            <button
              type="button"
              onClick={() => setSubMode('single-axis')}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                subMode === 'single-axis'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single-Axis Inspector ({baseDef.shortLabel} on Bottom-Left)
            </button>
          </div>

          {/* Personalizable Base Axis (Bottom-Left) Selector */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
            <Anchor className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium text-slate-300">
              Base Axis (Bottom-Left):
            </span>
            <select
              aria-label="Personalizable Base Axis (Bottom-Left)"
              value={baseMetric}
              onChange={(e) =>
                isMetricKey(e.target.value) &&
                onChangeBaseMetric(e.target.value)
              }
              className="bg-transparent font-bold text-emerald-300 focus:outline-none cursor-pointer"
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
        </div>

        {subMode === 'single-axis' ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-slate-400 mr-1">Inspect Vertical Axis:</span>
            {sliceMetrics.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setActiveSingleAxis(k)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition border ${
                  effectiveSingleAxis === k
                    ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {METRIC_DEFINITIONS[k].shortLabel}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            <strong>
              {baseDef.shortLabel} ({baseDef.unit})
            </strong>{' '}
            is anchored at the <strong>Bottom-Left</strong> of every panel •
            Points repainted per axis
          </span>
        )}
      </div>

      {subMode === 'slices-2x2' ? (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
            isExpanded ? 'h-[78vh] min-h-[640px]' : 'h-[520px]'
          }`}
        >
          {sliceMetrics.map((metricKey) => {
            const mDef = METRIC_DEFINITIONS[metricKey];
            const color = ACCENT_PALETTE[metricKey];
            return (
              <div
                key={metricKey}
                className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-2.5"
              >
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-bold text-slate-200">
                    {baseDef.shortLabel} ({baseDef.unit}) vs. {mDef.shortLabel}{' '}
                    ({mDef.unit})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Bottom-Left: Min {baseDef.shortLabel} •{' '}
                    {mDef.direction === 'max'
                      ? 'Top-Left = Best'
                      : 'Bottom-Left = Best'}
                  </span>
                </div>
                <div className="flex-1 min-h-[195px]">
                  <ReactECharts
                    option={buildSliceOption(metricKey, color, false)}
                    style={{ height: '100%', width: '100%' }}
                    onEvents={onEvents}
                    notMerge={true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single-Axis Inspector: Base (Money $) on Bottom-Left -> Right vs. Selected Spec on Bottom-Left -> Top + Efficiency Sidebar */
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-3 ${
            isExpanded ? 'h-[78vh] min-h-[640px]' : 'h-[500px]'
          }`}
        >
          <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-white">
                Base Axis: {baseDef.shortLabel} ({baseDef.unit}, Bottom-Left →
                Right) vs. {METRIC_DEFINITIONS[effectiveSingleAxis].label}{' '}
                (Bottom-Left → Top)
              </span>
              <span className="text-[11px] font-semibold text-emerald-400">
                Repainted strictly for {baseDef.shortLabel} ×{' '}
                {METRIC_DEFINITIONS[effectiveSingleAxis].shortLabel}
              </span>
            </div>
            <div className="flex-1 min-h-[380px]">
              <ReactECharts
                option={buildSliceOption(
                  effectiveSingleAxis,
                  ACCENT_PALETTE[effectiveSingleAxis],
                  true,
                )}
                style={{ height: '100%', width: '100%' }}
                onEvents={onEvents}
                notMerge={true}
              />
            </div>
          </div>

          {/* Right 4 cols: Live Efficiency Ranking (Base per Spec Unit, e.g. $/GB or $/FPS) */}
          <div className="lg:col-span-4 flex flex-col rounded-xl border border-slate-800/90 bg-slate-950/60 p-3 overflow-y-auto">
            <div className="border-b border-slate-800 pb-2 mb-2">
              <div className="text-xs font-bold text-white">
                {baseDef.shortLabel} per{' '}
                {METRIC_DEFINITIONS[effectiveSingleAxis].shortLabel} Efficiency
              </div>
              <div className="text-[11px] text-slate-400">
                Sorted by best {baseDef.unit}/
                {METRIC_DEFINITIONS[effectiveSingleAxis].unit} ratio
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              {efficiencyRanking.map(({ gpu, costPerSpec, isOpt, yDef }, i) => {
                const rateStr =
                  baseDef.unit === '$'
                    ? `$${costPerSpec.toFixed(2)}/${yDef.unit}`
                    : `${costPerSpec.toFixed(2)} ${baseDef.unit}/${yDef.unit}`;
                return (
                  <div
                    key={gpu.id}
                    onMouseEnter={() => onHoverGpu(gpu.id)}
                    onMouseLeave={() => onHoverGpu(null)}
                    onClick={() => onToggleSelectGpu(gpu.id)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 cursor-pointer transition ${
                      isOpt
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-100'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-[10px] text-slate-500 mr-1.5">
                        #{i + 1}
                      </span>
                      <span
                        className={`font-semibold ${
                          isOpt ? 'text-emerald-300' : 'text-slate-300'
                        }`}
                      >
                        {gpu.name.replace(' [TRAP]', '')}
                      </span>
                    </div>
                    <div className="shrink-0 font-mono text-[11px]">
                      <span
                        className={
                          isOpt
                            ? 'text-emerald-400 font-bold'
                            : 'text-rose-400 font-medium'
                        }
                      >
                        {rateStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
