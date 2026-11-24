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

### 🔴 Black Friday launch blockers (due Wed 2026-11-25; full context in [`docs/plan/01-black-friday-launch.md`](docs/plan/01-black-friday-launch.md))

- **`[BF-B3]` Honest price labels:**
  Offers not verified from a product page show "reference price · checked <date>", are greyed after 72 h, and never drive a "deal" claim. Top 40 parts verified by hand from product pages.
  - **Files likely touched:** `src/data/prices/{br,us}.json`, `src/data/storePrices.ts`, price badge components, `src/utils/locales/*`
  - **Done when:** every price on screen shows its age; the top 40 offers link to product pages, not search pages.
  - **Test to add:** a test that an offer older than 72 h is flagged stale (`src/lib/math/__tests__/pricingEngine.test.ts`).
- **`[BF-B8]` "See price on Amazon" link:**
  Amazon offers were removed from `br.json`/`us.json` (BF-B5), so parts sold only there show an estimate with no store link. Once an Amazon Associates account is approved, add link-only Amazon offers (no `price`) and a "see price on Amazon" button next to the estimate.
  - **Files likely touched:** `src/lib/math/pricingEngine.ts`, `src/data/storePrices.ts`, `src/components/{SimpleGuidePickHero,BuildHeroCard}.tsx`, `src/utils/locales/*`
  - **Done when:** an Amazon-only part shows its estimate plus a "see price on Amazon" link, and no Amazon number.
  - **Test to add:** UI test asserting the Amazon link renders with no currency amount beside it.
- **`[BF-B6]` Analytics actually load:**
  `telemetry.ts` calls `window.plausible`, but no analytics script is loaded. Add Cloudflare Web Analytics.
  - **Files likely touched:** `index.html`, `src/utils/telemetry.ts`
  - **Done when:** a visit to the deployed site appears in the analytics dashboard.
  - **Test to add:** none.
- **`[BF-B7]` One host, one domain:**
  Cloudflare Pages (keeps `functions/go/`); replace the `paretopc.com` placeholder with the chosen domain (D-4) in canonical, OG, sitemap, guides and share cards; remove or document `vercel.json`.
  - **Files likely touched:** `index.html`, `public/sitemap.xml`, `public/robots.txt`, `scripts/generate-seo-pages.cjs`, `src/utils/shareBuild.ts`, `src/components/SocialShareModal.tsx`, `vercel.json`
  - **Done when:** the live domain serves the app, `/guides/` and `/go/<id>`.
  - **Test to add:** extend `src/data/__tests__/seoGuides.test.ts` to assert guides use the configured domain.

### Other tasks
- **`[PRI-12]` Use the priority score in Explorer and Pro leaderboards:**
  Explorer/Pro still rank with TOPSIS, which is relative to the list (see `CONTEXT.md` §3.4). Show the priority score (§3.5) as the main column and keep TOPSIS as "second opinion".
  - **Files likely touched:** `src/components/GpuLeaderboardTable.tsx`, `src/components/TopsisWeightsPanel.tsx`, `src/hooks/usePriorityRanking.ts`, `CODEMAP.md`
  - **Done when:** the Explorer #1 equals the Simple #1 for the same priorities and budget.
  - **Test to add:** UI test comparing the Simple and Explorer #1 under each use-case preset.

- **`[PRI-13]` Per-resolution benchmarks for the 1080p and 4K use cases:**
  Both presets score on 1440p FPS with goals scaled by hand. Add 1080p/4K FPS fields so the FPS goal is in the user's real resolution, and label scaled numbers "estimated" until then.
  - **Files likely touched:** `src/data/catalogs/gpus.json`, `src/lib/math/priorityModel.ts`, `src/lib/math/priorityProfiles.ts`
  - **Done when:** the 4K preset's FPS goal is expressed in 4K FPS.
  - **Test to add:** catalog test that every GPU has the new fields or is marked estimated.

- **`[UX-12]` Finish pt-BR translation of the Explorer & Pro chart internals:**
  `[UX-11]` translated the panels around the charts, but text inside them is still English in pt-BR: the extrapolation toolbar ("Extrapolation Rule"), scatter-plot controls and tooltips ("Scroll to Zoom • Drag to Pan", "Reset Zoom"), axis titles in `AxisViewsGrid`, the 3D cloud and hyper-graph labels, the deal importer modal, GPU technology badges (`KNOWN_GPU_TECHNOLOGIES`), dominance reason sentences, and catalog `notes` (e.g. "Budget 12GB disruptor…", which also quotes USD prices in BRL view).
  - **Files likely touched:** `src/components/{ExtrapolationToolbar,ParetoScatterPlot,AxisViewsGrid,Pareto3DCloud,HyperDimensionalExplorer,GpuDealImporterModal}.tsx`, `src/lib/math/capabilities.ts`, `src/data/realGpus.ts`, `src/utils/locales/*`
  - **Done when:** switching to 🇧🇷 PT and opening every Explorer/Pro chart view shows no English UI text (proper nouns and math symbols excepted).
  - **Test to add:** a UI test in `src/__tests__/App.ui.test.tsx` that opens each chart view in pt-BR and asserts the known English labels are absent.

_All planned engineering backlog items from Phases 0–6 (`[DATA-07]`, `[DATA-08]`, `[DATA-09]`, `[LAUNCH-04]`, `[AFF-04]`, `[AFF-06]`, `[AFF-07]`) are now implemented and archived in [`DONE.md`](DONE.md). Remaining non-code go-live operations (Cloudflare Pages / Vercel deploy, DNS attachment per `D-4`, submitting `sitemap.xml`, affiliate portal account verification, and external buyer tests per `R-1`) are documented in [`ROADMAP.md`](ROADMAP.md) and [`.agents/specs/business-and-creator-engine.md`](.agents/specs/business-and-creator-engine.md)._
