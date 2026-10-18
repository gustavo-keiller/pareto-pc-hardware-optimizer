# Spec: Phase 2 (Real GPU Dataset + Hedonic OLS), 5D/3D Frontier Fix & Simple vs. Pro UI Decomposition

**Status:** In Progress  
**Date:** 2026-10-18  
**Tasks Covered:** `[ARCH-01]`, `[ARCH-02]`, `[P2-01]`, `[P2-02]`, `[P2-03]`, plus user feedback on 5D Dominance visual decoupling, 3D Frontier Cloud, and Simple vs. Pro UI mode.

---

## 1. Root Cause Analysis of User Feedback

1. **Bug: "Right now the 5D version does nothing"**
   - In `ParetoScatterPlot.tsx`, the scatter points were partitioned into `optimalData` vs `trapData` using `frontierIdSet` from `get2DParetoFrontierCurve(gpus, xMetric, yMetric)` (which always evaluates 2D dominance on `[xMetric, yMetric]`) instead of `gpu.isParetoOptimal` (which reflects the active 2D or 5D `evaluateParetoFrontier` pass).
   - Furthermore, on the 10-card synthetic dataset, the 3 trap cards (`gpu-3`, `gpu-5`, `gpu-8`) are dominated across all 5 metrics simultaneously, so even in the table their status didn't change.
   - **Fix:**
     - Color/classify scatter points by `gpu.isParetoOptimal` (distinguishing cards that are 5D-optimal because of VRAM/RT/Efficiency even if they sit below the 2D X/Y staircase).
     - Add an interactive **Active Pareto Objectives** pill selector (`Price`, `1440p Raster`, `1440p RT`, `VRAM`, `Power TBP`) + the **Real-World GPU Dataset** where 2D vs. Multi-Objective dominance dramatically shifts which cards survive (e.g., an RTX 4070 Super vs RX 7800 XT trade-off on Price/Raster vs Ray Tracing/Power).

2. **UX Issue: "The UI also looks very complex for the normal user"**
   - Showing raw mathematical notation ($C_i$, $d^+$, $d^-$, $\sum w_j = 1$, axis selectors, 5 sliders, 3 constraint filters, 2D/5D toggles) all at once overwhelms a regular PC buyer.
   - **Fix:** Introduce a top-level **Simple Mode (Buyer Guide)** vs. **Pro Mode (MCDM Workbench)** toggle (defaulting to Simple Mode or switchable anytime):
     - **Simple Mode:** Clean, guided 3-step experience ("1. Set Your Budget & VRAM", "2. Pick Your Gaming Style", "3. Top Recommended GPU & Value Traps to Avoid") with plain-English badges (*"Great Value — $45 below fair market price"*), hiding raw mathematical notation and advanced axis toggles.
     - **Pro Mode:** Full MCDM workbench with custom X/Y/Z axis selectors, 2D vs. 3D Cloud toggle, custom objective checkboxes, Hedonic OLS regression residuals, and $C_i / d^+ / d^-$ telemetry.

---

## 2. Deliverables & Module Architecture

1. **`src/lib/math/types.ts`**
   - Extend `GpuCandidate` with optional `architecture`, `vramType`, `lengthMm` fields.
   - Add `HedonicRegressionResult` and `GpuValuation` interfaces (`fairPrice`, `residualUsd`, `residualPct`, `valueTier`: `'bargain' | 'fair' | 'overpriced'`).
   - Extend `RankedGpu` with `valuation?: GpuValuation`.

2. **`src/lib/math/regression.ts` (`[P2-02]`)**
   - Pure TypeScript log-linear Ordinary Least Squares (OLS) solver:
     $$\ln(\text{Price}_i) = \beta_0 + \beta_1 \cdot \text{RasterFPS}_i + \beta_2 \cdot \text{RT\_FPS}_i + \beta_3 \cdot \text{VRAM}_i + \beta_4 \cdot \text{TBP}_i + \epsilon_i$$
   - Uses Gaussian elimination with partial pivoting and Tikhonov regularization ($\lambda = 10^{-6}$) for numerical stability on small or collinear subsets.
   - Computes $\hat{P}_i = \exp(\hat{y}_i)$, `residualUsd = price - fairPrice`, `residualPct = ((price - fairPrice) / fairPrice) * 100`, and $R^2$ goodness-of-fit.

3. **`src/data/realGpus.ts` (`[P2-01]`)**
   - Curated 18-card Real-World GPU Benchmark Dataset (RX 6600, Arc B580, RTX 4060, RX 7600 XT, RX 6750 XT, RTX 4060 Ti 8GB [Trap], RTX 4060 Ti 16GB, RX 7700 XT, RX 7800 XT, RTX 4070 Super, RX 7900 GRE, RTX 4070 Ti Super, RX 7900 XT, RTX 4080 Super, RX 7900 XTX, RTX 4090, etc.) with realistic 1440p Raster/RT geomean FPS, VRAM, TBP Watts, and street pricing.

4. **`src/hooks/useOptimizerState.ts` (`[ARCH-01]`, `[ARCH-02]`)**
   - Central custom hook managing dataset selection (`'real' | 'synthetic'`), UI mode (`'simple' | 'pro'`), chart view (`'2d' | '3d' | 'residuals'`), hard constraints, active Pareto objectives, TOPSIS weights, and comparison selection, persisted via `safeGetJSON`/`safeSetJSON` (`src/utils/storage.ts`) + URL query param sharing.

5. **Focused UI Components (`[ARCH-01]`, `[P2-03]`)**
   - `src/components/ParetoScatterPlot.tsx`: Fixed 2D vs. Multi-Objective rendering (distinct badge/ring for cards that are N-dimensional Pareto-optimal even when off the 2D X/Y curve) + optional OLS Fair-Value curve.
   - `src/components/Pareto3DCloud.tsx`: Interactive 3D Multi-Objective Cloud (`Price` vs. `1440p Raster FPS` vs. `VRAM / Ray Tracing / Fair Value`) with mouse orbit/zoom, 3D depth cues, and Pareto optimal vs. trap coloring.
   - `src/components/ValueResidualsChart.tsx`: Hedonic OLS Fair-Market Price vs. Retail Price bar/diverging chart (`[P2-03]`).
   - `src/components/GpuLeaderboardTable.tsx`: Extracted leaderboard table with OLS Fair Price & Value Delta badges.
