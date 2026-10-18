---
name: resolving-merge-conflicts
description: Resolve in-progress git merge or rebase conflicts hunk-by-hunk. Use when git status shows files with UU/AA/DD markers, when <<<<<< conflict markers appear in source files, or when a merge/rebase has been started and cannot complete.
---

# Resolving Merge Conflicts

1. **Inspect conflicted files** with `git status`.
2. **Find the primary sources** for each conflict. Understand why each change was made and what the original intent was (`git log --merge -p <file>`).
3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour.
4. **Run automated checks** to verify your resolution:
   - `npm run check` (`tsc --noEmit`, `vitest run`, `check:docs`)
   - `npm run build`
5. **Finish the merge/rebase.** Stage resolved files and continue.
