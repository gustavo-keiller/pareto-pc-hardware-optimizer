import type React from 'react';
import {
  HyperDimKey,
  HyperDimDefinition,
  HyperEvaluatedItem,
} from './hyperTypes';

export interface RadVizGravityArenaProps {
  activeDims: HyperDimDefinition[];
  gravityBoost: Record<HyperDimKey, number>;
  setGravityBoost: React.Dispatch<
    React.SetStateAction<Record<HyperDimKey, number>>
  >;
  hyperEvaluated: HyperEvaluatedItem[];
  effectiveHideTraps: boolean;
  inspectedItem: HyperEvaluatedItem | null;
  svgW: number;
  svgH: number;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export function RadVizGravityArena({
  activeDims,
  gravityBoost,
  setGravityBoost,
  hyperEvaluated,
  effectiveHideTraps,
  inspectedItem,
  svgW,
  svgH,
  onHoverGpu,
  onToggleSelectGpu,
}: RadVizGravityArenaProps) {
  const cx = svgW / 2;
  const cy = svgH / 2;
  const arenaR = Math.min(svgW, svgH) * 0.37;
  const K = activeDims.length;

  const anchors = activeDims.map((dim, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
    return {
      dim,
      angle,
      ax: cx + arenaR * Math.cos(angle),
      ay: cy + arenaR * Math.sin(angle),
      lx: cx + (arenaR + 34) * Math.cos(angle),
      ly: cy + (arenaR + 24) * Math.sin(angle),
    };
  });

  const radvizPoints = hyperEvaluated.map((item) => {
    let sumWx = 0;
    let sumWy = 0;
    let sumW = 0;
    for (const anc of anchors) {
      const boost = gravityBoost[anc.dim.key] || 1;
      const pull = boost * (0.05 + 0.95 * item.utilities[anc.dim.key]);
      sumWx += pull * Math.cos(anc.angle);
      sumWy += pull * Math.sin(anc.angle);
      sumW += pull;
    }
    const normX = sumW > 0 ? sumWx / sumW : 0;
    const normY = sumW > 0 ? sumWy / sumW : 0;
    const px = cx + normX * arenaR * 1.25;
    const py = cy + normY * arenaR * 1.25;
    return {
      ...item,
      px,
      py,
    };
  });

  const inspectedRadPoint = radvizPoints.find(
    (p) => p.gpu.id === (inspectedItem?.gpu.id ?? ''),
  );

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
          <span className="text-slate-300">
            <strong>
              How to read the {activeDims.length}D RadViz Gravity Arena:
            </strong>{' '}
            All {activeDims.length} dimensions sit on the perimeter ring as{' '}
            <strong className="text-amber-300">Gravity Anchors</strong>. Every
            GPU is pulled by {activeDims.length} springs toward the specs where
            it excels! Click any perimeter anchor below to boost its gravity (
            <code className="text-amber-300">1× → 2× → 3×</code>).
          </span>
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto select-none"
        >
          {/* Concentric Arena Rings */}
          {[0.33, 0.66, 1.0].map((f) => (
            <circle
              key={`ring-${f}`}
              cx={cx}
              cy={cy}
              r={arenaR * f}
              fill="none"
              stroke="#1e293b"
              strokeWidth={f === 1 ? 2 : 1}
              strokeDasharray={f === 1 ? undefined : '4 4'}
            />
          ))}

          {/* Axis Spokes from Center to Perimeter Anchors */}
          {anchors.map((anc) => (
            <line
              key={`spoke-${anc.dim.key}`}
              x1={cx}
              y1={cy}
              x2={anc.ax}
              y2={anc.ay}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}

          {/* Spring Tension Lines */}
          {inspectedRadPoint &&
            anchors.map((anc) => {
              const u = inspectedRadPoint.utilities[anc.dim.key];
              return (
                <g key={`spring-${anc.dim.key}`}>
                  <line
                    x1={inspectedRadPoint.px}
                    y1={inspectedRadPoint.py}
                    x2={anc.ax}
                    y2={anc.ay}
                    stroke={anc.dim.color}
                    strokeWidth={1 + u * 4}
                    strokeDasharray="4 2"
                    opacity={0.8}
                  />
                </g>
              );
            })}

          {/* Perimeter Gravity Anchor Nodes */}
          {anchors.map((anc) => {
            const boost = gravityBoost[anc.dim.key] || 1;
            return (
              <g
                key={`anc-${anc.dim.key}`}
                className="cursor-pointer"
                onClick={() =>
                  setGravityBoost((prev) => ({
                    ...prev,
                    [anc.dim.key]:
                      prev[anc.dim.key] >= 3 ? 1 : prev[anc.dim.key] + 1,
                  }))
                }
              >
                <circle
                  cx={anc.ax}
                  cy={anc.ay}
                  r={10 + boost * 3}
                  fill={anc.dim.color}
                  fillOpacity={0.25}
                  stroke={anc.dim.color}
                  strokeWidth={2.5}
                />
                <text
                  x={anc.ax}
                  y={anc.ay + 4}
                  textAnchor="middle"
                  className="fill-white font-mono text-[10px] font-black"
                >
                  {boost}×
                </text>
                <text
                  x={anc.lx}
                  y={anc.ly}
                  textAnchor="middle"
                  className="fill-white text-xs font-extrabold"
                >
                  {anc.dim.shortLabel}
                </text>
              </g>
            );
          })}

          {/* GPU Nodes in RadViz */}
          {radvizPoints.map((pt) => {
            if (effectiveHideTraps && !pt.isNDOptimal) return null;
            const isTop1 = pt.gpu.rank === 1;
            const isInspected = inspectedItem?.gpu.id === pt.gpu.id;
            const fill = isTop1
              ? '#fbbf24'
              : pt.isNDOptimal
                ? '#10b981'
                : '#f43f5e';
            const r = isTop1 || isInspected ? 11 : pt.isNDOptimal ? 8.5 : 6.5;

            return (
              <g
                key={`rv-${pt.gpu.id}`}
                className="cursor-pointer"
                onMouseEnter={() => onHoverGpu(pt.gpu.id)}
                onMouseLeave={() => onHoverGpu(null)}
                onClick={() => onToggleSelectGpu(pt.gpu.id)}
                opacity={pt.passesGates ? 0.95 : 0.15}
              >
                <circle
                  cx={pt.px}
                  cy={pt.py}
                  r={r}
                  fill={fill}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
                <text
                  x={pt.px}
                  y={pt.py - r - 4}
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${
                    isTop1
                      ? 'fill-amber-300'
                      : pt.isNDOptimal
                        ? 'fill-emerald-200'
                        : 'fill-rose-300'
                  }`}
                >
                  {pt.gpu.name.replace('GeForce ', '').replace('Radeon ', '')}{' '}
                  (${pt.gpu.price})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
