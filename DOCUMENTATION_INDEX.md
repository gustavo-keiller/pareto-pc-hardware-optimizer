# ParetoPC — Documentation Index & Master Catalog

> Master index cataloging all active Markdown documentation, skills, and engineering reference manuals across the repository.

---

## Tier 1: Core Operational & Architectural Docs

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| [`AGENTS.md`](AGENTS.md) | **Auto-loaded agent entry point**: navigation, damaging invariants, verify commands. | AI Agents (loaded on start) |
| [`CLAUDE.md`](CLAUDE.md) | Imports `AGENTS.md` for Claude Code, plus Claude-specific skill stub & hook wiring. | Claude Code |
| [`README.md`](README.md) | Project overview, 4-stage MCDM summary, quickstart, and verification commands. | Developers & Users |
| [`CODEMAP.md`](CODEMAP.md) | **Repository Navigator**: Math engine modules, UI components, scripts, and call chains. | All Developers & AI Agents |
| [`CONTEXT.md`](CONTEXT.md) | **Mathematical Specification**: Formulas for Hard Constraints, Pareto, TOPSIS, OLS, and Full Builds. | All Developers & AI Agents |
| [`.agents/AGENTS.md`](.agents/AGENTS.md) | **16 Core Architectural Principles**: Deep guardrails and engineering invariants. | AI Agents & Maintainers |
| [`.agents/CURRENT_STATE.md`](.agents/CURRENT_STATE.md) | Real-time snapshot: what is in flight, unvalidated decisions, and recently completed work. | Active Developers & AI |
| [`TODO.md`](TODO.md) | **Task board**: Architecture refactors, Phase 2 (OLS Regression), and Phase 3 (Full Builder). | PM & Developers |
| [`DONE.md`](DONE.md) | **Shipped catalog**: Archive of completed features and infrastructure milestones. | PM & Developers |

---

## Tier 2: Domain & Workflow Skills (`.agents/skills/`)

Indexed by [`.agents/skills/skill-library/SKILL.md`](.agents/skills/skill-library/SKILL.md) and synced to `.claude/skills/` via `npm run sync:skills`:

### Domain-Specific Skills
- [`.agents/skills/mcdm-math-engine/SKILL.md`](.agents/skills/mcdm-math-engine/SKILL.md) — Mathematical invariants, directionality rules, numerical stability guards, and testing requirements.
- [`.agents/skills/echarts-pareto-viz/SKILL.md`](.agents/skills/echarts-pareto-viz/SKILL.md) — 2D Pareto staircase geometry, shaded dominated regions, hover dominator links, and Radar normalization.
- [`.agents/skills/hardware-copywriting/SKILL.md`](.agents/skills/hardware-copywriting/SKILL.md) — Unslop rules and MCDM Math-to-PC-Builder dictionary.
- [`.agents/skills/domain-modeling/SKILL.md`](.agents/skills/domain-modeling/SKILL.md) — Ubiquitous language, canonical domain terms, and ADR recording.

### Core Engineering & Workflow Skills
- [`.agents/skills/karpathy-guidelines/SKILL.md`](.agents/skills/karpathy-guidelines/SKILL.md) — Guardrails against over-engineering and drive-by refactors.
- [`.agents/skills/codebase-design/SKILL.md`](.agents/skills/codebase-design/SKILL.md) — Deep modules vocabulary and interface design principles (plus [`DEEPENING.md`](.agents/skills/codebase-design/DEEPENING.md) & [`DESIGN-IT-TWICE.md`](.agents/skills/codebase-design/DESIGN-IT-TWICE.md)).
- [`.agents/skills/typescript-best-practices/SKILL.md`](.agents/skills/typescript-best-practices/SKILL.md) — Zero `any`, zero unchecked `as` casts, and `_exhaustive: never` switches.
- [`.agents/skills/tdd/SKILL.md`](.agents/skills/tdd/SKILL.md) — Vitest red-green loop and durable mathematical property testing (plus [`mocking.md`](.agents/skills/tdd/references/mocking.md) & [`tests.md`](.agents/skills/tdd/references/tests.md)).
- [`.agents/skills/diagnosing-bugs/SKILL.md`](.agents/skills/diagnosing-bugs/SKILL.md) — Disciplined feedback-loop-first diagnosis protocol.
- [`.agents/skills/blast-radius/SKILL.md`](.agents/skills/blast-radius/SKILL.md) — 5-step safety verification ladder for core refactors.
- [`.agents/skills/code-review/SKILL.md`](.agents/skills/code-review/SKILL.md) — Two-axis Standards + Spec code review rubric.
- [`.agents/skills/preflight/SKILL.md`](.agents/skills/preflight/SKILL.md) — Pre-flight verification checklist (`npm run check`).
- [`.agents/skills/to-spec/SKILL.md`](.agents/skills/to-spec/SKILL.md) — Feature specification and vertical-slice ticket planning.
- [`.agents/skills/grilling/SKILL.md`](.agents/skills/grilling/SKILL.md) — Interactive design tree interrogation (`/grill-me`).
- [`.agents/skills/handoff/SKILL.md`](.agents/skills/handoff/SKILL.md) — Context compaction and session transition protocol.
- [`.agents/skills/resolving-merge-conflicts/SKILL.md`](.agents/skills/resolving-merge-conflicts/SKILL.md) — Hunk-by-hunk git conflict resolution.
- [`.agents/skills/writing-for-agents/SKILL.md`](.agents/skills/writing-for-agents/SKILL.md) — Standards for authoring literal, high-signal skills and rules.

---

## Tier 3: Deep Reference Manuals (`.agents/references/`)

- [`.agents/references/engineering-principles.md`](.agents/references/engineering-principles.md) — 21 Foundational Engineering Principles.
- [`.agents/references/patterns.md`](.agents/references/patterns.md) — TypeScript type patterns (Branded types, Discriminated unions, `NonEmpty<T>`, narrowing, `satisfies`).
- [`.agents/references/architecture-review.md`](.agents/references/architecture-review.md) — Architecture review and module deepening guide.
