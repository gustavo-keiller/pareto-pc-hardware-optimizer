---
name: code-review
description: "Two-axis review of changes: Standards (do changes follow AGENTS.md, maintainability rubrics, and domain skills?) and Spec (do changes match what the task asked for?). Run after completing any task before declaring done."
---

# Code Review

Two-axis review. Run after completing any implementation task. Both axes are **separate** — a change can pass one and fail the other.

---

## Axis 1: Standards & Code Quality

Does the code follow ParetoPC's documented standards and maintainability rubrics?

### Primary Sources

- `AGENTS.md` & `.agents/AGENTS.md` — architectural principles and invariants
- `CONTEXT.md` — mathematical specifications
- Relevant skills:
  - Math engine -> `.agents/skills/mcdm-math-engine/SKILL.md`
  - ECharts visualizations -> `.agents/skills/echarts-pareto-viz/SKILL.md`
  - TypeScript best practices -> `.agents/skills/typescript-best-practices/SKILL.md`
  - Copywriting -> `.agents/skills/hardware-copywriting/SKILL.md`

### Thermo-Nuclear Maintainability Rubric

1. **The File Size Limit (~600–800 Lines):**
   - Any change that pushes a file near or over 800 lines is a structural warning. Decompose into focused modules or custom hooks.
2. **Zero UI Coupling in `src/lib/math/`:**
   - Prohibit any React, DOM, `localStorage`, or ECharts imports inside `src/lib/math/`.
3. **Seek the "Code Judo" Move:**
   - Actively search for restructurings that *delete* complexity and layers rather than spreading it around.
4. **Deslop & De-Comment:**
   - Strip AI narrative comments (`// Step 1: setup`) while preserving genuine mathematical formula docstrings.
   - Reject thin pass-through wrapper functions that add indirection without buying clarity.

### Project-Specific Violations (Always Flag)

- Hardcoded `<` or `>` metric comparisons that ignore `METRIC_DEFINITIONS[metric].direction` -> violates `AGENTS.md` Rule 2
- Unchecked division without a `denom > 0` guard -> violates `AGENTS.md` Rule 3
- Brute-force Cartesian combinations before intra-category Pareto pruning -> violates `AGENTS.md` Rule 4
- `any` or unchecked `as` casts -> violates `AGENTS.md` Rule 5
- Unguarded `JSON.parse(localStorage.getItem(...))` -> violates `AGENTS.md` Rule 6 -> use `safeGetJSON` from `src/utils/storage.ts`

---

## Axis 2: Spec & Requirements

Does the code faithfully implement what the task asked for?

Check for:
- Requirements the task asked for that are **missing or partial**
- Behaviour in the code that **was not asked for** (scope creep)
- Mathematical formulas that deviate from `CONTEXT.md`

---

## After Review

Run the preflight skill: `.agents/skills/preflight/SKILL.md` (`npm run check`).
