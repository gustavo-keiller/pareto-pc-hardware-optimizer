import React, { useMemo } from 'react';
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { MetricDefinition, MetricKey, RankedGpu } from '../lib/math/types';
import { formatCurrency } from '../utils/currency';

export type StoryStep = 1 | 2 | 3 | 4 | 5;

export interface SimpleGuideScatterPlotProps {
  gpus: RankedGpu[];
  currency?: 'USD' | 'BRL';
  activeStep: StoryStep;
  setActiveStep: (s: StoryStep | ((prev: StoryStep) => StoryStep)) => void;
  toStoryStep: (n: number) => StoryStep;
  xMetric: MetricKey;
  yMetric: MetricKey;
  xDef: MetricDefinition;
  yDef: MetricDefinition;
  frontier2DGpus: RankedGpu[];
  spotlightTrap: RankedGpu | null;
  spotlightDominators: RankedGpu[];
  bestChoice: { gpu: RankedGpu } | null;
  step1Leader: RankedGpu | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
  bounds: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };
  pareto2DMap: Map<string, { isParetoOptimal: boolean }>;
  paretoActiveMap: Map<string, { isParetoOptimal: boolean }>;
  onlyFrontier: boolean;
  frontierStaircasePath: string;
  isoUtilityPath: string;
}

export const SimpleGuideScatterPlot: React.FC<SimpleGuideScatterPlotProps> = ({
  gpus,
  currency = 'USD',
  activeStep,
  setActiveStep,
  toStoryStep,
  xMetric,
  yMetric,
  xDef,
  yDef,
  frontier2DGpus,
  spotlightTrap,
  spotlightDominators,
  bestChoice,
  step1Leader,
  hoveredId,
  setHoveredId,
  onToggleSelectGpu,
  bounds,
  pareto2DMap,
  paretoActiveMap,
  onlyFrontier,
  frontierStaircasePath,
  isoUtilityPath,
}) => {
  const svgW = 680;
  const svgH = 400;
  const padL = 64;
  const padR = 36;
  const padT = 34;
  const padB = 52;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const toScreenX = (val: number) => {
    const span = bounds.x.max - bounds.x.min || 1;
    const t = (val - bounds.x.min) / span;
    return padL + t * plotW;
  };

  const toScreenY = (val: number) => {
    const span = bounds.y.max - bounds.y.min || 1;
    const t = (val - bounds.y.min) / span;
    return padT + plotH - t * plotH;
  };

  const toStep1ScreenX = (val: number) => {
    const span = bounds.y.max - bounds.y.min || 1;
    const t = (val - bounds.y.min) / span;
    return padL + t * plotW;
  };

  const xTicks = useMemo(() => {
    const count = 5;
    const span = bounds.x.max - bounds.x.min || 1;
    return Array.from({ length: count + 1 }, (_, i) =>
      Math.round(bounds.x.min + (i / count) * span),
    );
  }, [bounds.x]);

  const yTicks = useMemo(() => {
    const count = 4;
    const span = bounds.y.max - bounds.y.min || 1;
    return Array.from({ length: count + 1 }, (_, i) =>
      Math.round(bounds.y.min + (i / count) * span),
    );
  }, [bounds.y]);

  const hoveredGpu = useMemo(
    () => gpus.find((g) => g.id === hoveredId) ?? null,
    [gpus, hoveredId],
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            {activeStep === 1
              ? `Step 1: Single-Metric Ranking by ${yDef.shortLabel}`
              : activeStep === 2
                ? `Step 2: Trade-Off Between ${xDef.shortLabel} & ${yDef.shortLabel}`
                : activeStep === 3
                  ? `Step 3: Why ${spotlightTrap?.name ?? 'This Card'} Is an Overpriced Trap`
                  : activeStep === 4
                    ? `Step 4: The Best Deals (${frontier2DGpus.length} Cards Worth Considering)`
                    : `Step 5: Value Trade-Off Curve & Top Recommendations`}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {activeStep === 1
              ? 'When you only look at 1 metric, every GPU sits on a single line.'
              : activeStep === 5
                ? 'Drag the priority slider on the left to balance what matters most to your setup.'
                : 'Green points are cards worth considering. Red points are bad deals beaten on both specs.'}
          </p>
        </div>

        {/* Prev / Next Step Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((s) => toStoryStep(s - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            type="button"
            disabled={activeStep === 5}
            onClick={() => setActiveStep((s) => toStoryStep(s + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Interactive Plot */}
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto select-none"
        >
          <defs>
            <filter
              id="pareto-gold-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="5"
                floodColor="#fbbf24"
                floodOpacity="0.85"
              />
            </filter>
          </defs>

          {/* Grid Lines & Axes when in 2D mode (Steps 2–5) */}
          {activeStep > 1 ? (
            <>
              {/* Horizontal Y grid lines */}
              {yTicks.map((tick) => {
                const sy = toScreenY(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={padL}
                      y1={sy}
                      x2={svgW - padR}
                      y2={sy}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={sy + 4}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Vertical X grid lines */}
              {xTicks.map((tick) => {
                const sx = toScreenX(tick);
                return (
                  <g key={`x-${tick}`}>
                    <line
                      x1={sx}
                      y1={padT}
                      x2={sx}
                      y2={svgH - padB}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={sx}
                      y={svgH - padB + 18}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {xDef.unit === '$'
                        ? formatCurrency(tick, currency)
                        : tick}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Label */}
              <text
                x={padL + plotW / 2}
                y={svgH - 10}
                textAnchor="middle"
                className="fill-emerald-400 text-xs font-bold"
              >
                {xDef.label} ({xDef.unit}) —{' '}
                {xDef.direction === 'min'
                  ? 'Lower (Left) is Better'
                  : 'Higher (Right) is Better'}
              </text>

              {/* Y Axis Label */}
              <text
                x={-(padT + plotH / 2)}
                y={16}
                transform="rotate(-90)"
                textAnchor="middle"
                className="fill-sky-400 text-xs font-bold"
              >
                {yDef.label} ({yDef.unit})
              </text>
            </>
          ) : (
            /* Step 1: Single 1D Horizontal Axis */
            <>
              <line
                x1={padL}
                y1={svgH / 2}
                x2={svgW - padR}
                y2={svgH / 2}
                stroke="#334155"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              {yTicks.map((tick) => {
                const sx = toStep1ScreenX(tick);
                return (
                  <g key={`s1-${tick}`}>
                    <line
                      x1={sx}
                      y1={svgH / 2 - 8}
                      x2={sx}
                      y2={svgH / 2 + 8}
                      stroke="#475569"
                    />
                    <text
                      x={sx}
                      y={svgH / 2 + 26}
                      textAnchor="middle"
                      className="fill-slate-300 font-mono text-[11px]"
                    >
                      {tick} {yDef.unit}
                    </text>
                  </g>
                );
              })}
              <text
                x={padL + plotW / 2}
                y={svgH / 2 + 52}
                textAnchor="middle"
                className="fill-amber-400 text-xs font-bold"
              >
                {yDef.label} ({yDef.unit}) — Single-Metric Ranking
              </text>
            </>
          )}

          {/* Steps 4 & 5: Pareto Frontier Staircase Line */}
          {activeStep >= 4 && frontierStaircasePath && (
            <path
              d={frontierStaircasePath}
              fill="none"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              opacity={0.85}
            />
          )}

          {/* Step 3: Domination Arrows from Better GPUs to Bad Deal GPU */}
          {activeStep === 3 &&
            spotlightTrap &&
            spotlightDominators.map((dom) => {
              const x1 = toScreenX(dom[xMetric]);
              const y1 = toScreenY(dom[yMetric]);
              const x2 = toScreenX(spotlightTrap[xMetric]);
              const y2 = toScreenY(spotlightTrap[yMetric]);
              return (
                <g key={`dom-${dom.id}`}>
                  {/* Shaded domination rectangle */}
                  <rect
                    x={Math.min(x1, x2)}
                    y={Math.min(y1, y2)}
                    width={Math.abs(x2 - x1)}
                    height={Math.abs(y2 - y1)}
                    fill="#f43f5e"
                    opacity={0.1}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </g>
              );
            })}

          {/* Step 5: Live "Max Utility" Iso-Curve */}
          {activeStep === 5 && isoUtilityPath && (
            <g>
              <path
                id="pareto-isoutility-curve"
                d={isoUtilityPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2.5}
              />
              <text dy="-6" className="fill-amber-300 text-[11px] font-bold">
                <textPath href="#pareto-isoutility-curve" startOffset="12%">
                  Optimal Value Boundary (Your Priorities)
                </textPath>
              </text>
            </g>
          )}

          {/* GPU Nodes */}
          {gpus.map((gpu) => {
            const is2DFrontier =
              pareto2DMap.get(gpu.id)?.isParetoOptimal ?? false;
            const isActiveFrontier =
              paretoActiveMap.get(gpu.id)?.isParetoOptimal ?? false;
            const isBestWinner =
              activeStep === 5 && bestChoice?.gpu.id === gpu.id;
            const isStep1Top = activeStep === 1 && step1Leader?.id === gpu.id;
            const isSpotlightTrap =
              activeStep === 3 && spotlightTrap?.id === gpu.id;
            const isSpotlightDom =
              activeStep === 3 &&
              spotlightDominators.some((d) => d.id === gpu.id);

            // Hide traps when onlyFrontier is toggled in Step 4
            if (activeStep === 4 && onlyFrontier && !is2DFrontier) {
              return null;
            }

            const cx =
              activeStep === 1
                ? toStep1ScreenX(gpu[yMetric])
                : toScreenX(gpu[xMetric]);
            const cy = activeStep === 1 ? svgH / 2 : toScreenY(gpu[yMetric]);

            // Opacity based on step focus
            let opacity = 0.9;
            if (activeStep === 3) {
              opacity = isSpotlightTrap || isSpotlightDom ? 1.0 : 0.18;
            } else if (activeStep === 4) {
              opacity = is2DFrontier ? 1.0 : 0.25;
            } else if (activeStep === 5) {
              opacity = isBestWinner ? 1.0 : isActiveFrontier ? 0.92 : 0.22;
            }

            // Node color & radius
            let fill = '#38bdf8';
            let stroke = '#0f172a';
            let radius = 7;

            if (isBestWinner || isStep1Top) {
              fill = '#fbbf24';
              stroke = '#ffffff';
              radius = 12;
            } else if (isSpotlightTrap) {
              fill = '#f43f5e';
              stroke = '#ffffff';
              radius = 11;
            } else if (isSpotlightDom) {
              fill = '#10b981';
              stroke = '#ffffff';
              radius = 10;
            } else if (
              (activeStep >= 4 && is2DFrontier) ||
              (activeStep === 5 && isActiveFrontier)
            ) {
              fill = '#10b981';
              stroke = '#052e16';
              radius = 8.5;
            } else if (activeStep >= 3 && !is2DFrontier) {
              fill = '#f43f5e';
            }

            const showLabel =
              isBestWinner ||
              isStep1Top ||
              isSpotlightTrap ||
              isSpotlightDom ||
              hoveredId === gpu.id;

            return (
              <g
                key={gpu.id}
                style={{
                  transition: 'all 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                  opacity,
                }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(gpu.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onToggleSelectGpu(gpu.id)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isBestWinner || isSpotlightTrap ? 2.5 : 1.5}
                  filter={
                    isBestWinner || isStep1Top
                      ? 'url(#pareto-gold-glow)'
                      : undefined
                  }
                />
                {showLabel && (
                  <text
                    x={cx}
                    y={cy - radius - 5}
                    textAnchor="middle"
                    className={`text-[10px] font-bold pointer-events-none ${
                      isBestWinner || isStep1Top
                        ? 'fill-amber-300'
                        : isSpotlightTrap
                          ? 'fill-rose-300'
                          : 'fill-slate-200'
                    }`}
                  >
                    {gpu.name.replace('GeForce ', '').replace('Radeon ', '')} (
                    {formatCurrency(gpu.price, currency)})
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Inspector Pill */}
        {hoveredGpu && (
          <div className="absolute bottom-3 right-3 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
            <div className="font-bold text-white">
              {hoveredGpu.name}{' '}
              <span className="text-emerald-400">${hoveredGpu.price}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {xDef.shortLabel}:{' '}
              <strong>
                {hoveredGpu[xMetric]} {xDef.unit}
              </strong>{' '}
              • {yDef.shortLabel}:{' '}
              <strong>
                {hoveredGpu[yMetric]} {yDef.unit}
              </strong>{' '}
              • VRAM: <strong>{hoveredGpu.vramGb} GB</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
