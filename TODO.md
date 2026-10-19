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

- **`[BLD-01]` & `[BLD-02]` Complete PC build data model & physical compatibility engine:**
  Expand the full-system data model and compatibility engine to include storage (NVMe SSD), PC case, and CPU cooler, checking case length/height clearances, socket cooler brackets, and M.2 slots with plain-language rejection reasons.
  - **Files likely touched:** `src/lib/math/buildTypes.ts`, `src/lib/math/combinatorial.ts`, `src/data/seedComponents.ts`, `CODEMAP.md`
  - **Done when:** full builds include all 8 physical components for a working PC and physical clearances (case vs. GPU length, cooler vs. case height) are validated with clear explanations.
  - **Test to add:** Vitest unit tests in `src/lib/math/__tests__/buildTypes.test.ts` and `combinatorial.test.ts`.
