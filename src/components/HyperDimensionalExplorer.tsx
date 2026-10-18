import { useMemo, useState } from 'react';
import { RankedGpu } from '../lib/math/types';
import {
  Sliders,
  EyeOff,
  Eye,
  RotateCcw,
  Activity,
  Hexagon,
  Orbit,
  Search,
  CheckCircle2,
} from 'lucide-react';

export type HyperDimKey =
  | 'price'
  | 'rasterFps1440p'
  | 'rtFps1440p'
  | 'vramGb'
  | 'tdpWatts'
  | 'fpsPerDollar'
  | 'fpsPerWatt';

interface HyperDimDefinition {
  key: HyperDimKey;
  label: string;
  shortLabel: string;
  unit: string;
  direction: 'min' | 'max';
  color: string;
  getValue: (gpu: RankedGpu) => number;
  formatValue: (val: number) => string;
}

export const HYPER_DIMENSIONS: HyperDimDefinition[] = [
  {
    key: 'price',
    label: 'Lower Price ($)',
    shortLabel: 'Price ($)',
    unit: '$',
    direction: 'min',
    color: '#10b981',
    getValue: (g) => g.price,
    formatValue: (v) => `$${Math.round(v)}`,
  },
  {
    key: 'rasterFps1440p',
    label: '1440p Raster FPS',
    shortLabel: '1440p FPS',
    unit: 'FPS',
    direction: 'max',
    color: '#38bdf8',
    getValue: (g) => g.rasterFps1440p,
    formatValue: (v) => `${Math.round(v)} FPS`,
  },
  {
    key: 'rtFps1440p',
    label: '1440p Ray Tracing',
    shortLabel: 'Ray Tracing',
    unit: 'FPS',
    direction: 'max',
    color: '#a855f7',
    getValue: (g) => g.rtFps1440p,
    formatValue: (v) => `${Math.round(v)} FPS`,
  },
  {
    key: 'vramGb',
    label: 'VRAM Capacity',
    shortLabel: 'VRAM (GB)',
    unit: 'GB',
    direction: 'max',
    color: '#f59e0b',
    getValue: (g) => g.vramGb,
    formatValue: (v) => `${Math.round(v)} GB`,
  },
  {
    key: 'tdpWatts',
    label: 'Low Power Draw',
    shortLabel: 'Power (W)',
    unit: 'W',
    direction: 'min',
    color: '#2dd4bf',
    getValue: (g) => g.tdpWatts,
    formatValue: (v) => `${Math.round(v)}W`,
  },
  {
    key: 'fpsPerDollar',
    label: 'Value (FPS / $100)',
    shortLabel: 'FPS / $100',
    unit: 'FPS/$100',
    direction: 'max',
    color: '#ec4899',
    getValue: (g) =>
      g.price > 0 ? Number(((g.rasterFps1440p / g.price) * 100).toFixed(1)) : 0,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  {
    key: 'fpsPerWatt',
    label: 'Efficiency (FPS / 100W)',
    shortLabel: 'FPS / 100W',
    unit: 'FPS/100W',
    direction: 'max',
    color: '#84cc16',
    getValue: (g) =>
      g.tdpWatts > 0
        ? Number(((g.rasterFps1440p / g.tdpWatts) * 100).toFixed(1))
        : 0,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
];

type HyperProjectionMode = 'parallel' | 'glyph' | 'radviz';

interface HyperDimensionalExplorerProps {
  gpus: RankedGpu[];
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded: boolean;
  hideDominatedNodes: boolean;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export function HyperDimensionalExplorer({
  gpus,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded,
  hideDominatedNodes,
  onHoverGpu,
  onToggleSelectGpu,
}: HyperDimensionalExplorerProps) {
  const [projection, setProjection] = useState<HyperProjectionMode>('parallel');

  // Active dimensions (defaults to 6 dimensions so it's immediately >3D!)
  const [activeDimKeys, setActiveDimKeys] = useState<HyperDimKey[]>([
    'price',
    'rasterFps1440p',
    'rtFps1440p',
    'vramGb',
    'tdpWatts',
    'fpsPerDollar',
  ]);

  // Per-dimension minimum utility gates (0 to 80%) for N-dimensional hypercube slicing
  const [dimGates, setDimGates] = useState<Record<HyperDimKey, number>>({
    price: 0,
    rasterFps1440p: 0,
    rtFps1440p: 0,
    vramGb: 0,
    tdpWatts: 0,
    fpsPerDollar: 0,
    fpsPerWatt: 0,
  });

  // Per-dimension gravity boost for RadViz (1x, 2x, 3x)
  const [gravityBoost, setGravityBoost] = useState<Record<HyperDimKey, number>>({
    price: 1,
    rasterFps1440p: 1,
    rtFps1440p: 1,
    vramGb: 1,
    tdpWatts: 1,
    fpsPerDollar: 1,
    fpsPerWatt: 1,
  });

  // Pinned trap ID to demonstrate N-D dominance ribbon
  const [pinnedTrapId, setPinnedTrapId] = useState<string | null>(null);
  const [localHideTraps, setLocalHideTraps] = useState<boolean>(false);

  const effectiveHideTraps = hideDominatedNodes || localHideTraps;

  const activeDims = useMemo(
    () => HYPER_DIMENSIONS.filter((d) => activeDimKeys.includes(d.key)),
    [activeDimKeys]
  );

  // Compute min/max bounds for all 7 dimensions
  const dimBounds = useMemo(() => {
    const map = {} as Record<
      HyperDimKey,
      { min: number; max: number; mid: number }
    >;
    for (const dim of HYPER_DIMENSIONS) {
      if (gpus.length === 0) {
        map[dim.key] = { min: 0, max: 100, mid: 50 };
      } else {
        const vals = gpus.map((g) => dim.getValue(g));
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        map[dim.key] = { min, max, mid: (min + max) / 2 };
      }
    }
    return map;
  }, [gpus]);

  // Compute normalized directional utility u_{i, d} in [0, 1] where 1.0 = Best in Market
  // and evaluate exact N-Dimensional Pareto Dominance across `activeDims`!
  const hyperEvaluated = useMemo(() => {
    const utilitiesById = new Map<string, Record<HyperDimKey, number>>();

    for (const gpu of gpus) {
      const uRecord = {} as Record<HyperDimKey, number>;
      for (const dim of HYPER_DIMENSIONS) {
        const { min, max } = dimBounds[dim.key];
        const val = dim.getValue(gpu);
        const span = max - min;
        if (span <= 1e-9) {
          uRecord[dim.key] = 1.0;
        } else {
          const raw =
            dim.direction === 'min' ? (max - val) / span : (val - min) / span;
          uRecord[dim.key] = Math.max(0, Math.min(1, raw));
        }
      }
      utilitiesById.set(gpu.id, uRecord);
    }

    // Check N-Dimensional Pareto Dominance across `activeDims`:
    // A dominates B iff u_A[d] >= u_B[d] for ALL activeDims AND u_A[d] > u_B[d] for AT LEAST ONE activeDim
    const dominatorsById = new Map<string, RankedGpu[]>();
    for (const b of gpus) {
      const uB = utilitiesById.get(b.id)!;
      const dominators: RankedGpu[] = [];

      for (const a of gpus) {
        if (a.id === b.id) continue;
        const uA = utilitiesById.get(a.id)!;
        let allAtLeastAsGood = true;
        let strictlyBetterInOne = false;

        for (const dim of activeDims) {
          const va = uA[dim.key];
          const vb = uB[dim.key];
          if (va + 1e-9 < vb) {
            allAtLeastAsGood = false;
            break;
          }
          if (va > vb + 1e-9) {
            strictlyBetterInOne = true;
          }
        }

        if (allAtLeastAsGood && strictlyBetterInOne) {
          dominators.push(a);
        }
      }
      dominatorsById.set(b.id, dominators);
    }

    return gpus.map((gpu) => {
      const u = utilitiesById.get(gpu.id)!;
      const dominators = dominatorsById.get(gpu.id) ?? [];
      const isNDOptimal = dominators.length === 0;

      // Check if gpu passes all active dimension gates
      const passesGates = activeDims.every(
        (d) => u[d.key] * 100 + 1e-6 >= dimGates[d.key]
      );

      // Average hyper-utility across active dimensions (weighted by gravityBoost)
      let weightedSum = 0;
      let weightTotal = 0;
      for (const d of activeDims) {
        const w = gravityBoost[d.key] || 1;
        weightedSum += w * u[d.key];
        weightTotal += w;
      }
      const hyperScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

      return {
        gpu,
        utilities: u,
        dominators,
        isNDOptimal,
        passesGates,
        hyperScore,
      };
    });
  }, [gpus, dimBounds, activeDims, dimGates, gravityBoost]);

  const ndOptimalList = useMemo(
    () => hyperEvaluated.filter((item) => item.isNDOptimal),
    [hyperEvaluated]
  );
  const ndTrapList = useMemo(
    () => hyperEvaluated.filter((item) => !item.isNDOptimal),
    [hyperEvaluated]
  );

  // Active inspected GPU (either hovered or pinned trap)
  const inspectedItem = useMemo(() => {
    const targetId = hoveredGpuId ?? pinnedTrapId;
    if (!targetId) return null;
    return hyperEvaluated.find((item) => item.gpu.id === targetId) ?? null;
  }, [hyperEvaluated, hoveredGpuId, pinnedTrapId]);

  // If the inspected GPU is an N-D Trap, pick its #1 best dominator to draw the N-D Dominance Ribbon!
  const activeDominatorItem = useMemo(() => {
    if (!inspectedItem || inspectedItem.isNDOptimal) return null;
    const firstDom = inspectedItem.dominators[0];
    if (!firstDom) return null;
    return hyperEvaluated.find((item) => item.gpu.id === firstDom.id) ?? null;
  }, [inspectedItem, hyperEvaluated]);

  const handleToggleDimension = (key: HyperDimKey) => {
    setActiveDimKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 3) return prev; // Keep at least 3 dimensions
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleResetGates = () => {
    setDimGates({
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
      fpsPerDollar: 0,
      fpsPerWatt: 0,
    });
    setGravityBoost({
      price: 1,
      rasterFps1440p: 1,
      rtFps1440p: 1,
      vramGb: 1,
      tdpWatts: 1,
      fpsPerDollar: 1,
      fpsPerWatt: 1,
    });
    setPinnedTrapId(null);
  };

  // SVG Canvas Dimensions
  const svgW = 860;
  const svgH = isExpanded ? 560 : 440;

  return (
    <div className="mt-3 space-y-4">
      {/* Top N-Dimensional Header & Projection Mode Switcher */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-slate-900 to-emerald-500/10 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/20 border border-indigo-400/40 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-indigo-300">
                {activeDims.length}D Hyper-Space Active
              </span>
              <span className="text-xs font-bold text-white">
                Comparing {activeDims.length} Hardware Dimensions Simultaneously
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              In <strong>{activeDims.length}D space</strong>, a GPU is a trap{' '}
              <em>only</em> if another GPU beats it on{' '}
              <strong>all {activeDims.length} selected dimensions at once</strong>:{' '}
              <span className="text-emerald-400 font-bold">
                {ndOptimalList.length} {activeDims.length}D-Optimal Survivors
              </span>{' '}
              vs.{' '}
              <span className="text-rose-400 font-bold">
                {ndTrapList.length} Strictly Dominated {activeDims.length}D Traps
              </span>
              .
            </p>
          </div>

          {/* 3 N-Dimensional Projection Switchers */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setProjection('parallel')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-bold transition ${
                  projection === 'parallel'
                    ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                1. {activeDims.length}D Parallel Dominance
              </button>
              <button
                type="button"
                onClick={() => setProjection('glyph')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-bold transition ${
                  projection === 'glyph'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hexagon className="h-3.5 w-3.5" />
                2. {activeDims.length}D Star-Glyph Scatter
              </button>
              <button
                type="button"
                onClick={() => setProjection('radviz')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-bold transition ${
                  projection === 'radviz'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Orbit className="h-3.5 w-3.5" />
                3. {activeDims.length}D RadViz Gravity Arena
              </button>
            </div>
          </div>
        </div>

        {/* Active Dimension Pill Toggles (Choose any 3 to 7 dimensions!) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">
              Toggle Dimensions ({activeDims.length}/7):
            </span>
            {HYPER_DIMENSIONS.map((dim) => {
              const isActive = activeDimKeys.includes(dim.key);
              return (
                <button
                  key={dim.key}
                  type="button"
                  onClick={() => handleToggleDimension(dim.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    isActive
                      ? 'border-slate-600 bg-slate-800 text-white shadow-sm'
                      : 'border-slate-800/70 bg-slate-950/60 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isActive ? dim.color : '#475569',
                    }}
                  />
                  {dim.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLocalHideTraps((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                effectiveHideTraps
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {effectiveHideTraps ? (
                <>
                  <Eye className="h-3 w-3" /> Show {ndTrapList.length} Traps
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" /> Hide {ndTrapList.length} Traps
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleResetGates}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" /> Reset Gates
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Trap Proof Selector Bar */}
      {ndTrapList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold text-rose-300">
              <Search className="h-3.5 w-3.5" />
              Prove {activeDims.length}D Dominance Ribbon:
            </span>
            <span className="text-slate-300">
              Click a dominated trap to see the GPU that beats it across{' '}
              <strong>all {activeDims.length} dimensions at once</strong>:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ndTrapList.map((trapItem) => {
              const isPinned = pinnedTrapId === trapItem.gpu.id;
              return (
                <button
                  key={trapItem.gpu.id}
                  type="button"
                  onClick={() =>
                    setPinnedTrapId((prev) =>
                      prev === trapItem.gpu.id ? null : trapItem.gpu.id
                    )
                  }
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
                    isPinned
                      ? 'border-rose-400 bg-rose-500 text-white shadow'
                      : 'border-rose-500/30 bg-slate-950/80 text-rose-300 hover:bg-rose-500/20'
                  }`}
                >
                  {trapItem.gpu.name.replace('GeForce ', '').replace('Radeon ', '')}{' '}
                  (${trapItem.gpu.price})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PROJECTION 1: N-DIMENSIONAL PARALLEL DOMINANCE COORDINATES */}
      {projection === 'parallel' && (
        <div className="space-y-3">
          {/* Per-Dimension Gate Sliders (N-Dimensional Hypercube Slicing) */}
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
                <strong>How to read {activeDims.length}D Parallel Coordinates:</strong>{' '}
                Every vertical pillar is oriented so{' '}
                <strong className="text-emerald-400">
                  TOP (100%) = Best in Market
                </strong>{' '}
                and{' '}
                <strong className="text-rose-400">
                  BOTTOM (0%) = Worst
                </strong>
                . If Green Line A never dips below Red Line B on any pillar,{' '}
                <strong>A strictly dominates B in {activeDims.length}D!</strong>
              </span>
              {inspectedItem && activeDominatorItem && (
                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {activeDominatorItem.gpu.name} (${activeDominatorItem.gpu.price})
                  is above {inspectedItem.gpu.name} (${inspectedItem.gpu.price}) on all{' '}
                  {activeDims.length} pillars!
                </span>
              )}
            </div>

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto select-none"
            >
              {(() => {
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

                // Build N-Dimensional Dominance Ribbon polygon between activeDominatorItem and inspectedItem
                let ribbonPoints = '';
                if (inspectedItem && activeDominatorItem) {
                  const topPts = activeDims.map((d, i) => {
                    const x = getPillarX(i);
                    const y = getUtilityY(activeDominatorItem.utilities[d.key]);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  });
                  const botPts = [...activeDims]
                    .reverse()
                    .map((d, revIdx) => {
                      const i = K - 1 - revIdx;
                      const x = getPillarX(i);
                      const y = getUtilityY(inspectedItem.utilities[d.key]);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                  ribbonPoints = [...topPts, ...botPts].join(' ');
                }

                return (
                  <>
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

                    {/* GPU Polylines across all K Dimensions */}
                    {hyperEvaluated.map((item) => {
                      if (effectiveHideTraps && !item.isNDOptimal) return null;

                      const isInspected =
                        inspectedItem?.gpu.id === item.gpu.id;
                      const isDominator =
                        activeDominatorItem?.gpu.id === item.gpu.id;
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
                                        isDominator
                                          ? 'fill-emerald-300'
                                          : 'fill-rose-300'
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

                    {/* Vertical Dimension Pillars, Top/Bottom Value Labels, and Gate Threshold Markers */}
                    {activeDims.map((dim, i) => {
                      const x = getPillarX(i);
                      const b = dimBounds[dim.key];
                      const bestRaw = dim.direction === 'min' ? b.min : b.max;
                      const worstRaw = dim.direction === 'min' ? b.max : b.min;
                      const gatePct = dimGates[dim.key];
                      const gateY = getUtilityY(gatePct / 100);

                      return (
                        <g key={dim.key}>
                          {/* Shaded Unacceptable Gate Region at Bottom of Pillar */}
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

                          {/* Pillar Line */}
                          <line
                            x1={x}
                            y1={padT}
                            x2={x}
                            y2={padT + plotH}
                            stroke={dim.color}
                            strokeWidth={2.5}
                            opacity={0.75}
                          />

                          {/* Pillar Title Header */}
                          <text
                            x={x}
                            y={18}
                            textAnchor="middle"
                            className="fill-white text-[11px] font-extrabold"
                          >
                            {dim.shortLabel}
                          </text>

                          {/* Best Value at Top of Pillar */}
                          <text
                            x={x}
                            y={padT - 8}
                            textAnchor="middle"
                            className="fill-emerald-400 font-mono text-[10px] font-bold"
                          >
                            {dim.formatValue(bestRaw)}
                          </text>

                          {/* Worst Value at Bottom of Pillar */}
                          <text
                            x={x}
                            y={padT + plotH + 16}
                            textAnchor="middle"
                            className="fill-slate-400 font-mono text-[10px]"
                          >
                            {dim.formatValue(worstRaw)}
                          </text>

                          {/* Direction Label at Bottom */}
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

                          {/* Gate Marker Bar */}
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
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* PROJECTION 2: 6D+ STAR-GLYPH HYPER-SCATTER (X × Y × Size × Embedded Multi-Ray Radar Polygon) */}
      {projection === 'glyph' && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
            <span className="text-slate-300">
              <strong>How to read the {activeDims.length}D Star-Glyph Scatter:</strong>{' '}
              Each GPU is positioned at <strong>(Price $, 1440p FPS)</strong>,
              while its body is a{' '}
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
            {(() => {
              const padL = 68;
              const padR = 230; // Leave room on right for the Star-Ray Key & Live Overlay Radar
              const padT = 38;
              const padB = 50;
              const plotW = svgW - padL - padR;
              const plotH = svgH - padT - padB;

              const pBounds = dimBounds.price;
              const fBounds = dimBounds.rasterFps1440p;

              const toX = (price: number) =>
                padL +
                ((price - pBounds.min) / (pBounds.max - pBounds.min || 1)) *
                  plotW;
              const toY = (fps: number) =>
                padT +
                plotH -
                ((fps - fBounds.min) / (fBounds.max - fBounds.min || 1)) *
                  plotH;

              const K = activeDims.length;
              const maxGlyphRadius = 22;
              const minGlyphRadius = 4;

              // Build star polygon points around (cx, cy)
              const buildGlyphPolygon = (
                cx: number,
                cy: number,
                utilities: Record<HyperDimKey, number>,
                scale = 1
              ) => {
                return activeDims
                  .map((dim, idx) => {
                    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / K;
                    const r =
                      (minGlyphRadius +
                        utilities[dim.key] *
                          (maxGlyphRadius - minGlyphRadius)) *
                      scale;
                    const px = cx + r * Math.cos(angle);
                    const py = cy + r * Math.sin(angle);
                    return `${px.toFixed(1)},${py.toFixed(1)}`;
                  })
                  .join(' ');
              };

              // Reference legend center in right sidebar
              const legendCx = svgW - 115;
              const legendCy = 155;
              const legendR = 68;

              return (
                <>
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const yVal = Math.round(
                      fBounds.min + t * (fBounds.max - fBounds.min)
                    );
                    const sy = toY(yVal);
                    const xVal = Math.round(
                      pBounds.min + t * (pBounds.max - pBounds.min)
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
                      isInspected || isTop1 ? 1.25 : 1.0
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
                        {/* Outer VRAM Halo Ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={maxGlyphRadius * (isInspected ? 1.25 : 1.0)}
                          fill="none"
                          stroke="#334155"
                          strokeDasharray="2 2"
                          strokeWidth={1}
                        />
                        {/* Ray Spokes */}
                        {activeDims.map((dim, idx) => {
                          const angle =
                            -Math.PI / 2 + (idx * 2 * Math.PI) / K;
                          const rx =
                            cx +
                            maxGlyphRadius *
                              (isInspected ? 1.25 : 1) *
                              Math.cos(angle);
                          const ry =
                            cy +
                            maxGlyphRadius *
                              (isInspected ? 1.25 : 1) *
                              Math.sin(angle);
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
                        {/* Embedded K-Dimensional Star Polygon */}
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
                          {item.gpu.name
                            .replace('GeForce ', '')
                            .replace('Radeon ', '')}
                        </text>
                      </g>
                    );
                  })}

                  {/* Right Sidebar: Live Enlarged Star-Glyph Compass & Overlay Inspector */}
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

                    {/* Compass Ray Axes & Labels */}
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

                    {/* Overlay Inspected GPU (or #1 Winner) inside the Compass */}
                    {(() => {
                      const target =
                        inspectedItem ??
                        hyperEvaluated.find((i) => i.gpu.rank === 1) ??
                        hyperEvaluated[0];
                      if (!target) return null;

                      const compassPts = activeDims
                        .map((dim, idx) => {
                          const angle =
                            -Math.PI / 2 + (idx * 2 * Math.PI) / K;
                          const r =
                            (0.1 + 0.9 * target.utilities[dim.key]) * legendR;
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
                              target.isNDOptimal
                                ? 'fill-emerald-400'
                                : 'fill-rose-400'
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
                </>
              );
            })()}
          </svg>
        </div>
      )}

      {/* PROJECTION 3: N-DIMENSIONAL RADVIZ GRAVITY ARENA */}
      {projection === 'radviz' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
              <span className="text-slate-300">
                <strong>
                  How to read the {activeDims.length}D RadViz Gravity Arena:
                </strong>{' '}
                All {activeDims.length} dimensions sit on the perimeter ring as{' '}
                <strong className="text-amber-300">Gravity Anchors</strong>.
                Every GPU is pulled by {activeDims.length} springs toward the
                specs where it excels! Click any perimeter anchor below to boost
                its gravity (<code className="text-amber-300">1× → 2× → 3×</code>
                ).
              </span>
            </div>

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto select-none"
            >
              {(() => {
                const cx = svgW / 2;
                const cy = svgH / 2;
                const arenaR = Math.min(svgW, svgH) * 0.37;
                const K = activeDims.length;

                // Anchor coordinates on perimeter circle
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

                // Compute RadViz spring equilibrium position for each GPU
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
                  // Scale slightly outward (1.35x clamped) so points spread nicely across the arena
                  const px = cx + normX * arenaR * 1.25;
                  const py = cy + normY * arenaR * 1.25;
                  return {
                    ...item,
                    px,
                    py,
                  };
                });

                const inspectedRadPoint = radvizPoints.find(
                  (p) => p.gpu.id === (inspectedItem?.gpu.id ?? '')
                );

                return (
                  <>
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

                    {/* Spring Tension Lines when Hovering/Inspecting a GPU */}
                    {inspectedRadPoint &&
                      anchors.map((anc) => {
                        const u =
                          inspectedRadPoint.utilities[anc.dim.key];
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

                    {/* Perimeter Gravity Anchor Nodes (Click to cycle 1x -> 2x -> 3x Gravity Boost!) */}
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
                                prev[anc.dim.key] >= 3
                                  ? 1
                                  : prev[anc.dim.key] + 1,
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

                    {/* GPU Nodes inside the RadViz Gravity Arena */}
                    {radvizPoints.map((pt) => {
                      if (effectiveHideTraps && !pt.isNDOptimal) return null;
                      const isTop1 = pt.gpu.rank === 1;
                      const isInspected =
                        inspectedItem?.gpu.id === pt.gpu.id;
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
                            {pt.gpu.name
                              .replace('GeForce ', '')
                              .replace('Radeon ', '')}{' '}
                            (${pt.gpu.price})
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
