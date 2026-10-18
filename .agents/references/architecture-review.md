# Architecture Review & Deepening Guide

Framework for scanning the ParetoPC codebase for architectural friction and proposing **deepening opportunities** using the [`codebase-design`](../skills/codebase-design/SKILL.md) vocabulary.

---

## 1. Exploration Targets

Prioritize hotspots by size and coupling:

- **Math Modules (`src/lib/math/`):** Ensure pure functions have small, high-leverage signatures, zero UI dependencies, and complete unit tests.
- **React Components (`src/App.tsx`, `src/components/`):** Check for excessive file size (>600 lines), high prop count, inline data transformations that belong in `src/lib/math/`, and duplicated metric formatting.
- **State & Storage (`src/utils/storage.ts`, custom hooks):** Keep `localStorage` persistence behind a narrow hook interface so UI components only read state and dispatch semantic actions.

Apply the **deletion test**: would deleting a module concentrate complexity, or just remove a pass-through wrapper?

---

## 2. Presenting Candidates

Format refactoring recommendations clearly:

- **Files:** Involved files and modules
- **Problem:** Concrete source of friction or coupling (e.g., 866-line `App.tsx` mixing state, presets, and table markup)
- **Solution:** Targeted deepening proposal
- **Benefits:** Locality, leverage, and testability improvements
- **Visualization:** Mermaid diagram showing Before vs. After module boundaries
