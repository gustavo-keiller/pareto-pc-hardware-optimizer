import { useState, useEffect, lazy, Suspense } from 'react';
import { METRIC_DEFINITIONS, isMetricKey } from './lib/math/types';
import { ALL_METRIC_KEYS } from './lib/math/topsis';
import { useOptimizerState } from './hooks/useOptimizerState';
import { ExtrapolationToolbar } from './components/ExtrapolationToolbar';
import { GpuLeaderboardTable } from './components/GpuLeaderboardTable';
import { SimpleParetoGuide } from './components/SimpleParetoGuide';
import { DealbreakerFilterPanel } from './components/DealbreakerFilterPanel';
import { TopWinnerBanner } from './components/TopWinnerBanner';
import { TopsisWeightsPanel } from './components/TopsisWeightsPanel';
import { AppHeader } from './components/AppHeader';
import { t } from './utils/i18n';
import {
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Info,
  Box,
  TrendingDown,
  EyeOff,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  ListFilter,
} from 'lucide-react';
import {
  ChartLoadingFallback,
  BuildExplorerLoadingFallback,
} from './components/LoadingFallbacks';

// Lazy-loaded heavy visualizers & mode views (PERF-01)
const FullBuildExplorer = lazy(() =>
  import('./components/FullBuildExplorer').then((m) => ({
    default: m.FullBuildExplorer,
  })),
);
const ParetoScatterPlot = lazy(() =>
  import('./components/ParetoScatterPlot').then((m) => ({
    default: m.ParetoScatterPlot,
  })),
);
const Pareto3DCloud = lazy(() =>
  import('./components/Pareto3DCloud').then((m) => ({
    default: m.Pareto3DCloud,
  })),
);
const AxisViewsGrid = lazy(() =>
  import('./components/AxisViewsGrid').then((m) => ({
    default: m.AxisViewsGrid,
  })),
);
const ValueResidualsChart = lazy(() =>
  import('./components/ValueResidualsChart').then((m) => ({
    default: m.ValueResidualsChart,
  })),
);
const HyperDimensionalExplorer = lazy(() =>
  import('./components/HyperDimensionalExplorer').then((m) => ({
    default: m.HyperDimensionalExplorer,
  })),
);
const ComparisonDrawer = lazy(() =>
  import('./components/ComparisonDrawer').then((m) => ({
    default: m.ComparisonDrawer,
  })),
);
const GpuDealImporterModal = lazy(() =>
  import('./components/GpuDealImporterModal').then((m) => ({
    default: m.GpuDealImporterModal,
  })),
);

export function App() {
  const {
    datasetMode,
    uiMode,
    setUiMode,
    chartView,
    setChartView,
    constraints,
    setConstraints,
    xMetric,
    setXMetric,
    yMetric,
    setYMetric,
    zMetric,
    setZMetric,
    paretoMode,
    setParetoMode,
    extrapolation,
    setExtrapolation,
    weights,
    setWeights,
    activePresetId,
    setActivePresetId,
    hoveredGpuId,
    setHoveredGpuId,
    selectedGpuIds,
    setSelectedGpuIds,
    hideTrapsInTable,
    setHideTrapsInTable,
    rawCatalog,
    validGpus,
    rankedGpus,
    displayedTableGpus,
    normalizedWeights,
    olsModel,
    topWinner,
    hoveredGpu,
    selectedGpus,
    optimalCount,
    trapCount,
    handleSwitchDataset,
    handleApplyPreset,
    handleToggleSelectGpu,
    handleResetAll,
    customGpus,
    addCustomGpus,
    removeCustomGpu,
    clearCustomGpus,
    isDealImporterOpen,
    setIsDealImporterOpen,
    activeCurrency,
    exchangeRateUsdToBrl,
    setExchangeRateUsdToBrl,
    locale,
    handleToggleLocale,
  } = useOptimizerState();

  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [showDominatedZoneMesh, setShowDominatedZoneMesh] =
    useState<boolean>(true);
  const [hideDominatedNodes, setHideDominatedNodes] = useState<boolean>(false);
  const [showAllGpusInSimple, setShowAllGpusInSimple] =
    useState<boolean>(false);

  // When switching away from Pro mode, gracefully fall back to 2D view if residuals was selected
  useEffect(() => {
    if (uiMode !== 'pro' && chartView === 'residuals') {
      setChartView('2d');
    }
  }, [uiMode, chartView, setChartView]);

  const handleInspectGpuInExplorer = (gpuId: string) => {
    setSelectedGpuIds((prev) => (prev.includes(gpuId) ? prev : [gpuId]));
    setUiMode('explorer');
    setChartView('2d');
  };

  const maxBudgetBound =
    datasetMode === 'real'
      ? 1800
      : datasetMode === 'synthetic'
        ? 1000
        : Math.max(15000, ...rawCatalog.map((g) => g.price), 0);
  const maxWattsBound = datasetMode === 'real' ? 450 : 350;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Skip to Main Content Link for Keyboard & Screen Reader Users [UX-09] */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        {t('skipToContent', locale)}
      </a>

      {/* Top Header Bar (Extracted deep module UX-09) */}
      <AppHeader
        uiMode={uiMode}
        setUiMode={setUiMode}
        locale={locale}
        onToggleLocale={handleToggleLocale}
        onResetAll={handleResetAll}
        datasetMode={datasetMode}
        onSwitchDataset={handleSwitchDataset}
        customGpuCount={customGpus.length}
        exchangeRateUsdToBrl={exchangeRateUsdToBrl}
        onChangeExchangeRate={setExchangeRateUsdToBrl}
        onOpenDealImporter={() => setIsDealImporterOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 focus:outline-none"
      >
        {uiMode === 'builds' ? (
          <Suspense fallback={<BuildExplorerLoadingFallback />}>
            <FullBuildExplorer
              gpus={rawCatalog}
              currency={activeCurrency}
              locale={locale}
              onSwitchToSimple={() => setUiMode('simple')}
              onSwitchToExplorer={() => setUiMode('explorer')}
            />
          </Suspense>
        ) : uiMode === 'simple' ? (
          <SimpleParetoGuide
            gpus={rankedGpus}
            rawCatalog={rawCatalog}
            currency={activeCurrency}
            locale={locale}
            constraints={constraints}
            onChangeConstraints={setConstraints}
            xMetric={xMetric}
            yMetric={yMetric}
            zMetric={zMetric}
            onSelectXMetric={setXMetric}
            onSelectYMetric={setYMetric}
            onSelectZMetric={setZMetric}
            weights={weights}
            onChangeWeights={setWeights}
            selectedGpuIds={selectedGpuIds}
            onToggleSelectGpu={handleToggleSelectGpu}
            onSwitchToExplorer={() => setUiMode('explorer')}
            onInspectInExplorer={handleInspectGpuInExplorer}
            onSwitchTo3D={() => {
              setUiMode('explorer');
              setChartView('3d');
            }}
            onSwitchToHyper={() => {
              setUiMode('explorer');
              setChartView('hyper');
            }}
            onSwitchToBuilds={() => setUiMode('builds')}
            maxBudgetBound={maxBudgetBound}
          />
        ) : (
          <>
            {/* Top #1 Winner Hero Banner */}
            {topWinner && (
              <TopWinnerBanner topWinner={topWinner} uiMode={uiMode} />
            )}

            {/* Main 12-Column Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Step 1 Filters + Step 2 Preferences (moves below when chart is expanded to full width) */}
              <div
                className={`${
                  isChartExpanded
                    ? 'lg:col-span-12 order-2 grid grid-cols-1 md:grid-cols-2 gap-6'
                    : 'lg:col-span-4 space-y-6'
                }`}
              >
                {/* Step 1: Budget & Hardware Limits */}
                <DealbreakerFilterPanel
                  constraints={constraints}
                  onChangeConstraints={setConstraints}
                  rawCatalog={rawCatalog}
                  validGpus={validGpus}
                  activeCurrency={activeCurrency}
                  maxBudgetBound={maxBudgetBound}
                  maxWattsBound={maxWattsBound}
                  datasetMode={datasetMode}
                />

                {/* Step 2: Gaming Priorities / Stage 3 TOPSIS Sliders */}
                <TopsisWeightsPanel
                  weights={weights}
                  normalizedWeights={normalizedWeights}
                  activePresetId={activePresetId}
                  uiMode={uiMode}
                  locale={locale}
                  onChangeWeights={setWeights}
                  onApplyPreset={handleApplyPreset}
                  onSelectCustomPreset={() => setActivePresetId('custom')}
                />
              </div>

              {/* Right Column (8 cols normal, 12 cols when expanded): Interactive Visualizations */}
              <div
                className={`${
                  isChartExpanded ? 'lg:col-span-12 order-1' : 'lg:col-span-8'
                } space-y-6 transition-all duration-300`}
              >
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
                            <span className="text-slate-400 font-medium">
                              Trap Rule:
                            </span>
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
                          onClick={() =>
                            setShowDominatedZoneMesh((prev) => !prev)
                          }
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
                              isMetricKey(e.target.value) &&
                              setXMetric(e.target.value)
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
                              isMetricKey(e.target.value) &&
                              setYMetric(e.target.value)
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

                  {/* Proportional Value Extrapolation Toolbar (Active for 2D views where lines/curves are plotted) */}
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
                          onToggleSelectGpu={handleToggleSelectGpu}
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
                          onToggleSelectGpu={handleToggleSelectGpu}
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
                          onToggleSelectGpu={handleToggleSelectGpu}
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
                          onToggleSelectGpu={handleToggleSelectGpu}
                        />
                      ) : (
                        <ValueResidualsChart
                          gpus={rankedGpus}
                          rSquared={olsModel.rSquared}
                          hoveredGpuId={hoveredGpuId}
                          isExpanded={isChartExpanded}
                          hideDominatedNodes={hideDominatedNodes}
                          onHoverGpu={setHoveredGpuId}
                          onToggleSelectGpu={handleToggleSelectGpu}
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
                        Raise your Maximum Budget slider, lower the Minimum VRAM
                        floor, or increase your Power Draw limit.
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
                              VALUE TRAP DETECTED: {hoveredGpu.name} ($
                              {hoveredGpu.price}) is strictly beaten!
                            </div>
                            <ul className="mt-1 space-y-0.5 text-slate-300">
                              {hoveredGpu.dominanceReasons
                                .slice(0, 3)
                                .map((r) => (
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
                                  OLS Fair Value: $
                                  {hoveredGpu.valuation.fairPrice}
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
                            <strong>Tip:</strong> Hover any GPU to see why it is
                            a Smart Buy or a Value Trap. Click{' '}
                            <strong>Expand Graphic</strong> for a full-screen
                            theater view.
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {optimalCount} Optimal • {trapCount} Traps Flagged
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {/* Simple Mode: Optional Expandable Complete GPU Table */}
        {uiMode === 'simple' && (
          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowAllGpusInSimple((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition shadow-lg"
            >
              <ListFilter className="h-4 w-4 text-emerald-400" />
              {showAllGpusInSimple
                ? t('hideAllGpusButton', locale)
                : t('showAllGpusButton', locale)}
            </button>
            {showAllGpusInSimple && (
              <div className="w-full mt-4">
                {selectedGpus.length > 0 && (
                  <Suspense fallback={null}>
                    <ComparisonDrawer
                      selectedGpus={selectedGpus}
                      allGpus={rankedGpus}
                      currency={activeCurrency}
                      locale={locale}
                      onRemoveGpu={handleToggleSelectGpu}
                      onClearAll={() => setSelectedGpuIds([])}
                    />
                  </Suspense>
                )}
                <GpuLeaderboardTable
                  gpus={displayedTableGpus}
                  topWinnerId={topWinner?.id ?? null}
                  hoveredGpuId={hoveredGpuId}
                  selectedGpuIds={selectedGpuIds}
                  hideTrapsInTable={hideTrapsInTable}
                  trapCount={trapCount}
                  uiMode={uiMode}
                  currency={activeCurrency}
                  locale={locale}
                  weights={weights}
                  onHoverGpu={setHoveredGpuId}
                  onToggleSelectGpu={handleToggleSelectGpu}
                  onToggleHideTraps={setHideTrapsInTable}
                />
              </div>
            )}
          </div>
        )}

        {/* Multi-Metric Comparison Drawer & GPU Leaderboard Table (Explorer & Pro modes) */}
        {(uiMode === 'explorer' || uiMode === 'pro') && (
          <>
            {selectedGpus.length > 0 && (
              <Suspense fallback={null}>
                <ComparisonDrawer
                  selectedGpus={selectedGpus}
                  allGpus={rankedGpus}
                  currency={activeCurrency}
                  locale={locale}
                  weights={weights}
                  onRemoveGpu={handleToggleSelectGpu}
                  onClearAll={() => setSelectedGpuIds([])}
                />
              </Suspense>
            )}

            {/* Live-Sorted TOPSIS Leaderboard & OLS Fair-Value Table */}
            <GpuLeaderboardTable
              gpus={displayedTableGpus}
              topWinnerId={topWinner?.id ?? null}
              hoveredGpuId={hoveredGpuId}
              selectedGpuIds={selectedGpuIds}
              hideTrapsInTable={hideTrapsInTable}
              trapCount={trapCount}
              uiMode={uiMode}
              currency={activeCurrency}
              locale={locale}
              weights={weights}
              onHoverGpu={setHoveredGpuId}
              onToggleSelectGpu={handleToggleSelectGpu}
              onToggleHideTraps={setHideTrapsInTable}
            />
          </>
        )}

        {/* GPU Deal Importer & Custom Database Modal */}
        {isDealImporterOpen && (
          <Suspense fallback={null}>
            <GpuDealImporterModal
              isOpen={isDealImporterOpen}
              onClose={() => setIsDealImporterOpen(false)}
              customGpus={customGpus}
              onAddCustomGpus={addCustomGpus}
              onRemoveCustomGpu={removeCustomGpu}
              onClearCustomGpus={clearCustomGpus}
              onSwitchToCustomDataset={() => handleSwitchDataset('custom')}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default App;
