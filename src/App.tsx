import { useState } from 'react';
import { METRIC_DEFINITIONS, isMetricKey } from './lib/math/types';
import { ALL_METRIC_KEYS } from './lib/math/topsis';
import { PRESET_PROFILES, useOptimizerState } from './hooks/useOptimizerState';
import { ParetoScatterPlot } from './components/ParetoScatterPlot';
import { Pareto3DCloud } from './components/Pareto3DCloud';
import { AxisViewsGrid } from './components/AxisViewsGrid';
import { ExtrapolationToolbar } from './components/ExtrapolationToolbar';
import { ValueResidualsChart } from './components/ValueResidualsChart';
import { ComparisonDrawer } from './components/ComparisonDrawer';
import { GpuLeaderboardTable } from './components/GpuLeaderboardTable';
import { SimpleParetoGuide } from './components/SimpleParetoGuide';
import { HyperDimensionalExplorer } from './components/HyperDimensionalExplorer';
import { GpuDealImporterModal } from './components/GpuDealImporterModal';
import { formatCurrency } from './utils/currency';
import {
  Award,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  Filter,
  RotateCcw,
  Cpu,
  Zap,
  DollarSign,
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
} from 'lucide-react';

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
  } = useOptimizerState();

  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [showDominatedZoneMesh, setShowDominatedZoneMesh] =
    useState<boolean>(true);
  const [hideDominatedNodes, setHideDominatedNodes] = useState<boolean>(false);

  const maxBudgetBound =
    datasetMode === 'custom'
      ? Math.max(
          6000,
          ...(rawCatalog.length ? rawCatalog.map((g) => g.price) : [6000]),
        )
      : datasetMode === 'real'
        ? 1800
        : 1000;
  const maxWattsBound = datasetMode === 'real' ? 450 : 350;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Cpu className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  ParetoPC
                </h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  {uiMode === 'simple'
                    ? 'Level 1: Easy Buyer Guide'
                    : uiMode === 'explorer'
                      ? 'Level 2: Visual Axis Explorer'
                      : 'Level 3: Pro MCDM Lab'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {uiMode === 'simple'
                  ? 'Pick your budget and gaming style — overpriced value traps are filtered out automatically'
                  : uiMode === 'explorer'
                    ? 'Explore custom hardware axes, 3D views, 4D–7D Hyper-Graphs, and custom $/spec extrapolation rules'
                    : 'Full 4D–7D Hyper-Space Frontier, TOPSIS Closeness, Non-Linear Extrapolation & Hedonic OLS Lab'}
              </p>
            </div>
          </div>

          {/* Right Controls: 3 Proportional Experience Modes + Dataset Switcher + Import Deals + Reset */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
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
                onClick={() => handleSwitchDataset('synthetic')}
                className={`rounded-md px-2.5 py-1.5 font-semibold transition ${
                  datasetMode === 'synthetic'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sandbox (10)
              </button>
            </div>

            {/* Import Deals Button */}
            <button
              type="button"
              onClick={() => setIsDealImporterOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 font-bold text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400 transition shadow-sm"
              title="Paste listings from Pichau, Terabyte, KaBuM, PCYes, Amazon, etc."
            >
              <PlusCircle className="h-3.5 w-3.5" />+ Import Deals
            </button>

            {/* 3 Proportional Experience Level Buttons */}
            <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setUiMode('simple');
                  if (
                    chartView === 'residuals' ||
                    chartView === 'axes' ||
                    chartView === 'hyper'
                  ) {
                    setChartView('2d');
                  }
                }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'simple'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Level 1: Clean, simple guide for normal PC buyers"
              >
                <Eye className="h-3.5 w-3.5" />
                1. Simple Guide
              </button>
              <button
                type="button"
                onClick={() => {
                  setUiMode('explorer');
                  if (chartView === 'residuals') {
                    setChartView('2d');
                  }
                }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'explorer'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Level 2: Unlock custom axis selectors, 4D-7D Hyper-Graph, 4-panel matrix, and guided value rules"
              >
                <Compass className="h-3.5 w-3.5" />
                2. Explorer
              </button>
              <button
                type="button"
                onClick={() => setUiMode('pro')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold transition ${
                  uiMode === 'pro'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Level 3: Full MCDM math controls, non-linear curve laws, and Hedonic OLS regression"
              >
                <Wrench className="h-3.5 w-3.5" />
                3. Pro Lab
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
              title="Reset filters and weights to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {uiMode === 'simple' ? (
          <SimpleParetoGuide
            gpus={rankedGpus}
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
            onSwitchTo3D={() => {
              setUiMode('explorer');
              setChartView('3d');
            }}
            onSwitchToHyper={() => {
              setUiMode('explorer');
              setChartView('hyper');
            }}
            maxBudgetBound={maxBudgetBound}
          />
        ) : (
          <>
            {/* Top #1 Winner Hero Banner */}
            {topWinner && (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 p-4 sm:p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                          Stage 3 Optimal Recommendation (#1 TOPSIS Match)
                        </span>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                          Closeness Cᵢ = {topWinner.topsisScore.toFixed(3)} (
                          {topWinner.topsisScorePct.toFixed(1)}%)
                        </span>
                        {topWinner.valuation && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold border ${
                              topWinner.valuation.residualUsd <= 0
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {topWinner.valuation.residualUsd <= 0
                              ? `${formatCurrency(Math.abs(topWinner.valuation.residualUsd), topWinner.currency)} Below Fair Market Price (${formatCurrency(topWinner.valuation.fairPrice, topWinner.currency)})`
                              : `${formatCurrency(topWinner.valuation.residualUsd, topWinner.currency)} Above Fair Market Price (${formatCurrency(topWinner.valuation.fairPrice, topWinner.currency)})`}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-extrabold text-white mt-0.5">
                        {topWinner.name}{' '}
                        <span className="text-emerald-400 font-bold">
                          —{' '}
                          {formatCurrency(topWinner.price, topWinner.currency)}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {topWinner.notes}
                        {uiMode === 'pro' &&
                          ` • Ideal Distance d⁺ = ${topWinner.distanceToBest.toFixed(4)}, Anti-Ideal d⁻ = ${topWinner.distanceToWorst.toFixed(4)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
                      <div className="text-slate-400">1440p Gaming</div>
                      <div className="text-sm font-bold text-white">
                        {topWinner.rasterFps1440p} FPS
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
                      <div className="text-slate-400">Ray Tracing</div>
                      <div className="text-sm font-bold text-white">
                        {topWinner.rtFps1440p} FPS
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
                      <div className="text-slate-400">VRAM</div>
                      <div className="text-sm font-bold text-sky-400">
                        {topWinner.vramGb} GB
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
                      <div className="text-slate-400">Power Draw</div>
                      <div className="text-sm font-bold text-slate-200">
                        {topWinner.tdpWatts} W
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                        Stage 1: Hard Dealbreakers
                      </h2>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400">
                      {validGpus.length}/{rawCatalog.length} GPUs Fit
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    {/* Max Budget Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <label
                          htmlFor="max-budget-slider"
                          className="font-medium text-slate-300 flex items-center gap-1"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                          Maximum Budget
                        </label>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(constraints.maxPrice, activeCurrency)}
                        </span>
                      </div>
                      <input
                        id="max-budget-slider"
                        type="range"
                        min={datasetMode === 'custom' ? 500 : 200}
                        max={maxBudgetBound}
                        step={datasetMode === 'custom' ? 50 : 10}
                        value={Math.min(constraints.maxPrice, maxBudgetBound)}
                        onChange={(e) =>
                          setConstraints((prev) => ({
                            ...prev,
                            maxPrice: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>
                          {formatCurrency(
                            datasetMode === 'custom' ? 500 : 200,
                            activeCurrency,
                          )}
                        </span>
                        <span>
                          {formatCurrency(
                            Math.round(maxBudgetBound / 2),
                            activeCurrency,
                          )}
                        </span>
                        <span>
                          {formatCurrency(maxBudgetBound, activeCurrency)} (All)
                        </span>
                      </div>
                    </div>

                    {/* Min VRAM Floor Selector */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-300">
                          Minimum VRAM Required
                        </span>
                        <span className="font-mono font-bold text-sky-400">
                          {constraints.minVram} GB+
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[8, 12, 16, 20].map((vram) => (
                          <button
                            key={vram}
                            type="button"
                            onClick={() =>
                              setConstraints((prev) => ({
                                ...prev,
                                minVram: vram,
                              }))
                            }
                            className={`rounded-lg py-1.5 text-xs font-semibold transition border ${
                              constraints.minVram === vram
                                ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {vram} GB+
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Power TDP Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <label
                          htmlFor="max-watts-slider"
                          className="font-medium text-slate-300 flex items-center gap-1"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          Max GPU Power Draw (PSU Limit)
                        </label>
                        <span className="font-mono font-bold text-amber-400">
                          {constraints.maxWatts} W
                        </span>
                      </div>
                      <input
                        id="max-watts-slider"
                        type="range"
                        min={120}
                        max={maxWattsBound}
                        step={5}
                        value={Math.min(constraints.maxWatts, maxWattsBound)}
                        onChange={(e) =>
                          setConstraints((prev) => ({
                            ...prev,
                            maxWatts: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>120W (Low Power)</span>
                        <span>260W</span>
                        <span>{maxWattsBound}W (No Limit)</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Step 2: Gaming Priorities / Stage 3 TOPSIS Sliders */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-amber-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                        Stage 3: TOPSIS Priority Weights
                      </h2>
                    </div>
                    {uiMode === 'pro' && (
                      <span className="text-[11px] text-slate-400">
                        ∑ wⱼ = 100%
                      </span>
                    )}
                  </div>

                  {/* Buyer Persona Cards */}
                  <div className="mt-3">
                    <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Quick Buyer Persona Presets:
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {PRESET_PROFILES.map((preset) => {
                        const isActive = activePresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className={`rounded-xl border p-2.5 text-left transition ${
                              isActive
                                ? 'border-amber-500/60 bg-amber-500/15 text-white shadow-sm'
                                : 'border-slate-800 bg-slate-950/90 text-slate-300 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">
                                {preset.label}
                              </span>
                              {isActive && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {preset.shortDesc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Objective Weights */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    <span className="block text-[11px] font-semibold text-slate-400">
                      Individual Objective Weights:
                    </span>

                    <div className="space-y-3 pt-1">
                      {ALL_METRIC_KEYS.map((metric) => {
                        const def = METRIC_DEFINITIONS[metric];
                        const rawVal = weights[metric];
                        const normPct = Math.round(
                          normalizedWeights[metric] * 100,
                        );

                        return (
                          <div key={metric}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <label
                                htmlFor={`weight-${metric}`}
                                className="font-medium text-slate-200 flex items-center gap-1.5"
                              >
                                <span>{def.shortLabel}</span>
                                {uiMode === 'pro' && (
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
                                      def.direction === 'min'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-sky-500/15 text-sky-400'
                                    }`}
                                  >
                                    {def.direction}
                                  </span>
                                )}
                              </label>
                              <div className="font-mono text-xs">
                                <span className="text-amber-400 font-semibold">
                                  {normPct}%
                                </span>
                              </div>
                            </div>
                            <input
                              id={`weight-${metric}`}
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={rawVal}
                              onChange={(e) => {
                                setActivePresetId('custom');
                                setWeights((prev) => ({
                                  ...prev,
                                  [metric]: Number(e.target.value),
                                }));
                              }}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
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
                        {/* Trap Rule 5D vs 2D only shown in Pro mode */}
                        {uiMode === 'pro' && (
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
                    chartView === '2d' ? (
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
                    )
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

        {/* Multi-Metric Comparison Drawer (Radar & Parallel Coordinates) */}
        <ComparisonDrawer
          selectedGpus={selectedGpus}
          allGpus={rankedGpus}
          onRemoveGpu={handleToggleSelectGpu}
          onClearAll={() => setSelectedGpuIds([])}
        />

        {/* Live-Sorted TOPSIS Leaderboard & OLS Fair-Value Table */}
        <GpuLeaderboardTable
          gpus={displayedTableGpus}
          topWinnerId={topWinner?.id ?? null}
          hoveredGpuId={hoveredGpuId}
          selectedGpuIds={selectedGpuIds}
          hideTrapsInTable={hideTrapsInTable}
          trapCount={trapCount}
          uiMode={uiMode}
          onHoverGpu={setHoveredGpuId}
          onToggleSelectGpu={handleToggleSelectGpu}
          onToggleHideTraps={setHideTrapsInTable}
        />

        {/* GPU Deal Importer & Custom Database Modal */}
        <GpuDealImporterModal
          isOpen={isDealImporterOpen}
          onClose={() => setIsDealImporterOpen(false)}
          customGpus={customGpus}
          onAddCustomGpus={addCustomGpus}
          onRemoveCustomGpu={removeCustomGpu}
          onClearCustomGpus={clearCustomGpus}
          onSwitchToCustomDataset={() => handleSwitchDataset('custom')}
        />
      </main>
    </div>
  );
}

export default App;
