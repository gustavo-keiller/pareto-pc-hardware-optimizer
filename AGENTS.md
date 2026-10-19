# ParetoPC — Agent Entry Point

Multi-Objective Hardware & PC Build Optimizer (inspired by Antoine Mayerowitz's *Mario Meets Pareto*).
Pure TypeScript MCDM math engine (`src/lib/math/`) + React 18 / Vite 6 / Tailwind v4 / Apache ECharts frontend (`src/`).

This is the short version of the protocol, loaded automatically by tools that read `AGENTS.md` (Antigravity, Codex, Cursor, Copilot), by Gemini CLI through `.gemini/settings.json`, and by Claude Code through `CLAUDE.md`. The full protocol lives in `.agents/`. Keep this file under 12,000 characters (`npm run check:docs` enforces it).

---

## Look up what you need — don't read everything first

Read only the part your task needs:

1. [`.agents/CURRENT_STATE.md`](.agents/CURRENT_STATE.md) — the 🔴 **In Flight** section (top ~30 lines): what is currently being built or blocked.
2. [`CODEMAP.md`](CODEMAP.md) — module topology, math engine boundaries, UI components, and the 4-stage pipeline call chains.
3. [`CONTEXT.md`](CONTEXT.md) — mathematical specification (Hard Constraints, Pareto Dominance, TOPSIS, Hedonic OLS Regression, and Combinatorial System Builder).
4. [`.agents/AGENTS.md`](.agents/AGENTS.md) — the 16 architectural principles. Read when a change spans multiple subsystems or adds new state/math layers.

Roadmap and backlog: [`TODO.md`](TODO.md). Shipped milestones: [`DONE.md`](DONE.md). Words for UI copy: [`.agents/GLOSSARY.md`](.agents/GLOSSARY.md).

**One home per fact.** Math lives in `CONTEXT.md`, files in `CODEMAP.md`, skills in `skill-library`, terms in `GLOSSARY.md`, tasks in `TODO.md`/`DONE.md`. Link to the home instead of restating it elsewhere.

## Work from a real clone

Cloud and remote sessions clone the GitHub repo (`gustavo-keiller/pareto-pc-hardware-optimizer`) and open PRs against `main`. Don't work from synced or uploaded copies of the folder: they usually lack the dot-folders (`.agents/`, `.claude/`, `.gemini/`, `.github/`), so skills are missing and `check:docs` reports broken links. After a PR merges, local checkouts need `git pull`.

## This checkout may be shared

Multiple agent sessions may work in this working tree at once. Only edit, stage, format, or revert files you changed. Never run `reset --hard`, `clean -f`, `branch -D`, `checkout .` / `restore .`, or a push that rewrites or deletes remote history (`--force`, `+refspec`, `--mirror`, `--delete`, force-push to main) — ask the user. (`.agents/scripts/block-dangerous-git.cjs` enforces this in Claude Code.)

## Keep your context small

Every turn re-reads the whole conversation, so anything that enters context is paid for again on every later turn.

- **One task per session.** When the task is done or the topic changes, write a handoff (`handoff` skill) and start a fresh session rather than carrying on.
- **Filter command output before it reaches you.** Test runs and builds: `| tail -n 40` or `| grep -E 'error|FAIL'`.
- **Search in two steps.** List matching files first, then read only the line ranges you need. Don't re-read a file that is already in context unless it changed.

## Invariants that cause real damage when broken

- **Pure Math Engine Isolation (Rule 1).** Everything in `src/lib/math/` must be 100% pure, deterministic TypeScript with **zero** React, DOM, `localStorage`, or ECharts imports. Every math module must have comprehensive Vitest unit tests in `src/lib/math/__tests__/`.
- **Directionality Authority (Rule 2).** Never hardcode `<` or `>` comparisons for metrics in math or UI code. Always read `METRIC_DEFINITIONS[metric].direction` (`'min' | 'max'`) from `src/lib/math/types.ts`. Adding a new metric must work automatically across Pareto dominance, TOPSIS ideal best/worst, and ECharts axes.
- **Numerical & Boundary Safety (Rule 3).** Guard all denominators against zero (`denom > 0 ? num / denom : fallback`). When all user slider weights are `0`, fall back to uniform weights (`1 / k`). Use `1e-9` epsilon for floating-point tie-breakers in TOPSIS and OLS regression.
- **Pre-Prune Before Combinatorics (Rule 4).** In Phase 3 (Full-System Builder), always filter by hard constraints and eliminate Pareto-dominated components **within each category** (`CPU`, `GPU`, `RAM`, `Motherboard`, `PSU`) *before* generating Cartesian combinations. Never brute-force unpruned catalogs on the UI thread.
- **Strict TypeScript — Zero `any` & Zero Unchecked `as` (Rule 5).** Use discriminated unions and `_exhaustive: never` in `switch` statements over `MetricKey` or hardware categories. External JSON or `localStorage` data starts as `unknown`.
- **Safe Storage (Rule 6).** Use `safeGetJSON` / `safeSetJSON` / `safeGetInt` / `safeGetBool` from `src/utils/storage.ts`. A raw `JSON.parse(localStorage.getItem(...))` white-screens the app on corrupted or migrated data.
- **Deep Modules & File Size Cap (Rule 7).** Favor deep modules (small interface, rich implementation). Split any file approaching ~600–800 lines into focused modules or custom hooks (`src/App.tsx` is actively queued for decomposition). `check:docs` fails above 800 lines; the legacy files in `OVERSIZED_FILE_ALLOWLIST` may only shrink, so never raise their ceilings: move code out instead.
- **Durable Property Tests Only (Rule 8).** Tests in `__tests__/` must assert mathematical invariants (transitivity, scale invariance, monotonicity, bounds $C_i \in [0, 1]$, zero-weight fallback) — never ephemeral one-off debug repros.

## Verify before declaring done

While iterating, run the narrowest check that covers your change:

```bash
npx tsc --noEmit          # TypeScript check
npx vitest run            # Unit tests (~1s)
```

Before declaring done:

```bash
npm run check             # tsc + eslint + prettier + vitest + docs/file-size check (CI runs this too)
npm run check:docs        # AGENTS.md size cap, skill stubs, and markdown link integrity
```

## Keep the docs true in the same commit

`npm run check:docs` fails when documentation drifts from code:

| If you...                                      | Update                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| add, move, or split a math module or component | `CODEMAP.md`                                                        |
| add or remove a skill, or edit its frontmatter | `.agents/skills/skill-library/SKILL.md`, then `npm run sync:skills` |
| move or delete any markdown file               | every doc that links to it                                          |
| finish or add a `TODO.md` item                 | delete it from `TODO.md` + add a line in `DONE.md`                  |

Update `.agents/CURRENT_STATE.md` **only** when the 🔴 In Flight section changes — not merely because a session ended. Features touching 3+ files get a spec in `.agents/specs/` first (`to-spec` skill).

## Skills

Task-specific playbooks live in `.agents/skills/` (indexed by [`skill-library`](.agents/skills/skill-library/SKILL.md)). Antigravity and Gemini CLI load `.agents/skills/` natively, and Claude Code sees each skill through a generated stub in `.claude/skills/` (`npm run sync:skills`).

Reach for them by task:
- **Domain:** `mcdm-math-engine`, `echarts-pareto-viz`, `hardware-copywriting`, `domain-modeling`
- **Engineering & Workflow:** `karpathy-guidelines`, `codebase-design`, `typescript-best-practices`, `tdd`, `diagnosing-bugs`, `blast-radius`, `code-review`, `preflight`, `to-spec`, `grilling`, `handoff`, `resolving-merge-conflicts`, `writing-for-agents`
