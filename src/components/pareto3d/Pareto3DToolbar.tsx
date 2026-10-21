import type React from 'react';
import {
  METRIC_DEFINITIONS,
  MetricKey,
  MetricDefinition,
  isMetricKey,
} from '../../lib/math/types';
import { ALL_METRIC_KEYS } from '../../lib/math/topsis';
import { CameraPresetId } from './pareto3dMath';
import {
  RotateCcw,
  Move3d,
  EyeOff,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  Anchor,
} from 'lucide-react';

export interface Pareto3DToolbarProps {
  activePreset: CameraPresetId | 'custom';
  onApplyCameraPreset: (presetId: CameraPresetId) => void;
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  xDef: MetricDefinition;
  yDef: MetricDefinition;
  zDef: MetricDefinition;
  onInspectAxisAgainstBase: (targetMetric: MetricKey) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showDominatedZoneMesh: boolean;
  onToggleDominatedZoneMesh?: () => void;
  hideDominatedNodes: boolean;
  onToggleHideDominatedNodes?: () => void;
  onChangeXMetric?: (m: MetricKey) => void;
  onChangeYMetric?: (m: MetricKey) => void;
  onChangeZMetric: (m: MetricKey) => void;
  onResetCamera: () => void;
}

export function Pareto3DToolbar({
  activePreset,
  onApplyCameraPreset,
  xMetric,
  yMetric,
  zMetric,
  xDef,
  yDef,
  zDef,
  onInspectAxisAgainstBase,
  zoom,
  setZoom,
  showDominatedZoneMesh,
  onToggleDominatedZoneMesh,
  hideDominatedNodes,
  onToggleHideDominatedNodes,
  onChangeXMetric,
  onChangeYMetric,
  onChangeZMetric,
  onResetCamera,
}: Pareto3DToolbarProps) {
  return (
    <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Reoriented Camera Presets */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 text-xs backdrop-blur">
          <span className="px-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            View (Base Bottom-Left):
          </span>
          <button
            type="button"
            onClick={() => onApplyCameraPreset('iso')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              activePreset === 'iso'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="3D Cube with Base (Money $) anchored at the Front-Bottom-Left"
          >
            3D Cube
          </button>
          <button
            type="button"
            onClick={() => onApplyCameraPreset('xy')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              activePreset === 'xy'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Base (${xDef.shortLabel}) at Bottom-Left → Right vs. ${yDef.shortLabel} Bottom-Left → Top`}
          >
            {xDef.shortLabel} × {yDef.shortLabel}
          </button>
          <button
            type="button"
            onClick={() => onApplyCameraPreset('xz')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              activePreset === 'xz'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Base (${xDef.shortLabel}) at Bottom-Left → Right vs. ${zDef.shortLabel} Bottom-Left → Top`}
          >
            {xDef.shortLabel} × {zDef.shortLabel}
          </button>

          {/* Quick buttons for remaining specs */}
          {ALL_METRIC_KEYS.filter(
            (k) => k !== xMetric && k !== yMetric && k !== zMetric,
          ).map((otherKey) => (
            <button
              key={otherKey}
              type="button"
              onClick={() => onInspectAxisAgainstBase(otherKey)}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 transition"
              title={`Switch Z-Axis to ${METRIC_DEFINITIONS[otherKey].shortLabel} and view with ${xDef.shortLabel} at Bottom-Left`}
            >
              {xDef.shortLabel} × {METRIC_DEFINITIONS[otherKey].shortLabel}
            </button>
          ))}
        </div>

        {/* Right: Zoom, Volume Toggle, Trap Toggle & Reset */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950/90 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.45, z * 0.85))}
              className="p-1 text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-emerald-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4.5, z * 1.18))}
              className="p-1 text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {onToggleDominatedZoneMesh && (
            <button
              type="button"
              onClick={onToggleDominatedZoneMesh}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                showDominatedZoneMesh
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white'
              }`}
              title="Toggle the unified, merged 3D dominated region hull"
            >
              <Layers className="h-3.5 w-3.5" />
              {showDominatedZoneMesh ? 'Unoptimized Zone: ON' : 'Zone: OFF'}
            </button>
          )}

          {onToggleHideDominatedNodes && (
            <button
              type="button"
              onClick={onToggleHideDominatedNodes}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                hideDominatedNodes
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white'
              }`}
              title="Make dominated trap points disappear from the chart"
            >
              <EyeOff className="h-3.5 w-3.5" />
              {hideDominatedNodes ? 'Traps Hidden' : 'Hide Traps'}
            </button>
          )}

          <button
            type="button"
            onClick={onResetCamera}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Sub-bar: Personalizable Base Axis + Y-Axis + Z-Axis selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-md border border-slate-800/80 bg-slate-950/85 px-2.5 py-1">
          <Anchor className="h-3 w-3 text-emerald-400" />
          <span>Base (Bottom-Left):</span>
          {onChangeXMetric ? (
            <select
              aria-label="Base Bottom-Left Axis Metric"
              value={xMetric}
              onChange={(e) =>
                isMetricKey(e.target.value) && onChangeXMetric(e.target.value)
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
          ) : (
            <span className="font-bold text-emerald-400">
              {xDef.shortLabel}
            </span>
          )}

          <span className="text-slate-600">|</span>
          <span>Y-Vertical:</span>
          {onChangeYMetric ? (
            <select
              aria-label="Y-Vertical Axis Metric"
              value={yMetric}
              onChange={(e) =>
                isMetricKey(e.target.value) && onChangeYMetric(e.target.value)
              }
              className="bg-transparent font-semibold text-sky-400 focus:outline-none cursor-pointer"
            >
              {ALL_METRIC_KEYS.map((k) => (
                <option
                  key={k}
                  value={k}
                  className="bg-slate-900 text-slate-100"
                >
                  {METRIC_DEFINITIONS[k].shortLabel}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-sky-400">
              {yDef.shortLabel}
            </span>
          )}

          <span className="text-slate-600">|</span>
          <Move3d className="h-3 w-3 text-purple-400" />
          <span>Z-Depth:</span>
          <select
            aria-label="Z-Axis Metric"
            value={zMetric}
            onChange={(e) =>
              isMetricKey(e.target.value) && onChangeZMetric(e.target.value)
            }
            className="bg-transparent font-semibold text-purple-400 focus:outline-none cursor-pointer"
          >
            {ALL_METRIC_KEYS.map((k) => (
              <option key={k} value={k} className="bg-slate-900 text-slate-100">
                {METRIC_DEFINITIONS[k].shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
