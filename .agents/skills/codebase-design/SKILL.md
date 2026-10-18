---
name: codebase-design
description: Shared vocabulary for designing deep modules in the ParetoPC project. Use when designing or improving a module's interface, when a file exceeds 400 lines (such as src/App.tsx) or exposes more than 6 public functions, or when separating math engine logic from React UI.
---

# Codebase Design

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. In ParetoPC, our primary boundaries are the **Pure Math Engine (`src/lib/math/`)**, **State / Persistence Hooks**, and **Visualization Components (`src/components/`)**.

## Glossary

Use these terms consistently:

- **Module**: anything with an interface and an implementation: a pure math function (`evaluateParetoFrontier`), a custom React hook (`useOptimizerState`), or a chart component (`ParetoScatterPlot`).
- **Interface**: everything a caller must know to use the module correctly: the type signature, mathematical invariants, directionality assumptions, and edge-case behavior (`[]`, zero weights).
- **Implementation**: what's inside a module, its body of code.
- **Depth**: leverage at the interface. A module is **deep** when rich algorithmic or visual behaviour sits behind a small, clean signature; **shallow** when the interface is nearly as complex as the implementation.
- **Seam** *(Michael Feathers)*: a place where you can test or alter behaviour without editing internals.

## Deep vs. Shallow in ParetoPC

**Deep module** = small interface + rich implementation:

- `rankByTopsis(candidates, weights) -> RankedGpu[]`: Caller passes evaluated candidates and raw 0–100 slider numbers; the module handles weight normalization, zero-sum fallback, vector normalization, ideal $A^+$/$A^-$ directionality, Euclidean distances, and tie-breaking internally.
- `ParetoScatterPlot`: Caller passes `gpus`, `xMetric`, `yMetric`, and hover callbacks; the component computes the 2D staircase curve, shaded polygon, bubble sizing, and ECharts option series internally.

**Shallow module** = large interface + little implementation:

- A wrapper function that just calls `.filter()` with one condition and forwards 6 arguments.
- A monolithic `App.tsx` (currently 866 lines) that mixes state initialization, preset definitions, filter bars, slider controls, and leaderboard table markup in one component.

## Examples to Watch Out For

- **`src/App.tsx` (866 lines)**: Prime candidate for deepening (`[ARCH-01]` in `TODO.md`). Extract state + `localStorage` persistence into a focused hook and split the UI into deep domain panels (`ConstraintFilterBar`, `TopsisWeightSliders`, `GpuLeaderboardTable`).
- **`src/lib/math/`**: Keep exports coarse-grained and pure (`filterByHardConstraints`, `evaluateParetoFrontier`, `get2DParetoFrontierCurve`, `rankByTopsis`).

## Principles

- **Depth is a property of the interface, not the implementation.**
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across callers, it was earning its keep.
- **The interface is the test surface.** Test `src/lib/math/` through its exported functions in `src/lib/math/__tests__/`.
