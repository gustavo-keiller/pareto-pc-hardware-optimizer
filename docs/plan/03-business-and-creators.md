# 03 — Business: creators first, own revenue later

> Phases E (creators, **2027-01-11 → 2027-04-30**) and F (own revenue, **2027-04-01 → 2027-12-30**). Stage 1–5 notes from 2026-11-22 are in [`.agents/specs/business-and-creator-engine.md`](../../.agents/specs/business-and-creator-engine.md); this file adds the compliance questions, the outreach process and the money math.

## 1. The model gustavo described

> Advertisers link to ParetoPC → ParetoPC does the convincing (graphs, reasons) → the buyer buys wherever → **the advertiser keeps their commission**. ParetoPC offers no discount, only its name in the middle, to build recognition. Later ParetoPC runs its own sponsored deals.

Why it can work: creators and deal groups want conversions with zero extra work. A link that says *"here is mathematical proof this is the best GPU for your R$ 2.000"* converts better than "link na descrição", and costs them nothing.

Why it is hard: **the commission has to actually land**, and each store's affiliate rules decide whether a creator's tag may be used on someone else's website.

## 2. Three ways to keep the creator's commission

| Option | How | Pros | Risks / 🔬 |
|---|---|---|---|
| **A. Tag injection** (what the code does now: `?p=`, `?ref=`, `?amz=`) | ParetoPC adds the creator's tag to outbound store links | Zero setup for the creator | 🔬 **R-04**: Amazon's Operating Agreement likely requires links to sit on sites the associate registered. A creator's tag on paretopc.com may break *their* agreement. Must be answered **before** pitching any creator. |
| **B. Creator's own deep links** | Creator pastes their own affiliate link per store (or a link-in-bio page); ParetoPC buttons send buyers there | Commission always theirs, clean for programs that issue deep links (Awin, Lomadee, Mercado Livre, Impact) | Slightly more setup; links must be per product or per store search |
| **C. Embed on the creator's site** | `<iframe>` / script widget the creator puts on their own blog or link page; outbound links carry their tag *on their own site* | Most compliant for Amazon; their page, our name ("powered by ParetoPC") | Only works for creators with a site; widget work |

**Plan:** launch creator outreach with **B** as the default, **C** for creators with sites, and keep **A** only for programs where R-04 confirms it is allowed. Rankings never change by partner (`[AFF-02]` invariant, already tested).

## 3. Steps and dates

### Phase B — groundwork (2026-12-01 → 2026-12-20)
- [ ] G: affiliate approvals: Amazon BR, Amazon US, one BR network (R-02). Note Amazon's rule that a new account needs qualifying sales within its first 180 days (🔬 R-03 confirm), so house links on organic traffic matter early.
- [ ] G+AI: answer R-04 per store (Amazon BR/US, KaBuM!, Pichau, Terabyte, Mercado Livre, Newegg, Best Buy, B&H). Output: a table "creator tag on our site: allowed / not / unknown" in [06](06-research-tracks.md).
- [ ] AI: support option B in `partners.json` (per-store deep-link templates) and a "creator page" `/c/<handle>` that shows their name and preset.
- [ ] G: disclosure check — CONAR (BR) and FTC (US) require clear "we may earn a commission" near links; the footer has it, add it next to the store buttons too (🔬 R-05).

### Phase E — creator program (2027-01-11 → 2027-04-30)

**Who to contact (in this order):**
1. **Deal groups** (Telegram/WhatsApp/Discord, BR and US): they post many links a day; a "frontier check" link per deal is valuable to them. Start here: fastest yes.
2. **Mid-size hardware YouTubers / TikTokers (20k–300k subs)** in BR and US who post "best PC for R$ X" or "GPU tier list" videos. Big channels ignore cold emails; mid-size ones answer.
3. **Blogs / buying-guide sites** (option C widget).

🔬 **R-06**: build the list — 40 BR + 40 US names, with channel size, last "budget build" video date, contact, affiliate stores they use. Store it privately (not in the public repo) — e.g. a private spreadsheet.

**"Done for you" pitch (the key idea):** don't ask a creator to learn the tool. Take their latest recommendation video, rebuild their picks in ParetoPC, and send them:
- their co-branded link (`/c/<handle>`) with their picks pre-loaded,
- 3 share cards with their handle,
- one line: "In your video you picked X; the frontier agrees / shows Y is R$ 300 cheaper for the same FPS."
Template messages live in a private doc; keep it short, in their language, no attachments in the first message.

**Weekly cadence (2 h/week):** 10 new contacts, follow up once after 7 days, log replies.

| Milestone | Date |
|---|---|
| First 5 deal groups using frontier links | 2027-01-31 |
| First creator page live with a real creator | 2027-02-15 |
| First video mentioning ParetoPC | 2027-03-31 |
| 10 creators/groups active | 2027-04-30 |

**Make the tool presentable on camera** (creators need both audiences at once): a "presenter view" — big type, the Simple answer on the left, the frontier chart on the right, one click to toggle. 💡 Also an OBS-friendly URL with transparent background for streamers.

### Phase F — own revenue (2027-04-01 →)

1. **House affiliate links** on organic + SEO traffic (code exists as `[AFF-04]`; only with approved tags).
2. **Pareto-verified sponsorship** (`[AFF-07]` guard exists): a store pays to show its coupon **only** when that coupon makes the product a frontier pick. Sell it as "we can't be bought, so our badge means something".
3. **Price-drop alerts** (email/Telegram bot) — the strongest repeat-visit and conversion tool; needs a tiny backend (Cloudflare Workers + KV/D1).
4. **B2B white-label builder** for small PC stores (Q4 2027): their catalog, our engine, monthly fee.
5. 💡 **Paid "frontier report"** for creators: weekly sheet of the best picks per budget for their videos.

## 4. Income model

Commission rates on PC parts are low (🔬 R-07: confirm current rates; assume **~2–4%** for planning). Rough numbers, to be replaced by real data in Phase B:

| Assumption | Value |
|---|---|
| Average order a ParetoPC click leads to | R$ 2.500 (mix of GPUs and full PCs) |
| Commission | 3% → **R$ 75 per sale** |
| Outbound click → purchase | 2–4% |
| Visitor → outbound click | 15–25% |

To earn **R$ 5.000/month** from house links: ~67 sales → ~2.200 outbound clicks at 3% → ~11.000 visitors/month at 20%. That is achievable by late 2027 *if* SEO guides and creators work; it is not achievable from Black Friday alone. Sponsorships and B2B are what move it from "pocket money" to "stable income". Set the real target (D-8) on 2026-12-20 with launch-week numbers.

## 5. Recognition (the real asset in year 1)

- One name, one domain, one handle on every network (🔬 R-01 checks availability on YouTube, Instagram, TikTok, X, Threads, Bluesky).
- Every share card and embed carries the watermark (already in `[SHARE-01]`).
- Monthly public "Frontier Report" (BR + US): best value per budget this month, biggest fake discount. Cheap to produce from our own data, citable by creators and press.
- Black Friday 2027 (Fri 2027-11-26): plan a "Black Fraude tracker" page from Sep 2027 using a full year of price history.

## 6. Rules that protect the name

- Rankings never depend on money (`[AFF-02]`).
- A sponsored badge only on frontier products (`[AFF-07]`).
- Unverified prices are labelled; Amazon prices only from Amazon.
- Disclosure next to every monetized link.
