# ParetoPC — Architectural Principles

> High-level design principles and invariants for ParetoPC.
> Step-by-step procedures live in code (types, tests, check scripts) and in `.agents/skills/`.

## 1. Infrastructure Over Rules

When a category of bug keeps happening, fix it by creating a **code-level guardrail** (a type constraint, a pure helper, a Vitest property test, or a script in `scripts/`) — not by adding another paragraph to this file. Make bad code impossible to write.

## 2. Long-Term Health First

Before implementing any feature, ask: *"Will this make the next 10 changes easier or harder?"* Prefer pure functions in `src/lib/math/` over inline component math, shared types in `src/lib/math/types.ts` over scattered interfaces, and single sources of truth (`METRIC_DEFINITIONS`) over duplicated config objects.

## 3. Pure Math Engine Isolation

All MCDM algorithms (Hard-Constraint Filtering, Pareto Dominance, TOPSIS Ranking, Hedonic OLS Regression, and Combinatorial System Optimization) live in `src/lib/math/` as pure, deterministic TypeScript functions with **zero** React, DOM, `localStorage`, or ECharts imports. Every function in `src/lib/math/` is unit-tested in `src/lib/math/__tests__/`.

## 4. Directionality Authority (`METRIC_DEFINITIONS`)

Never hardcode `<` or `>` metric assumptions in algorithms or chart builders. Every metric defines `direction: 'min' | 'max'` in `METRIC_DEFINITIONS` (`src/lib/math/types.ts`). All dominance checks, ideal best/worst calculations ($A^+$, $A^-$), and 2D frontier sorting must branch on `METRIC_DEFINITIONS[metric].direction`.

## 5. Numerical & Boundary Safety

Mathematical pipelines must never produce `NaN`, `Infinity`, or throw on degenerate inputs:
- Empty candidate array `[]` returns `[]` cleanly.
- All-zero user slider weights fall back to uniform weights (`1 / k`).
- Zero Euclidean column norm (`norm === 0`) or zero distance denominator (`dPlus + dMinus === 0`) falls back to `r_ij = 0` and `topsisScore = 1.0`.
- Floating-point tie-breakers use an explicit epsilon (`1e-9`), breaking ties by Pareto optimality first, then lower price.

## 6. Pre-Prune Before Combinatorics (Phase 3)

A full PC build tuple `(CPU, GPU, RAM, Motherboard, PSU)` grows multiplicatively ($N_{\text{CPU}} \times N_{\text{GPU}} \times N_{\text{RAM}} \times N_{\text{Mobo}} \times N_{\text{PSU}}$). Always apply Stage 1 hard constraints and Stage 2 intra-category Pareto pruning **before** generating combinations, and enforce socket, RAM generation, and PSU wattage compatibility during generation.

Pruning must be **safe**: a part may only be dropped when another part dominates it *inside the same compatibility partition* (CPUs per socket, RAM per generation, GPUs per PSU/case fit), because a cheaper CPU on another socket can still make the whole build more expensive (board + RAM). Never prune by product name. Any change to pruning or search keeps a test that the optimized frontier equals the brute-force frontier on the seed catalog, for every workload profile.

## 7. Strict TypeScript Boundary

Never use `any` or unchecked `as` casts. Use discriminated unions and `_exhaustive: never` in `switch` statements over `MetricKey` or hardware categories. External data (`localStorage`, imported JSON datasets, URL query params) enters as `unknown` and is validated before use.

## 8. Dataset Integrity Is Schema-Driven

Hardware datasets in `src/data/` (synthetic seed data in Phase 1, real-world benchmark outcomes in Phase 2, multi-component catalogs in Phase 3) must conform strictly to typed schemas (`GpuCandidate`, etc.) with verified units (`$` USD, `FPS` geomean, `GB` VRAM, `W` TBP).

## 9. Safe Storage & Versioned Migrations

Never use unguarded `JSON.parse(localStorage.getItem(...))` or `parseInt(...)` which cause white-screen crashes on corrupt or migrated data. Always use the typed helpers from `src/utils/storage.ts` (`safeGetJSON`, `safeSetJSON`, `safeGetInt`, `safeGetBool`, `safeGetString`) and register schema migrations in `runStorageMigrations()`.

## 10. Deep Modules Over Shallow Wrappers

Favor *deep modules* — small public interface, rich implementation, high information hiding. Split any file approaching 600–800 lines into focused modules or custom hooks. Read `.agents/skills/codebase-design/SKILL.md` for the full vocabulary.

## 11. Buyer-First Copywriting (Unslop)

Explain mathematical results in plain, actionable hardware-buyer language (e.g., *"Do not buy Apex 3060 Legacy: Vortex RX 760 is $35 cheaper and 11.5% faster"*), while keeping exact metrics ($C_i$, $d^+$, $d^-$) inspectable for power users. Follow `.agents/skills/hardware-copywriting/SKILL.md`.

## 12. Verify Before Declaring Done

After any change, run `npm run check` before handing code back (CI runs it on every PR too). What it covers and the extra UI checks live in the `preflight` skill.

## 13. Log Assumptions, Don't Block On Them

When you hit a minor design fork and the user hasn't answered, pick the safer/simpler default, proceed, and log a one-liner in the `🔶 Decisions Made Without Validation` section of `.agents/CURRENT_STATE.md`.

## 14. Spec Before Sprint

Features that touch more than 3 files or introduce a new pipeline stage (e.g., Phase 2 Hedonic OLS or Phase 3 Combinatorial Builder) must have a written spec (via the `to-spec` skill) in `.agents/specs/` before implementation begins.

## 15. CURRENT_STATE.md Update Rule

Update `.agents/CURRENT_STATE.md` **only** when the 🔴 In Flight section changes (a task starts, completes, or gets blocked). Never update it just because a session ended with no state change.

## 16. Durable Property Tests Over Ephemeral Debug Tests

Every committed test in `__tests__/` must protect a durable mathematical or behavioral invariant (dominance transitivity, scale invariance, empty/single-item boundaries, tie-breaking determinism) that protects the system for the next 100 commits. See `.agents/skills/tdd/SKILL.md`.

---

## Workflow Skills

Which skill to read before which action is listed once, in [`.agents/skills/skill-library/SKILL.md`](skills/skill-library/SKILL.md).
