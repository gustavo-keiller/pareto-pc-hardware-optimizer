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
import { getHeaderBadge, getHeaderSubtitle, t } from './utils/i18n';
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Cpu,
  Sparkles,
  BarChart3,
  Info,
  Box,
  TrendingDown,
  Database,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Wrench,
  Compass,
  Store,
  PlusCircle,
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
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          {/* Top Row: Brand & Quick Language/Reset Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Cpu className="h-5 w-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                    ParetoPC
                  </h1>
                  <span className="hidden sm:inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 truncate">
                    {getHeaderBadge(uiMode, locale)}
                  </span>
                </div>
                <p className="hidden md:block text-xs text-slate-400 truncate max-w-xl">
                  {getHeaderSubtitle(uiMode, locale)}
                </p>
              </div>
            </div>

            {/* Quick Actions: Language Toggle + Reset Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs">
              {/* Language / Currency Toggle (UX-06) */}
              <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => handleToggleLocale('pt-BR')}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                    locale === 'pt-BR'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Mudar para Português (Preços em Reais R$)"
                >
                  🇧🇷 PT
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLocale('en-US')}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                    locale === 'en-US'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Switch to English (Prices in USD $)"
                >
                  🇺🇸 EN
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 sm:px-2.5 py-1 sm:py-1.5 font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
                title={t('appResetTitle', locale)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t('appResetButton', locale)}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation & Controls Bar: Level Buttons + Expert Controls */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-2 text-xs">
            {/* 4 Proportional Experience Level Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setUiMode('simple')}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'simple'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                {t('modeSimple', locale)}
              </button>
              <button
                type="button"
                onClick={() => setUiMode('explorer')}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'explorer'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                {t('modeExplorer', locale)}
              </button>
              <button
                type="button"
                onClick={() => setUiMode('pro')}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'pro'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                {t('modePro', locale)}
              </button>
              <button
                type="button"
                onClick={() => setUiMode('builds')}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'builds'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {t('modeBuilds', locale)}
              </button>
            </div>

            {/* Expert Controls: Dataset Switcher + Import Deals (Visible only in Explorer and Pro modes) */}
            {(uiMode === 'explorer' || uiMode === 'pro') && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Dataset Toggle */}
                <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchDataset('real')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                      datasetMode === 'real'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    Real GPUs (18)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDataset('custom')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                      datasetMode === 'custom'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="View your custom imported deals from Pichau, Terabyte, KaBuM, etc."
                  >
                    <Store className="h-3.5 w-3.5" />
                    My Deals ({customGpus.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDataset('combined')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition ${
                      datasetMode === 'combined'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Combined Sandbox: Compare live store deals directly against converted US benchmark baselines in BRL"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Combined Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDataset('synthetic')}
                    className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                      datasetMode === 'synthetic'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Synthetic testbed with mathematically verified anchors and trap cards"
                  >
                    Synthetic (10)
                  </button>
                </div>

                {/* Exchange Rate Control for Combined Sandbox Mode */}
                {datasetMode === 'combined' && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs">
                    <span className="text-slate-400 font-medium">USD/BRL:</span>
                    <span className="font-mono font-bold text-amber-300">
                      $1 = R$
                    </span>
                    <input
                      aria-label="USD to BRL Exchange Rate"
                      type="number"
                      min={1}
                      max={20}
                      step={0.1}
                      value={exchangeRateUsdToBrl}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0)
                          setExchangeRateUsdToBrl(val);
                      }}
                      className="w-14 rounded bg-slate-900 px-1 py-0.5 text-center font-mono font-bold text-amber-300 focus:outline-none border border-slate-700"
                      title="Exchange rate used to convert US benchmark MSRP to BRL"
                    />
                  </div>
                )}

                {/* Import Deals Button */}
                <button
                  type="button"
                  onClick={() => setIsDealImporterOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 font-bold text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400 transition shadow-sm"
                  title="Paste listings from Pichau, Terabyte, KaBuM, PCYes, Amazon, etc."
                >
                  <PlusCircle className="h-3.5 w-3.5" />+ Import Deals
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
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
