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

## 🧩 Active Tasks (top to bottom; reprioritized 2026-10-20 from [`ROADMAP.md`](ROADMAP.md))

> Branch `fix/perf-engine-and-ci` (engine speed, lint, Simple-mode table toggle, price notice, pt-BR pass, share link) is not merged yet. Open its PR first and merge it when CI is green; the items below assume it is merged.

- **`[FIX-01]` CPU and RAM pruning picks pricier builds:**
  `optimizeFullSystemBuilds` prunes CPUs across sockets and RAM across generations unless the user picked one, so the AMD Ryzen 7 5700X3D (AM4, $205) is dropped because the Ryzen 5 7600 (AM5, $185) has the same `gamingScore`, even though the AM5 build needs a pricier board and DDR5. Result: the default "1440p" build reaches 116 FPS at $1,035 instead of $997 (5700X3D + RX 7800 XT), and 127 FPS at $1,095 instead of $1,042. Over 4 workloads × 4 budgets, 12 of 16 frontiers differ from brute force. The same unpartitioned `pruneDominatedCpus` call is in `upgradeOptimizer.ts`, where it can hide the usual AM4 upgrade from an AM4 owner. Also: GPU pruning treats +30 W as "equal", and every pruner drops parts by the name `[TRAP]`.
  - **Files likely touched:** `src/lib/math/intraCategoryPruning.ts`, `src/lib/math/combinatorial.ts`, `src/lib/math/upgradeOptimizer.ts`, `src/lib/math/__tests__/combinatorial.test.ts`
  - **Done when:** pruning is partitioned by socket (CPU, board), RAM generation (RAM, board) and power/size fit (GPU), nothing is pruned by name, and the frontier equals brute force for every workload at $800, $1,200, $2,000 and $3,200.
  - **Test to add:** property test comparing `optimizeFullSystemBuilds` with an unpruned brute-force frontier (price vs. workload score) on the seed catalog; replace the test that only asserts `prunedPartCounts.cpus < SEED_CPUS.length`.

- **`[FIX-02]` Shared links fail silently:**
  Once there are more than 100 compatible builds, `allCompatibleBuilds` now holds only the frontier builds, and `FullBuildExplorer` resolves a shared link by searching that list. A shared build that is not on the receiver's frontier (or is outside their filters) silently shows a different build.
  - **Files likely touched:** `src/components/FullBuildExplorer.tsx`, `src/utils/shareBuild.ts`, `src/lib/math/buildTypes.ts`
  - **Done when:** a shared link rebuilds the build from its 8 part IDs with `assemblePcBuild`, and shows a plain message when a part is no longer in the catalog or the build is over budget.
  - **Test to add:** UI test opening a share URL for a build that is not on the frontier and checking the same 8 parts appear.

- **`[FIX-03]` Last English left in Portuguese:**
  With PT selected, the header subtitle still lists only 5 parts, and the Montar PC frontier table is English ("COMPLETE PARETO OPTIMAL BUILD FRONTIER", column names, "View", "Selected", "Anchor"). Inline `locale === 'pt-BR'` text remains in components such as `UpgradePlannerModal.tsx`.
  - **Files likely touched:** `src/utils/i18n.ts`, `src/App.tsx`, `src/components/BuildLeaderboardTable.tsx`, `src/components/UpgradePlannerModal.tsx`
  - **Done when:** every mode in pt-BR shows no English UI words, and no component has inline locale ternaries for text.
  - **Test to add:** UI test that renders each of the 4 modes in pt-BR and fails on a list of English UI words.

- **`[FIX-04]` Label model numbers as estimates:**
  Workload FPS and bottleneck figures ("100% Desempenho GPU (0% Gargalo)", "99% Alimentado pela CPU") come from made-up coefficients (CONTEXT.md §4) but read as measured facts.
  - **Files likely touched:** `src/components/BuildHeroCard.tsx`, `src/components/FullBuildPickHero.tsx`, `src/utils/i18n.ts`
  - **Done when:** these numbers carry an "estimativa" / "estimate" label and a one-line explanation, until DATA-02 calibrates them.
  - **Test to add:** UI test that the estimate label is shown next to the workload score.

- **`[UX-10]` Test with 3–5 people who know nothing about PCs:**
  Success = they pick a graphics card or a whole PC in under 2 minutes without help and can say why. Findings become `TODO.md` items.
  - **Files likely touched:** `TODO.md`, `ROADMAP.md`
  - **Done when:** findings from at least 3 sessions are written up as tasks.
  - **Test to add:** none (user research).

- **`[BLD-08]` Optional Constraints for Enthusiasts (SFF, Cooler Type, RGB & Brand Ecosystems):** _paused until FIX-01 lands; it adds filters to the same engine._
  Add enthusiast-grade filtering criteria across form factor (Small Form Factor / Mini-ITX / Micro-ATX vs Standard ATX), cooling preference (Quiet Air Cooling vs AIO Liquid Cooler), aesthetics (Stealth Blackout / No-RGB vs RGB Lighting), and CPU vendor ecosystem (AMD Ryzen vs Intel Core), seamlessly filtering the multi-objective Pareto builds.
  - **Files likely touched:** `src/lib/math/buildTypes.ts`, `src/lib/math/combinatorial.ts`, `src/components/FullBuildExplorer.tsx`, `src/lib/math/__tests__/combinatorial.test.ts`, `CODEMAP.md`
  - **Done when:** selecting "Small Form Factor", "AIO Liquid Cooler", or "No RGB" filters down builds to strictly conforming hardware, and tests verify constraint propagation.
  - **Test to add:** unit tests in `src/lib/math/__tests__/combinatorial.test.ts` verifying SFF filtering, AIO vs Air cooler constraints, and aesthetic tagging.
