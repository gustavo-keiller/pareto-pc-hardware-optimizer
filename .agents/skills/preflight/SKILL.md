---
name: preflight
description: Pre-flight checklist to run before declaring any task complete. Read this before finalizing code changes and running verification checks.
---

# Pre-Flight Verification Checklist

Run through this checklist **before** declaring any task complete or handing off code.

---

## 1. Automated Verification Command

Run the unified verification command:

```bash
npm run check
```

It runs in sequence and stops at the first failing step:

1. **`npm run typecheck`** (`tsc --noEmit`) — zero TypeScript compiler or type errors.
2. **`npm run test`** (`vitest run`) — all unit and mathematical property tests pass.
3. **`npm run check:docs`** (`node scripts/check-docs.cjs`) — verifies:
   - `AGENTS.md` is under the 12,000-character limit.
   - Every skill in `.agents/skills/` has valid frontmatter, is indexed in `skill-library/SKILL.md`, and is synced to `.claude/skills/` (`npm run sync:skills`).
   - Every relative markdown link across root docs and `.agents/` resolves to an existing file.
   - Every `src/` module path listed in `CODEMAP.md` exists on disk.

---

## 2. Math & State Invariants

- [ ] `src/lib/math/` contains zero React, DOM, `localStorage`, or ECharts imports (Rule 1).
- [ ] All metric comparisons respect `METRIC_DEFINITIONS[metric].direction` (Rule 2).
- [ ] All divisions are guarded against `0` denominators (Rule 3).
- [ ] Any new `localStorage` persistence uses `safeGetJSON` / `safeSetJSON` from `src/utils/storage.ts` (Rule 6).

---

## 3. Documentation Sync (`CODEMAP.md` & `TODO.md`)

- [ ] If you added, moved, or renamed a file in `src/`, updated [`CODEMAP.md`](../../../CODEMAP.md).
- [ ] If you added or edited a skill in `.agents/skills/`, updated `.agents/skills/skill-library/SKILL.md` and ran `npm run sync:skills`.
- [ ] If you completed a task in [`TODO.md`](../../../TODO.md), moved it to [`DONE.md`](../../../DONE.md).

---

## 4. Surgical Change Check

- [ ] Every changed line traces directly to the user's request — no drive-by refactors.
- [ ] Unused imports or variables introduced by your changes are removed.
