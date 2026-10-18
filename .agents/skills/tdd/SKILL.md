---
name: tdd
description: Test-driven development with a red-green loop using Vitest. Use when building new math algorithms, fixing bugs, or adding data transformations -- write the failing test first, then only enough code to pass it.
---

# Test-Driven Development (Vitest)

The red -> green loop. Write a failing test first. Then write only enough code to pass it.

## What a Good Test Is

Tests verify **mathematical and behavioral contracts through public interfaces**, not internal implementation details.

A good test reads like a specification:
- `"identifies the exact 3 trap GPUs in the Phase 1 synthetic dataset across all 5 metrics"`
- `"falls back to uniform weights (0.2 each) when all user sliders are set to 0"`
- `"never lists a dominated card in dominatedBy when a Pareto-optimal dominator exists"`

## Seams for ParetoPC

A **seam** is the public boundary you test at:

- `src/lib/math/pareto.ts`: `filterByHardConstraints()`, `dominates()`, `evaluateParetoFrontier()`, `get2DParetoFrontierCurve()`, `buildDominanceReason()`
- `src/lib/math/topsis.ts`: `normalizeWeights()`, `rankByTopsis()`
- `src/lib/math/regression.ts` (Phase 2): Hedonic OLS log-linear regression & residuals
- `src/lib/math/combinatorial.ts` (Phase 3): Pre-pruning, compatibility filtering, CPU-GPU bottleneck formula
- `src/utils/storage.ts`: `safeGetJSON()`, `safeGetInt()`, `safeGetBool()`

### Running Tests

```bash
npm run test                                      # Run all Vitest suites once
npx vitest run src/lib/math/__tests__/math.test.ts # Run specific suite
```

## Rules of the Loop

1. **Red before green**: Write the failing test, run `npx vitest run`, and confirm it fails for the expected reason.
2. **One slice at a time**: One test -> one minimal implementation -> repeat.
3. **No speculative code**: Only write enough code to pass the current test.
4. **No tautological assertions**: Test against known hand-calculated values or strict mathematical properties ($0 \le C_i \le 1$, $\sum w_j = 1$).
5. **Durable Invariant Focus**: Every committed test must protect an enduring mathematical or domain property, not an ephemeral debug state.

## Mathematical Invariants to Always Test

When adding or modifying a math module in `src/lib/math/`, ensure tests cover:

1. **Empty & Single-Element Boundaries:** `[]` returns `[]`; `[singleGpu]` returns `isParetoOptimal: true`, `topsisScore: 1.0`, `rank: 1`.
2. **Directionality Flip:** Verify both `'min'` (Price, Watts) and `'max'` (FPS, VRAM) metrics work in dominance and ideal solution calculation.
3. **Dominance Anti-Symmetry & Transitivity:** If $A \succ B$, then $\neg(B \succ A)$. If $A \succ B$ and $B \succ C$, then $A \succ C$.
4. **Zero-Weight & Identical-Candidate Degeneracy:** All-zero slider weights or identical candidate metrics never produce `NaN` or `Infinity`.
