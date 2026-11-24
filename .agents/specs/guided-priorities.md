# Spec: guided priorities and precise scoring (PRI-01..11)

Plan and audit with reproductions: project file `plans/PRIORITIES-AND-SCORING-PLAN.md` (shared project folder, not in the repo). Math: [`CONTEXT.md` §3.5](../../CONTEXT.md). Files: [`CODEMAP.md`](../../CODEMAP.md).

## Problem
Simple mode ranked with TOPSIS, which is relative to the current list: adding or removing an unrelated card, or raising the budget, could reorder cards that were already affordable, and a slider's % was not its real pull (price pulled ~2.3× harder than VRAM per point). The step-5 walkthrough used a different formula (Cobb-Douglas), so the page could name two different "best" cards. The bad-deal filter ignored criteria the user weighted, and the top pick skipped cards by the `[TRAP]` name.

## Decision
gustavo chose (2026-10-26): Simple mode and its walkthrough use a weighted score on fixed scales; Explorer and Pro keep TOPSIS as a second opinion. One stored priority profile feeds both (TOPSIS weights are its five-metric slice).

## Behaviour
- "What matters to you" sits inside the first card, right after the use case. Use cases are presets that fill visible rows. Each row: 0–5 stars, share of the score, remove; features have "must have". "+ Add" offers derived parameters (value for money, efficiency), features (frame gen, AV1, CUDA) and "create your own rating" (0–10 per card, unrated = 5). FPS and VRAM goals set what counts as "enough".
- The hero shows "x.x/10 for you", a confidence badge, exact points per priority, a practical-tie note, "X is now #1 because you raised Y", and up to 3 flip points with "Try it".
- Step-down is the best-scoring cheaper option; step-up is the best-scoring pricier option that is also faster (else any pricier one).
- Cards with a better alternative on the weighted priorities (3% tolerance) or missing a must-have are set aside, with a count.

## Not in scope
Price sources and manual prices (PR #7). Explorer/Pro still rank with TOPSIS; switching their leaderboards to the priority score is a follow-up (`[PRI-12]`).
