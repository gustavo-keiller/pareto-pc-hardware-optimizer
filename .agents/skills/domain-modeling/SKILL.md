---
name: domain-modeling
description: Build and sharpen the ParetoPC domain model. Use when a new hardware category, metric, or optimization stage is introduced in code, when a term is used inconsistently across files, or when updating CONTEXT.md.
---

# Domain Modeling — ParetoPC

Actively maintain a sharp, consistent domain vocabulary across math types, UI components, and documentation.

## Canonical Domain Terms (`CONTEXT.md` & `src/lib/math/types.ts`)

- **Candidate (`GpuCandidate` / Hardware Candidate):** A single hardware item evaluated by the pipeline.
- **Metric (`MetricKey` & `MetricDefinition`):** A measurable objective with an explicit `OptimizationDirection` (`'min'` or `'max'`) and `unit` (`$`, `FPS`, `GB`, `W`, `mm`).
- **Hard Constraints (`HardConstraints`):** Stage 1 step-function dealbreakers (`maxPrice`, `minVram`, `maxWatts`) that prune the candidate set to $S_{\text{valid}}$ before dominance analysis.
- **Pareto Dominance ($A \succ B$):** Candidate $A$ is at least as good as $B$ on all active objectives and strictly better on at least one.
- **Pareto Frontier (`isParetoOptimal === true`):** The set of non-dominated candidates in $S_{\text{valid}}$.
- **Value Trap (`isDominated === true`):** A candidate strictly dominated by one or more Pareto-optimal items (`dominatedBy` / `dominanceReasons`).
- **TOPSIS Closeness (`topsisScore` $C_i \in [0, 1]$ / `topsisScorePct`):** Relative geometric closeness to the weighted Positive Ideal Solution ($A^+$) vs. Negative Ideal Solution ($A^-$).
- **Hedonic OLS Baseline (Phase 2):** Fair-market predicted price $\hat{P}$ from log-linear regression $\ln(\text{Price})$ vs. performance metrics.
- **System Build Tuple (Phase 3):** `Build = (CPU, GPU, RAM, Motherboard, PSU)` evaluated after intra-category Pareto pre-pruning and compatibility checks.

## Guidelines

- **Never mix 2D Slice Optimality with N-Dimensional Optimality silently:** Name variables `frontier2D` vs. `paretoOptimalND` when both exist in scope.
- **Update `CONTEXT.md`, `src/lib/math/types.ts`, and [`.agents/GLOSSARY.md`](../../GLOSSARY.md) together** whenever a new metric, stage, or part category is introduced. The glossary holds the beginner and Pro wording for each term.
