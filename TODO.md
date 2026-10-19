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

- **`[UX-05]` Mobile layout & responsive polish:**
  Improve mobile phone layout: compact single-row header navigation, ensure SVG plot labels and recommendation cards render cleanly without overflow or clipping on 360px–420px viewport widths.
  - **Files likely touched:** `src/App.tsx`, `src/components/SimpleGuideScatterPlot.tsx`, `src/components/SimpleGuidePickHero.tsx`, `src/components/FullBuildPickHero.tsx`
  - **Done when:** mobile viewport test runs cleanly without horizontal overflow and hero cards/scatter plots fit within standard mobile screens.
  - **Test to add:** Playwright / Vitest UI smoke assertions at mobile breakpoint.
