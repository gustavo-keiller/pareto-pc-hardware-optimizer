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

- **`[BLD-06]` Upgrade Mode ("I Already Have..."):**
  Allow users to lock components they already own (e.g., existing AM4 motherboard, DDR4 RAM, 550W PSU, or GPU), treating owned components as $0 cost towards the upgrade budget. The optimizer verifies full physical compatibility (socket retention, RAM generation, PSU wattage headroom, case clearances) and evaluates the Pareto frontier of upgrade paths to recommend the highest performance leap per dollar spent.
  - **Files likely touched:** `src/lib/math/upgradeOptimizer.ts`, `src/lib/math/combinatorial.ts`, `src/components/FullBuildExplorer.tsx`, `src/components/UpgradePlannerModal.tsx`, `CODEMAP.md`
  - **Done when:** user can select owned components, set an upgrade budget, and receive compatible upgrade combinations with net cost and performance gains.
  - **Test to add:** unit tests in `src/lib/math/__tests__/upgradeOptimizer.test.ts` verifying component locking, budget subtraction/zero-cost accounting, compatibility constraints, and Pareto ranking of upgrades.
