@AGENTS.md

## Claude Code specifics

The protocol above is shared with every agent tool; edit it in `AGENTS.md`, not here. Only Claude-specific wiring belongs in this file.

- **Skills** appear in your skill list through the stubs in `.claude/skills/`. Each stub tells you to read the real `SKILL.md` in `.agents/skills/` — do that before following it. Never edit a stub; edit the source and run `npm run sync:skills`.
- **Context cap:** `.claude/settings.json` sets `autoCompactWindow` to 300K. `.agents/scripts/context-budget.cjs` (a prompt hook) warns the user once at 150K and 225K tokens and at 8 and 24 hours of session age. When that warning appears, finish the current step and offer a handoff (`handoff` skill) instead of taking on a new task in this session.
- **`.claude/settings.json`** (committed) allows check, test, and read-only git commands without prompting, runs `.agents/scripts/block-dangerous-git.cjs` before every Bash and PowerShell call, and runs `.agents/scripts/context-budget.cjs` on every prompt.
