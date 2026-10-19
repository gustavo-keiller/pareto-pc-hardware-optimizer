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

- **`[UX-01]` Answer-first beginner flow (3 questions → 1 top pick + 2 alternatives):**
  Redesign Simple Guide into an answer-first flow: (1) What will you do? (Gaming, Streaming, Video Editing, AI), (2) Resolution? (1080p, 1440p, 4K), (3) Budget. Display 1 top recommended GPU + 2 alternatives with shopping reasons, turning the 5-step tutorial into an optional "Why this pick?" drawer.
  - **Files likely touched:** `src/components/SimpleParetoGuide.tsx`, `src/hooks/useOptimizerState.ts`, `CODEMAP.md`
  - **Done when:** on desktop and mobile, the user answers 3 quick questions and immediately sees 1 top pick + 2 alternatives above the fold without scrolling past 4 screens of tutorial charts.
  - **Test to add:** UI tests in `src/__tests__/App.ui.test.tsx` and Playwright e2e in `e2e/beginner.spec.ts`.

- **`[UX-02]` Hide expert controls in Simple Guide mode:**
  Clean up the top header and controls in Simple Guide mode: hide dataset switchers (Real / My Deals / Sandbox), Import Deals, and complex MCDM jargon, keeping them visible only in Explorer, Pro Lab, and Full Builds.
  - **Files likely touched:** `src/App.tsx`, `CODEMAP.md`
  - **Done when:** Simple Guide mode presents a minimal, distraction-free interface focused purely on hardware recommendations, while Explorer and Pro retain full control.
  - **Test to add:** UI test in `src/__tests__/App.ui.test.tsx` asserting expert controls are hidden in Simple mode.

- **`[UX-11]` Unified beginner flow ending in GPU or Whole PC:**
  Connect the beginner questionnaire to either "Just a Graphics Card" or "A Whole PC", generating a complete PC build with total price and plain-language reasons per part using the combinatorial engine.
  - **Files likely touched:** `src/components/SimpleParetoGuide.tsx`, `src/components/FullBuildExplorer.tsx`, `src/App.tsx`, `CODEMAP.md`
  - **Done when:** a beginner selecting "Whole PC" receives a complete, physically compatible build recommendation directly in the beginner view without needing to navigate to Level 4 "Mario Kart Mode".
  - **Test to add:** Playwright e2e test covering beginner whole-PC journey.

- **`[BLD-01]` & `[BLD-02]` Complete PC build data model & physical compatibility engine:**
  Expand the full-system data model and compatibility engine to include storage (NVMe SSD), PC case, and CPU cooler, checking case length/height clearances, socket cooler brackets, and M.2 slots with plain-language rejection reasons.
  - **Files likely touched:** `src/lib/math/buildTypes.ts`, `src/lib/math/combinatorial.ts`, `src/data/seedComponents.ts`, `CODEMAP.md`
  - **Done when:** full builds include all 8 physical components for a working PC and physical clearances (case vs. GPU length, cooler vs. case height) are validated with clear explanations.
  - **Test to add:** Vitest unit tests in `src/lib/math/__tests__/buildTypes.test.ts` and `combinatorial.test.ts`.
