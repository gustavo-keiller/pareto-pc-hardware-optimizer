import type React from 'react';
import {
  HyperDimKey,
  HyperDimDefinition,
  HyperEvaluatedItem,
} from './hyperTypes';
import { Sliders, CheckCircle2 } from 'lucide-react';

export interface ParallelDominanceViewProps {
  activeDims: HyperDimDefinition[];
  dimGates: Record<HyperDimKey, number>;
  setDimGates: React.Dispatch<
    React.SetStateAction<Record<HyperDimKey, number>>
  >;
  hyperEvaluated: HyperEvaluatedItem[];
  effectiveHideTraps: boolean;
  selectedGpuIds: string[];
  inspectedItem: HyperEvaluatedItem | null;
  activeDominatorItem: HyperEvaluatedItem | null;
  dimBounds: Record<HyperDimKey, { min: number; max: number; mid: number }>;
  svgW: number;
  svgH: number;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export function ParallelDominanceView({
  activeDims,
  dimGates,
  setDimGates,
  hyperEvaluated,
  effectiveHideTraps,
  selectedGpuIds,
  inspectedItem,
  activeDominatorItem,
  dimBounds,
  svgW,
  svgH,
  onHoverGpu,
  onToggleSelectGpu,
}: ParallelDominanceViewProps) {
  const padL = 70;
  const padR = 70;
  const padT = 48;
  const padB = 56;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const K = activeDims.length;

  const getPillarX = (idx: number) =>
    K <= 1 ? padL + plotW / 2 : padL + (idx / (K - 1)) * plotW;
  const getUtilityY = (u: number) => padT + (1 - u) * plotH;

  let ribbonPoints = '';
  if (inspectedItem && activeDominatorItem) {
    const topPts = activeDims.map((d, i) => {
      const x = getPillarX(i);
      const y = getUtilityY(activeDominatorItem.utilities[d.key]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const botPts = [...activeDims].reverse().map((d, revIdx) => {
      const i = K - 1 - revIdx;
      const x = getPillarX(i);
      const y = getUtilityY(inspectedItem.utilities[d.key]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    ribbonPoints = [...topPts, ...botPts].join(' ');
  }

  return (
    <div className="space-y-3">
      {/* Per-Dimension Gate Sliders */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            N-Dimensional Hypercube Gate Slicers (Set Minimum Standard on Any
            Pillar):
          </span>
          <span className="text-[11px] text-slate-400">
            {hyperEvaluated.filter((i) => i.passesGates).length}/
            {hyperEvaluated.length} GPUs Pass All {activeDims.length} Gates
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {activeDims.map((dim) => (
            <div
              key={`gate-${dim.key}`}
              className="rounded-lg border border-slate-800 bg-slate-950/90 p-2"
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-200 truncate">
                  {dim.shortLabel}
                </span>
                <span className="font-mono font-bold text-indigo-300">
                  ≥{dimGates[dim.key]}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                step={10}
                value={dimGates[dim.key]}
                onChange={(e) =>
                  setDimGates((prev) => ({
                    ...prev,
                    [dim.key]: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
          <span className="text-slate-300">
            <strong>
              How to read {activeDims.length}D Parallel Coordinates:
            </strong>{' '}
            Every vertical pillar is oriented so{' '}
            <strong className="text-emerald-400">
              TOP (100%) = Best in Market
            </strong>{' '}
            and <strong className="text-rose-400">BOTTOM (0%) = Worst</strong>.
            If Green Line A never dips below Red Line B on any pillar,{' '}
            <strong>A strictly dominates B in {activeDims.length}D!</strong>
          </span>
          {inspectedItem && activeDominatorItem && (
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {activeDominatorItem.gpu.name} (${activeDominatorItem.gpu.price})
              is above {inspectedItem.gpu.name} (${inspectedItem.gpu.price}) on
              all {activeDims.length} pillars!
            </span>
          )}
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto select-none"
        >
          {/* Horizontal 0%, 25%, 50%, 75%, 100% Reference Bands */}
          {[0, 0.25, 0.5, 0.75, 1].map((u) => {
            const y = getUtilityY(u);
            return (
              <g key={`band-${u}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={svgW - padR}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {Math.round(u * 100)}%
                </text>
              </g>
            );
          })}

          {/* N-Dimensional Dominance Proof Ribbon */}
          {ribbonPoints && (
            <polygon
              points={ribbonPoints}
              fill="#10b981"
              opacity={0.18}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* GPU Polylines */}
          {hyperEvaluated.map((item) => {
            if (effectiveHideTraps && !item.isNDOptimal) return null;

            const isInspected = inspectedItem?.gpu.id === item.gpu.id;
            const isDominator = activeDominatorItem?.gpu.id === item.gpu.id;
            const isSelected = selectedGpuIds.includes(item.gpu.id);
            const isTop1 = item.gpu.rank === 1;

            const pathD = activeDims
              .map((d, i) => {
                const x = getPillarX(i);
                const y = getUtilityY(item.utilities[d.key]);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');

            let stroke = item.isNDOptimal ? '#10b981' : '#f43f5e';
            let strokeWidth = item.isNDOptimal ? 2.2 : 1.4;
            let opacity = item.passesGates
              ? item.isNDOptimal
                ? 0.75
                : 0.35
              : 0.08;

            if (isTop1) {
              stroke = '#fbbf24';
              strokeWidth = 3.5;
              opacity = 1.0;
            }
            if (isSelected) {
              stroke = '#38bdf8';
              strokeWidth = 3.2;
              opacity = 0.95;
            }
            if (inspectedItem) {
              if (isInspected) {
                stroke = item.isNDOptimal ? '#fbbf24' : '#f43f5e';
                strokeWidth = 4;
                opacity = 1.0;
              } else if (isDominator) {
                stroke = '#10b981';
                strokeWidth = 4;
                opacity = 1.0;
              } else {
                opacity = 0.12;
              }
            }

            return (
              <g
                key={item.gpu.id}
                className="cursor-pointer"
                onMouseEnter={() => onHoverGpu(item.gpu.id)}
                onMouseLeave={() => onHoverGpu(null)}
                onClick={() => onToggleSelectGpu(item.gpu.id)}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Vertex Dots on each Pillar */}
                {(isInspected || isDominator || isTop1 || isSelected) &&
                  activeDims.map((d, i) => {
                    const cx = getPillarX(i);
                    const cy = getUtilityY(item.utilities[d.key]);
                    return (
                      <g key={`${item.gpu.id}-${d.key}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isInspected || isDominator ? 5.5 : 4}
                          fill={stroke}
                          stroke="#0f172a"
                          strokeWidth={1.5}
                        />
                        {(isInspected || isDominator) && (
                          <text
                            x={cx + (isDominator ? -8 : 8)}
                            y={cy - 6}
                            textAnchor={isDominator ? 'end' : 'start'}
                            className={`font-mono text-[10px] font-bold ${
                              isDominator ? 'fill-emerald-300' : 'fill-rose-300'
                            }`}
                          >
                            {d.formatValue(d.getValue(item.gpu))}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            );
          })}

          {/* Pillars and Axis Info */}
          {activeDims.map((dim, i) => {
            const x = getPillarX(i);
            const b = dimBounds[dim.key];
            const bestRaw = dim.direction === 'min' ? b.min : b.max;
            const worstRaw = dim.direction === 'min' ? b.max : b.min;
            const gatePct = dimGates[dim.key];
            const gateY = getUtilityY(gatePct / 100);

            return (
              <g key={dim.key}>
                {gatePct > 0 && (
                  <rect
                    x={x - 14}
                    y={gateY}
                    width={28}
                    height={padT + plotH - gateY}
                    fill="#f43f5e"
                    opacity={0.22}
                    rx={4}
                  />
                )}

                <line
                  x1={x}
                  y1={padT}
                  x2={x}
                  y2={padT + plotH}
                  stroke={dim.color}
                  strokeWidth={2.5}
                  opacity={0.75}
                />

                <text
                  x={x}
                  y={18}
                  textAnchor="middle"
                  className="fill-white text-[11px] font-extrabold"
                >
                  {dim.shortLabel}
                </text>

                <text
                  x={x}
                  y={padT - 8}
                  textAnchor="middle"
                  className="fill-emerald-400 font-mono text-[10px] font-bold"
                >
                  {dim.formatValue(bestRaw)}
                </text>

                <text
                  x={x}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {dim.formatValue(worstRaw)}
                </text>

                <text
                  x={x}
                  y={padT + plotH + 30}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] uppercase font-bold"
                >
                  {dim.direction === 'min'
                    ? '↑ Lower is Better'
                    : '↑ Higher is Better'}
                </text>

                {gatePct > 0 && (
                  <g>
                    <line
                      x1={x - 18}
                      y1={gateY}
                      x2={x + 18}
                      y2={gateY}
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                    />
                    <text
                      x={x}
                      y={gateY - 4}
                      textAnchor="middle"
                      className="fill-rose-300 font-mono text-[9px] font-bold"
                    >
                      Gate ≥{gatePct}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
