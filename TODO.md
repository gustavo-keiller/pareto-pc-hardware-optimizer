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

- **`[DATA-03]` Hardware Catalog Coverage Expansion across All Categories:**
  Expand all 8 hardware catalogs (`cpus.json`, `gpus.json`, `motherboards.json`, `ram.json`, `storage.json`, `coolers.json`, `cases.json`, `psus.json`) to cover current and previous generation components across major market segments (RTX 50/40/30, RX 7000/6000, Intel Arc B-series; AM5, AM4, LGA1700, LGA1851) with complete specifications, physical clearances, and audit citations.
  - **Files likely touched:** `src/data/catalogs/*.json`, `src/data/benchmarks/*.json`, `src/data/knownGpuBenchmarks.ts`, `src/data/__tests__/catalogs.test.ts`, `scripts/validate-catalogs.cjs`
  - **Done when:** Catalogs cover expanded parts with 100% schema validation passing, and all cross-component socket/RAM/PSU relationships remain fully compatible.
  - **Test to add:** Catalog coverage and integrity tests in `src/data/__tests__/catalogs.test.ts`.

- **`[UX-10]` Test with 3–5 people who know nothing about PCs:**
  Success = they pick a graphics card or a whole PC in under 2 minutes without help and can say why. Findings become `TODO.md` items.
  - **Files likely touched:** `TODO.md`, `ROADMAP.md`
  - **Done when:** findings from at least 3 sessions are written up as tasks.
  - **Test to add:** none (user research).
