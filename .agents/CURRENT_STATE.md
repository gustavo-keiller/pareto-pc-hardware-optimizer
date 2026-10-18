# Current Project State — ParetoPC

> Snapshot of active work. Update **only** when 🔴 In Flight or 🔶 Decisions change (Rule 15).

## 🔴 In Flight

- `[P3-02]` Pre-Pruned Combinatorial Engine & Bottleneck Model (`src/lib/math/combinatorial.ts`).

## 🔶 Decisions Made Without Validation

- Defaulted the UI to **Simple Guide** mode (`uiMode = 'simple'`) and the **Real-World GPU Dataset** (`datasetMode = 'real'`, 18 GPUs) so normal users immediately get an approachable experience, while **Pro Math Mode** and the **Phase 1 Synthetic Sandbox (10 GPUs)** are one click away in the top header.

## 🟡 Recently Completed

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
