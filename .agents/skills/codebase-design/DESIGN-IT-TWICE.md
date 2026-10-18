# Design It Twice

When exploring alternative interfaces for a new math engine stage (e.g., Phase 2 Hedonic OLS or Phase 3 Combinatorial Builder) or a major UI decomposition, compare at least two distinct interface designs before writing implementation code.

Uses vocabulary in [`SKILL.md`](SKILL.md).

## Process

### 1. Frame the Problem Space

Write a brief summary of:
- Inputs, outputs, and mathematical invariants the new module must satisfy
- Degenerate edge cases (`[]`, collinear metrics, zero weights, incompatible sockets)
- How callers (`App.tsx`, charts, Vitest) will invoke it

### 2. Draft 2–3 Competing Interfaces

- **Design A (Minimalist / High-Leverage):** 1–2 exported functions with sensible defaults that hide all intermediate matrices and normalization steps.
- **Design B (Composable / Pipeline Stages):** Separate functions for each intermediate step (e.g., `prePruneComponents` + `generateValidBuilds` + `scoreBuilds`).

### 3. Compare and Pick

Contrast by **depth**, **locality**, and **testability**. Pick the design that gives callers the most leverage while keeping mathematical invariants testable in `src/lib/math/__tests__/`.
