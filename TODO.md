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

- **`[UX-06]` Country-agnostic money & language layer (Brazil-first testing):**
  Add region/locale state (default `'pt-BR'` / `'BRL'`, with `'en-US'` / `'USD'` toggle) using `Intl.NumberFormat` for currency, currency-aware budget steps, and a lightweight typed dictionary for Brazilian Portuguese and English.
  - **Files likely touched:** `src/utils/currency.ts`, `src/hooks/useOptimizerState.ts`, `src/components/BeginnerIntakeCard.tsx`, `src/App.tsx`, `CODEMAP.md`
  - **Done when:** UI defaults to pt-BR / R$ (BRL) with an instant English toggle in header, formatting prices and budget presets appropriately without code duplication.
  - **Test to add:** Vitest unit tests in `src/utils/__tests__/currency.test.ts` and UI test in `src/__tests__/App.ui.test.tsx`.

- **`[UX-03]` Plain-language copy pass on Simple Guide:**
  Audit all copy in Simple Guide, intake card, pick hero, and full-build cards against `.agents/GLOSSARY.md` to ensure zero math jargon ("Pareto", "frontier", "dominated", "TOPSIS", "tradeoff hyperplane") appears in Simple mode, replacing with plain shopping terms ("Melhor custo-benefício", "Alternativa econômica", "Opção superior").
  - **Files likely touched:** `src/components/SimpleParetoGuide.tsx`, `src/components/SimpleGuidePickHero.tsx`, `src/components/FullBuildPickHero.tsx`, `src/components/BeginnerIntakeCard.tsx`
  - **Done when:** zero mathematical MCDM terms appear in Simple Guide UI text, and all recommendations speak directly to hardware buyers.
  - **Test to add:** Vitest string assertion test verifying no forbidden jargon in Simple Guide components.

- **`[UX-05]` Mobile layout & responsive polish:**
  Improve mobile phone layout: compact single-row header navigation, ensure SVG plot labels and recommendation cards render cleanly without overflow or clipping on 360px–420px viewport widths.
  - **Files likely touched:** `src/App.tsx`, `src/components/SimpleGuideScatterPlot.tsx`, `src/components/SimpleGuidePickHero.tsx`, `src/components/FullBuildPickHero.tsx`
  - **Done when:** mobile viewport test runs cleanly without horizontal overflow and hero cards/scatter plots fit within standard mobile screens.
  - **Test to add:** Playwright / Vitest UI smoke assertions at mobile breakpoint.
