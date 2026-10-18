---
name: to-spec
description: Turn a feature request or complex mathematical/UI change into a structured spec (.agents/specs/<feature>.md) and vertical-slice tickets (.agents/tickets/<feature>/). Use when a feature touches 3+ files, adds a new pipeline stage (like Phase 2 OLS Regression or Phase 3 Combinatorial Builder), or has open design questions.
---

# Feature Specification & Ticket Decomposition (`to-spec`)

Turns multi-file features and mathematical pipeline stages into a structured specification document and vertical slice tickets.

---

## 1. Specification Process

1. **Context Synthesis:** Check `CONTEXT.md`, `CODEMAP.md`, and `TODO.md` to align with existing mathematical definitions and types.
2. **Identify Test Seams:** Determine how the math and UI behavior will be verified in `src/lib/math/__tests__/`.
3. **Write Spec:** Save the document to `.agents/specs/<feature-name>.md` using the template below.

### Specification Template (`.agents/specs/<feature-name>.md`)

```markdown
# Spec: <Feature Name>

## Problem Statement

The user problem or mathematical capability being addressed.

## Mathematical & Technical Solution

Formulas, inputs/outputs, edge-case guards, and UI interaction flow.

## Implementation Decisions

- Math modules to create or modify in `src/lib/math/`
- Dataset changes in `src/data/`
- UI / ECharts components to create or modify in `src/components/`

## Testing Decisions

- Mathematical invariants and boundary cases to test in Vitest (`[], [1], zero-weights, ties`)

## Out of Scope

- Boundaries and excluded functionality
```

---

## 2. Ticket Decomposition Process

Break the work into independently verifiable vertical slices under `.agents/tickets/<feature-name>/<NN>-<ticket-slug>.md`:

1. **Slice 1 (Pure Math + Unit Tests):** Types + pure algorithm in `src/lib/math/` + 100% Vitest coverage.
2. **Slice 2 (Data & State Wiring):** Dataset integration in `src/data/` and state hook wiring.
3. **Slice 3 (Visualization & UI):** ECharts plot / table / drawer integration + `npm run check`.
