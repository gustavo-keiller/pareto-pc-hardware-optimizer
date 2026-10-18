import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  METRIC_DEFINITIONS,
  MetricKey,
  RankedGpu,
} from '../lib/math/types';
import { get2DParetoFrontierCurve } from '../lib/math/pareto';
import {
  ExtrapolationConfig,
  evaluateLinearExtrapolation,
  getExtrapolationCurvePoints,
} from '../lib/math/extrapolation';
import { RotateCcw, ZoomIn } from 'lucide-react';

interface ParetoScatterPlotProps {
  gpus: RankedGpu[];
  xMetric: MetricKey;
  yMetric: MetricKey;
  paretoMode: '2d-axes' | 'all-5d';
  extrapolation: ExtrapolationConfig;
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded?: boolean;
  hideDominatedNodes?: boolean;
  showDominatedZoneMesh?: boolean;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export const ParetoScatterPlot: React.FC<ParetoScatterPlotProps> = ({
  gpus,
  xMetric,
  yMetric,
  paretoMode,
  extrapolation,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded = false,
  hideDominatedNodes = false,
  showDominatedZoneMesh = true,
  onHoverGpu,
  onToggleSelectGpu,
}) => {
  const chartRef = useRef<ReactECharts | null>(null);
  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];

  const { frontierGpus, stepLineCoords } = useMemo(
    () => get2DParetoFrontierCurve(gpus, xMetric, yMetric),
    [gpus, xMetric, yMetric]
  );

  // Evaluate Linear Extrapolation Rule (e.g. $1000 for 10 GB = $100/GB)
  const extrapResult = useMemo(
    () => evaluateLinearExtrapolation(gpus, xMetric, yMetric, extrapolation),
    [gpus, xMetric, yMetric, extrapolation]
  );

  const belowMarginSet = useMemo(
    () => new Set(extrapResult.belowMarginIds),
    [extrapResult]
  );

  const frontier2DIdSet = useMemo(
    () => new Set(frontierGpus.map((g) => g.id)),
    [frontierGpus]
  );

  // Helper: Is a GPU optimal in the currently displayed 2D view?
  const isGpuOptimalInView = (g: RankedGpu): boolean => {
    const passesExtrap =
      !extrapolation.enabled ||
      !extrapolation.enforceAsTrap ||
      !belowMarginSet.has(g.id);
    // To prevent green points from ever appearing inside the red 2D staircase cloud,
    // a point is painted green on the 2D chart only if it lies on the 2D [xMetric, yMetric] frontier!
    return frontier2DIdSet.has(g.id) && passesExtrap;
  };

  // Identify #1 TOPSIS winner among GPUs that are optimal on this 2D view
  const winnerGpu = useMemo(
    () =>
      gpus.find((g) => isGpuOptimalInView(g)) ??
      gpus.find((g) => frontier2DIdSet.has(g.id)) ??
      gpus[0] ??
      null,
    [gpus, frontier2DIdSet, extrapolation, belowMarginSet]
  );

  const hoveredGpu = useMemo(
    () => gpus.find((g) => g.id === hoveredGpuId) ?? null,
    [gpus, hoveredGpuId]
  );

  // Compute exact padded domain bounds
  const axisBounds = useMemo(() => {
    if (gpus.length === 0) {
      return { xMin: 0, xMax: 1000, yMin: 0, yMax: 200 };
    }
    const xVals = gpus.map((g) => g[xMetric]);
    const yVals = gpus.map((g) => g[yMetric]);
    const rawXMin = Math.min(...xVals);
    const rawXMax = Math.max(...xVals);
    const rawYMin = Math.min(...yVals);
    const rawYMax = Math.max(...yVals);

    const xPad = Math.max(10, (rawXMax - rawXMin) * 0.08);
    const yPad = Math.max(5, (rawYMax - rawYMin) * 0.1);

    return {
      xMin: Math.max(0, Math.floor(rawXMin - xPad)),
      xMax: Math.ceil(rawXMax + xPad),
      yMin: Math.max(0, Math.floor(rawYMin - yPad)),
      yMax: Math.ceil(rawYMax + yPad),
    };
  }, [gpus, xMetric, yMetric]);

  // Extend the 2D Pareto staircase to the worst X edge so the shaded region covers the entire unoptimized zone
  const extendedStepCoords = useMemo(() => {
    if (stepLineCoords.length === 0) return [];
    const worstX =
      xDef.direction === 'min' ? axisBounds.xMax : axisBounds.xMin;
    const lastPt = stepLineCoords[stepLineCoords.length - 1];
    const coords = [...stepLineCoords];
    if (
      (xDef.direction === 'min' && worstX > lastPt[0]) ||
      (xDef.direction === 'max' && worstX < lastPt[0])
    ) {
      coords.push([worstX, lastPt[1]]);
    }
    return coords;
  }, [stepLineCoords, xDef.direction, axisBounds]);

  // Sampled curve points for Value Extrapolation (supports Linear Ratio, Power-Law, 2-GPU Secant, and Tolerance Band)
  const extrapLineCoords = useMemo(() => {
    if (!extrapolation.enabled) return [];
    return getExtrapolationCurvePoints(
      extrapResult.evaluateCutoffY,
      axisBounds.xMin,
      axisBounds.xMax,
      axisBounds.yMin,
      axisBounds.yMax
    );
  }, [extrapolation.enabled, extrapResult, axisBounds]);

  const extrapAnchorCoords = useMemo(() => {
    if (!extrapolation.enabled || Math.abs(extrapolation.tolerancePct) < 0.5) {
      return [];
    }
    return getExtrapolationCurvePoints(
      extrapResult.evaluateAnchorY,
      axisBounds.xMin,
      axisBounds.xMax,
      axisBounds.yMin,
      axisBounds.yMax
    );
  }, [
    extrapolation.enabled,
    extrapolation.tolerancePct,
    extrapResult,
    axisBounds,
  ]);

  const option = useMemo(() => {
    const dominatorsOfHovered = new Set(hoveredGpu?.dominatedBy ?? []);

    // Build dominance arrows when hovering a trap card
    const dominanceLines: Array<{
      coords: [[number, number], [number, number]];
      name: string;
    }> = [];

    if (hoveredGpu && !isGpuOptimalInView(hoveredGpu) && !hideDominatedNodes) {
      for (const domId of hoveredGpu.dominatedBy) {
        const domGpu = gpus.find((g) => g.id === domId);
        if (domGpu) {
          dominanceLines.push({
            coords: [
              [domGpu[xMetric], domGpu[yMetric]],
              [hoveredGpu[xMetric], hoveredGpu[yMetric]],
            ],
            name: `${domGpu.name} ≻ ${hoveredGpu.name}`,
          });
        }
      }
    }

    // 1. Dominated / Unoptimized GPUs on this 2D slice (or failing the enforced Extrapolation Margin)
    // Painted Red so NO point inside the red unoptimized region is ever painted green!
    const trapData = hideDominatedNodes
      ? []
      : gpus
          .filter(
            (g) =>
              !isGpuOptimalInView(g) &&
              !(
                paretoMode === 'all-5d' &&
                g.isParetoOptimal &&
                (!extrapolation.enabled ||
                  !extrapolation.enforceAsTrap ||
                  !belowMarginSet.has(g.id))
              )
          )
          .map((g) => {
            const isSelected = selectedGpuIds.includes(g.id);
            const isHovered = hoveredGpuId === g.id;
            return {
              name: g.name,
              value: [g[xMetric], g[yMetric], g.vramGb, g.id],
              gpu: g,
              symbolSize:
                Math.max(14, g.vramGb * 1.1) +
                (isHovered || isSelected ? 6 : 0),
              itemStyle: {
                color: isSelected ? '#f43f5e' : 'rgba(244, 63, 94, 0.5)',
                borderColor: isHovered || isSelected ? '#fda4af' : '#f43f5e',
                borderWidth: isHovered || isSelected ? 2.5 : 1.5,
                borderType: 'dashed',
              },
            };
          });

    // 2. 5D Multi-Objective Specialists (Dominated on 2D X/Y, but saved by another spec in 5D mode)
    // Painted as Amber/Cyan hollow diamonds so they are clearly distinct from green 2D Frontier nodes
    const specialist5DData =
      hideDominatedNodes || paretoMode !== 'all-5d'
        ? []
        : gpus
            .filter(
              (g) =>
                !frontier2DIdSet.has(g.id) &&
                g.isParetoOptimal &&
                (!extrapolation.enabled ||
                  !extrapolation.enforceAsTrap ||
                  !belowMarginSet.has(g.id))
            )
            .map((g) => {
              const isSelected = selectedGpuIds.includes(g.id);
              const isHovered = hoveredGpuId === g.id;
              return {
                name: g.name,
                value: [g[xMetric], g[yMetric], g.vramGb, g.id],
                gpu: g,
                symbol: 'diamond',
                symbolSize:
                  Math.max(16, g.vramGb * 1.2) +
                  (isHovered || isSelected ? 6 : 0),
                itemStyle: {
                  color: isSelected
                    ? '#38bdf8'
                    : 'rgba(6, 182, 212, 0.55)',
                  borderColor: isHovered || isSelected ? '#ffffff' : '#22d3ee',
                  borderWidth: 2,
                },
              };
            });

    // 3. 2D Staircase Optimal GPUs (Strictly on the 2D outer frontier and above any enforced margin)
    const optimal2DData = gpus
      .filter((g) => isGpuOptimalInView(g) && g.id !== winnerGpu?.id)
      .map((g) => {
        const isSelected = selectedGpuIds.includes(g.id);
        const isHovered = hoveredGpuId === g.id;
        const isDominatorHighlight = dominatorsOfHovered.has(g.id);
        const isBelowLineWarning =
          extrapolation.enabled && belowMarginSet.has(g.id);
        return {
          name: g.name,
          value: [g[xMetric], g[yMetric], g.vramGb, g.id],
          gpu: g,
          symbolSize:
            Math.max(16, g.vramGb * 1.25) +
            (isHovered || isSelected || isDominatorHighlight ? 6 : 0),
          itemStyle: {
            color: isDominatorHighlight
              ? '#34d399'
              : isSelected
              ? '#38bdf8'
              : '#10b981',
            borderColor: isBelowLineWarning
              ? '#f59e0b'
              : isDominatorHighlight || isHovered || isSelected
              ? '#ffffff'
              : '#059669',
            borderWidth:
              isDominatorHighlight || isHovered || isSelected ? 3 : 2,
            shadowBlur: isDominatorHighlight ? 18 : 8,
            shadowColor: isDominatorHighlight
              ? 'rgba(52, 211, 153, 0.8)'
              : 'rgba(16, 185, 129, 0.4)',
          },
        };
      });

    // 4. #1 TOPSIS Winner (Guaranteed to be on the outer 2D frontier!)
    const winnerData =
      winnerGpu && isGpuOptimalInView(winnerGpu)
        ? [
            {
              name: winnerGpu.name,
              value: [
                winnerGpu[xMetric],
                winnerGpu[yMetric],
                winnerGpu.vramGb,
                winnerGpu.id,
              ],
              gpu: winnerGpu,
              symbolSize: Math.max(22, winnerGpu.vramGb * 1.35) + 6,
              itemStyle: {
                color: '#f59e0b',
                borderColor: '#fef3c7',
                borderWidth: 3,
                shadowBlur: 22,
                shadowColor: 'rgba(245, 158, 11, 0.85)',
              },
            },
          ]
        : [];

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      legend: {
        top: 6,
        right: 16,
        textStyle: { color: '#cbd5e1', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
        data: [
          '#1 TOPSIS Winner',
          '2D Frontier Optimal',
          ...(paretoMode === 'all-5d' && !hideDominatedNodes
            ? ['5D Specialist (Dominated on 2D)']
            : []),
          ...(hideDominatedNodes ? [] : ['Dominated Traps']),
          ...(extrapolation.enabled ? ['Linear Extrapolation Margin'] : []),
        ],
      },
      grid: {
        top: 48,
        right: 42,
        bottom: 78,
        left: 68,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 18,
          bottom: 8,
          borderColor: '#1e293b',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          fillerColor: 'rgba(16, 185, 129, 0.18)',
          handleStyle: { color: '#10b981', borderColor: '#34d399' },
          textStyle: { color: '#94a3b8', fontSize: 10 },
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          filterMode: 'none',
          width: 14,
          right: 8,
          top: 48,
          bottom: 78,
          borderColor: '#1e293b',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          fillerColor: 'rgba(56, 189, 248, 0.18)',
          handleStyle: { color: '#38bdf8', borderColor: '#7dd3fc' },
          textStyle: { color: '#94a3b8', fontSize: 10 },
        },
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 14,
        textStyle: {
          color: '#f8fafc',
          fontSize: 12,
        },
        formatter: (params: { data?: { gpu?: RankedGpu } }) => {
          const g = params.data?.gpu;
          if (!g) return '';
          const is2DOpt = frontier2DIdSet.has(g.id);
          const extrapDiag = extrapResult.diagnostics[g.id];

          const statusBadge =
            g.id === winnerGpu?.id && isGpuOptimalInView(g)
              ? `<span style="background:#f59e0b22;color:#fbbf24;border:1px solid #f59e0b66;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">★ #1 WINNER</span>`
              : isGpuOptimalInView(g)
              ? `<span style="background:#10b98122;color:#34d399;border:1px solid #10b98166;padding:2px 6px;border-radius:4px;font-weight:600;font-size:10px;">● 2D FRONTIER OPTIMAL</span>`
              : g.isParetoOptimal && !is2DOpt
              ? `<span style="background:#06b6d422;color:#22d3ee;border:1px solid #06b6d466;padding:2px 6px;border-radius:4px;font-weight:600;font-size:10px;">◆ 5D SPECIALIST (2D DOMINATED)</span>`
              : `<span style="background:#f43f5e22;color:#fb7185;border:1px solid #f43f5e66;padding:2px 6px;border-radius:4px;font-weight:600;font-size:10px;">▲ DOMINATED TRAP</span>`;

          const extrapHtml =
            extrapolation.enabled && extrapDiag
              ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;font-size:11px;color:${
                  extrapDiag.isBelowMargin ? '#fda4af' : '#6ee7b7'
                };">
                  <strong>Extrapolation Check:</strong> ${extrapDiag.summaryText}
                </div>`
              : '';

          const valHtml = g.valuation
            ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;">
                <span>OLS Fair Value: <strong style="color:#e2e8f0;">$${g.valuation.fairPrice}</strong></span>
                <span style="color:${
                  g.valuation.residualUsd <= 0 ? '#34d399' : '#fb7185'
                };font-weight:600;">
                  ${
                    g.valuation.residualUsd <= 0
                      ? `$${Math.abs(g.valuation.residualUsd)} Undervalued`
                      : `+$${g.valuation.residualUsd} Overpriced`
                  }
                </span>
              </div>`
            : '';

          const reasonsHtml =
            g.isDominated && g.dominanceReasons.length > 0
              ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;color:#fda4af;max-width:300px;white-space:normal;line-height:1.4;">
                  ${g.dominanceReasons
                    .slice(0, 2)
                    .map((r) => `<div>⚠️ ${r.summaryText}</div>`)
                    .join('')}
                </div>`
              : '';

          return `
            <div style="min-width:255px;font-family:Inter,system-ui,sans-serif;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <strong style="font-size:14px;color:#fff;">${g.name}</strong>
                ${statusBadge}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;color:#cbd5e1;">
                <div>Price: <strong style="color:#fff;">$${g.price}</strong></div>
                <div>Match Score: <strong style="color:#fbbf24;">${g.topsisScorePct.toFixed(1)}%</strong></div>
                <div>1440p Raster: <strong style="color:#fff;">${g.rasterFps1440p} FPS</strong></div>
                <div>1440p RT: <strong style="color:#fff;">${g.rtFps1440p} FPS</strong></div>
                <div>VRAM: <strong style="color:#38bdf8;">${g.vramGb} GB</strong></div>
                <div>Power (TBP): <strong style="color:#fff;">${g.tdpWatts} W</strong></div>
              </div>
              ${extrapHtml}
              ${valHtml}
              ${reasonsHtml}
            </div>
          `;
        },
      },
      xAxis: {
        name: `${xDef.label} (${xDef.direction === 'min' ? 'Lower is better' : 'Higher is better'})`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontWeight: 600,
        },
        type: 'value',
        min: axisBounds.xMin,
        max: axisBounds.xMax,
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          formatter: (val: number) =>
            xDef.unit === '$'
              ? `$${Math.round(val)}`
              : `${Math.round(val)} ${xDef.unit}`,
        },
      },
      yAxis: {
        name: `${yDef.label} (${yDef.direction === 'max' ? 'Higher is better' : 'Lower is better'})`,
        nameLocation: 'middle',
        nameGap: 46,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontWeight: 600,
        },
        type: 'value',
        min: axisBounds.yMin,
        max: axisBounds.yMax,
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          formatter: (val: number) =>
            yDef.unit === '$' ? `$${Math.round(val)}` : `${Math.round(val)}`,
        },
      },
      series: [
        // 1. Exact Pareto Staircase Boundary & Unified Unoptimized Shading
        {
          name: 'Pareto Frontier (Step)',
          type: 'line',
          step: xDef.direction === 'min' ? 'end' : 'start',
          data: extendedStepCoords,
          symbol: 'none',
          lineStyle: {
            color: '#10b981',
            width: 2.2,
            type: 'dashed',
            opacity: 0.85,
          },
          areaStyle: showDominatedZoneMesh
            ? {
                origin: yDef.direction === 'max' ? 'start' : 'end',
                color: 'rgba(244, 63, 94, 0.16)',
              }
            : undefined,
          silent: true,
          z: 1,
        },
        // 2. Direct Pareto Curve Hull
        {
          name: 'Pareto Frontier Hull',
          type: 'line',
          smooth: 0.12,
          data: stepLineCoords,
          symbol: 'none',
          lineStyle: {
            color: '#34d399',
            width: 2.5,
          },
          silent: true,
          z: 2,
        },
        // 3. Personalized Value Extrapolation Curve & Tolerance Cutoff Boundary
        ...(extrapolation.enabled
          ? [
              ...(extrapAnchorCoords.length > 0
                ? [
                    {
                      name: 'Anchor Trajectory',
                      type: 'line',
                      smooth: 0.2,
                      data: extrapAnchorCoords,
                      symbol: 'none',
                      lineStyle: {
                        color: '#fde047',
                        width: 1.6,
                        type: 'dashed',
                        opacity: 0.75,
                      },
                      silent: true,
                      z: 2,
                    },
                  ]
                : []),
              {
                name: 'Extrapolation Cutoff Margin',
                type: 'line',
                smooth: 0.2,
                data: extrapLineCoords,
                symbol: 'none',
                lineStyle: {
                  color: '#f59e0b',
                  width: 2.5,
                  type: 'solid',
                },
                areaStyle: showDominatedZoneMesh
                  ? {
                      origin: yDef.direction === 'max' ? 'start' : 'end',
                      color: 'rgba(245, 158, 11, 0.11)',
                    }
                  : undefined,
                endLabel: {
                  show: true,
                  formatter: () => extrapResult.formulaLabel,
                  color: '#fbbf24',
                  fontSize: 10.5,
                  fontWeight: 700,
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  padding: [2, 6],
                  borderRadius: 4,
                },
                z: 3,
              },
            ]
          : []),
        // 4. Dominance Diagnostic Vectors (shown on trap hover)
        {
          name: 'Dominance Vector',
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          z: 10,
          effect: {
            show: true,
            period: 2.5,
            trailLength: 0.2,
            symbol: 'arrow',
            symbolSize: 8,
            color: '#34d399',
          },
          lineStyle: {
            color: '#f43f5e',
            width: 2,
            curveness: 0.18,
            opacity: 0.9,
          },
          data: dominanceLines,
        },
        // 5. Dominated "Trap" GPUs
        {
          name: 'Dominated Traps',
          type: 'scatter',
          data: trapData,
          z: 4,
          labelLayout: { hideOverlap: true },
          label: {
            show: true,
            position: 'bottom',
            formatter: (p: { data: { name: string } }) =>
              p.data.name.replace(' [TRAP]', ''),
            color: '#94a3b8',
            fontSize: 10,
          },
        },
        // 6. 5D Multi-Objective Specialists
        {
          name: '5D Specialist (Dominated on 2D)',
          type: 'scatter',
          data: specialist5DData,
          z: 5,
          labelLayout: { hideOverlap: true },
          label: {
            show: true,
            position: 'bottom',
            formatter: (p: { data: { name: string } }) =>
              `◆ ${p.data.name.replace(' [TRAP]', '')}`,
            color: '#67e8f9',
            fontSize: 10,
            fontWeight: 600,
          },
        },
        // 7. 2D Pareto-Optimal GPUs
        {
          name: '2D Frontier Optimal',
          type: 'scatter',
          data: optimal2DData,
          z: 6,
          labelLayout: { hideOverlap: true },
          label: {
            show: true,
            position: 'top',
            formatter: (p: { data: { name: string } }) => p.data.name,
            color: '#e2e8f0',
            fontSize: 11,
            fontWeight: 600,
          },
        },
        // 8. #1 TOPSIS Winner
        {
          name: '#1 TOPSIS Winner',
          type: 'effectScatter',
          rippleEffect: {
            brushType: 'stroke',
            scale: 2.4,
            period: 3.5,
          },
          data: winnerData,
          z: 8,
          label: {
            show: true,
            position: 'top',
            formatter: (p: { data: { name: string } }) => `★ ${p.data.name}`,
            color: '#fbbf24',
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: [3, 6],
            borderRadius: 4,
            borderColor: '#f59e0b',
            borderWidth: 1,
          },
        },
      ],
    };
  }, [
    gpus,
    xMetric,
    yMetric,
    paretoMode,
    extrapolation,
    extrapResult,
    extrapLineCoords,
    belowMarginSet,
    xDef,
    yDef,
    frontier2DIdSet,
    stepLineCoords,
    extendedStepCoords,
    axisBounds,
    winnerGpu,
    hoveredGpu,
    hoveredGpuId,
    selectedGpuIds,
    hideDominatedNodes,
    showDominatedZoneMesh,
  ]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onHoverGpu(id);
      },
      mouseout: () => {
        onHoverGpu(null);
      },
      click: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onToggleSelectGpu(id);
      },
    }),
    [onHoverGpu, onToggleSelectGpu]
  );

  const handleResetZoom = () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (instance) {
      instance.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100,
      });
    }
  };

  return (
    <div
      className={`w-full ${
        isExpanded ? 'h-[82vh] min-h-[660px]' : 'h-[480px]'
      } relative`}
    >
      <div className="absolute top-1.5 left-3 z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/85 px-2 py-0.5 text-[11px] text-slate-400">
          <ZoomIn className="h-3 w-3 text-emerald-400" />
          Scroll to Zoom • Drag to Pan
        </span>
        <button
          type="button"
          onClick={handleResetZoom}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/90 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
          title="Reset 2D Zoom & Pan"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Zoom
        </button>
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        onEvents={onEvents}
        notMerge={true}
      />
    </div>
  );
};
