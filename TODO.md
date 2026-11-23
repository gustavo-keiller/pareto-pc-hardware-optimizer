# ParetoPC — Roadmap & Task Board (`TODO.md`)

> Active engineering tasks, each with a stable ID. When an item ships, delete it from here and add a summary line to [`DONE.md`](DONE.md).
> The long-range master roadmap and 5-stage business/creator plan live in [`ROADMAP.md`](ROADMAP.md) and [`.agents/specs/business-and-creator-engine.md`](.agents/specs/business-and-creator-engine.md). Copy items here using the template below when work starts.

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

## 🧩 Active Tasks

- **`[UX-12]` Finish pt-BR translation of the Explorer & Pro chart internals:**
  `[UX-11]` translated the panels around the charts, but text inside them is still English in pt-BR: the extrapolation toolbar ("Extrapolation Rule"), scatter-plot controls and tooltips ("Scroll to Zoom • Drag to Pan", "Reset Zoom"), axis titles in `AxisViewsGrid`, the 3D cloud and hyper-graph labels, the deal importer modal, GPU technology badges (`KNOWN_GPU_TECHNOLOGIES`), dominance reason sentences, and catalog `notes` (e.g. "Budget 12GB disruptor…", which also quotes USD prices in BRL view).
  - **Files likely touched:** `src/components/{ExtrapolationToolbar,ParetoScatterPlot,AxisViewsGrid,Pareto3DCloud,HyperDimensionalExplorer,GpuDealImporterModal}.tsx`, `src/lib/math/capabilities.ts`, `src/data/realGpus.ts`, `src/utils/locales/*`
  - **Done when:** switching to 🇧🇷 PT and opening every Explorer/Pro chart view shows no English UI text (proper nouns and math symbols excepted).
  - **Test to add:** a UI test in `src/__tests__/App.ui.test.tsx` that opens each chart view in pt-BR and asserts the known English labels are absent.

_All planned engineering backlog items from Phases 0–6 (`[DATA-07]`, `[DATA-08]`, `[DATA-09]`, `[LAUNCH-04]`, `[AFF-04]`, `[AFF-06]`, `[AFF-07]`) are now implemented and archived in [`DONE.md`](DONE.md). Remaining non-code go-live operations (Cloudflare Pages / Vercel deploy, DNS attachment per `D-4`, submitting `sitemap.xml`, affiliate portal account verification, and external buyer tests per `R-1`) are documented in [`ROADMAP.md`](ROADMAP.md) and [`.agents/specs/business-and-creator-engine.md`](.agents/specs/business-and-creator-engine.md)._
