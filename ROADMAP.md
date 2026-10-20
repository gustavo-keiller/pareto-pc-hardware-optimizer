# ParetoPC — Master Roadmap & Todo List (`ROADMAP.md`)

> Goal: the app can take anyone, from "I don't know what a GPU is" to "show me the 7D frontier", to a complete, compatible, well-priced dream PC.
> Re-evaluated 2026-10-20 on `main` @ `f03d605` plus branch `fix/perf-engine-and-ci` @ `e0e44c2`. Item IDs follow the repo's `TODO.md` convention: active work is copied into `TODO.md`, shipped work moves to `DONE.md`, and this file is ticked in the same PR.
> Order inside each phase = priority. Phases 0 and 1 can run in parallel; Phase 2 is the core product goal.

---

## Where the project stands (re-checked 2026-10-20)

**Shipped since the first roadmap:** Phase 0 (CI, lint, UI tests, `npm run snap`, glossary); the answer-first beginner flow ending in a graphics card or a whole PC (UX-01/02/11); trust fixes (UX-12/13); plain words, phone layout, pt-BR + reais (UX-03/05/06); shopping reasons (UX-04); step-up to Explorer (UX-07); accessibility and pro extras (UX-08/09); full 8-part PC builder with clearance fit checks (BLD-01/02), use-case scores (BLD-03), background Web Worker engine (BLD-04), interactive part swapper (BLD-05), upgrade mode (BLD-06), share links (BLD-07), and enthusiast constraints (BLD-08); code splitting and slim ECharts (PERF-01/02, first download ~108 KB gzipped).

**Phase status:** Phase 0, Phase 1, and Phase 2 are 100% complete. In Phase 3, `[DATA-01]` (versioned JSON catalogs & validation) is shipped; next up is `[DATA-02]` (benchmark sourcing from public creators).

**Known problems (see `TODO.md`):**
- BRL prices are US prices × 5.7 (labelled as estimates); real Brazilian prices are Phase 3 (DATA-04).

**Process:** `main` had 8 red CI runs out of 12 on 2026-10-19 because work was pushed straight to it. From now on everything goes through PRs (see "How work lands on `main`" in `AGENTS.md`); branch protection on `main` is still to be turned on.

---

## Decisions (updated 2026-10-18 from gustavo's answers)

- [x] **D-1 Market:** country-agnostic app, **Brazil first** for testing. Every price carries a currency and a region; nothing hardcodes BRL or USD. UI starts in pt-BR with English as a second language.
- [x] **D-2 No live prices, no server for now.** The GitHub repo is the database: catalogs and prices are JSON files, updated by commits/PRs (by hand, or through the existing deal importer exporting JSON). The app reads them at build time. A server only comes back if affiliate click tracking (AFF-06) needs one.
- [ ] **D-3 Benchmarks: leaning towards public creator results** (YouTube channels like Linus Tech Tips, plus others). See DATA-02 for how to make that work.
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
- [ ] **`[UX-10]` Test with 3–5 people who know nothing about PCs.** Success = picks a part in under 2 minutes without help, and can say why. Feed findings back into UX-01..05.

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
- [ ] **`[DATA-02]` Benchmark sourcing from public creators (D-3).** Prefer creators who publish written charts/tables (LTT Labs, Hardware Unboxed, Gamers Nexus, TechPowerUp). Store numbers with source citation, normalize to relative performance vs reference card.
- [ ] **`[DATA-03]` Coverage:** from 18 real GPUs to all current and previous generation parts in every BLD-01 category.
- [ ] **`[DATA-04]` Prices as JSON in the repo, per store and region** (`data/prices/br.json` first), each with a "checked on" date. No live scraping (D-2).
- [ ] **`[DATA-05]` Price history for free:** git history of price commits tracks price shifts over time.
- [ ] **`[DATA-06]` Maintainer tooling:** `npm run add-part` script that asks for specs, validates, and writes the JSON.

---

## Phase 4 — Code optimization & performance

- [x] **`[PERF-01]` Code-split by mode.** `React.lazy` for Explorer/Pro views, 3D cloud, hyper explorer, full-build explorer, comparison drawer, and deal importer; Simple mode loads only what it shows (initial bundle reduced from 1,548 kB to 367 kB, 101 kB gzipped). _Done 2026-10-19._
- [x] **`[PERF-02]` Import only the ECharts parts used** (`echarts/core` + the specific charts/components, via `echarts-for-react/lib/core`). Shipped centralized `EChartsRenderer.tsx` registering only required charts (`Scatter`, `EffectScatter`, `Line`, `Lines`, `Bar`, `Radar`, `Parallel`) and components, reducing vendor chunk by 392 kB. _Done 2026-10-19._
- [ ] **`[PERF-03]` Split the oversized files** (`SimpleParetoGuide`, `HyperDimensionalExplorer`, `Pareto3DCloud`, `App`, and `useOptimizerState` into per-mode slices). Pure calculations that live inside components move into `src/lib/` with tests.
- [ ] **`[PERF-04]` Remove dead code** with `knip` (unused exports/files/deps) and add it to CI.
- [ ] **`[PERF-05]` Performance budget in CI:** bundle size limit and a Lighthouse score floor on the built site.
- [ ] **`[PERF-06]` Heavy math off the main thread** (shared with BLD-04) and memoized per input, so sliders stay smooth on cheap phones.

---

## Phase 5 — Launch

- [ ] **`[LAUNCH-01]` Hosting** (Cloudflare Pages / Vercel / Netlify) with preview deploys per PR, and a domain (D-4).
- [ ] **`[LAUNCH-02]` Error tracking and privacy-friendly analytics**.
- [ ] **`[LAUNCH-03]` Legal pages:** privacy policy (LGPD for Brazil, GDPR if EU visitors), terms, cookie notice.
- [ ] **`[LAUNCH-04]` Search traffic:** pre-rendered landing pages ("Best GPU under R$2000" / "Best gaming PC under $1000").
- [ ] **`[LAUNCH-05]` Feedback button** ("this recommendation is wrong because…") feeding a backlog.

---

## Phase 6 — Affiliate links & creator partnerships (later, after launch)

- [ ] **`[AFF-01]` Offer data model:** each price row can carry `store`, `url`, `affiliateUrl`, `partner`.
- [ ] **`[AFF-02]` Ranking neutrality rule:** affiliate status must never change scores or ordering.
- [ ] **`[AFF-03]` Disclosure:** visible "we may earn a commission" label next to affiliate links.
- [ ] **`[AFF-04]` Sign up to programs:** Amazon BR/US, KaBuM!, Pichau, Terabyte, PCYes.
- [ ] **`[AFF-05]` Creator partner system:** creator codes in links (`?ref=creator`), creator-branded build pages.
- [ ] **`[AFF-06]` Click redirect + tracking** (`/go/:offerId` serverless function, D-2).
- [ ] **`[AFF-07]` Partner dashboard and payout records**.

---

## Next up, reprioritized (2026-10-20)

1. **Merge `fix/perf-engine-and-ci` through a PR** once CI is green, and turn on branch protection for `main`.
2. **UX-10:** test with 3–5 people who know nothing about PCs; their findings set what comes after.
3. **Phase 3 data** (real BRL prices DATA-04, creator benchmarks DATA-02), then BLD-04 (Web Worker).

Then Phase 5 (launch) and Phase 6 (affiliates, later per gustavo). Expert depth (UX-08) is strong enough to wait.
