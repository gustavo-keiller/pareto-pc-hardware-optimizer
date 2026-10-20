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

- **`[UX-10]` Test with 3–5 people who know nothing about PCs:**
  Success = they pick a graphics card or a whole PC in under 2 minutes without help and can say why. Findings become `TODO.md` items.
  - **Files likely touched:** `TODO.md`, `ROADMAP.md`
  - **Done when:** findings from at least 3 sessions are written up as tasks.
  - **Test to add:** none (user research).
