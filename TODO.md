# ParetoPC — Roadmap & Task Board (`TODO.md`)

> Active engineering tasks, each with a stable ID. When an item ships, delete it from here and add a summary line to [`DONE.md`](DONE.md).
> The long-range master roadmap (all phases, decisions, and future milestones) is documented in [`ROADMAP.md`](ROADMAP.md). Copy items here using the template below when work starts.

## Task template

Every item uses this shape, so an agent knows where to look and when it is finished:

```markdown
- **`[ID]` Short title:**
  One or two sentences: what and why.
  - **Files likely touched:** `src/...`, `CODEMAP.md`
  - **Done when:** an observable condition (a test passes, a screen shows X, a check fails on Y).
  - **Test to add:** the invariant or behaviour test that proves it (`src/lib/.../__tests__/...`).
```

---

## 🧩 Active Tasks (Reprioritized from [`ROADMAP.md`](ROADMAP.md))

- **`[BLD-07]` Save & Share Builds (URL Encoding & Copy Parts List):**
  Encode active build selection and custom filter configuration into shareable URL parameters (or hash), allowing users to share their dream build with friends or save it without requiring a server backend. Include a 1-click "Copy Build Summary" button formatted cleanly for Discord, Reddit, and WhatsApp (listing all 8 components, total price in active currency, power draw, and target workload FPS).
  - **Files likely touched:** `src/utils/shareBuild.ts`, `src/components/BuildHeroCard.tsx`, `src/components/FullBuildExplorer.tsx`, `src/hooks/useOptimizerState.ts`, `CODEMAP.md`
  - **Done when:** clicking "Share Build" copies a direct URL and markdown/text summary, and navigating to the URL recreates the exact build selection.
  - **Test to add:** unit tests in `src/utils/__tests__/shareBuild.test.ts` verifying encoding/decoding and clipboard string generation.
