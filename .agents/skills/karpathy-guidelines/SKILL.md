---
name: karpathy-guidelines
description: Behavioral guardrails to prevent common LLM coding mistakes. Read before writing any new code — math functions, React components, or hooks. Prevents over-engineering, drive-by refactoring, and weak success criteria.
---

# Karpathy Guidelines

Four rules that prevent the most common agent coding failure modes, adapted for the ParetoPC TypeScript / React / ECharts stack.

**Bias:** These rules favor caution over speed. For trivial one-liners, use judgment.

---

## 1. Think Before Coding

**State assumptions explicitly. Surface tradeoffs. Never pick silently.**

Before implementing anything:

- Write out your assumptions. If uncertain about a mathematical formula or rule, check `CONTEXT.md` or `AGENTS.md` first.
- If multiple approaches exist (e.g. computing 2D vs. N-dimensional Pareto dominance, or normalizing Radar axes), name both and pick with a reason.
- If a simpler approach exists (e.g. reusing `evaluateParetoFrontier` instead of writing a new dominance loop), say so.
- If the requirement is unclear, stop and ask rather than guessing.

**Anti-rationalization:** *"I will figure it out as I go"* -- No. State the plan first.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No new abstraction layers for single-use logic (a helper called once is just indirection).
- No configurability that was not requested.
- No defensive branches for impossible types already guaranteed by `MetricKey`.
- If you wrote 100 lines and it could be 30, rewrite it.

**Test:** Would a senior TypeScript engineer say this is overcomplicated? If yes, simplify.

**Anti-rationalization:** *"I added this in case we need it later"* -- Remove it. YAGNI applies here.

---

## 3. Surgical Changes

**Touch only what the task requires. Clean up only your own mess.**

When editing existing code:

- Don't alter adjacent TOPSIS weights, seed GPU numbers, or ECharts styling that aren't broken.
- Don't reformat files you're only reading.
- Match the existing style of the file you're in.
- If you notice unrelated dead code, **mention it in your response** -- don't delete it.

When your changes create orphans:

- Remove imports and variables that YOUR changes made unused.
- Don't remove pre-existing dead code unless explicitly asked.

**Test:** Every changed line traces directly to the user's request. If it doesn't, revert it.

---

## 4. Goal-Driven Execution

**Transform vague tasks into verifiable success criteria before writing any code.**

| Vague | Verifiable |
| :--- | :--- |
| "Fix the TOPSIS tie-breaker" | Write a test in `src/lib/math/__tests__/math.test.ts` with two tied GPUs where one is Pareto-optimal, then make it pass |
| "Add OLS regression" | Write unit tests in `regression.test.ts` verifying exact log-linear $\hat{P}$ and residuals on synthetic points, then implement `regression.ts` |
| "Split `App.tsx`" | Extract components while keeping `npm run check` and `npm run build` green with identical rendered behavior |

For multi-step tasks, state a brief plan before starting:

```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```
