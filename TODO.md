# ParetoPC — Roadmap & Task Board (`TODO.md`)

> Active engineering tasks, each with a stable ID. When an item ships, delete it from here and add a summary line to [`DONE.md`](DONE.md).
> The long-range roadmap (phases, decisions, later IDs like `UX-01`, `BLD-02`) lives outside this repo, in the project's planning notes. Copy an item here, in the template below, when work on it starts.

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

## 🧩 Phase 3: Combinatorial Full-System Builder ("Mario Kart Mode")

- **`[P3-02]` Pre-Pruned Combinatorial Engine & Bottleneck Model:**
  Eliminate dominated parts per category first, enforce socket (`CPU.socket === Motherboard.socket`), RAM generation, and PSU headroom (`(CPU.tdp + GPU.tdp + 75) * 1.25 <= PSU.wattage`), and compute system `EffectiveFPS` using the CPU-GPU bottleneck formula.
  - **Files likely touched:** `src/lib/math/combinatorial.ts` (new), `CONTEXT.md` §4, `CODEMAP.md`
  - **Done when:** every returned build passes all compatibility rules, no build uses a part that is dominated within its category, and the full seed catalog runs in under 300 ms.
  - **Test to add:** property tests: every build is compatible; pre-pruning never removes a part that appears in the unpruned full-build frontier; `EffectiveFPS <= GPU FPS`.
- **`[P3-03]` Full-Build Pareto Explorer UI:**
  Build the interactive "Mario Kart Mode" view allowing users to explore Pareto-optimal complete PC builds across total budget vs. effective system FPS.
  - **Files likely touched:** `src/components/` (new view), `src/hooks/useOptimizerState.ts`, `src/App.tsx`, `CODEMAP.md`
  - **Done when:** a user can pick a budget and see the best full builds with total price, and `npm run snap` shows the view on desktop and phone without overlapping labels.
  - **Test to add:** UI smoke test in `src/__tests__/` (view renders, budget change updates the top build) and an e2e step in `e2e/`.
