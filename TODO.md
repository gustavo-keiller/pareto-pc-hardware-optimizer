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

- **`[UX-07]` Smooth step-up between levels ("See the math behind this"):**
  Add a clear "See the math behind this" / "Ver a matemática desta escolha" transition button on recommendation cards in Simple Guide. Clicking it seamlessly transitions to Explorer (or Pro Lab for enthusiasts) keeping the active budget, resolution, and selected GPU highlighted in the 2D Pareto scatter plot and leaderboard table, so a beginner can smoothly grow into deeper MCDM views.
  - **Files likely touched:** `src/components/SimpleGuidePickHero.tsx`, `src/components/SimpleParetoGuide.tsx`, `src/App.tsx`, `src/utils/i18n.ts`
  - **Done when:** clicking "See the math" on any pick smoothly switches mode to Explorer, maintains active constraints, and selects the GPU in the inspection/comparison layer.
  - **Test to add:** UI integration test in `src/__tests__/App.ui.test.tsx` verifying level transition and GPU selection.

- **`[PERF-01]` Code-split by mode & Lazy Loading:**
  Lazy-load heavy Explorer/Pro components (`ParetoScatterPlot`, `Pareto3DCloud`, `HyperDimensionalExplorer`, `ValueResidualsChart`, `ComparisonDrawer`, `GpuDealImporterModal`) via `React.lazy` and `Suspense`, so first-time visitors landing on Simple Guide download a much smaller initial bundle without downloading 3D WebGL or 7D multi-objective visualization libraries until needed.
  - **Files likely touched:** `src/App.tsx`, `src/components/`
  - **Done when:** initial chunk size drops significantly and `npm run check` passes.
  - **Test to add:** test in `src/__tests__/App.ui.test.tsx` ensuring lazy components render smoothly when switching modes.
