# Current Project State — ParetoPC

> Snapshot of active work. Update **only** when 🔴 In Flight or 🔶 Decisions change (Rule 15).

## 🔴 In Flight

- `[UX-05]` Mobile layout & responsive polish (compact single-row header navigation, ensure 360px-420px viewport layouts fit without clipping).

## 🔶 Decisions Made Without Validation

- Defaulted the UI to **Simple Guide** mode (`uiMode = 'simple'`), the **Real-World GPU Dataset** (`datasetMode = 'real'`, 18 GPUs), and **Brazilian Portuguese / Reais** (`locale = 'pt-BR'`, `BRL`), so users testing locally get an instant zero-friction experience, while `[🇧🇷 PT (R$) | 🇺🇸 EN ($)]` and Pro Math Mode are one click away in the header.

## 🟡 Recently Completed

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
