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

- **`[UX-10]` Test with 3–5 people who know nothing about PCs:**
  Success = they pick a graphics card or a whole PC in under 2 minutes without help and can say why. Findings become `TODO.md` items.
  - **Files likely touched:** `TODO.md`, `ROADMAP.md`
  - **Done when:** findings from at least 3 sessions are written up as tasks.
  - **Test to add:** none (user research).
