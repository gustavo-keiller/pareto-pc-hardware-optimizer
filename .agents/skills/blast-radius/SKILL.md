---
name: blast-radius
description: Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it is safe because of by running real code instead of writing an explanation. Use for "blast radius of X", "what could this break", reviewing core math changes, or verifying refactors.
---

# Blast Radius

Find what a change breaks somewhere else, before it ships.

In ParetoPC, changes to `MetricKey`, `METRIC_DEFINITIONS`, `evaluateParetoFrontier`, `rankByTopsis`, or `GpuCandidate` ripple across the 2D scatter staircase, hover dominator connectors, TOPSIS sliders, radar chart normalization, and `localStorage` state.

---

## The Core Rule: Do Not Trust Your Own Writeup

A writeup that sounds convincing is worthless if it is not grounded in execution. **Find the one or two critical facts the change's safety depends on and prove them by running code.**

### The 5-Step Safety Verification Ladder

1. **Level 1 (Worthless alone):** You asserted it in prose ("this only affects the radar chart").
2. **Level 2 (Static reference):** You cited an exact `file:line` or type definition.
3. **Level 3 (Logical step-through):** You traced the data flow through all branches and showed the bad state cannot reach.
4. **Level 4 (Automated proof):** You ran a real test or check (`npm run test`, `npx tsc --noEmit`, `npm run build`) that executes the code path and fails loudly if wrong.
5. **Level 5 (Runtime reproduction):** You verified the actual rendered chart/UI behavior in the browser.

**Any safety claim that stops at Level 1 or Level 2 must be flagged as `[UNPROVEN]`.**

---

## Investigation Steps

1. **Analyze the Diff & Unspoken Contracts:**
   - Did a metric's unit, scale, or `direction` (`'min' | 'max'`) change?
   - Does `ParetoScatterPlot` or `ComparisonDrawer` assume `ALL_METRIC_KEYS` has a fixed order or length?
2. **Identify the One Load-Bearing Safety Fact:**
   - Pin down the exact invariant that makes the change safe (e.g. *"every metric lookup goes through `METRIC_DEFINITIONS[key]` and all switches use `_exhaustive: never`"*).
3. **Look Where Grep Stops:**
   - **Local Storage Schemas:** Could saved `PreferenceWeights` or `HardConstraints` in `localStorage` lack a newly added `MetricKey` and produce `NaN` in `normalizeWeights()`?
   - **ECharts Coordinate Arrays:** Does `stepLineCoords` order change when the user picks a `'max'` metric on the X-axis?
4. **Prove the Safety Fact:**
   - Write or run a Vitest test and run `npm run check`.

---

## What to Report Back

- **What Changed:** Exact functional change, including non-obvious side effects.
- **The Core Safety Invariant:** The single fact the change's safety depends on, with its Ladder Level (1–5) and proof.
- **Identified Risks & Edge Cases:** Real risks with their `file:line` and verification status.
- **Pre-Merge Verification:** The repeatable command (`npm run check`) that proves safety.
