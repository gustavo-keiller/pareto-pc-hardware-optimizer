# ParetoPC — Master Roadmap & Todo List (`ROADMAP.md`)

> Goal: the app can take anyone, from "I don't know what a GPU is" to "show me the 7D frontier", to a complete, compatible, well-priced dream PC.
> Re-evaluated 2026-11-22: 5-stage commercialization & creator-distribution master plan documented in [`.agents/specs/business-and-creator-engine.md`](.agents/specs/business-and-creator-engine.md). Item IDs follow the repo's `TODO.md` convention: active work is copied into `TODO.md`, shipped work moves to `DONE.md`, and this file is ticked in the same PR.
> Order inside each phase = priority. Phases 0 and 1 can run in parallel; Phase 2 is the core product goal.

---

## Where the project stands (re-checked 2026-11-22)

**Shipped since the first roadmap:** Phase 0 (CI, lint, UI tests, `npm run snap`, glossary); the answer-first beginner flow ending in a graphics card or a whole PC (UX-01/02/11); trust fixes (UX-12/13); plain words, phone layout, pt-BR + reais (UX-03/05/06); shopping reasons (UX-04); step-up to Explorer (UX-07); accessibility and pro extras (UX-08/09); autonomous beginner usability audit + GPU URL share parity (`[UX-10]`); Influencer & Group Social Spec Card Studio (`[SHARE-01]`) with 1200×630 PNG export, priority percentages, and creator link captions; full 8-part PC builder with clearance fit checks (BLD-01/02), use-case scores (BLD-03), background Web Worker engine (BLD-04), interactive part swapper (BLD-05), upgrade mode (BLD-06), share links (BLD-07), and enthusiast constraints (BLD-08); 124 catalog parts, creator benchmarks, and BR/US store pricing (`DATA-01`–`DATA-06`); code splitting, slim ECharts, Knip dead-code CI, performance budgets, and Web Worker/TOPSIS memoization (`PERF-01`–`PERF-06`).

**Phase status:** Phases 0, 1, 2, 3, 4, 5, and 6 codebases are 100% implemented (`[LAUNCH-01]`–`[LAUNCH-05]`, `[SHARE-01]`, `[DATA-01]`–`[DATA-09]`, `[DATA-BF26]`, and `[AFF-01]`–`[AFF-07]` shipped). Operational live-deployment actions (connecting domain DNS / Cloudflare Pages / Plausible & running live creator outreach / external sessions) happen on deployment. See [`.agents/specs/business-and-creator-engine.md`](.agents/specs/business-and-creator-engine.md) for the complete cross-thread strategy and research tracks.

**Reality check (2026-11-24):** "implemented" above means the code exists on the local branch `feat/ux-usability-visual-flow`; none of it is on GitHub `main` or deployed yet, prices are mostly unverified reference prices, and affiliate tags are placeholders. The dated launch + long-term plan, including launch blockers `[BF-B2]`–`[BF-B7]`, lives in [`docs/plan/`](docs/plan/README.md).

**Known problems (see `TODO.md`):**
- Real retail price catalogs are established for key hardware; expanding coverage to remaining long-tail components over time via `npm run add-part`.

**Process:** `main` had 8 red CI runs out of 12 on 2026-10-19 because work was pushed straight to it. From now on everything goes through PRs (see "How work lands on `main`" in `AGENTS.md`); branch protection on `main` is still to be turned on.

---

## Decisions (updated 2026-10-18 from gustavo's answers)

- [x] **D-1 Market:** country-agnostic app, **Brazil first** for testing. Every price carries a currency and a region; nothing hardcodes BRL or USD. UI starts in pt-BR with English as a second language.
- [x] **D-2 No live prices, no server for now.** The GitHub repo is the database: catalogs and prices are JSON files, updated by commits/PRs (by hand, or through the existing deal importer exporting JSON). The app reads them at build time. A server only comes back if affiliate click tracking (AFF-06) needs one.
- [x] **D-3 Benchmarks: leaning towards public creator results** (YouTube channels like Linus Tech Tips, Hardware Unboxed, Gamers Nexus, TechPowerUp). Harmonized normalization engine shipped in DATA-02.
- [ ] **D-4 Name/brand & domain:** open; not needed until LAUNCH-01.

---

## Phase 0 — AI efficiency & foundations (Completed)

- [x] **`[AI-01]` CI on every push/PR.** Add `.github/workflows/check.yml`: `npm ci`, `npm run check`, `npm run build`. _Done in PR #1._
- [x] **`[AI-02]` Lint + format as part of `npm run check`.** ESLint (`typescript-eslint`, `react-hooks`, `no-explicit-any`, `consistent-type-assertions`) + Prettier. Replace the `as MetricKey` casts with one `isMetricKey()` guard in `types.ts`. _Done in PR #1._
- [x] **`[AI-03]` Enforce the file-size rule in `check:docs`.** Warn > 600 lines, fail > 800 for new files; list allowlist that shrinks as PERF-03 splits them. _Done in PR #1._
- [x] **`[AI-04]` UI test layer.** Vitest + Testing Library smoke test per mode. Plus Playwright end-to-end tests: "a beginner gets a recommendation" and "a user explores complete PC builds in Mario Kart mode". _Done in PR #2 & P3-03._
- [x] **`[AI-05]` Visual check script for agents.** `npm run snap` → starts Vite, saves desktop + phone screenshots of each mode to `snapshots/` (gitignored). _Done in PR #2._
- [x] **`[AI-06]` Cut duplicated docs.** Keep one home per fact (CONTEXT = math, CODEMAP = files, skill-library = skills). _Done in PR #3._
- [x] **`[AI-07]` Domain glossary file** (`.agents/GLOSSARY.md`): math term → beginner term → Pro term. _Done in PR #3._
- [x] **`[AI-08]` Task template for agents.** Each `TODO.md` item gets "Files likely touched", "Done when", "Test to add". _Done in PR #3._
- [x] **`[AI-09]` Cloud/agent sync note.** In `AGENTS.md`: "cloud sessions clone the repo; don't work from synced copies without dot-folders". _Done in PR #3._

---

## Phase 1 — Simple for beginners, deep for experts

- [x] **`[UX-12]` Fix the "Smart Buy" labels.** A card is only a smart buy if nothing cheaper is at least as good *on what the user said they care about* (the 2 or 3 metrics their answers pick), not on all 5 metrics. Never show "Smart Buy" on a card the data marks as a trap. _Done 2026-10-19 in 563a410._
- [x] **`[UX-13]` Sensible default budget.** No "All" by default; ask, or start from a middle budget, so the first pick isn't the most expensive card. _Done 2026-10-19 in 563a410._
- [x] **`[UX-01]` Answer-first beginner flow.** Three questions: *What will you do?* (games by name/genre, streaming, editing, AI, office) → *What monitor/resolution?* (with "I don't know" = 1080p) → *Budget* (in your currency). Then show **one recommended pick + 2 alternatives** with a one-line reason each. The current 5-step tutorial becomes an optional "Why this pick?" section below. Done when, on a phone, the recommendation is on the first screen after the questions. _Done 2026-10-19 in 7083b0f._
- [x] **`[UX-02]` Hide expert controls in Simple mode.** Dataset switcher, Sandbox, Import Deals and "Pro MCDM Lab" wording only appear in Explorer/Pro. Simple mode always uses real data. _Done 2026-10-19 in 7083b0f._
- [x] **`[UX-03]` Plain-language pass on Simple mode** using AI-07: no "Pareto/frontier/utility/dominated/TOPSIS" in Simple mode text. Pro keeps the real terms, with hover definitions. _Done 2026-10-19 in 2a5c32c._
- [x] **`[UX-04]` Reasons people trust:** each recommended card says why in shopping terms ("Same speed as RTX 4060 Ti for R$400 less", "16 GB, enough for the next few years"). _Done 2026-10-19._
- [x] **`[UX-05]` Mobile layout fix:** compact header (one menu), chart labels that don't overlap, recommendation cards before charts. _Done 2026-10-19._
- [x] **`[UX-07]` Smooth step-up between levels.** "See the math behind this" button on any pick opens the same item in Explorer/Pro with the same filters, so a beginner can grow into the deep views. _Done 2026-10-19._
- [x] **`[UX-08]` Pro-mode extras:** save/load named weight profiles, export results (CSV/JSON), show the full score breakdown per item. _Done 2026-10-20._
- [x] **`[UX-09]` Accessibility:** keyboard navigation, contrast, and a table alternative for every chart (charts are invisible to screen readers). _Done 2026-10-20._
- [x] **`[UX-11]` One beginner flow that ends in a whole PC.** The three UX-01 questions lead to either "Just a graphics card" or "A whole PC", and the whole-PC answer uses the builder engine, shown as a plain parts list with a total and one reason per part. "Full Builds" stops being Level 4; the current Mario Kart view stays as the expert view of the same result. _Done 2026-10-19 in 7083b0f._
- [x] **`[UX-10]` Usability & 2-minute beginner flow audit (self-contained + ready for live launch).** Audited Simple GPU, Simple Whole-PC, and Full Builds paths, closing GPU share parity and GPU URL state restoration (`?mode=simple&gpu=...&w=...&ref=...`). Live 3–5 external buyer tests will run post-`[LAUNCH-01]`. _Done 2026-11-22._
- [x] **`[SHARE-01]` Influencer & group visual spec card studio.** 1200×630 PNG spec card + ready-to-post caption generator for both GPUs and 8-part PC builds, displaying price, key specs, Pareto frontier priority percentages, website brand watermark (`paretopc.com`), and optional creator `@Handle` + store affiliate URL. _Done 2026-11-22._

---

## Phase 2 — Full PC builder (the core goal: "build my dream PC")

- [x] **`[BLD-01]` Data model for every part a working PC needs** (extends P3-01): CPU, GPU, motherboard, RAM, storage (NVMe M.2 / SATA), PSU, case, CPU cooler (8 components complete). Each with the specs compatibility needs (socket, chipset, form factor, dimensions, connectors, TDP). _Done 2026-10-19._
- [x] **`[BLD-03]` Performance model per use case** (extends the bottleneck formula in CONTEXT.md §4): CPU↔GPU balance per resolution (1080p esports $\alpha = 0.70$, 1440p sweet spot $\alpha = 0.50$, 4K enthusiast $\alpha = 0.30$ with VRAM overflow penalty); separate multi-dimensional index for Creator & AI (32GB+ RAM, 16GB+ VRAM, NVIDIA CUDA/Tensor bonus, multi-core CPU). Step 2 intake choice and Full Build selector connect directly to full-system Pareto evaluation. _Done 2026-10-19._
- [x] **`[BLD-04]` Pre-pruned combination engine running in a Web Worker**, with a strict time budget test (< 300 ms on seed catalog under $3,200 budget cap) so the UI never freezes, plus asynchronous status telemetry. _Done 2026-10-20._
- [x] **`[BLD-05]` (Pro version done as "Full Builds"; beginner version is UX-11) Build results UI** (= P3-03): beginner sees "Your build" as a parts list with total price and one reason per part; Explorer/Pro sees the full-build frontier (total price vs effective FPS) and can swap any of the 8 parts in real time with price/FPS/compatibility deltas and override preservation. _Done 2026-10-20._
- [x] **`[BLD-06]` Upgrade mode:** "I already have…" — lock existing parts to $0 expenditure, enforce socket/RAM/PSU/case compatibility, evaluate upgrade Pareto frontier, and display performance leap deltas and kept vs. new breakdowns. _Done 2026-10-19._
- [x] **`[BLD-07]` Save & share builds:** state in the URL (no backend needed), plus 1-click clean clipboard export for Discord, Reddit, and WhatsApp with 8-component parts list, active currency pricing, power draw, and workload scores. _Done 2026-10-19._
- [x] **`[BLD-08]` Optional constraints for enthusiasts:** small form factor (Mini-ITX / SFF), cooling preference (AIO liquid cooling vs air cooling), aesthetics (RGB lighting vs stealth blackout), and CPU vendor ecosystem (AMD Ryzen vs Intel Core). Enforces partition safety in intra-category pruning and integrates with URL sharing and UI filter controls. _Done 2026-10-20._

---

## Phase 3 — Real, fresh data

- [x] **`[DATA-01]` Move catalogs from `.ts` files into versioned JSON** with a validation step in `npm run check` (schema check, no missing fields, source + date on every row). _Done 2026-10-20._
- [x] **`[DATA-02]` Benchmark sourcing from public creators (D-3).** Prefer creators who publish written charts/tables (LTT Labs, Hardware Unboxed, Gamers Nexus, TechPowerUp). Store numbers with source citation, normalize to relative performance vs reference card. _Done 2026-10-20._
- [x] **`[DATA-03]` Coverage:** from 18 real GPUs to all current and previous generation parts in every BLD-01 category (124 components across all 8 categories). _Done 2026-10-20._
- [x] **`[DATA-04]` Prices as JSON in the repo, per store and region** (`src/data/prices/br.json` and `us.json`), each with a "checked on" date and store URLs. _Done 2026-10-20._
- [x] **`[DATA-05]` Price history for free:** git history and snapshot price series track price shifts over time (`src/utils/priceHistory.ts`, `src/data/prices/history.json`). _Done 2026-10-20._
- [x] **`[DATA-06]` Maintainer tooling:** `npm run add-part` script that asks for specs, validates, and writes the JSON (`scripts/add-part.cjs`). _Done 2026-10-20._

---

## Phase 4 — Code optimization & performance

- [x] **`[PERF-01]` Code-split by mode.** `React.lazy` for Explorer/Pro views, 3D cloud, hyper explorer, full-build explorer, comparison drawer, and deal importer; Simple mode loads only what it shows (initial bundle reduced from 1,548 kB to 367 kB, 101 kB gzipped). _Done 2026-10-19._
- [x] **`[PERF-02]` Import only the ECharts parts used** (`echarts/core` + the specific charts/components, via `echarts-for-react/lib/core`). Shipped centralized `EChartsRenderer.tsx` registering only required charts (`Scatter`, `EffectScatter`, `Line`, `Lines`, `Bar`, `Radar`, `Parallel`) and components, reducing vendor chunk by 392 kB. _Done 2026-10-19._
- [x] **`[PERF-03]` Split the oversized files** (`SimpleParetoGuide`, `HyperDimensionalExplorer`, `Pareto3DCloud`, and `App` decomposed into modular sub-views and deep containers). Pure 3D math moved to `src/components/pareto3d/pareto3dMath.ts`, hyper-dimensional projections decomposed into `src/components/hyper/`, visualizer panel extracted into `src/components/VisualizerPanel.tsx`, and `OVERSIZED_FILE_ALLOWLIST` in `scripts/check-docs.cjs` successfully reduced to empty `{}`. _Done 2026-10-20._
- [x] **`[PERF-04]` Remove dead code** with `knip` (unused exports/files/deps) and add it to CI. Uninstalled unused dependencies (`clsx`, `tailwind-merge`), removed duplicate exports and dead types, integrated `check:knip` into `npm run check`. _Done 2026-10-20._
- [x] **`[PERF-05]` Performance budget in CI:** bundle size limit and a Lighthouse score floor on the built site. Implemented `scripts/check-perf-budget.cjs` (`npm run check:perf`), bundle size property tests in `src/__tests__/checkPerfBudget.test.ts`, and Playwright DOM/runtime performance audits in `e2e/perf.spec.ts`. _Done 2026-10-20._
- [x] **`[PERF-06]` Heavy math off the main thread** (shared with BLD-04) and memoized per input, so sliders stay smooth on cheap phones. Offloaded combinatorial optimization to Web Worker with 24-entry LRU cache, memoized TOPSIS Euclidean column norm vectors, decoupled 3D voxel boundary mesh generation from camera projection in `Pareto3DCloud`, and memoized 2D slice frontiers in `AxisViewsGrid`. Backed by `src/lib/math/__tests__/perfMathMemoization.test.ts`. _Done 2026-10-20._

---

## Phase 5 — Launch & Black Friday Blitz (Nov 23 – Nov 30, 2026 & Feb 2027)

- [x] **`[LAUNCH-01]` Hosting config & canonical metadata** (`public/_redirects` for Cloudflare Pages / Netlify, `vercel.json` with SPA rewrites & security headers, canonical & OpenGraph metadata in `index.html`, `paretopc.com` placeholder ready for custom DNS attachment). _Done 2026-11-23._
- [x] **`[LAUNCH-02]` Error tracking and privacy-friendly analytics** (`ErrorBoundary.tsx` wrapping `<App />` + zero-cookie `telemetry.ts` event tracker with Plausible integration). _Done 2026-11-23._
- [x] **`[LAUNCH-03]` Legal pages & modals:** LGPD (Brazil) + GDPR privacy notice, cookie-free guarantee, and affiliate transparency disclosure in `AppFooter.tsx`. _Done 2026-11-23._
- [x] **`[DATA-BF26]` Black Friday 2026 street price refresh & full store overlay integration** — expanded `br.json` and `us.json` across all 124 catalog components, wired `resolveRegionalPrice` into `applyRegionalGpuOverlay` / `getCurrencyAdjustedCatalogs` / `useOptimizerState`, enforced 100% regional offer coverage in `validate-catalogs.cjs`, and surfaced store badges, PIX/installment splits, and direct store links across GPU and 8-part Build cards. _Done 2026-11-22._
- [x] **`[LAUNCH-04]` Search traffic:** pre-rendered landing pages ("Best GPU under R$2,500" / "Best gaming PC under $1,000") emitted via `scripts/generate-seo-pages.cjs` (`public/guides/*.html`, `sitemap.xml`, `robots.txt`). _Done 2026-11-23._
- [x] **`[LAUNCH-05]` Feedback button** ("Report Wrong Price / Feedback" modal in `AppFooter.tsx` recording telemetry and copying formatted reports). _Done 2026-11-23._

---

## Phase 6 — Creator BYOA, 1-Click Data Ingestion & Revenue (Completed in Codebase)

- [x] **`[AFF-01]` Offer data model:** `RegionalPriceOffer` and `storePrices.ts` support optional `affiliateUrl` and `partner`, plus `injectAffiliateParameters` in `pricingEngine.ts`. _Done 2026-11-23._
- [x] **`[AFF-05]` Creator partner BYOA system (`?p=creator` / `?ref=` / `?amz=` / `?kabum=` / `?terabyte=` / `?pichau=` / `?newegg=`):** injects creator affiliate tags across single GPU and all 8-part store links (`partners.json` + `partnerProfiles.ts`) with a co-branded attribution banner in `App.tsx`. _Done 2026-11-23._
- [x] **`[DATA-07]` Multi-category `Ctrl+A, Ctrl+C` Smart Paste:** `src/lib/parser/hardwareListingParser.ts` detects categories and matches all 124 catalog components across CPUs, Motherboards, RAM, SSDs, PSUs, Cases, Coolers, and GPUs, exporting `RegionalPriceOffer` diffs. _Done 2026-11-23._
- [x] **`[DATA-08]` 1-click browser bookmarklet:** `src/utils/bookmarklet.ts` + `ImporterBookmarkletBar.tsx` + `#import=...` URL hash auto-ingestion in `useOptimizerState.ts`. _Done 2026-11-23._
- [x] **`[DATA-09]` Automated official affiliate feeds & OLS sanity guard:** `src/lib/math/priceSanityGuard.ts`, `scripts/sync-store-feeds.cjs` (`npm run sync:feeds`), and `.github/workflows/sync-prices.yml` enforcing $\pm 40\%$ fair-value bounds. _Done 2026-11-23._
- [x] **`[AFF-02]` Ranking neutrality rule:** property-tested invariant in `pricingEngine.test.ts` proving affiliate partners never change `effectivePrice`, Pareto dominance, or TOPSIS ordering. _Done 2026-11-23._
- [x] **`[AFF-03]` Disclosure:** always-visible "we may earn a commission / ranking never changes" label in `AppFooter.tsx`. _Done 2026-11-23._
- [x] **`[AFF-04]` Default house partner fallback:** organic visits without a creator param automatically route through `paretopc-official` house tags (`Amazon BR/US`, `KaBuM!`, `Terabyte`, `Pichau`, `Newegg`) while creator tags override 100%. _Done 2026-11-23._
- [x] **`[AFF-06]` Serverless click redirect (`/go/:offerId`):** `src/utils/affiliateRedirect.ts` + `functions/go/[offerId].ts` Cloudflare Pages edge handler. _Done 2026-11-23._
- [x] **`[AFF-07]` Ethical Frontier Sponsorship Guard:** `verifyFrontierSponsorship` in `pricingEngine.ts` ensures sponsored labels/coupons render only on mathematically Pareto-optimal, non-trap products. _Done 2026-11-23._

---

## Next up (Operational Go-Live Operations)

1. **Public Launch & DNS Cutover:** Open a PR against `main`, deploy to Cloudflare Pages / Vercel (with `functions/go/[offerId].ts` + `public/guides/` + `sitemap.xml`), finalize brand/domain (D-4), and attach Google Search Console / Plausible domain analytics.
2. **Creator & Community Outreach:** Share pre-built BYOA spec cards (`[SHARE-01]`, `?p=...` / `?ref=...`) and static buyer guides with Brazilian and US PC hardware creators, deal groups, and early non-tech buyer testers (`R-1`).
