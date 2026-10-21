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

## 🧩 Active Tasks (top to bottom; reprioritized 2026-10-20 from [`ROADMAP.md`](ROADMAP.md))

- **`[DATA-05]` Price History Engine via Git History & Commit Tracking:**
  Build a pure price history tracker (`src/utils/priceHistory.ts`) that inspects price evolution commits, computes all-time-low (ATL) price baselines, and flags whether current prices are at or near historic minimums.
  - **Files likely touched:** `src/utils/priceHistory.ts`, `src/utils/__tests__/priceHistory.test.ts`, `CODEMAP.md`
  - **Done when:** Price history utility correctly tracks price delta records and identifies all-time low discounts.
  - **Test to add:** Price history resolution unit tests in `src/utils/__tests__/priceHistory.test.ts`.

- **`[DATA-06]` Maintainer Tooling (`npm run add-part`):**
  Create interactive CLI script (`scripts/add-part.cjs`) prompting maintainers for component specs, validating against schema bounds, and safely appending to the corresponding catalog JSON.
  - **Files likely touched:** `scripts/add-part.cjs`, `package.json`, `CODEMAP.md`
  - **Done when:** Script guides through additions and enforces schema rules before write.
  - **Test to add:** Schema validation via `npm run check:catalogs`.

- **`[UX-10]` Test with 3–5 people who know nothing about PCs:**
  Success = they pick a graphics card or a whole PC in under 2 minutes without help and can say why. Findings become `TODO.md` items.
  - **Files likely touched:** `TODO.md`, `ROADMAP.md`
  - **Done when:** findings from at least 3 sessions are written up as tasks.
  - **Test to add:** none (user research).
