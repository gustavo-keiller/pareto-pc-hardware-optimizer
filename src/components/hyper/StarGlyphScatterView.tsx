import {
  HyperDimKey,
  HyperDimDefinition,
  HyperEvaluatedItem,
} from './hyperTypes';

export interface StarGlyphScatterViewProps {
  activeDims: HyperDimDefinition[];
  dimBounds: Record<HyperDimKey, { min: number; max: number; mid: number }>;
  hyperEvaluated: HyperEvaluatedItem[];
  effectiveHideTraps: boolean;
  inspectedItem: HyperEvaluatedItem | null;
  svgW: number;
  svgH: number;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export function StarGlyphScatterView({
  activeDims,
  dimBounds,
  hyperEvaluated,
  effectiveHideTraps,
  inspectedItem,
  svgW,
  svgH,
  onHoverGpu,
  onToggleSelectGpu,
}: StarGlyphScatterViewProps) {
  const padL = 68;
  const padR = 230;
  const padT = 38;
  const padB = 50;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const pBounds = dimBounds.price;
  const fBounds = dimBounds.rasterFps1440p;

  const toX = (price: number) =>
    padL + ((price - pBounds.min) / (pBounds.max - pBounds.min || 1)) * plotW;
  const toY = (fps: number) =>
    padT +
    plotH -
    ((fps - fBounds.min) / (fBounds.max - fBounds.min || 1)) * plotH;

  const K = activeDims.length;
  const maxGlyphRadius = 22;
  const minGlyphRadius = 4;

  const buildGlyphPolygon = (
    cx: number,
    cy: number,
    utilities: Record<HyperDimKey, number>,
    scale = 1,
  ) => {
    return activeDims
      .map((dim, idx) => {
        const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
        const r =
          (minGlyphRadius +
            utilities[dim.key] * (maxGlyphRadius - minGlyphRadius)) *
          scale;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(' ');
  };

  const legendCx = svgW - 115;
  const legendCy = 155;
  const legendR = 68;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
        <span className="text-slate-300">
          <strong>
            How to read the {activeDims.length}D Star-Glyph Scatter:
          </strong>{' '}
          Each GPU is positioned at <strong>(Price $, 1440p FPS)</strong>, while
          its body is a{' '}
          <strong className="text-emerald-300">
            {activeDims.length}-Pointed Radar Star Polygon
          </strong>{' '}
          showing all {activeDims.length} dimensions at once! A large, full
          polygon = strong across every spec; a pinched spike = weak in that
          ray&apos;s direction.
        </span>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto select-none"
      >
        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yVal = Math.round(
            fBounds.min + t * (fBounds.max - fBounds.min),
          );
          const sy = toY(yVal);
          const xVal = Math.round(
            pBounds.min + t * (pBounds.max - pBounds.min),
          );
          const sx = toX(xVal);
          return (
            <g key={`grid-${t}`}>
              <line
                x1={padL}
                y1={sy}
                x2={padL + plotW}
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
                {yVal} FPS
              </text>
              <line
                x1={sx}
                y1={padT}
                x2={sx}
                y2={padT + plotH}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
              <text
                x={sx}
                y={padT + plotH + 18}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[10px]"
              >
                ${xVal}
              </text>
            </g>
          );
        })}

        <text
          x={padL + plotW / 2}
          y={svgH - 10}
          textAnchor="middle"
          className="fill-emerald-400 text-xs font-bold"
        >
          Base Axis: Street Price ($) — Left is Cheaper
        </text>

        {/* Plot Each GPU as a Multi-Ray Star Polygon Glyph */}
        {hyperEvaluated.map((item) => {
          if (effectiveHideTraps && !item.isNDOptimal) return null;
          const cx = toX(item.gpu.price);
          const cy = toY(item.gpu.rasterFps1440p);
          const isTop1 = item.gpu.rank === 1;
          const isInspected = inspectedItem?.gpu.id === item.gpu.id;
          const strokeColor = isTop1
            ? '#fbbf24'
            : item.isNDOptimal
              ? '#10b981'
              : '#f43f5e';

          const polyPts = buildGlyphPolygon(
            cx,
            cy,
            item.utilities,
            isInspected || isTop1 ? 1.25 : 1.0,
          );

          return (
            <g
              key={item.gpu.id}
              className="cursor-pointer"
              onMouseEnter={() => onHoverGpu(item.gpu.id)}
              onMouseLeave={() => onHoverGpu(null)}
              onClick={() => onToggleSelectGpu(item.gpu.id)}
              opacity={item.passesGates ? 0.95 : 0.15}
            >
              <circle
                cx={cx}
                cy={cy}
                r={maxGlyphRadius * (isInspected ? 1.25 : 1.0)}
                fill="none"
                stroke="#334155"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              {activeDims.map((dim, idx) => {
                const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
                const rx =
                  cx +
                  maxGlyphRadius * (isInspected ? 1.25 : 1) * Math.cos(angle);
                const ry =
                  cy +
                  maxGlyphRadius * (isInspected ? 1.25 : 1) * Math.sin(angle);
                return (
                  <line
                    key={`${item.gpu.id}-ray-${dim.key}`}
                    x1={cx}
                    y1={cy}
                    x2={rx}
                    y2={ry}
                    stroke="#334155"
                    strokeWidth={0.8}
                  />
                );
              })}
              <polygon
                points={polyPts}
                fill={strokeColor}
                fillOpacity={isInspected || isTop1 ? 0.45 : 0.28}
                stroke={strokeColor}
                strokeWidth={isInspected || isTop1 ? 2.4 : 1.6}
              />
              <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
              <text
                x={cx}
                y={cy - maxGlyphRadius - 6}
                textAnchor="middle"
                className={`text-[10px] font-bold ${
                  isTop1
                    ? 'fill-amber-300'
                    : item.isNDOptimal
                      ? 'fill-emerald-300'
                      : 'fill-rose-300'
                }`}
              >
                {item.gpu.name.replace('GeForce ', '').replace('Radeon ', '')}
              </text>
            </g>
          );
        })}

        {/* Right Sidebar: Live Enlarged Star-Glyph Compass */}
        <g>
          <rect
            x={svgW - 218}
            y={16}
            width={206}
            height={svgH - 32}
            rx={14}
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth={1.5}
          />
          <text
            x={legendCx}
            y={38}
            textAnchor="middle"
            className="fill-amber-300 text-[11px] font-extrabold uppercase"
          >
            {activeDims.length}D Star-Glyph Compass
          </text>

          {/* Compass Web Rings */}
          {[0.33, 0.66, 1.0].map((rFrac) => (
            <circle
              key={`web-${rFrac}`}
              cx={legendCx}
              cy={legendCy}
              r={legendR * rFrac}
              fill="none"
              stroke="#1e293b"
              strokeDasharray="2 2"
            />
          ))}

          {/* Compass Ray Axes */}
          {activeDims.map((dim, idx) => {
            const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
            const ex = legendCx + legendR * Math.cos(angle);
            const ey = legendCy + legendR * Math.sin(angle);
            const lx = legendCx + (legendR + 18) * Math.cos(angle);
            const ly = legendCy + (legendR + 18) * Math.sin(angle);
            return (
              <g key={`compass-${dim.key}`}>
                <line
                  x1={legendCx}
                  y1={legendCy}
                  x2={ex}
                  y2={ey}
                  stroke={dim.color}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
                <text
                  x={lx}
                  y={ly + 3}
                  textAnchor="middle"
                  className="fill-slate-200 text-[9px] font-bold"
                >
                  {dim.shortLabel}
                </text>
              </g>
            );
          })}

          {/* Overlay Inspected GPU inside Compass */}
          {(() => {
            const target =
              inspectedItem ??
              hyperEvaluated.find((i) => i.gpu.rank === 1) ??
              hyperEvaluated[0];
            if (!target) return null;

            const compassPts = activeDims
              .map((dim, idx) => {
                const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
                const r = (0.1 + 0.9 * target.utilities[dim.key]) * legendR;
                return `${(legendCx + r * Math.cos(angle)).toFixed(1)},${(legendCy + r * Math.sin(angle)).toFixed(1)}`;
              })
              .join(' ');

            return (
              <>
                <polygon
                  points={compassPts}
                  fill={target.isNDOptimal ? '#10b981' : '#f43f5e'}
                  fillOpacity={0.35}
                  stroke={target.isNDOptimal ? '#10b981' : '#f43f5e'}
                  strokeWidth={2.5}
                />
                <text
                  x={legendCx}
                  y={268}
                  textAnchor="middle"
                  className="fill-white text-xs font-extrabold"
                >
                  {target.gpu.name}
                </text>
                <text
                  x={legendCx}
                  y={284}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${
                    target.isNDOptimal ? 'fill-emerald-400' : 'fill-rose-400'
                  }`}
                >
                  ${target.gpu.price} •{' '}
                  {target.isNDOptimal
                    ? `${activeDims.length}D Pareto Optimal`
                    : `${activeDims.length}D Dominated Trap`}
                </text>
                {activeDims.map((dim, idx) => (
                  <text
                    key={`stat-${dim.key}`}
                    x={legendCx - 85}
                    y={308 + idx * 17}
                    className="fill-slate-300 font-mono text-[10px]"
                  >
                    • {dim.shortLabel}:{' '}
                    <tspan className="fill-white font-bold">
                      {dim.formatValue(dim.getValue(target.gpu))}
                    </tspan>{' '}
                    ({Math.round(target.utilities[dim.key] * 100)}%)
                  </text>
                ))}
              </>
            );
          })()}
        </g>
      </svg>
    </div>
  );
}
