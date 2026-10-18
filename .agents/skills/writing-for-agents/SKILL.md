---
name: writing-for-agents
description: How to write good skill files, AGENTS.md rules, and any document an agent reads via a pointer. Use when creating or editing SKILL.md files or updating AGENTS.md.
---

# Writing for Agents

Guidelines for writing documents that agents actually follow. Agents are literal — they follow what you write, not what you meant. Vague rules produce inconsistent behaviour.

## Skill Files (`SKILL.md`)

### Do

- **Start with a precise trigger**: the `description` frontmatter tells the agent when to invoke this skill. Be specific: *"Use when editing files in `src/lib/math/`"* is better than *"Use for math tasks"*.
- **Give ordered steps**: agents follow sequences. Unordered prose produces random execution order.
- **Show, do not tell**: include code snippets, exact commands, and example outputs. *"Run `npm run check`"* is clearer than *"verify the code works"*.
- **Reference other skills by path**: `See .agents/skills/preflight/SKILL.md`. Never refer to skills by name alone.
- **State what NOT to do**: negative rules are often more valuable than positive ones. *"Never hardcode `<` or `>` for metrics; read `METRIC_DEFINITIONS[key].direction`"* is more actionable than *"respect metric direction"*.
- **Include a verification step**: every skill should end with how to confirm the work was done correctly (`npm run check`).
- **Use concrete project examples**: name real files (`src/lib/math/pareto.ts`), real functions (`evaluateParetoFrontier`), and real commands (`npm run check:docs`).

### Do Not

- Write prose essays — agents do not extract meaning well from flowing text
- Use vague qualifiers: *"try to"*, *"consider"*, *"it may be useful"* — these are ignored
- Repeat content from `AGENTS.md` verbatim — link to it instead
- Make one skill a kitchen sink — one skill = one domain
- Nest more than 3 heading levels deep

### Size Guide

- Under 100 lines: ideal
- 100–200 lines: acceptable for complex domains
- Over 200 lines: split into sub-skills with a main `SKILL.md` that references them

## `AGENTS.md` Rules

`AGENTS.md` is the constitution — it applies everywhere, always. Keep it under 12,000 characters (`npm run check:docs` enforces this).

**A good rule:**

- Is a single, enforceable statement
- Has a clear violation condition
- Names the mechanism that enforces it (type, Vitest test, check script, skill)
- Does not overlap with another rule

## Checklist Before Publishing a New Skill

- [ ] Does the `description` frontmatter clearly say when to invoke this?
- [ ] Does the skill have numbered or bulleted ordered steps?
- [ ] Does it include at least one command to run?
- [ ] Does it end with a verification step (`npm run check`)?
- [ ] Is it under 200 lines?
- [ ] Is it indexed in `.agents/skills/skill-library/SKILL.md`?
- [ ] Did you run `npm run sync:skills` so `.claude/skills/` has its stub?
