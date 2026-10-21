import { useState, useEffect, lazy, Suspense } from 'react';
import { useOptimizerState } from './hooks/useOptimizerState';
import { GpuLeaderboardTable } from './components/GpuLeaderboardTable';
import { SimpleParetoGuide } from './components/SimpleParetoGuide';
import { DealbreakerFilterPanel } from './components/DealbreakerFilterPanel';
import { TopWinnerBanner } from './components/TopWinnerBanner';
import { TopsisWeightsPanel } from './components/TopsisWeightsPanel';
import { AppHeader } from './components/AppHeader';
import { VisualizerPanel } from './components/VisualizerPanel';
import { t } from './utils/i18n';
import { ListFilter } from 'lucide-react';
import { BuildExplorerLoadingFallback } from './components/LoadingFallbacks';

// Lazy-loaded heavy visualizers & mode views (PERF-01)
const FullBuildExplorer = lazy(() =>
  import('./components/FullBuildExplorer').then((m) => ({
    default: m.FullBuildExplorer,
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

export default function App() {
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
                <VisualizerPanel
                  chartView={chartView}
                  setChartView={setChartView}
                  uiMode={uiMode}
                  paretoMode={paretoMode}
                  setParetoMode={setParetoMode}
                  isChartExpanded={isChartExpanded}
                  setIsChartExpanded={setIsChartExpanded}
                  showDominatedZoneMesh={showDominatedZoneMesh}
                  setShowDominatedZoneMesh={setShowDominatedZoneMesh}
                  hideDominatedNodes={hideDominatedNodes}
                  setHideDominatedNodes={setHideDominatedNodes}
                  xMetric={xMetric}
                  setXMetric={setXMetric}
                  yMetric={yMetric}
                  setYMetric={setYMetric}
                  zMetric={zMetric}
                  setZMetric={setZMetric}
                  rankedGpus={rankedGpus}
                  hoveredGpuId={hoveredGpuId}
                  setHoveredGpuId={setHoveredGpuId}
                  selectedGpuIds={selectedGpuIds}
                  onToggleSelectGpu={handleToggleSelectGpu}
                  extrapolation={extrapolation}
                  setExtrapolation={setExtrapolation}
                  olsModel={olsModel}
                  hoveredGpu={hoveredGpu}
                  optimalCount={optimalCount}
                  trapCount={trapCount}
                />
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
