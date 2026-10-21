import type React from 'react';
import {
  HyperDimKey,
  HyperDimDefinition,
  HYPER_DIMENSIONS,
  HyperProjectionMode,
  HyperEvaluatedItem,
} from './hyperTypes';
import {
  RotateCcw,
  Activity,
  Hexagon,
  Orbit,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface HyperHeaderControlsProps {
  activeDims: HyperDimDefinition[];
  activeDimKeys: HyperDimKey[];
  onToggleDimension: (key: HyperDimKey) => void;
  projection: HyperProjectionMode;
  setProjection: (mode: HyperProjectionMode) => void;
  ndOptimalList: HyperEvaluatedItem[];
  ndTrapList: HyperEvaluatedItem[];
  effectiveHideTraps: boolean;
  onToggleHideTraps: () => void;
  onResetGates: () => void;
  pinnedTrapId: string | null;
  setPinnedTrapId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function HyperHeaderControls({
  activeDims,
  activeDimKeys,
  onToggleDimension,
  projection,
  setProjection,
  ndOptimalList,
  ndTrapList,
  effectiveHideTraps,
  onToggleHideTraps,
  onResetGates,
  pinnedTrapId,
  setPinnedTrapId,
}: HyperHeaderControlsProps) {
  return (
    <>
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
              <strong>
                all {activeDims.length} selected dimensions at once
              </strong>
              :{' '}
              <span className="text-emerald-400 font-bold">
                {ndOptimalList.length} {activeDims.length}D-Optimal Survivors
              </span>{' '}
              vs.{' '}
              <span className="text-rose-400 font-bold">
                {ndTrapList.length} Strictly Dominated {activeDims.length}D
                Traps
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

        {/* Active Dimension Pill Toggles */}
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
                  onClick={() => onToggleDimension(dim.key)}
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
              onClick={onToggleHideTraps}
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
              onClick={onResetGates}
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
                      prev === trapItem.gpu.id ? null : trapItem.gpu.id,
                    )
                  }
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
                    isPinned
                      ? 'border-rose-400 bg-rose-500 text-white shadow'
                      : 'border-rose-500/30 bg-slate-950/80 text-rose-300 hover:bg-rose-500/20'
                  }`}
                >
                  {trapItem.gpu.name
                    .replace('GeForce ', '')
                    .replace('Radeon ', '')}{' '}
                  (${trapItem.gpu.price})
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
