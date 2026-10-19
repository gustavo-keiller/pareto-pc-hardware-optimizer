# ParetoPC — Roadmap & Task Board (`TODO.md`)

> Active engineering tasks, each with a stable ID. When an item ships, delete it from here and add a summary line to [`DONE.md`](DONE.md).
> The long-range master roadmap (all phases, decisions, and future milestones) is documented in [`ROADMAP.md`](ROADMAP.md). Copy items here using the template below when work starts.

## Task template

Every item uses this shape, so an agent knows where to look and when it is finished:

```markdown
- **`[ID]` Short title:**
  One or two sentences: what and why.
  - **Files likely touched:** `src/...`, `CODEMAP.md`
  - **Done when:** an observable condition (a test passes, a screen shows X, a check fails on Y).
  - **Test to add:** the invariant or behaviour test that proves it (`src/lib/.../__tests__/...`).
```

---

## 🧩 Active Tasks (Reprioritized from [`ROADMAP.md`](ROADMAP.md))

- **`[PERF-01]` Code-split by mode & Lazy Loading:**
  Lazy-load heavy Explorer, Pro Lab, and deal importer components (`ParetoScatterPlot`, `Pareto3DCloud`, `HyperDimensionalExplorer`, `ValueResidualsChart`, `ComparisonDrawer`, `GpuDealImporterModal`, `FullBuildExplorer`) via `React.lazy` and `Suspense`, so first-time visitors landing on Simple Guide download a much smaller initial bundle without downloading 3D WebGL or 7D multi-objective visualization libraries until needed.
  - **Files likely touched:** `src/App.tsx`, `src/components/`
  - **Done when:** bundle analyzer / build shows separate async chunks for heavy visualizers and initial bundle size is substantially reduced.
  - **Test to add:** UI tests in `src/__tests__/App.ui.test.tsx` verifying lazy-loaded components render cleanly with Suspense fallbacks.

- **`[PERF-02]` Slim ECharts tree-shaking:**
  Import only the specific ECharts modules used (`echarts/core`, `ScatterChart`, `RadarChart`, `ParallelChart`, `BarChart`, `GridComponent`, `TooltipComponent`, `CanvasRenderer`) via `echarts-for-react/lib/core` instead of importing the monolithic 1MB+ `echarts` bundle.
  - **Files likely touched:** `src/components/ParetoScatterPlot.tsx`, `src/components/ComparisonDrawer.tsx`, `src/components/ValueResidualsChart.tsx`
  - **Done when:** monolithic `echarts` import is replaced with selective tree-shaken components and `npm run check` passes.
  - **Test to add:** verify all charts render without missing module runtime errors in `npm run test` and `npm run test:e2e`.
