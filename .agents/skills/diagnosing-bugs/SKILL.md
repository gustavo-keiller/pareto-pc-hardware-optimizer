---
name: diagnosing-bugs
description: Disciplined diagnosis loop for math bugs, NaN regressions, ECharts glitches, and state synchronization issues. Use when something is broken, throwing, failing, or producing wrong output. Do NOT hypothesize before building a feedback loop.
---

# Diagnosing Bugs

A discipline for hard bugs in ParetoPC. Skip phases only when explicitly justified.

## Phase 1: Build a Feedback Loop (Most Important Phase)

Without a tight pass/fail signal, no amount of reading code will reliably find the cause.

If you catch yourself reading code to build a theory before a red-capable command exists — **stop**.

### Ways to Construct One

1. **Failing Vitest unit test** — add a test in `src/lib/math/__tests__/math.test.ts` (or a new `.test.ts` file) with the exact candidate inputs and weights that trigger the bug.
2. **TypeScript compiler check** — `npx tsc --noEmit` for type or property mismatches.
3. **Differential check** — run the same input through the pipeline before and after the suspected change and compare the output vectors (`normalizedMetrics`, `weightedMetrics`, `distanceToBest`, `topsisScore`).

### Completion Criterion

Phase 1 is done when you can name **one command you have already run** that goes red on this specific bug and is deterministic and fast.

## Phase 2: Reproduce + Minimise

Run the loop. Confirm the failure matches what the user described. Then **minimise**: cut the candidate list down from 10 GPUs to the smallest 2–3 GPU subset and minimum active metrics that still reproduce the issue.

## Phase 3: Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Each must be falsifiable:

> "If X is the cause, then changing Y will make the bug disappear."

Common hypothesis sources in ParetoPC:

- **Directionality inversion:** A `'min'` metric (`price`, `tdpWatts`) was treated as `'max'` when sorting the 2D staircase curve, computing radar bounds, or picking $A^+$/$A^-$.
- **2D Slice vs. N-Dimensional Pareto Mismatch:** A card is Pareto-optimal in 5D (because of 16GB VRAM or lower TDP) but appears inside the dominated region of a 2D Price-vs-Raster plot.
- **Zero-norm / Zero-denominator NaN:** All remaining candidates have the same value on a metric, or all user slider weights are 0.
- **Stale React memoization:** Missing dependency in `useMemo` in `App.tsx`, `ParetoScatterPlot.tsx`, or `ComparisonDrawer.tsx`.
- **ECharts series merge issue:** ECharts reusing stale series data when `notMerge` is not configured or series keys collide.

## Phase 4: Instrument

Each probe maps to one hypothesis. **Change one variable at a time.**

- Tag every temporary debug log with a unique prefix: `console.log('[DEBUG-a4f2]', value)`. Cleanup = one grep.

## Phase 5: Fix + Regression Test

1. Turn the minimised repro into a permanent property/contract test in `src/lib/math/__tests__/` — watch it fail.
2. Apply the minimal surgical fix — watch it pass.
3. Re-run `npm run check`.

## Phase 6: Cleanup

Before declaring done:

- [ ] Original repro no longer reproduces
- [ ] All `[DEBUG-...]` tagged logs removed
- [ ] Root cause stated clearly in summary to user
- [ ] Run `.agents/skills/preflight/SKILL.md` (`npm run check`)
