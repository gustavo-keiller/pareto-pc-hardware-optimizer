# ParetoPC — Multi-Objective Hardware & PC Build Optimizer

Interactive hardware decision-support and data visualization web application inspired by Antoine Mayerowitz's *"Mario Meets Pareto"* study.

Hardware buyers face a Multi-Criteria Decision Making (MCDM) problem: minimizing **Retail Price ($)** and **Board Power / TBP (W)** while maximizing **1440p Raster FPS**, **1440p Ray Tracing FPS**, and **VRAM Capacity (GB)**.

---

## How It Ranks Hardware

Four stages: dealbreaker filters → Pareto frontier (drops cards that are worse *and* pricier than another) → TOPSIS ranking by your priorities → fair-price regression. The formulas live in [`CONTEXT.md`](CONTEXT.md) and the code map in [`CODEMAP.md`](CODEMAP.md).

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
npm run test:e2e   # Playwright end-to-end test (first run: npx playwright install chromium)
npm run snap       # Desktop + phone screenshots of each mode into snapshots/
```

---

## Repository Navigation

- **[`AGENTS.md`](AGENTS.md)** — AI agent entry point, invariants, and verification workflow.
- **[`CODEMAP.md`](CODEMAP.md)** — Module topology and pipeline call chains.
- **[`CONTEXT.md`](CONTEXT.md)** — Full mathematical specification.
- **[`TODO.md`](TODO.md) & [`DONE.md`](DONE.md)** — Active task backlog and shipped milestones.
- **[`.agents/skills/skill-library/SKILL.md`](.agents/skills/skill-library/SKILL.md)** — Index of agent skills and reference manuals.
- **[`.agents/GLOSSARY.md`](.agents/GLOSSARY.md)** — Math term → beginner wording → Pro wording.
