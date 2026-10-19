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

- **`[UX-04]` Reasons people trust (plain shopping reasons per pick):**
  Generate plain-English and Portuguese buyer rationale per recommended GPU card and build component in shopping terms (e.g. "Same speed as RTX 4060 Ti for R$400 less", "16 GB, enough for modern textures", "Top 1440p value in its price bracket") without algorithmic jargon.
  - **Files likely touched:** `src/components/SimpleGuidePickHero.tsx`, `src/components/FullBuildPickHero.tsx`, `src/utils/i18n.ts`, `src/lib/math/types.ts`
  - **Done when:** the top pick and alternatives display dynamic plain shopping reasons highlighting exact dollar savings, VRAM longevity, or performance parity.
  - **Test to add:** unit tests in `src/utils/__tests__/` asserting plain shopping reasons generated for recommended picks.
