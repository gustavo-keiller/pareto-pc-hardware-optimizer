# ParetoPC — Multi-Objective Hardware & PC Build Optimizer

Interactive hardware decision-support and data visualization web application inspired by Antoine Mayerowitz's *"Mario Meets Pareto"* study.

Hardware buyers face a Multi-Criteria Decision Making (MCDM) problem: minimizing **Retail Price ($)** and **Board Power / TBP (W)** while maximizing **1440p Raster FPS**, **1440p Ray Tracing FPS**, and **VRAM Capacity (GB)**.

---

## 4-Stage Mathematical Pipeline

1. **Stage 1: Hard-Constraint Pruning (`filterByHardConstraints`)** — Filters out candidates that violate strict user dealbreakers (max budget, minimum VRAM, max PSU/board wattage).
2. **Stage 2: Pareto Dominance & Frontier Identification (`evaluateParetoFrontier`)** — Identifies the non-dominated **Pareto Optimal Frontier** and flags strictly dominated "value trap" cards along with exact dollar/FPS/VRAM trade-off diagnostics.
3. **Stage 3: TOPSIS Multi-Objective Ranking (`rankByTopsis`)** — Normalizes user preference sliders ($w_j$) and ranks candidates by geometric closeness ($C_i \in [0, 1]$) to the Positive Ideal Solution ($A^+$) vs. Negative Ideal Solution ($A^-$).
4. **Stage 4 (Roadmap): Hedonic OLS Value Regression & Combinatorial Full-System Builder** — Log-linear fair-price regression ($\ln(\text{Price})$ vs. performance residuals) and pre-pruned full-build `(CPU, GPU, RAM, Motherboard, PSU)` optimization.

---

## Quick Start

```bash
npm install
npm run dev        # Start Vite dev server at http://localhost:5173
```

## Verification & Quality Gates

```bash
npm run check      # Runs tsc --noEmit + eslint + prettier --check + vitest run + check:docs
npm run format     # Auto-format with Prettier
npm run test       # Run Vitest unit & mathematical property tests
npm run check:docs # Verify AGENTS.md cap, skills, CODEMAP paths, links, math isolation, and file sizes
npm run build      # Production build to dist/
```

---

## Repository Navigation

- **[`AGENTS.md`](AGENTS.md)** — AI agent entry point, invariants, and verification workflow.
- **[`CODEMAP.md`](CODEMAP.md)** — Module topology and pipeline call chains.
- **[`CONTEXT.md`](CONTEXT.md)** — Full mathematical specification and phased roadmap.
- **[`TODO.md`](TODO.md) & [`DONE.md`](DONE.md)** — Active task backlog and shipped milestones.
- **[`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md)** — Master catalog of all project documentation, skills, and reference manuals.
