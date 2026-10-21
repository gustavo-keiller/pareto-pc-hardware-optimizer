import { lazy, Suspense } from 'react';
import type React from 'react';
import {
  MetricKey,
  RankedGpu,
  METRIC_DEFINITIONS,
  isMetricKey,
} from '../lib/math/types';
import { UiMode, ChartViewMode } from '../hooks/useOptimizerState';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { ExtrapolationConfig } from '../lib/math/extrapolation';
import { ExtrapolationToolbar } from './ExtrapolationToolbar';
import { ChartLoadingFallback } from './LoadingFallbacks';
import {
  BarChart3,
  Box,
  Sparkles,
  LayoutGrid,
  TrendingDown,
  Maximize2,
  Minimize2,
  Layers,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';

const ParetoScatterPlot = lazy(() =>
  import('./ParetoScatterPlot').then((m) => ({
    default: m.ParetoScatterPlot,
  })),
);
const Pareto3DCloud = lazy(() =>
  import('./Pareto3DCloud').then((m) => ({
    default: m.Pareto3DCloud,
  })),
);
const AxisViewsGrid = lazy(() =>
  import('./AxisViewsGrid').then((m) => ({
    default: m.AxisViewsGrid,
  })),
);
const ValueResidualsChart = lazy(() =>
  import('./ValueResidualsChart').then((m) => ({
    default: m.ValueResidualsChart,
  })),
);
const HyperDimensionalExplorer = lazy(() =>
  import('./HyperDimensionalExplorer').then((m) => ({
    default: m.HyperDimensionalExplorer,
  })),
);

export type ParetoDominanceMode = '2d-axes' | 'all-5d';

export interface VisualizerPanelProps {
  chartView: ChartViewMode;
  setChartView: (v: ChartViewMode) => void;
  uiMode: UiMode;
  paretoMode: ParetoDominanceMode;
  setParetoMode: (m: ParetoDominanceMode) => void;
  isChartExpanded: boolean;
  setIsChartExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  showDominatedZoneMesh: boolean;
  setShowDominatedZoneMesh: React.Dispatch<React.SetStateAction<boolean>>;
  hideDominatedNodes: boolean;
  setHideDominatedNodes: React.Dispatch<React.SetStateAction<boolean>>;
  xMetric: MetricKey;
  setXMetric: (k: MetricKey) => void;
  yMetric: MetricKey;
  setYMetric: (k: MetricKey) => void;
  zMetric: MetricKey;
  setZMetric: (k: MetricKey) => void;
  rankedGpus: RankedGpu[];
  hoveredGpuId: string | null;
  setHoveredGpuId: (id: string | null) => void;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  extrapolation: ExtrapolationConfig;
  setExtrapolation: React.Dispatch<React.SetStateAction<ExtrapolationConfig>>;
  olsModel: { rSquared: number };
  hoveredGpu: RankedGpu | null;
  optimalCount: number;
  trapCount: number;
}

export function VisualizerPanel({
  chartView,
  setChartView,
  uiMode,
  paretoMode,
  setParetoMode,
  isChartExpanded,
  setIsChartExpanded,
  showDominatedZoneMesh,
  setShowDominatedZoneMesh,
  hideDominatedNodes,
  setHideDominatedNodes,
  xMetric,
  setXMetric,
  yMetric,
  setYMetric,
  zMetric,
  setZMetric,
  rankedGpus,
  hoveredGpuId,
  setHoveredGpuId,
  selectedGpuIds,
  onToggleSelectGpu,
  extrapolation,
  setExtrapolation,
  olsModel,
  hoveredGpu,
  optimalCount,
  trapCount,
}: VisualizerPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      {/* Top Visualization Mode Switcher & Expand Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {chartView === '2d'
                ? 'Price vs. Performance Frontier (Value Trap Detector)'
                : chartView === '3d'
                  ? '3D Multi-Objective Frontier Cube (Price × FPS × VRAM/RT)'
                  : chartView === 'hyper'
                    ? '4D–7D Hyper-Space Explorer (N-Dimensional Pareto & Projections)'
                    : chartView === 'axes'
                      ? 'Multi-Axis & Individual Measurement Views'
                      : 'Phase 2: Fair Market Value vs. Street Price (Hedonic OLS)'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {chartView === '2d'
              ? paretoMode === 'all-5d'
                ? 'Green circles = 2D Frontier. Cyan diamonds = 5D Specialists (cards saved by high VRAM, Ray Tracing, or low Watts). Red = Strictly Dominated Traps.'
                : '2D Slice Mode: Every card below the green staircase is beaten on both axes simultaneously.'
              : chartView === '3d'
                ? 'Exact 3D step-corner polyhedron + quick camera views for X×Y, Z×Y, and X×Z.'
                : chartView === 'hyper'
                  ? 'Compare up to 7 hardware dimensions simultaneously via N-D Parallel Dominance, Star-Glyph Scatter, or RadViz Gravity Springs.'
                  : chartView === 'axes'
                    ? 'Inspect all 4 Price vs. Spec frontiers side-by-side or isolate each hardware measurement individually in 1D.'
                    : 'Green bars on the left are underpriced bargains relative to their benchmark specs; red bars on the right are overpriced.'}
          </p>
        </div>

        {/* View Switcher + Expand Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex flex-wrap rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setChartView('2d')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                chartView === '2d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              2D Frontier
            </button>
            <button
              type="button"
              onClick={() => setChartView('3d')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                chartView === '3d'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="h-3.5 w-3.5" />
              3D Cloud
            </button>
            <button
              type="button"
              onClick={() => setChartView('hyper')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                chartView === 'hyper'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-sm shadow-fuchsia-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compare 4 to 7 hardware dimensions at once (Parallel Dominance, Star-Glyphs & RadViz Gravity)"
            >
              <Sparkles className="h-3.5 w-3.5" />
              4D–7D Hyper-Graph
            </button>
            <button
              type="button"
              onClick={() => setChartView('axes')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                chartView === 'axes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="See every measurement axis individually or as a 4-panel matrix"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Axis Views
            </button>
            {uiMode === 'pro' && (
              <button
                type="button"
                onClick={() => setChartView('residuals')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  chartView === 'residuals'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Fair Value (OLS)
              </button>
            )}
          </div>

          {/* Expand / Cinema Mode Button */}
          <button
            type="button"
            onClick={() => setIsChartExpanded((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-semibold transition ${
              isChartExpanded
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
            title={
              isChartExpanded
                ? 'Restore standard side-by-side layout'
                : 'Expand graphic into full-width Cinema View'
            }
          >
            {isChartExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Shrink View
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                Expand Graphic
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Bar: 2D Frontier Controls (Trap Rule, Zone Mesh, Hide Traps, Base & Y-Axis) */}
      {chartView === '2d' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Trap Rule 5D vs 2D shown in both Explorer and Pro modes */}
            {(uiMode === 'pro' || uiMode === 'explorer') && (
              <>
                <span className="text-slate-400 font-medium">Trap Rule:</span>
                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => setParetoMode('all-5d')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      paretoMode === 'all-5d'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All 5 Specs (5D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setParetoMode('2d-axes')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      paretoMode === '2d-axes'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Strict 2D Axes
                  </button>
                </div>
              </>
            )}

            {/* Paint Unoptimized Region Mesh Toggle */}
            <button
              type="button"
              onClick={() => setShowDominatedZoneMesh((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                showDominatedZoneMesh
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Paint the merged unoptimized/dominated region with a single translucent color"
            >
              <Layers className="h-3.5 w-3.5" />
              {showDominatedZoneMesh
                ? 'Shade Unoptimized Zone: ON'
                : 'Shade Unoptimized Zone: OFF'}
            </button>

            {/* Hide Trap Points Toggle */}
            <button
              type="button"
              onClick={() => setHideDominatedNodes((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                hideDominatedNodes
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Make dominated trap points disappear from the graphic"
            >
              <EyeOff className="h-3.5 w-3.5" />
              {hideDominatedNodes
                ? `Traps Hidden (${trapCount})`
                : `Hide Trap Points (${trapCount})`}
            </button>
          </div>

          {/* Custom Base & Y-Axis Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
              <span className="text-emerald-300 font-medium">
                Base Axis (Bottom-Left):
              </span>
              <select
                aria-label="Base (Bottom-Left) Metric"
                value={xMetric}
                onChange={(e) =>
                  isMetricKey(e.target.value) && setXMetric(e.target.value)
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
            </div>
            <div className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1">
              <span className="text-slate-400">↑ Y-Axis:</span>
              <select
                aria-label="Y-Axis Metric"
                value={yMetric}
                onChange={(e) =>
                  isMetricKey(e.target.value) && setYMetric(e.target.value)
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
            </div>
          </div>
        </div>
      )}

      {/* Proportional Value Extrapolation Toolbar */}
      {(chartView === '2d' || chartView === 'axes') && (
        <ExtrapolationToolbar
          gpus={rankedGpus}
          xMetric={xMetric}
          yMetric={yMetric}
          uiMode={uiMode}
          extrapolation={extrapolation}
          onChangeExtrapolation={setExtrapolation}
          onSelectAxes={(x, y) => {
            setXMetric(x);
            setYMetric(y);
          }}
        />
      )}

      {/* Active Visualization Canvas */}
      {rankedGpus.length > 0 ? (
        <Suspense fallback={<ChartLoadingFallback />}>
          {chartView === '2d' ? (
            <ParetoScatterPlot
              gpus={rankedGpus}
              xMetric={xMetric}
              yMetric={yMetric}
              paretoMode={paretoMode}
              extrapolation={extrapolation}
              hoveredGpuId={hoveredGpuId}
              selectedGpuIds={selectedGpuIds}
              isExpanded={isChartExpanded}
              hideDominatedNodes={hideDominatedNodes}
              showDominatedZoneMesh={showDominatedZoneMesh}
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={onToggleSelectGpu}
            />
          ) : chartView === '3d' ? (
            <Pareto3DCloud
              gpus={rankedGpus}
              xMetric={xMetric}
              yMetric={yMetric}
              zMetric={zMetric}
              extrapolation={extrapolation}
              hoveredGpuId={hoveredGpuId}
              selectedGpuIds={selectedGpuIds}
              isExpanded={isChartExpanded}
              hideDominatedNodes={hideDominatedNodes}
              showDominatedZoneMesh={showDominatedZoneMesh}
              onToggleHideDominatedNodes={() =>
                setHideDominatedNodes((prev) => !prev)
              }
              onToggleDominatedZoneMesh={() =>
                setShowDominatedZoneMesh((prev) => !prev)
              }
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={onToggleSelectGpu}
              onChangeXMetric={setXMetric}
              onChangeYMetric={setYMetric}
              onChangeZMetric={setZMetric}
            />
          ) : chartView === 'hyper' ? (
            <HyperDimensionalExplorer
              gpus={rankedGpus}
              hoveredGpuId={hoveredGpuId}
              selectedGpuIds={selectedGpuIds}
              isExpanded={isChartExpanded}
              hideDominatedNodes={hideDominatedNodes}
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={onToggleSelectGpu}
            />
          ) : chartView === 'axes' ? (
            <AxisViewsGrid
              gpus={rankedGpus}
              baseMetric={xMetric}
              onChangeBaseMetric={setXMetric}
              extrapolation={extrapolation}
              hoveredGpuId={hoveredGpuId}
              selectedGpuIds={selectedGpuIds}
              isExpanded={isChartExpanded}
              hideDominatedNodes={hideDominatedNodes}
              showDominatedZoneMesh={showDominatedZoneMesh}
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={onToggleSelectGpu}
            />
          ) : (
            <ValueResidualsChart
              gpus={rankedGpus}
              rSquared={olsModel.rSquared}
              hoveredGpuId={hoveredGpuId}
              isExpanded={isChartExpanded}
              hideDominatedNodes={hideDominatedNodes}
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={onToggleSelectGpu}
            />
          )}
        </Suspense>
      ) : (
        <div className="flex h-[420px] flex-col items-center justify-center text-center p-6">
          <ShieldAlert className="h-10 w-10 text-rose-400 mb-2" />
          <h3 className="text-base font-bold text-white">
            No GPUs Fit Your Current Limits
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Raise your Maximum Budget slider, lower the Minimum VRAM floor, or
            increase your Power Draw limit.
          </p>
        </div>
      )}

      {/* Live Trap Diagnostic Footer Bar */}
      <div className="mt-3 rounded-xl border border-slate-800/90 bg-slate-950/90 p-3.5">
        {hoveredGpu ? (
          hoveredGpu.isDominated ? (
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-rose-300">
                  VALUE TRAP DETECTED: {hoveredGpu.name} (${hoveredGpu.price})
                  is strictly beaten!
                </div>
                <ul className="mt-1 space-y-0.5 text-slate-300">
                  {hoveredGpu.dominanceReasons.slice(0, 3).map((r) => (
                    <li key={r.dominatorId}>• {r.summaryText}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-300">
                  SMART BUY (
                  {paretoMode === 'all-5d'
                    ? '5D Pareto Optimal'
                    : '2D Frontier Optimal'}
                  ): {hoveredGpu.name} (${hoveredGpu.price})
                </div>
                <p className="text-slate-300 mt-0.5">
                  {hoveredGpu.notes} • Match Score:{' '}
                  <strong className="text-amber-400">
                    {hoveredGpu.topsisScorePct.toFixed(1)}%
                  </strong>{' '}
                  (Rank #{hoveredGpu.rank}).
                  {hoveredGpu.valuation && (
                    <span className="ml-2 text-sky-300">
                      OLS Fair Value: ${hoveredGpu.valuation.fairPrice}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-400 shrink-0" />
              <span>
                <strong>Tip:</strong> Hover any GPU to see why it is a Smart Buy
                or a Value Trap. Click <strong>Expand Graphic</strong> for a
                full-screen theater view.
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {optimalCount} Optimal • {trapCount} Traps Flagged
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
