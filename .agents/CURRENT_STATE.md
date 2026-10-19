# Current Project State — ParetoPC

> Snapshot of active work. Update **only** when 🔴 In Flight or 🔶 Decisions change (Rule 15).

## 🔴 In Flight
 
- `[BLD-01]`, `[BLD-02]` Complete 8-component PC build data model (Storage NVMe, Case, CPU Cooler) and physical clearance compatibility engine.
 
 ## 🔶 Decisions Made Without Validation
 
 - Defaulted the UI to **Simple Guide** mode (`uiMode = 'simple'`) and the **Real-World GPU Dataset** (`datasetMode = 'real'`, 18 GPUs) so normal users immediately get an approachable experience, while **Pro Math Mode** and the **Phase 1 Synthetic Sandbox (10 GPUs)** are one click away in the top header.
 
 ## 🟡 Recently Completed
 
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
