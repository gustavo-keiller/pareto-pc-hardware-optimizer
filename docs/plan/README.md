# ParetoPC — Launch & Long-Term Plan (Nov 2026 → Dec 2027)

> Written 2026-11-24, three days before Black Friday (Fri 2026-11-27).
> Based on the local branch `feat/ux-usability-visual-flow` @ `b9fe612` (2026-11-23), which is **not on GitHub yet**. GitHub `main` is still at `f7dc690` (2026-10-21).
> This folder is the "what to do and when" plan. Engineering task IDs still live in [`ROADMAP.md`](../../ROADMAP.md) / [`TODO.md`](../../TODO.md); this plan adds dates, owners, research and business steps around them.

## The end goal in one paragraph

A buyer in Brazil or the US opens ParetoPC, answers three questions (or moves a few percentage sliders), and in under two minutes gets **one compatible, well-priced part or whole PC** chosen from the Pareto frontier, with a reason they can repeat to a friend. Creators and deal groups link to ParetoPC because it does the convincing for them and **their commission still lands**. ParetoPC earns recognition first, then its own commissions, then verified sponsorships, and reaches a **stable monthly income** by the end of 2027.

## Documents

| # | File | What it answers |
|---|------|-----------------|
| 1 | [01-black-friday-launch.md](01-black-friday-launch.md) | Is main ready? What exactly happens Nov 24 → Nov 30, with a go/no-go list |
| 2 | [02-whole-pc-builds.md](02-whole-pc-builds.md) | How to combine 8 parts into one Pareto choice: compatibility, scoring, technology relevance |
| 3 | [03-business-and-creators.md](03-business-and-creators.md) | Bring-your-own-affiliate model, creator outreach, own revenue, income math |
| 4 | [04-prices-and-data.md](04-prices-and-data.md) | Getting stores, prices and specs for US + Brazil, paste-a-page, bookmarklet, extension |
| 5 | [05-creative-ideas.md](05-creative-ideas.md) | Idea bank for attention, distribution and hard problems |
| 6 | [06-research-tracks.md](06-research-tracks.md) | Every open question, how to answer it, and by when |

## Legend used in every file

- 🔴 **Blocker** — must be done before the step it blocks.
- 🔬 **R-xx** — needs research before building or promising anything. Details in [06-research-tracks.md](06-research-tracks.md).
- 💡 — creative idea, optional.
- **Owner**: `G` = gustavo (accounts, money, contacts, judgment calls), `AI` = coding agent (code, docs, data entry), `G+AI` = both.

## Master timeline

| Phase | Dates | Goal | Exit criterion |
|---|---|---|---|
| **A. Black Friday launch** | Tue 2026-11-24 → Mon 2026-11-30 | Site live on a real domain with honest prices; first 500 visitors | Site up, analytics recording, 0 broken store links in the top 40 parts |
| **B. Stabilize & learn** | Tue 2026-12-01 → Sun 2026-12-20 | Learn from real users; fix trust problems | 5 non-tech buyer sessions done (R-1); affiliate accounts approved or rejected |
| **C. Whole-PC v2** | Mon 2026-12-07 → Fri 2027-02-26 | Build engine users trust more than a forum post | Compatibility v2 + build priorities + technology relevance shipped; catalog ≥ 300 parts |
| **D. Data pipeline** | Mon 2027-01-04 → Wed 2027-03-31 | Prices fresh without gustavo typing them | ≥ 70% of shown prices < 72 h old, automatically |
| **E. Creator program** | Mon 2027-01-11 → Fri 2027-04-30 | Creators use ParetoPC on camera / in posts | 10 creators or groups using links; 1 video featuring the tool |
| **F. Own revenue** | Thu 2027-04-01 → Thu 2027-12-30 | Stable income | 3 consecutive months above the income target set in Phase B |

Calendar hooks worth planning around: **Cyber Monday** 2026-11-30, **Christmas** sales Dec 2026, **CES** (early Jan 2027, new GPU/CPU announcements → catalog work), **back-to-school** BR (Jan–Feb), **Dia do Consumidor** BR (2027-03-15), **Computex** (late May / early Jun 2027), **Amazon Prime Day** (July 2027), **Black Friday 2027** (Fri 2027-11-26) — the second Black Friday is the real business test.

## The five decisions gustavo owns

| ID | Decision | Needed by | Recommendation |
|---|---|---|---|
| D-4 | Brand name + domain | **Wed 2026-11-25** | Keep "ParetoPC" if `paretopc.com` (or `.com.br`) is free and has no trademark clash (🔬 R-01). Otherwise pick the domain first, the name follows. |
| D-5 | Hosting provider | Wed 2026-11-25 | **Cloudflare Pages**: free, the `/go/` function in `functions/` already targets it; Vercel would ignore that folder. |
| D-6 | Which affiliate programs to join first | Wed 2026-11-25 (apply), approvals may take days | Amazon BR + Amazon US + one BR network (🔬 R-02). Do not show house tags that are not approved. |
| D-7 | When to merge PR #9 (guided priorities) | 2026-12-01 | After Black Friday. Too big to merge safely this week. |
| D-8 | Monthly income target for "stable" | 2026-12-20 | Set after seeing real traffic; see the income model in [03](03-business-and-creators.md#income-model). |
