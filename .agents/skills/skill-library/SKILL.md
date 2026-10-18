---
name: skill-library
description: Router for domain-specific, workflow, and situational skills across the ParetoPC codebase. Use when navigating which skill applies to a task.
---

# Skill Library & Router — ParetoPC

Quick index of active domain and workflow skills in `.agents/skills/`.

---

## 1. Domain-Specific Skills (MCDM Math, Charts & Hardware Copy)

| Trigger | Skill |
| :--- | :--- |
| Modifying Pareto dominance, TOPSIS ranking, Hedonic OLS regression, or Phase 3 combinatorial system math? | [`.agents/skills/mcdm-math-engine/SKILL.md`](../mcdm-math-engine/SKILL.md) |
| Modifying ECharts 2D Pareto scatter plot, frontier staircase curve, radar chart, or parallel coordinates? | [`.agents/skills/echarts-pareto-viz/SKILL.md`](../echarts-pareto-viz/SKILL.md) |
| Writing UI labels, trap explanations, tooltips, preset descriptions, or documentation? | [`.agents/skills/hardware-copywriting/SKILL.md`](../hardware-copywriting/SKILL.md) |
| Defining hardware entities, metrics, units, or recording architectural decisions? | [`.agents/skills/domain-modeling/SKILL.md`](../domain-modeling/SKILL.md) |

---

## 2. Core Engineering & Workflow Skills

| Trigger | Skill |
| :--- | :--- |
| Writing any new code (math modules, React components, hooks)? Prevent over-engineering | [`.agents/skills/karpathy-guidelines/SKILL.md`](../karpathy-guidelines/SKILL.md) |
| Designing deep modules, clean interfaces, or decomposing large files (`App.tsx`)? | [`.agents/skills/codebase-design/SKILL.md`](../codebase-design/SKILL.md) |
| Writing or refactoring TypeScript / React code? | [`.agents/skills/typescript-best-practices/SKILL.md`](../typescript-best-practices/SKILL.md) |
| Writing unit or property tests in Vitest (TDD red-green loop)? | [`.agents/skills/tdd/SKILL.md`](../tdd/SKILL.md) |
| Diagnosing a math bug, NaN regression, or UI rendering defect? Build feedback loop first | [`.agents/skills/diagnosing-bugs/SKILL.md`](../diagnosing-bugs/SKILL.md) |
| Evaluating refactoring blast radius and proving safety with real code? | [`.agents/skills/blast-radius/SKILL.md`](../blast-radius/SKILL.md) |
| Feature specification and vertical-slice ticket breakdown (3+ files)? | [`.agents/skills/to-spec/SKILL.md`](../to-spec/SKILL.md) |
| Reviewing completed code (two-axis Standards + Spec check)? | [`.agents/skills/code-review/SKILL.md`](../code-review/SKILL.md) |
| Finalizing changes before completing a task or PR? | [`.agents/skills/preflight/SKILL.md`](../preflight/SKILL.md) |
| Handing off context to another agent or session? | [`.agents/skills/handoff/SKILL.md`](../handoff/SKILL.md) |
| Stress-testing a plan with an interactive grill session? | [`.agents/skills/grilling/SKILL.md`](../grilling/SKILL.md) |
| Resolving git merge or rebase conflicts hunk-by-hunk? | [`.agents/skills/resolving-merge-conflicts/SKILL.md`](../resolving-merge-conflicts/SKILL.md) |
| Authoring or updating `SKILL.md` files or `AGENTS.md` rules? | [`.agents/skills/writing-for-agents/SKILL.md`](../writing-for-agents/SKILL.md) |

---

## 3. Deep Reference Manuals (`.agents/references/`)

Read on-demand when specific deep-dive patterns are needed:

| Topic | Reference Path |
| :--- | :--- |
| **21 Foundational Engineering Principles** | [`.agents/references/engineering-principles.md`](../../references/engineering-principles.md) |
| **TypeScript Type Patterns (branded, narrowing, `satisfies`)** | [`.agents/references/patterns.md`](../../references/patterns.md) |
| **Architecture Review & Deepening Guide** | [`.agents/references/architecture-review.md`](../../references/architecture-review.md) |
| **Deepening Modules & Designing Interfaces Twice** | [`.agents/skills/codebase-design/DEEPENING.md`](../codebase-design/DEEPENING.md) & [`DESIGN-IT-TWICE.md`](../codebase-design/DESIGN-IT-TWICE.md) |
| **Good vs. Bad Tests & When to Mock** | [`.agents/skills/tdd/references/tests.md`](../tdd/references/tests.md) & [`mocking.md`](../tdd/references/mocking.md) |
| **ADR & CONTEXT.md Formats** | [`.agents/skills/domain-modeling/references/ADR-FORMAT.md`](../domain-modeling/references/ADR-FORMAT.md) & [`CONTEXT-FORMAT.md`](../domain-modeling/references/CONTEXT-FORMAT.md) |
