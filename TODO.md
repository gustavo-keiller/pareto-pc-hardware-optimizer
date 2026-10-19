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

- **`[BLD-08]` Optional Constraints for Enthusiasts (SFF, Cooler Type, RGB & Brand Ecosystems):**
  Add enthusiast-grade filtering criteria across form factor (Small Form Factor / Mini-ITX / Micro-ATX vs Standard ATX), cooling preference (Quiet Air Cooling vs AIO Liquid Cooler), aesthetics (Stealth Blackout / No-RGB vs RGB Lighting), and CPU vendor ecosystem (AMD Ryzen vs Intel Core), seamlessly filtering the multi-objective Pareto builds.
  - **Files likely touched:** `src/lib/math/buildTypes.ts`, `src/lib/math/combinatorial.ts`, `src/components/FullBuildExplorer.tsx`, `src/lib/math/__tests__/combinatorial.test.ts`, `CODEMAP.md`
  - **Done when:** selecting "Small Form Factor", "AIO Liquid Cooler", or "No RGB" filters down builds to strictly conforming hardware, and tests verify constraint propagation.
  - **Test to add:** unit tests in `src/lib/math/__tests__/combinatorial.test.ts` verifying SFF filtering, AIO vs Air cooler constraints, and aesthetic tagging.
