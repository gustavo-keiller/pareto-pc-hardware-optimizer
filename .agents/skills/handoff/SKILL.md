---
name: handoff
description: Compact the current conversation into a handoff document so another agent or resumed session can continue the work without losing context. Use when context is filling up, when handing off to another agent round, or when a task spans multiple sessions.
---

# Handoff

Write a handoff document so the next agent can pick up exactly where you left off. Be specific — vague summaries cause the next agent to re-discover things you already know.

## When to Use

- Your context is filling up mid-task
- You are finishing a round and assigning work to other agents
- A task spans multiple sessions and you want continuity

## Update `.agents/CURRENT_STATE.md` — Only What the Snapshot Tracks

`.agents/CURRENT_STATE.md` is a fixed-structure snapshot (`AGENTS.md` Rule 15). Keep its sections; never rewrite it into a session log:

- Work started but not finished -> **🔴 In Flight**: the exact stopping point and what remains.
- Decisions the user has not validated -> **🔶 Decisions Made Without Validation** (Rule 13).
- Finished work -> one line in **🟡 Recently Completed** (and update `TODO.md` / `DONE.md`).

If nothing is in flight and nothing was decided unvalidated, leave the file alone.

## Write the Handoff Prompt

Use this structure for the next session's prompt:

```markdown
# Handoff — [date]

## What was just completed

[List of tasks finished in this session, with specific file paths changed]

## Work in progress (if any)

[Any task started but not finished — include the exact stopping point and what remains]

## Next steps (priority order)

1. [Most urgent next action with enough context to start immediately]
2. [Second priority]

## Decisions Made Without Validation

[What you decided, what the alternative was, which file it affects]

## Files changed this session

- `src/lib/math/...` — ...
- `src/components/...` — ...
```
