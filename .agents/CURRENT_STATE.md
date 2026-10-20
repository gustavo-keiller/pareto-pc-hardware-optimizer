# Current Project State — ParetoPC

> Snapshot of active work. Update **only** when 🔴 In Flight or 🔶 Decisions change (Rule 15).

## 🔴 In Flight

- `feat/bld-08-enthusiast-constraints`: Land enthusiast filtering criteria (SFF/Mini-ITX, AIO vs. Air cooler, RGB vs. Stealth, CPU vendor ecosystem), partition-safe intra-category pruning, seed hardware additions, and URL sharing.

## 🔶 Decisions Made Without Validation

- Defaulted the UI to **Simple Guide** mode (`uiMode = 'simple'`), the **Real-World GPU Dataset** (`datasetMode = 'real'`, 18 GPUs), and **Brazilian Portuguese / Reais** (`locale = 'pt-BR'`, `BRL`), so users testing locally get an instant zero-friction experience, while `[🇧🇷 PT (R$) | 🇺🇸 EN ($)]` and Pro Math Mode are one click away in the header.

## 🟡 Recently Completed

- **Enthusiast Constraints: SFF, AIO vs. Air, RGB & CPU Vendor (`[BLD-08]`, 2026-10-20):**
  - Added enthusiast filtering criteria across form factor (Mini-ITX / SFF, Micro-ATX, ATX), cooler type (AIO Liquid vs. Air), aesthetics (RGB vs. Stealth), and CPU vendor (AMD vs. Intel).
  - Enforced partition safety in intra-category pruning: compact Mini-ITX motherboards and SFF cases cannot be dominated by ATX parts; AIO coolers are preserved; aesthetic preferences are partitioned cleanly.
  - Expanded seed hardware catalog with Mini-ITX motherboards (B650I/B760I Lightning), SFF chassis (NR200P), 240mm AIO liquid coolers (Frozen Prism, Liquid Freezer III), and RGB RAM.
  - Supported URL sharing serialization and deserialization for all 4 enthusiast criteria.
  - Added accessible UI filter controls with full localization in `pt-BR` and `en-US`.
  - Backed by unit property tests in `src/lib/math/__tests__/enthusiastConstraints.test.ts` and UI integration tests in `src/__tests__/App.ui.test.tsx`.

- **Full Localization Integrity & Zero Inline Locale Ternaries (`[FIX-03]`, 2026-10-20):**
  - Modularized localization into typed dictionaries `src/utils/locales/ptBR.ts`, `enUS.ts`, and `types.ts` keeping each file well under the 800-line limit.
  - Eliminated all inline `locale === 'pt-BR' ? ... : ...` text ternaries across all UI components, routing all strings through `t(key, locale)`.
  - Replaced residual English terms in pt-BR mode (Montar PC table, header subtitle, badges, and modal controls).
  - Backed by integration tests verifying zero residual English terms in all 4 UI modes in pt-BR.

- **Workload Score and Bottleneck Model Estimate Labels (`[FIX-04]`, 2026-10-20):**
  - Added explicit "estimativa" / "estimate" badge tags and explanatory footnote in `BuildHeroCard.tsx` for workload FPS and bottleneck percentages until DATA-02 physical benchmark calibration.
  - Backed by UI integration tests in `src/__tests__/App.ui.test.tsx`.

- **Direct Shared Build Reconstruction (`[FIX-02]`, 2026-10-20):**
  - Ensured shared 8-component builds rebuild cleanly via `assemblePcBuild` even when off the receiver's local frontier sample.
  - Added missing part and budget warning banners for receiver awareness.
  - Backed by UI integration tests in `src/__tests__/App.ui.test.tsx`.

- **Safe Partition-Based Pruning Matching Brute Force (`[FIX-01]`, 2026-10-20):**
  - Replaced unpartitioned intra-category pruning with platform-safe partitions (CPUs partitioned by socket, RAM by generation, GPUs by TDP/length fit and vendor bonus).
  - Purged name-based `[TRAP]` pruning, ensuring platform-advantaged CPUs (e.g. Ryzen 7 5700X3D) are never discarded against cross-platform alternatives.
  - Backed by combinatorial property test proving `optimizeFullSystemBuilds` frontier equals unpruned brute-force across all 4 workloads and 4 budget levels.

- **Upgrade Mode ("I Already Have...") (`[BLD-06]`, 2026-10-19):**
  - Shipped dedicated pure math engine in `src/lib/math/upgradeOptimizer.ts` enabling hardware owners to lock existing components with $0 new cost towards their upgrade budget.
  - Enforced physical compatibility (AM4/AM5/LGA1700 socket retention, RAM generation match, PSU wattage headroom rejecting unsafe GPU pairings on 550W PSUs, and compact case clearance).
  - Evaluated the 2D Pareto frontier of upgrade paths (net upgrade cost vs. workload performance), calculating baseline scores, +FPS leaps, and component action breakdowns ("KEEP ($0)" vs "BUY NEW").
  - Extracted budget presets into `src/data/budgetPresets.ts` and delivered interactive `UpgradePlannerModal.tsx` in `FullBuildExplorer.tsx`.
  - Backed by 9 durable Vitest property tests in `src/lib/math/__tests__/upgradeOptimizer.test.ts` and UI integration tests in `src/__tests__/App.ui.test.tsx` (146 total tests passing).

- **Save & Share Builds via URL Encoding & Copy Parts List (`[BLD-07]`, 2026-10-19):**
  - Shipped pure URL encoding/decoding engine in `src/utils/shareBuild.ts` serializing all 8 component IDs, budget ceiling, workload profile, and active currency into URL search parameters.
  - Implemented 1-click clipboard export utilities generating unslop, human-readable parts list summaries formatted cleanly for Discord, Reddit, and WhatsApp with power draw and workload score in `pt-BR` and `en-US`.
  - Added "Share Link" and "Copy List" buttons with 2-second visual confirmation feedback to `BuildHeroCard.tsx`.
  - Initialized `FullBuildExplorer.tsx` and `useOptimizerState.ts` directly from URL search params on mount.
  - Backed by 5 Vitest unit tests in `src/utils/__tests__/shareBuild.test.ts` and UI smoke tests in `src/__tests__/App.ui.test.tsx` (136 total tests passing).

- **Performance Model Per Use Case (`[BLD-03]`, 2026-10-19):**
  - Extended continuous bottleneck formula and combinatorial optimization engine to evaluate workload-specific performance across 4 target profiles: 1080p Esports ($\alpha = 0.70$), 1440p Sweet Spot ($\alpha = 0.50$), 4K RT Enthusiast ($\alpha = 0.30$ + VRAM overflow penalty), and Creator & AI (32GB+ RAM, 16GB+ VRAM, NVIDIA CUDA/Tensor bonus, multi-core CPU).
  - Connected beginner Step 2 intake choice and Full Build selector pills directly into `optimizeFullSystemBuilds`.
  - Updated telemetry in hero cards, leaderboard tables, and trade-off comparison cards with dynamic score labels and units.
  - Backed by 9 property tests in `src/lib/math/__tests__/workloadModels.test.ts` and UI integration tests in `src/__tests__/App.ui.test.tsx` (130 total tests passing).

- **Slim ECharts Tree-Shaking (`[PERF-02]`, 2026-10-19):**
  - Replaced monolithic `echarts-for-react` imports with centralized, tree-shaken `EChartsRenderer.tsx` using `echarts-for-react/lib/core` and `echarts/core`.
  - Selectively registered only required charts (`Scatter`, `EffectScatter`, `Line`, `Lines`, `Bar`, `Radar`, `Parallel`) and components (`Tooltip`, `Grid`, `Legend`, `DataZoom`, `MarkLine`, `MarkArea`, `Parallel`, `Radar`, `AxisPointer`, `LabelLayout`, `CanvasRenderer`).
  - Reduced ECharts vendor chunk size by 392 kB minified (1,054 kB → 662 kB) and by 130 kB gzipped (350 kB → 220 kB).
  - Backed by 120 Vitest unit/UI tests and 4 Playwright browser e2e tests.

- **Code-Split by Mode & Lazy Loading (`[PERF-01]`, 2026-10-19):**
  - Lazy-loaded heavy visualizers, 3D WebGL charts, 7D hyper-dimensional views, full-build explorer, comparison drawer, and deal importer modals (`ParetoScatterPlot`, `Pareto3DCloud`, `AxisViewsGrid`, `ValueResidualsChart`, `HyperDimensionalExplorer`, `ComparisonDrawer`, `GpuDealImporterModal`, `FullBuildExplorer`) via `React.lazy` and `<Suspense>`.
  - Added responsive fallback skeletons (`ChartLoadingFallback`, `BuildExplorerLoadingFallback`).
  - Reduced monolithic initial JavaScript bundle from 1,548 kB (483 kB gzipped) down to 367 kB (101 kB gzipped), a ~79% download size reduction for beginners.
  - Backed by UI integration tests in `src/__tests__/App.ui.test.tsx` (120 tests passing) and 4 Playwright e2e tests.

- **Smooth Step-Up Between Levels ("See Math in 2D Explorer") (`[UX-07]`, 2026-10-19):**
  - Added a prominent "See Math in 2D Explorer →" / "Ver Cálculo no Explorador 2D →" transition button on the #1 recommended GPU hero card and quick-inspect compass buttons on both Step-Down Bargain and Step-Up Upgrade alternatives (`SimpleGuidePickHero.tsx`).
  - Seamlessly transitions user to Level 2 (Explorer mode), preserves active budget limits, and selects the chosen GPU so it is instantly highlighted with golden borders in the ECharts 2D scatter plot, TOPSIS leaderboard table, and multi-GPU comparison drawer.
  - Added localized prompt to Full Build hero card (`FullBuildPickHero.tsx`).
  - Backed by UI integration tests in `src/__tests__/App.ui.test.tsx` (120 tests passing across 11 suites).

- **Plain-Language Shopping Reasons for Picks & Builds (`[UX-04]`, 2026-10-19):**
  - Shipped pure shopping rationale engine in `src/utils/shoppingReasons.ts` generating unslop, plain shopping arguments without algorithmic jargon for both GPU recommendations and 8-component full PC builds in `pt-BR` and `en-US`.
  - GPU hero card (`SimpleGuidePickHero.tsx`) renders concrete comparative savings (e.g. "Economize R$ 313 (22% a menos) com a Radeon RX 6600 8GB, mantendo 51 FPS (69% da velocidade)"), FPS deltas, and VRAM longevity notes.
  - Complete PC build hero card (`BuildHeroCard.tsx`) renders personalized hardware rationales across all 8 component cards (CPU throughput & 0% bottleneck confirmation, GPU 1440p raster output, motherboard socket & M.2 slots, dual-channel RAM bandwidth, NVMe read speeds, PSU wattage & safety headroom, case clearance, and cooler TDP margin).
  - Backed by unit tests in `src/utils/__tests__/shoppingReasons.test.ts` (119 total tests passing across 11 suites).

- **Mobile Layout & Responsive Polish (`[UX-05]`, 2026-10-19):**
  - Redesigned top header navigation into a responsive 2-row layout on mobile phones (< 640px) featuring a compact brand row with instant language and reset controls, and an overflow-safe horizontal level navigation bar, shrinking mobile header height from ~280px to ~75px.
  - Prevented SVG scatter plot label collisions by showing text labels exclusively on key winners/traps and user hover instead of all 2D frontier items simultaneously.
  - Added currency-aware formatting to SVG chart axes and node prices (`formatCurrency(tick, currency)`).
  - Resolved "0 compatible builds" bug in Full Builds and Simple Guide under BRL by dynamically converting seed components to BRL and introducing currency-aware budget presets (`R$ 4.500` to `R$ 18.000` in BRL vs `$750` to `$3,200` in USD).
  - Verified across 117 Vitest unit/UI tests, 4 Playwright desktop and mobile e2e tests, and desktop/phone visual snapshots (`snapshots/simple-phone.png`, `snapshots/builds-phone.png`).

- **Plain-Language Buyer Copy Pass on Simple Guide (`[UX-03]`, 2026-10-19):**
  - Audited and purged all mathematical MCDM jargon ("Pareto", "TOPSIS", "Strictly Dominated", "tradeoff hyperplane") from the Simple Guide experience in both Portuguese (`pt-BR`) and English (`en-US`), replacing with plain shopping vocabulary ("Bom Negócio" / "Good Deal", "Combina" / "Match", "Peças Desvantajosas" / "Overpriced Bad Deals", "Curva de Melhores Negócios" / "Best-Deal Line").
  - Fixed `BuildHeroCard` header badge to render `#1 Recommended PC Build (Best Value)`, eliminating residual "(Pareto Frontier)" jargon.
  - Enhanced `formatCurrency` with safe `isAppLocale` type guard and normalized fraction digits.
  - Backed by 4 durable plain-language regression property tests in `src/utils/__tests__/plainLanguage.test.tsx` (116 total Vitest tests passing across 10 suites).

- **Country-Agnostic Money & Language Layer (Brazil-First Default) & Simple Guide Decomposition (`[UX-06]`, 2026-10-19):**
  - Shipped `src/utils/i18n.ts`: `AppLocale` (`'pt-BR' | 'en-US'`), `DEFAULT_LOCALE = 'pt-BR'`, typed zero-jargon dictionary, and `t(key, locale)` helper.
  - Shipped `src/utils/currency.ts`: locale-aware `formatCurrency` with non-breaking space normalization and currency formatting.
  - Added header locale toggle `[🇧🇷 PT (R$) | 🇺🇸 EN ($)]` in `src/App.tsx` and state hook in `src/hooks/useOptimizerState.ts`.
  - Decomposed `SimpleParetoGuide.tsx` from 1,898 lines down to 318 lines into `SimpleGuideStepStories.tsx`, `SimpleGuideMathWalkthrough.tsx`, and `SimpleGuideStep5Priority.tsx`.
  - Permanently removed `SimpleParetoGuide.tsx` from `OVERSIZED_FILE_ALLOWLIST` in `scripts/check-docs.cjs`.
  - Extracted `DealbreakerFilterPanel.tsx` from `src/App.tsx`, reducing `App.tsx` to 1007 lines.
  - Backed by 5 unit tests in `src/utils/__tests__/i18n.test.ts` and UI test in `src/__tests__/App.ui.test.tsx` (112 tests passing across 9 suites).

- **Complete 8-Component PC Build Data Model & Physical Clearance Compatibility Engine (`[BLD-01]`, `[BLD-02]`, 2026-10-19):**
  - Expanded full PC build tuple to 8 components (`StorageCandidate`, `CaseCandidate`, `CoolerCandidate`).
  - Added physical clearance checks: Case form factor, GPU length clearance, cooler height clearance, cooler socket brackets, cooler thermal TDP headroom, and M.2 NVMe slot availability with millimeter-precise rejection reasons.
  - Added intra-category pruning for storage, cases, and coolers maintaining sub-20ms combinatorial search.
  - Updated `BuildHeroCard` with 8-part grid and full budget distribution breakdown.
  - Backed by 27 `buildTypes` tests, 16 `combinatorial` tests (106 total Vitest tests passing).

- **Answer-First Beginner Flow & Unified Whole-PC Journey (`[UX-01]`, `[UX-02]`, `[UX-11]`, 2026-10-19):**
   - Transformed Simple Guide into an answer-first flow with `BeginnerIntakeCard.tsx` (Goal, Resolution, Budget), displaying #1 GPU hero card with plain-language shopping reasons (`SimpleGuidePickHero.tsx`) and 2 trade-off alternative cards (`Step-Down Bargain` and `Step-Up Upgrade`).
   - For users choosing "A Whole PC Build", directly embeds the top Pareto complete build under budget (`FullBuildPickHero.tsx`) with 5-component bill of materials, bottleneck telemetry, total hardware cost, and 2 alternative builds.
   - Hid expert controls (dataset switcher, USD/BRL currency conversion input, Import Deals) in Simple Guide mode header.
   - Extracted SVG scatter plot to `SimpleGuideScatterPlot.tsx` to maintain strict compliance with file size limits.
   - Backed by 95 Vitest tests and verified with `npm run check`.


- **Phase 1: Fix "Smart Buy" Labels, Eliminate Trap Endorsements & Sensible Default Budget (`[UX-12]`, `[UX-13]`, 2026-10-19):**
  - Resolved trust defects in Simple Guide: cards marked `[TRAP]` (e.g. RTX 4060 Ti 16GB, RTX 4060 Ti 8GB, RTX 3060 12GB) and dominated cards are never labeled "Smart Buy" or recommended as top choices, and clearly show "Bad Value Trap".
  - Restricted Simple Guide Pareto dominance strictly to active user criteria (`['price', 'rasterFps1440p']`).
  - Replaced $1800 "All" default budget with accessible $550 sweet-spot budget (R$ 5.000 in Combined BRL mode) so beginners immediately get an approachable recommendation (e.g. RX 7800 XT / Arc B580) instead of an $890+ halo GPU.
  - Decomposed `SimpleParetoGuide.tsx` by extracting mini widgets (`MiniWeightBar`, `SkewedStatBar`) into `src/components/SimpleGuideWidgets.tsx` (bringing `SimpleParetoGuide.tsx` well under its allowlist ceiling).
  - Backed by unit and UI integration tests (92 Vitest tests passing, Playwright e2e passing).

- **Phase 3: Combined Sandbox Mode with Live USD/BRL Currency Conversion (`[P3-04]`, 2026-10-19):**
  - Shipped `src/utils/currency.ts`: `convertUsdToBrl`, `convertBrlToUsd`, and `DEFAULT_USD_TO_BRL_RATE` (5.70), backed by 4 unit tests.
  - Implemented `'combined'` dataset mode in `src/hooks/useOptimizerState.ts` with real-time currency conversion, merging the 18 Real-World GPU benchmarks with custom user imported retail deals.
  - Added USD/BRL editable exchange rate input in header bar and store badges distinguishing live retail deals from US benchmark baselines (`US Baseline Ref ($MSRP)`) in `src/components/GpuLeaderboardTable.tsx`.
  - Added UI test in `src/__tests__/App.ui.test.tsx` verifying Combined Sandbox mode rendering and BRL formatting.

- **Phase 3: Full-Build Pareto Explorer UI ("Mario Kart Mode") (`[P3-03]`, 2026-10-19):**
   - Shipped `src/components/FullBuildExplorer.tsx`, `src/components/BuildHeroCard.tsx`, `src/components/BuildLeaderboardTable.tsx`, and `src/components/TopWinnerBanner.tsx`.
   - Wired 4th experience mode (`4. Full Builds`) into `src/App.tsx` and `src/hooks/useOptimizerState.ts`.
   - Interactive budget presets ($800, $1200, $1600, $2200, $3000) and custom slider, platform/socket filters (AM4, AM5, LGA1700, LGA1851), RAM generation filters (DDR4, DDR5), and GPU vendor filters (NVIDIA, AMD, Intel).
   - Component breakdown, power load, PSU headroom gauge, bottleneck warning telemetry, and budget distribution bar.
   - Decomposed `src/App.tsx` down to 1077 lines (safely below the 1125 ceiling in `OVERSIZED_FILE_ALLOWLIST`).
   - Added UI tests in `src/__tests__/App.ui.test.tsx` (81 passing tests) and e2e test in `e2e/beginner.spec.ts`.
 

- **Phase 3: Pre-Pruned Combinatorial Engine & Bottleneck Model (`[P3-02]`, 2026-10-19):**
  - Shipped `src/lib/math/combinatorial.ts`: intra-category Pareto pruning (`pruneDominatedCpus`, `pruneDominatedRam`, `pruneDominatedMotherboards`, `pruneDominatedPsus`).
  - Constraint-propagating backtracking generator (`generateCompatibleBuilds`) guaranteeing 100% physically valid builds.
  - System-level 2D Pareto dominance engine (`evaluateBuildParetoFrontier`) across Total Price vs. Effective FPS, plus user criteria filtering (`optimizeFullSystemBuilds`).
  - Added 12 Vitest property tests in `src/lib/math/__tests__/combinatorial.test.ts`.

- **Phase 3: Multi-Component Datasets & Schemas (`[P3-01]`, 2026-10-18):**
  - Shipped `src/lib/math/buildTypes.ts`: typed schemas for `CpuCandidate`, `MotherboardCandidate`, `RamCandidate`, `PsuCandidate`, and `PcBuild`.
  - Implemented Stage 1 build compatibility rules (`checkBuildCompatibility`), CPU-GPU bottleneck model (`computeCpuGpuBottleneck`), power estimation (`calculateEstimatedPowerDraw`), and recommended PSU wattage.
  - Added `src/data/seedComponents.ts` with real-world benchmarked parts for AM4, AM5, LGA1700, and LGA1851 platforms.
  - Added 20 Vitest unit tests in `src/lib/math/__tests__/buildTypes.test.ts`.

- **Phase 2: Real-World GPU Dataset, Hedonic OLS Regression, 3D Cloud & Simple/Pro UI (2026-10-18):**
  - Fixed the 2D vs. 5D Pareto visualization bug in `ParetoScatterPlot.tsx` by introducing **5D Specialist** diamond markers (`◆`) for cards that sit below the 2D Price/Raster staircase yet survive in 5D due to superior Ray Tracing, VRAM, or low Power draw.
  - Added `src/data/realGpus.ts` (18 real-world GPUs) and `src/lib/math/regression.ts` (log-linear Hedonic OLS fair-value regression).
  - Added `src/components/Pareto3DCloud.tsx` (interactive 3D rotatable frontier cube) and `src/components/ValueResidualsChart.tsx` (OLS Fair Market Value diverging bar chart).
  - Decomposed `src/App.tsx` using `src/hooks/useOptimizerState.ts` (`localStorage` persistence via `src/utils/storage.ts`) and `src/components/GpuLeaderboardTable.tsx`.
- **Phase 1: Synthetic GPU Sandbox:** Shipped pure MCDM math engine (`pareto.ts`, `topsis.ts`, `types.ts`), interactive 2D ECharts Pareto scatter plot, TOPSIS preference sliders, and Radar/Parallel Coordinates comparison drawer.
