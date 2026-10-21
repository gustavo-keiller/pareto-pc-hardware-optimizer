# CODEMAP — ParetoPC (Program Skeleton)

> Agent GPS. Read this instead of traversing directories.
> For mathematical formulas and roadmap specifications, read [`CONTEXT.md`](CONTEXT.md).
> **Maintenance:** Update in the same commit that adds, moves, or splits a module. See `preflight` skill.

---

## 1. Mathematical Engine & Data Layer (`src/lib/` & `src/data/`)

Pure TypeScript modules with zero React/DOM/ECharts dependencies:

| Path | Purpose |
| :--- | :--- |
| `src/lib/math/types.ts` | **Domain Types & Metric Registry** — `GpuCandidate`, `MetricKey`, `OptimizationDirection` (`'min' \| 'max'`), `METRIC_DEFINITIONS`, `HardConstraints`, `PreferenceWeights`, `ParetoEvaluatedGpu`, `GpuValuation`, `HedonicModelSummary`, `RankedGpu` |
| `src/lib/math/buildTypes.ts` | **Phase 3 Multi-Component Domain Schemas & Physical Clearance Engine** — `CpuCandidate`, `MotherboardCandidate`, `RamCandidate`, `PsuCandidate`, `StorageCandidate`, `CaseCandidate`, `CoolerCandidate`, `PcBuild`, `checkBuildCompatibility` (physical clearances, GPU length, cooler height, socket brackets, M.2 slots), `computeCpuGpuBottleneck`, `estimateGpuRequiredCpuScore`, `assemblePcBuild` (with precomputed metrics support) |
| `src/lib/math/workloadModels.ts` | **Workload Performance & Productivity Index Models (`[BLD-03]`)** — pure TypeScript models for 1080p esports ($\alpha = 0.70$), 1440p sweet spot ($\alpha = 0.50$), 4K Ultra RT ($\alpha = 0.30$), and multi-dimensional Creator & AI composite productivity index |
| `src/lib/math/__tests__/buildTypes.test.ts` | **Vitest Build Types & Multi-Component Suite** — 27 unit tests covering socket matching, RAM generation, PSU headroom, physical clearances (case form factor, GPU length, cooler height, cooler brackets, TDP capacity, M.2 slots), bottleneck elasticity, and 8-component assembly |
| `src/lib/math/intraCategoryPruning.ts` | **Intra-Category Pareto Pre-Pruning Engine (Rule 4)** — pure TypeScript intra-category pruning across all 8 hardware categories (`pruneDominatedCpus`, `pruneDominatedRam`, `pruneDominatedMotherboards`, `pruneDominatedPsus`, `pruneDominatedStorage`, `pruneDominatedCases`, `pruneDominatedCoolers`, `pruneDominatedGpus`, and `PSU_EFFICIENCY_TIER`) with partition safety for form factors (SFF / Mini-ITX), cooler architectures (Air vs AIO), and aesthetics (RGB vs Stealth) |
| `src/lib/math/combinatorial.ts` | **Phase 3 Combinatorial PC Optimization Engine** — `generateCompatibleBuilds` (backtracking search with branch-and-bound budget pruning, physical clearances, enthusiast filter criteria, and active `BuildWorkloadProfile`), `evaluateBuildParetoFrontier` (O(n log n) 2D Pareto sweep over total price vs. workload score), `optimizeFullSystemBuilds`, re-exports intra-category pruning |
| `src/lib/math/buildSearch.ts` | **Combinatorial Traversal & 2D Pareto Builder** — `searchOptimalBuildTuples` high-performance 8-component traversal with branch-and-bound lower bound budget pruning and price-point candidate bucketing |
| `src/lib/math/__tests__/combinatorial.test.ts` | **Vitest Combinatorial Suite** — 16 unit tests for intra-category pruning across all component types, physical clearance filtering during build generation, build-level Pareto optimality, and full-catalog optimization |
| `src/lib/math/__tests__/enthusiastConstraints.test.ts` | **Vitest Enthusiast Constraints Suite (`[BLD-08]`)** — 7 unit tests verifying SFF / Mini-ITX preservation in intra-category pruning, AIO vs. Air cooler filtering, RGB vs. Stealth aesthetics, and CPU vendor ecosystem constraints |
| `src/lib/math/pricingEngine.ts` | **Regional Pricing Overlay Engine (`[DATA-04]`)** — `resolveRegionalPrice`, `overlayRegionalPrices`, cash/PIX discount preference, store attribution, and uncertainty labeling (`isEstimated: boolean`) |
| `src/lib/math/__tests__/pricingEngine.test.ts` | **Vitest Regional Pricing Suite (`[DATA-04]`)** — unit tests for store price resolution, cash/PIX discounts, exchange rate fallbacks, and boundary safety |
| `src/data/storePrices.ts` | **Regional Store Price Loader (`[DATA-04]`)** — typed loader providing `BRAZIL_STORE_PRICES` and `US_STORE_PRICES` with store links, payment methods, and audit dates |
| `src/data/prices/` | **Regional Store Price JSON Datasets (`[DATA-04]`)** — versioned static price datasets (`br.json`, `us.json`) covering retail stores (KaBuM!, TerabyteShop, Pichau, Amazon, Newegg, Best Buy) |
| `src/lib/math/pareto.ts` | **Stages 1 & 2: Hard-Constraint Pruning & Pareto Dominance** — `filterByHardConstraints`, `dominates`, `buildDominanceReason` (human-readable trap diagnostics), `evaluateParetoFrontier`, `get2DParetoFrontierCurve` (staircase coordinates) |
| `src/lib/math/topsis.ts` | **Stage 3: TOPSIS Multi-Objective Ranking & Breakdown (`[UX-08]`)** — `ALL_METRIC_KEYS`, `DEFAULT_PREFERENCE_WEIGHTS`, `normalizeWeights`, `rankByTopsis` (vector normalization, $A^+$/$A^-$ ideal solutions, Euclidean distances $d^+$/$d^-$, closeness $C_i \in [0, 1]$), and `computeTopsisBreakdown` (per-metric distance vectors and proximity) |
| `src/lib/math/__tests__/topsisBreakdown.test.ts` | **Vitest TOPSIS Score Breakdown Suite (`[UX-08]`)** — 3 unit tests verifying Euclidean distance vector reconstruction, directionality mapping, and edge case safety |
| `src/lib/math/regression.ts` | **Phase 2: Hedonic OLS Regression Engine** — `solveLinearSystem` (Gaussian elimination with partial pivoting), `classifyValueTier`, `computeHedonicRegression` ($\ln(\text{Price})$ vs. performance specs, fair market price $\hat{P}_i$, dollar/percent residuals, and $R^2$) |
| `src/lib/math/extrapolation.ts` | **Linear Value Extrapolation Engine** — `ExtrapolationConfig`, `evaluateLinearExtrapolation` (anchors a linear $/unit margin ray $y = (Y_0 / X_0) \cdot x$ on a selected GPU or custom target like `$1000` for `10 GB` = `$100/GB` and flags GPUs below the margin), `getClippedExtrapolationLine` |
| `src/lib/math/capabilities.ts` | **Hardware Capabilities & Ecosystem Technology Engine** — pure TypeScript inference of GPU vendors (`NVIDIA`, `AMD`, `Intel`), architectures (`Blackwell`, `Ada`, `RDNA 3`, `Battlemage`), and proprietary ecosystem features (`DLSS 3+ Frame Gen`, `FSR 3 Frame Gen`, `AV1 Video Encode`, `Hardware Ray Tracing`, `CUDA / OptiX AI & 3D`), plus dynamic facet counts |
| `src/lib/math/__tests__/capabilities.test.ts` | **Vitest Capabilities Suite** — unit tests for vendor, architecture, and technology feature inference and live facet counting |
| `src/lib/parser/gpuListingParser.ts` | **E-Commerce GPU Listing Parser Engine** — pure TypeScript parser for Portuguese and international store copy (Pichau, Terabyte, KaBuM!, PCYes, Amazon), extracts cash/PIX discounts, card installment plans, VRAM, store names, URLs, and matches benchmark specs |
| `src/lib/parser/__tests__/gpuListingParser.test.ts` | **Vitest Parser Suite** — comprehensive unit tests verifying tokenization and extraction across single and batch listings |
| `src/lib/math/benchmarkNormalization.ts` | **Public Creator Benchmark Normalization Engine (`[DATA-02]`)** — `recenterBenchmarkToAnchor`, `transitiveBridgeReCenter`, `aggregateCrossReviewerIndex` (scale-invariant geometric mean harmonization), and `calculateCalibratedFps` |
| `src/data/benchmarks.ts` | **Public Creator Benchmark Loader & Provenance (`[DATA-02]`)** — loads and harmonizes GPU and CPU benchmarks from TechPowerUp, Hardware Unboxed, and Gamers Nexus, providing `getBenchmarkProvenance` citations |
| `src/data/knownGpuBenchmarks.ts` | **40+ Desktop GPU Benchmark Reference Database** — 1440p Ultra raster FPS, ray tracing FPS, TDP Watts, VRAM, and chip matching aliases (`matchKnownGpuChip`) |
| `src/data/realGpus.ts` | **Phase 2 Real-World GPU Dataset** — 18 desktop GPUs (`REAL_WORLD_GPUS`) across NVIDIA, AMD, and Intel with 1440p Raster/RT geomean FPS, VRAM, TBP Watts, and retail street pricing |
| `src/data/catalogs/` | **Versioned JSON Hardware Catalogs (`[DATA-01]`)** — versioned JSON datasets (`cpus.json`, `gpus.json`, `motherboards.json`, `ram.json`, `storage.json`, `coolers.json`, `cases.json`, `psus.json`) with mandatory source citations and audit dates on every component |
| `src/data/seedComponents.ts` | **Phase 3 Seed Component Catalogs** — typed real-world CPU, Motherboard, RAM, PSU, Storage (NVMe SSD), Case, and CPU Cooler candidates (`SEED_CPUS`, `SEED_MOTHERBOARDS`, `SEED_RAM_KITS`, `SEED_PSUS`, `SEED_STORAGES`, `SEED_CASES`, `SEED_COOLERS`) loaded from `src/data/catalogs/` |
| `src/lib/math/upgradeOptimizer.ts` | **Upgrade Optimizer Engine (`[BLD-06]`)** — evaluates optimal upgrade paths when users own hardware components, setting owned parts to $0 new expenditure, enforcing socket/RAM/PSU/clearance constraints, and extracting the Pareto frontier of net upgrade cost vs. performance |
| `src/data/budgetPresets.ts` | **Full Build & Upgrade Budget Presets** — typed presets for USD ($750 to $3,200) and BRL (R$ 4.500 to R$ 18.000) with target descriptions |
| `src/utils/storage.ts` | **Safe LocalStorage Layer** — `safeGetJSON`, `safeSetJSON`, `safeGetInt`, `safeGetBool`, `safeGetString`, and versioned schema migrations (`runStorageMigrations`) |
| `src/utils/currency.ts` | **Currency Formatter & Converter** — formats BRL (`R$ 3.899,99`) and USD (`$250`), plus bidirectional USD/BRL conversion (`convertUsdToBrl`, `convertBrlToUsd`) |
| `src/utils/i18n.ts` | **Lightweight Localization Dictionary (`[UX-06]`)** — type-safe translation helper supporting Brazil-first (`pt-BR`) and English (`en-US`) with plain-language, unslop copywriting |
| `src/utils/locales/types.ts` | **Localization Types & Schema (`[FIX-03]`)** — interface and type definitions for strict localized translation keys |
| `src/utils/locales/ptBR.ts` | **Brazilian Portuguese Dictionary (`[FIX-03]`)** — comprehensive pt-BR translations for all modes, components, and hardware labels |
| `src/utils/locales/enUS.ts` | **US English Dictionary (`[FIX-03]`)** — comprehensive en-US translations for all modes, components, and hardware labels |
| `src/utils/shoppingReasons.ts` | **Plain-Language Shopping Rationale Engine (`[UX-04]`)** — generates unslop shopping reasons with exact price savings, FPS percentages, VRAM longevity, and 8-component build breakdowns in `pt-BR` and `en-US` |
| `src/utils/shareBuild.ts` | **Save & Share Build Engine (`[BLD-07]`)** — encodes/decodes full 8-component PC build IDs, budget, and workload profile into URL query parameters, plus generates unslop markdown/plain-text parts lists for Discord, Reddit, and WhatsApp with safe clipboard copying |
| `src/utils/exportData.ts` | **Data Export Engine (`[UX-08]`)** — RFC 4180 compliant CSV export (`exportRankedGpusToCsv`), structured JSON export (`exportRankedGpusToJson`), and safe browser download (`downloadDataFile`) |
| `src/utils/__tests__/exportData.test.ts` | **Vitest Data Export Suite (`[UX-08]`)** — 4 unit tests covering CSV escaping, RFC 4180 compliance, JSON schema serialization, and DOM download trigger |

---

## 2. Frontend UI, Hooks & Visualization Layer (`src/`)

Vite + React 18 + Tailwind CSS v4 + Apache ECharts:

| Path | Purpose |
| :--- | :--- |
| `src/main.tsx` | React DOM entry point mounting `<App />` |
| `src/hooks/useOptimizerState.ts` | **Central Optimizer State & Persistence Hook** — manages dataset mode (`'real' \| 'custom' \| 'combined' \| 'synthetic'`), USD/BRL exchange rate (`exchangeRateUsdToBrl`), UI mode (`'simple' \| 'explorer' \| 'pro' \| 'builds'`), chart view (`'2d' \| '3d' \| 'hyper' \| 'axes' \| 'residuals'`), Stage 1–3 state, non-linear/linear extrapolation config, Hedonic OLS valuation attachment, user custom GPU database (`customGpus`), unified combined sandbox catalog merging, and `localStorage` persistence |
| `src/hooks/useFullSystemOptimizer.ts` | **Web Worker Combinatorial Optimizer Hook (`[BLD-04]`)** — resilient background optimizer dispatching combination calculations off the main thread with request ID serialization, race condition protection, activity telemetry (`isCalculating`), and automatic synchronous fallback |
| `src/workers/builderWorker.ts` | **Combinatorial Builder Web Worker (`[BLD-04]`)** — dedicated background thread executing `optimizeFullSystemBuilds` without UI thread frame drops |
| `src/App.tsx` | **Main Optimizer Workspace (`[PERF-01]`, `[UX-09]`)** — responsive layout shell with skip-link landmark, 4-tier experience switcher (`1. Simple Guide`, `2. Explorer`, `3. Pro Lab`, `4. Full Builds`), dataset switcher, Step 1/2 controls, chart view switcher, and `React.lazy` mode-based code splitting for heavy visualizers and modals |
| `src/components/AppHeader.tsx` | **Sticky Header & Global Navigation (`[UX-09]`)** — top navigation bar with brand, experience level buttons (`Simple`, `Explorer`, `Pro`, `Builds`), language/currency toggle (PT/EN), reset button, dataset selector, and deal importer trigger |
| `src/components/TopWinnerBanner.tsx` | **#1 TOPSIS Winner Banner** — top showcase banner for highest scoring GPU under active constraints and weights |
| `src/components/FullBuildExplorer.tsx` | **Phase 3 Full-Build Pareto Explorer UI ("Mario Kart Mode")** — interactive complete PC build optimizer with budget presets, custom budget slider, platform/socket filters, RAM generation filters, GPU vendor filters, hero card, trade-off alternatives, and leaderboard |
| `src/components/BuildFilterControls.tsx` | **Full-Build Filter & Preset Controls** — target workload selector, quick budget presets, interactive budget slider with BRL exchange estimation notices, platform/RAM/GPU vendor dropdowns, enthusiast constraints (CPU vendor, SFF/Mini-ITX form factor, AIO vs. Air cooler, RGB vs. Stealth aesthetics), and filter reset |
| `src/components/UpgradePlannerModal.tsx` | **Upgrade Planner Modal (`[BLD-06]`)** — interactive modal allowing users to lock owned parts to $0 cost, configure upgrade budget, inspect #1 recommended upgrade path with kept vs. new breakdowns and PSU headroom, and apply to Full Build Explorer |
| `src/components/BuildHeroCard.tsx` | **Top Recommended Build Hero Card** — full 8-component breakdown (CPU, GPU, Motherboard, RAM, Storage, Cooler, Case, PSU), total price, effective FPS, bottleneck telemetry, power load & headroom, visual budget distribution bar, and 1-click URL share / forum parts list copy |
| `src/components/PartSwapperModal.tsx` | **Interactive Part Swapper Modal (`[BLD-05]`)** — category-specific component alternatives picker with real-time price deltas, CPU/GPU FPS deltas, and physical/platform compatibility checks via `checkBuildCompatibility` |
| `src/components/BuildAlternatives.tsx` | **Step-Down & Step-Up Frontier Trade-Off Cards** — accessible trade-off cards comparing the active build against neighboring frontier options with exact dollar savings and performance deltas |
| `src/components/BuildLeaderboardTable.tsx` | **Pareto Build Leaderboard Table** — complete table of Pareto-optimal and candidate full PC builds with component specs, bottleneck telemetry, and select/inspect actions |
| `src/components/GpuDealImporterModal.tsx` | **Interactive GPU Deal Importer & Validator Modal** — 3-tab modal featuring Smart Paste (with one-click templates for Pichau, Terabyte, KaBuM, PCYes), Inspect & Validate card previews (cash/PIX vs. installment selector, benchmark links, editable specs), and My Deals database manager |
| `src/components/HardwareFilterPanel.tsx` | **Brand & Ecosystem Technology Filters** — multi-select brand chips (`NVIDIA`, `AMD`, `Intel`) and proprietary technology toggles (`DLSS 3+ Frame Gen`, `FSR 3 Frame Gen`, `AV1 Video Encode`, `Hardware Ray Tracing`, `CUDA / OptiX AI & 3D`) with live candidate counts |
| `src/components/DealbreakerFilterPanel.tsx` | **Stage 1 Dealbreaker Filters** — budget limit slider, min VRAM selectors, max TDP watt limit slider, and nested ecosystem technology toggles |
| `src/components/TopsisWeightsPanel.tsx` | **Stage 3 TOPSIS Priority Weights Panel** — quick buyer persona presets, sum-to-100% telemetry, per-objective importance weight sliders, and custom saved weight profiles |
| `src/components/CustomWeightProfilesManager.tsx` | **Custom Weight Profiles Manager (`[UX-08]`)** — named TOPSIS weight profile creation, listing, safe localStorage persistence, activation, and deletion |
| `src/components/LoadingFallbacks.tsx` | **Async Component Skeleton Loaders** — `ChartLoadingFallback` and `BuildExplorerLoadingFallback` with accessible aria roles and status text |
| `src/components/SimpleParetoGuide.tsx` | **Interactive Smart Buyer Guide** — answer-first beginner flow with 3-question intake (`Goal`, `Use Case`, `Budget`), above-the-fold #1 value recommendation hero + 2 alternatives, expandable 5-step Pareto math accordion with interactive 2D value curve and priority sliders |
| `src/components/SimpleGuideMathWalkthrough.tsx` | **Collapsible 5-Step Math Walkthrough Container** — modularized container holding 5-step storytelling progression, priority weight sliders, and interactive SVG value curve |
| `src/components/SimpleGuideStepStories.tsx` | **Steps 1–4 Storytelling Cards** — single-spec trap, 2D trade-offs, strictly dominated bad deal / value trap spotlight, and value frontier shortlist cards with inline budget/brand filters |
| `src/components/SimpleGuideStep5Priority.tsx` | **Step 5 Priority & Variable Controls** — 2-variable balance slider, 3D split presets, metric pickers, and live best-match spotlight |
| `src/components/BeginnerIntakeCard.tsx` | **3-Question Beginner Intake Card (`[UX-01]`, `[UX-11]`)** — accessible intake stepper selecting building goal (`GPU` vs. `Whole PC`), gaming style & resolution (`1080p Esports`, `1440p Sweet Spot`, `4K RT`, `Creator/AI`), and active currency budget pills |
| `src/components/SimpleGuidePickHero.tsx` | **#1 Top Pick GPU Hero & Alternatives (`[UX-01]`)** — prominent above-the-fold value recommendation hero card with plain-language shopping reasons, price-performance metrics, and 2 trade-off alternatives (`Step-Down Bargain` and `Step-Up Upgrade`) |
| `src/components/FullBuildPickHero.tsx` | **#1 Top Complete PC Build Hero & Alternatives (`[UX-11]`)** — unified beginner recommendation for complete systems, displaying total hardware cost, 8-component bill of materials, CPU/GPU bottleneck telemetry, and 1-click transition to Full Build Explorer |
| `src/components/SimpleGuideScatterPlot.tsx` | **Simple Guide Interactive 2D SVG Plot** — interactive scatter plot with step-function Pareto staircase, Mayerowitz Cobb-Douglas Iso-Utility curve, domination vectors, and hover inspector |
| `src/components/SimpleGuideWidgets.tsx` | **Simple Guide Mini Widgets** — `MiniWeightBar` priority share meter and `SkewedStatBar` hardware spec comparison bar |
| `src/components/HyperDimensionalExplorer.tsx` | **4D–7D Hyper-Space Explorer** — compares 3 to 7 hardware dimensions simultaneously (`Price`, `1440p FPS`, `Ray Tracing`, `VRAM`, `Power Draw`, `FPS/$100`, `FPS/100W`) with dynamic N-D Pareto dominance evaluation and 3 interactive projections: `1. ND Parallel Dominance` (Top=100% utility pillars, Dominance Proof Ribbon, and Hypercube Gate Slicers), `2. ND Star-Glyph Scatter` (embedded $K$-pointed radar polygon glyphs at each 2D coordinate), and `3. ND RadViz Gravity Arena` (360° spring-force dimensional equilibrium) |
| `src/components/ExtrapolationToolbar.tsx` | **Linear & Non-Linear Value Extrapolation Toolbar** — interactive control bar to toggle $/unit extrapolation rules (`Linear`, `Power-Law`, `Logarithmic`, `Sweet-Spot`), switch between GPU anchor and Custom Ratio (`$1000` for `10 GB` = `$100/GB`), and repaint GPUs below the margin as bad |
| `src/components/EChartsRenderer.tsx` | **Tree-Shaken ECharts Core Renderer (`[PERF-02]`)** — centralized wrapper around `echarts-for-react/lib/core` registering only required charts (`Scatter`, `EffectScatter`, `Line`, `Lines`, `Bar`, `Radar`, `Parallel`) and components (`Tooltip`, `Grid`, `Legend`, `DataZoom`, `MarkLine`, `MarkArea`, `Parallel`, `Radar`, `AxisPointer`, `LabelLayout`, `CanvasRenderer`), reducing vendor bundle size by ~392 kB |
| `src/components/ParetoScatterPlot.tsx` | **2D Pareto Frontier ECharts Scatter Plot** — plots valid GPUs (X/Y metric selectors, bubble size = VRAM), renders the step-function Pareto frontier curve and extrapolation curve, repaints nodes by active 2D/extrapolation status, and projects dominance vectors on hover |
| `src/components/Pareto3DCloud.tsx` | **Interactive 3D Multi-Objective Frontier Cube** — rotatable 3D perspective/orthographic projection (`Price` × `Raster FPS` × `VRAM / RT / Power`) with view-aware repainting, Utopia-corner-checked Voxel-Union Dominated Volume Hull, camera axis-pair presets (`X×Y`, `Z×Y`, `X×Z`), zoom, and pan |
| `src/components/AxisViewsGrid.tsx` | **Multi-Axis Matrix & Single-Axis Inspector** — 4-panel `2×2` grid showing Price vs. every hardware spec simultaneously with per-axis repainting, unified unoptimized shading, extrapolation rays, and a 1D Single-Axis Measurement Inspector |
| `src/components/ValueResidualsChart.tsx` | **Phase 2 Hedonic OLS Value Residuals Chart** — ECharts horizontal diverging bar chart ranking GPUs from most undervalued bargain (`-$`) to most overpriced (`+$`) against the OLS market baseline |
| `src/components/GpuLeaderboardTable.tsx` | **Ranked Leaderboard & Fair-Value Matrix** — live-sorted table displaying Pareto status, TOPSIS match score, street price, OLS Fair Market Value delta, comparison toggles, and CSV/JSON dataset export buttons (`[UX-08]`) |
| `src/components/ComparisonDrawer.tsx` | **Multi-GPU Comparison Drawer** — side-by-side ECharts Radar chart, Parallel Coordinates view, multi-criteria TOPSIS score breakdown view (`[UX-08]`), and head-to-head spec delta table for 2–4 selected GPUs |
| `src/components/TopsisScoreBreakdownView.tsx` | **TOPSIS Score Breakdown View (`[UX-08]`)** — multi-criteria Euclidean distance breakdown and metric closeness progress bars for compared GPUs |
| `src/index.css` | Tailwind v4 imports, `content-visibility: auto` containment boundaries, and custom dark scrollbar |

---

## 3. Automated Tooling (`scripts/` & `.agents/scripts/`)

| Path | Purpose |
| :--- | :--- |
| `scripts/check-docs.cjs` | Validates `AGENTS.md` character cap (<12,000 chars), internal markdown links, `.agents/skills/` frontmatter, `.claude/skills/` stub parity, and the 600/800-line file cap (with a shrink-only allowlist) |
| `scripts/validate-catalogs.cjs` | Validates schema conformance, numeric bounds, ID uniqueness, source citations, audit dates, and cross-catalog compatibility for all JSON hardware catalogs (`[DATA-01]`) |
| `.github/workflows/check.yml` | CI: `npm ci`, `npm run check`, `npm run build`, plus the Playwright e2e job, on every push to `main` and every PR |
| `scripts/snap.mjs` | `npm run snap`: starts Vite and saves desktop + phone screenshots of each mode to `snapshots/` (gitignored) |
| `src/__tests__/App.ui.test.tsx` | UI smoke tests (jsdom + Testing Library): each mode renders, budget changes the Simple top pick, share buttons copy links and feedback badges |
| `src/__tests__/PartSwapper.ui.test.tsx` | UI integration test (jsdom + Testing Library): interactive part swapping in Full Builds mode and live build metric updates (`[BLD-05]`) |
| `src/data/__tests__/catalogs.test.ts` | Vitest catalog suite (`[DATA-01]`): verifies all 8 JSON catalogs load, maintain unique IDs, include source/date metadata, and satisfy cross-platform compatibility |
| `src/lib/math/__tests__/benchmarkNormalization.test.ts` | **Vitest Benchmark Normalization Suite (`[DATA-02]`)** — 7 property tests verifying anchor re-centering, scale invariance, transitive bridge chaining, and geometric mean bounds |
| `src/lib/math/__tests__/upgradeOptimizer.test.ts` | **Vitest Upgrade Optimizer Suite** — 9 property and boundary tests verifying 0-cost accounting, socket preservation, PSU wattage guards, compact case clearance, and Pareto monotonicity |
| `src/utils/__tests__/shareBuild.test.ts` | Unit tests for build share URL encoding/decoding, parameter sanitization, and plain-text clipboard formatting |
| `src/utils/__tests__/plainLanguage.test.tsx` | Plain-language buyer copy regression tests ([`UX-03`]): asserts zero forbidden math jargon in Simple mode in pt-BR and en-US |
| `e2e/beginner.spec.ts` | Playwright e2e (`npm run test:e2e`): "a beginner gets a recommendation" on desktop and phone |
| `eslint.config.js` / `.prettierrc.json` | Lint (zero `any`, zero type assertions except `as const`, hooks rules) and formatting, both part of `npm run check` |
| `scripts/sync-claude-skills.cjs` | Generates/updates `.claude/skills/<name>/SKILL.md` pointer stubs from `.agents/skills/` (`npm run sync:skills`) |
| `.agents/scripts/block-dangerous-git.cjs` | PreToolUse hook blocking destructive git commands (`reset --hard`, `clean -f`, `checkout .`, force-push) |
| `.agents/scripts/context-budget.cjs` | UserPromptSubmit hook warning when session context crosses 150K / 225K tokens or 8 / 24 hours |
