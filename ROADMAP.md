# ParetoPC — Master Roadmap & Todo List (`ROADMAP.md`)

> Goal: the app can take anyone, from "I don't know what a GPU is" to "show me the 7D frontier", to a complete, compatible, well-priced dream PC.
> Re-evaluated 2026-10-19 on `main` @ `86beb27`. Item IDs follow the repo's `TODO.md` convention so they can be pasted straight into it (delete from `TODO.md` + add to `DONE.md` when shipped).
> Order inside each phase = priority. Phases 0 and 1 can run in parallel; Phase 2 is the core product goal.

---

## Where the project stands (re-checked 2026-10-19 on `main`)

**What changed since the first roadmap:**
- Phase 0 is merged (CI, lint, UI tests, `npm run snap`, glossary).
- Antigravity shipped the full-PC builder engine and UI:
  - `[P3-01]` Part schemas + compatibility (`buildTypes.ts`).
  - `[P3-02]` Intra-category pruning & backtracking combination engine (`combinatorial.ts`).
  - `[P3-03]` "4. Full Builds" mode (`FullBuildExplorer.tsx`, `BuildHeroCard.tsx`, `BuildLeaderboardTable.tsx`).
  - `[P3-04]` Unified Combined Sandbox mode with live USD/BRL currency conversion.
- `npm run check` passes (88 tests) and the build works cleanly.

**What a beginner sees today (screenshots at 1400px and phone size):**
- **Simple mode is still the 5-step economics lesson.** The header still shows Real GPUs / My Deals / Sandbox, Import Deals and the 4 level buttons. On a phone the first recommendation is about 4 screens down, under a chart whose labels overlap. UX-01/02/03/05 are queued next.
- **The default budget is "All ($1800)"**, so someone who skips the budget gets an $890 RX 7900 XTX as "#1 Top Pick".
- **Every GPU is labelled "Smart Buy", even the ones named `[TRAP]`** (e.g. "RTX 4060 Ti 16GB [TRAP]"). In the default 5-metric mode every real card survives, so "Hide Trap GPUs" shows 0. This is the opposite of the app's promise ("we filter out overpriced traps") and is the most urgent trust bug.
- **The full PC builder is the thing beginners need, but it sits behind "Level 4: Mario Kart Mode"**, after the Pro Lab, and talks about "Combinatorial", "Pareto Frontier", "CPU-GPU bottleneck telemetry".

**What the builder covers:**
- 38 parts (CPU, GPU, motherboard, RAM, PSU) on AM4/AM5/LGA1700/LGA1851.
- **No storage, case or CPU cooler yet**, so a "complete build" can't actually be assembled and case/cooler fit isn't checked.
- One score only (1440p gaming FPS): no streaming, editing, AI or office use yet.
- USD & BRL supported (with live exchange rate in Combined Sandbox), with English/Portuguese i18n queued.

**Engineering health:**
- Bundle grew to 1.50 MB / **469 KB gzipped** in one file; code splitting (`PERF-01`) is queued.
- `SimpleParetoGuide.tsx` ceiling currently in allowlist; decomposing it into focused sub-components is queued.
- `npm run check` strictly enforces zero `any`, zero unchecked type assertions, Vitest suites, and file caps.

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
- [ ] **`[UX-03]` Plain-language pass on Simple mode** using AI-07: no "Pareto/frontier/utility/dominated/TOPSIS" in Simple mode text. Pro keeps the real terms, with hover definitions.
- [ ] **`[UX-04]` Reasons people trust:** each recommended card says why in shopping terms ("Same speed as RTX 4060 Ti for R$400 less", "16 GB, enough for the next few years").
- [ ] **`[UX-05]` Mobile layout fix:** compact header (one menu), chart labels that don't overlap, recommendation cards before charts.
- [ ] **`[UX-06]` Country-agnostic money & language (D-1).** Region setting (BR first) picks currency, stores and price file; formatting via `Intl.NumberFormat`; pt-BR + English via a small i18n layer. Adding a country = adding a price file + translations, no code changes.
- [ ] **`[UX-07]` Smooth step-up between levels.** "See the math behind this" button on any pick opens the same item in Explorer/Pro with the same filters, so a beginner can grow into the deep views.
- [ ] **`[UX-08]` Pro-mode extras:** save/load named weight profiles, export results (CSV/JSON), show the full score breakdown per item.
- [ ] **`[UX-09]` Accessibility:** keyboard navigation, contrast, and a table alternative for every chart (charts are invisible to screen readers).
- [x] **`[UX-11]` One beginner flow that ends in a whole PC.** The three UX-01 questions lead to either "Just a graphics card" or "A whole PC", and the whole-PC answer uses the builder engine, shown as a plain parts list with a total and one reason per part. "Full Builds" stops being Level 4; the current Mario Kart view stays as the expert view of the same result. _Done 2026-10-19 in 7083b0f._
- [ ] **`[UX-10]` Test with 3–5 people who know nothing about PCs.** Success = picks a part in under 2 minutes without help, and can say why. Feed findings back into UX-01..05.

---

## Phase 2 — Full PC builder (the core goal: "build my dream PC")

- [x] **`[BLD-01]` Data model for every part a working PC needs** (extends P3-01): CPU, GPU, motherboard, RAM, storage (NVMe M.2 / SATA), PSU, case, CPU cooler (8 components complete). Each with the specs compatibility needs (socket, chipset, form factor, dimensions, connectors, TDP). _Done 2026-10-19._
- [x] **`[BLD-02]` Physical compatibility & clearance engine** (pure, fully tested, in `src/lib/math/buildTypes.ts` & `combinatorial.ts`): CPU↔motherboard socket; RAM type, speed and slot count; motherboard form factor ↔ case; GPU length and cooler height ↔ case; cooler ↔ socket bracket; cooler TDP rating; PSU wattage with headroom; M.2 slot count. Every rejection gets a human reason ("This case is too short for that GPU by 18 mm"). _Done 2026-10-19._
- [ ] **`[BLD-03]` (partial: gaming FPS + CPU/GPU bottleneck at 1440p only) Performance model per use case** (extends the bottleneck formula in CONTEXT.md §4): CPU↔GPU balance per resolution; separate scoring for gaming, streaming, video editing, local AI (VRAM-bound) and office. The beginner's answer in UX-01 picks the weights.
- [ ] **`[BLD-04]` (engine done, < 50 ms on 38 parts; not yet in a Web Worker) Pre-pruned combination engine** (= P3-02) running in a **Web Worker**, with a time budget test (e.g. full catalog < 300 ms) so the UI never freezes.
- [ ] **`[BLD-05]` (Pro version done as "Full Builds"; beginner version is UX-11) Build results UI** (= P3-03): beginner sees "Your build" as a parts list with total price and one reason per part; Explorer/Pro sees the full-build frontier (total price vs effective FPS) and can swap any part and see the effect.
- [ ] **`[BLD-06]` Upgrade mode:** "I already have…" — lock existing parts, recommend the best upgrade for the money.
- [ ] **`[BLD-07]` Save & share builds:** state in the URL (no backend needed), plus copy-as-list and print/PDF.
- [ ] **`[BLD-08]` Optional constraints for enthusiasts:** small form factor, noise, looks (RGB/no RGB), brand preferences.

---

## Phase 3 — Real, fresh data

- [ ] **`[DATA-01]` Move catalogs from `.ts` files into versioned JSON** with a validation step in `npm run check` (schema check, no missing fields, source + date on every row).
- [ ] **`[DATA-02]` Benchmark sourcing from public creators (D-3).** Prefer creators who publish written charts/tables (LTT Labs, Hardware Unboxed, Gamers Nexus, TechPowerUp). Store numbers with source citation, normalize to relative performance vs reference card.
- [ ] **`[DATA-03]` Coverage:** from 18 real GPUs to all current and previous generation parts in every BLD-01 category.
- [ ] **`[DATA-04]` Prices as JSON in the repo, per store and region** (`data/prices/br.json` first), each with a "checked on" date. No live scraping (D-2).
- [ ] **`[DATA-05]` Price history for free:** git history of price commits tracks price shifts over time.
- [ ] **`[DATA-06]` Maintainer tooling:** `npm run add-part` script that asks for specs, validates, and writes the JSON.

---

## Phase 4 — Code optimization & performance

- [ ] **`[PERF-01]` Code-split by mode.** `React.lazy` for Explorer/Pro views, 3D cloud, hyper explorer and importer; Simple mode loads only what it shows.
- [ ] **`[PERF-02]` Import only the ECharts parts used** (`echarts/core` + the specific charts/components, via `echarts-for-react/lib/core`).
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

## Next up, reprioritized (2026-10-19)

1. **UX-12 + UX-13 (trust fixes):** no "Smart Buy" on trap cards, no "All" default budget. Small, and it's what makes the recommendations believable for everyone.
2. **UX-01 + UX-02 + UX-11 (answer-first flow for GPU and whole PC):** three questions, one pick + 2 alternatives, expert controls hidden in Simple mode, and "a whole PC" as an answer, not a Level 4 mode.
3. **UX-03 + UX-05 + UX-06 (plain words, phone layout, pt-BR + BRL):** done together with step 2 since it rewrites the same screens. Brazil-first testing needs reais and Portuguese before any real user sees it.
4. **BLD-01/02 completion (storage, case, cooler + their fit checks, plain-language rejection reasons):** without these, "complete build" isn't actually complete.
5. **PERF-01 + PERF-02 + PERF-03 (split by mode, slim ECharts, split the big files):** Simple mode shouldn't download the 3D/7D views.
6. **UX-10 (test with 3–5 people who know nothing about PCs)** as soon as steps 1–3 land.
