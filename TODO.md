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

- **`[BLD-03]` Performance model per use case:**
  Extend the continuous bottleneck formula and scoring engine to support distinct multi-objective weighting and CPU/GPU balance curves for the 4 beginner workloads: 1080p Esports (CPU-bound high-refresh), 1440p Sweet Spot (balanced raster/VRAM), 4K RT Enthusiast (GPU/RT-bound heavy load), and Creator & AI (high RAM, VRAM capacity, multi-core CPU). Connect the intake choice from Step 2 directly to full-system TOPSIS weights.
  - **Files likely touched:** `src/lib/math/combinatorial.ts`, `src/lib/math/buildTypes.ts`, `src/hooks/useOptimizerState.ts`, `src/components/FullBuildExplorer.tsx`
  - **Done when:** selecting "Creator & AI" prioritizes 32GB+ RAM, 16GB+ VRAM, and high multi-core CPUs in full PC builds, and 1080p Esports prioritizes high single-core CPU throughput.
  - **Test to add:** unit tests in `src/lib/math/__tests__/combinatorial.test.ts` verifying build scores shift according to use case profiles.
