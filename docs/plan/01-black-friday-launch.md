# 01 — Black Friday Launch (Tue 2026-11-24 → Mon 2026-11-30)

> Black Friday is **Fri 2026-11-27** (US Thanksgiving is Thu 11-26; Cyber Monday is 11-30). Brazil's Black Friday is the same Friday, and BR stores run "Black Week/Black November" all month.
> Rule for this week: **ship what exists, make it honest, make it reachable.** No new features. Anything not on this list waits for Phase B.

## 1. Readiness audit of the code (2026-11-24)

What was checked: a fresh clone of GitHub `main` (`f7dc690`) plus gustavo's local branch `feat/ux-usability-visual-flow` (`b9fe612`, 83 files, +10,966 lines, committed 2026-11-23, **not pushed**).

| Area | State | Verdict |
|---|---|---|
| Build (`npm run build`) | Passes. Initial JS ~131 kB gzipped, charts lazy-loaded (~220 kB gz) | ✅ |
| `npm run check` (types, lint, format, unit tests, docs, catalogs, knip) | Passes locally **only when `dist/` already exists** | ⚠️ see B2 |
| `npm run check:perf` | Passes | ✅ |
| Playwright e2e | Not run in this audit | ❓ run once before deploy |
| Beginner flow (GPU + whole PC), share cards, SEO guides, footer legal, feedback modal | Implemented | ✅ |
| PR #7 (real prices), #8 (CI order fix), #9 (guided priorities) | Still open on GitHub, **none merged**; the local branch was cut from `main` without them | ⚠️ see B2, D-7 |

### Blockers (🔴 must be fixed before anyone is sent to the site)

| ID | Problem found | Fix | Owner | When |
|---|---|---|---|---|
| **B1** ✅ done 2026-11-24 (PR #10) | The launch code exists only on gustavo's PC. Nothing is on GitHub or hosted. | Push `feat/ux-usability-visual-flow`, open a PR to `main`, let CI run, merge. | G (push) + AI (PR) | Tue 11-24 |
| **B2** ✅ done 2026-11-24 (PR #8) | CI will fail on that PR: `check.yml` runs `npm run check` before `npm run build`, and `src/__tests__/checkPerfBudget.test.ts` needs `dist/`. Verified 2026-11-24: with `dist/` removed, that test file fails. PR #8 already fixes this. | Cherry-pick PR #8's one-line change (build before check) into the launch PR. | AI | Tue 11-24 |
| **B3** | **Prices look estimated, not checked.** All 248 BR + US offers carry the same date (2026-11-22); 99 of 124 BR links and 72 of 124 US links point to a store *search page*, not a product; most BR prices end in ,99 / ,49. For a site whose Black Friday pitch is "spot fake discounts", wrong prices are the biggest risk to the name. | (a) Verify by hand the **top 40** parts people will actually see (all GPUs in the beginner budgets + the 10 most-picked CPUs/boards) using Smart Paste from real product pages. (b) Mark every unverified price in the UI as "reference price — check the store" and don't use it to call anything a "deal". (c) Re-check the top 40 daily Thu–Mon. | G+AI | Wed 11-25 → Mon 11-30 |
| **B4** | **Affiliate tags are placeholders.** `src/data/partners.json` sends every organic click through `paretopc-20` / `paretopcus-20` / `paretopc` tags that (as far as this audit can tell) are not registered accounts. It also ships two demo creators, "Ofertas Hardware BR" and "Tech Deals US", whose handles look like real people. The non-Amazon parameter names (`partner_tag`, `p`, `ref`, `cm_mmc`) are guesses (🔬 R-02). On `amazon.com.br` the code falls back to the US tag when no BR tag is set, which earns nothing. | Before launch: remove the demo creators; keep only tags gustavo has actually been approved for; with no approved tag, send clean links + `utm_source=paretopc`. | G (accounts) + AI (data) | Wed 11-25 |
| **B5** | **Amazon prices.** Amazon Associates rules forbid showing an Amazon price unless it comes from their API and is fresh (🔬 R-03 confirms the exact wording for BR and US). Static JSON prices for Amazon offers can get the account closed. | Show "see price on Amazon" for Amazon offers; never a number. | AI | Wed 11-25 |
| **B6** | **Analytics record nothing.** `src/utils/telemetry.ts` calls `window.plausible`, but no analytics script is loaded in `index.html`. Launch week data would be lost. | Add **Cloudflare Web Analytics** (free, cookie-free, comes with Pages) and keep the custom events for Plausible later. | AI | Wed 11-25 |
| **B7** | **Hosting is half-decided.** Both `vercel.json` and Cloudflare `functions/go/` exist; Vercel ignores `functions/`. Canonical URL, sitemap, OG tags and share-card watermark all say `paretopc.com`, which is a placeholder (D-4). | Choose Cloudflare Pages (D-5); buy the domain (D-4); replace the placeholder everywhere in one commit; delete `vercel.json` or keep it documented as unused. | G (buy) + AI | Wed 11-25 |

### Should-fix this week (not blockers)

- **S1** Run `npm run test:e2e` once on the launch PR (CI does this) and click through the beginner flow on a real phone, in pt-BR and en-US.
- **S2** Add a visible "prices checked on <date>" line on every price, greyed out after 72 h (data already has `checkedAt`).
- **S3** Remove "100% implemented" claims from `ROADMAP.md` / `.agents/CURRENT_STATE.md` once the plan PR merges, so future agents don't skip verification (done in this plan's PR for `ROADMAP.md`).
- **S4** Decide PR #7: the local branch re-implemented store prices differently. Close #7 after B3 if nothing in it is still needed (its Cloudflare-aware refresh script may still be worth keeping, see [04](04-prices-and-data.md)).
- **S5** `TODO.md` `[UX-12]` (English left inside Pro charts in pt-BR) can wait: beginners stay in Simple mode.

## 2. Day-by-day plan

### Tue 2026-11-24 (today) — get the code online
- [ ] G: push `feat/ux-usability-visual-flow` to GitHub (B1). Connect GitHub for the agent so it can open PRs.
- [ ] AI: launch PR = local branch + PR #8 fix (B2); CI green.
- [ ] G: check domain availability and trademarks (🔬 R-01, 30 min), decide D-4.
- [ ] G: apply to Amazon Associates BR and US, and to the BR network chosen in R-02 (approvals can take days; apply now even if links go live later).

### Wed 2026-11-25 — honest data, real hosting
- [ ] AI: B4, B5, B6, B7 in one "launch hardening" PR.
- [ ] G: create the Cloudflare Pages project from the GitHub repo, attach the domain, turn on Web Analytics. Preview deploys per PR come for free.
- [ ] G+AI: verify the top 40 prices from real product pages (B3a). Target: 40 parts × ~2 min ≈ 80 min with Smart Paste.
- [ ] AI: label unverified prices (B3b).
- [ ] G: submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.

### Thu 2026-11-26 (US Thanksgiving) — dry run
- [ ] G: 3 people who don't know PCs use the live site on their phone while you watch silently (a first, small R-1). Write down where they hesitate.
- [ ] AI: fix only what blocks them (copy, a button, a broken link).
- [ ] G: prepare posts (see §3) and 6 share cards: best GPU under R$ 1.500 / R$ 2.500 / R$ 4.000, best PC under R$ 4.000 / R$ 6.000, best GPU under $400.

### Fri 2026-11-27 — Black Friday
- [ ] Morning (BRT): re-check top 40 prices (B3c); push a price PR; Cloudflare deploys in ~1 min.
- [ ] Post the "is this a real deal?" thread in BR communities; answer every comment with a share link for that person's budget.
- [ ] Evening: US posts.
- [ ] Watch analytics + the feedback modal every 2–3 h; hot-fix only broken things.

### Sat 11-28 → Mon 11-30 (Cyber Monday)
- [ ] Daily price re-check of the top 40.
- [ ] Sun: write a short "what Black Friday prices really did" post from the price history (good recognition content even if traffic was small).
- [ ] Mon: Cyber Monday post for the US; record the week's numbers in `docs/plan/metrics-log.md` (create it on first use).

## 3. Where to post (respect each community's self-promotion rules — read them first)

| Region | Places | Angle that fits |
|---|---|---|
| BR | r/computadores, r/hardwarebrasil, r/brdev (as a builder story), Adrenaline and Clube do Hardware forums, Pelando (comment on GPU deals with a frontier link, don't spam), Telegram/WhatsApp deal groups you are already in | "Montei uma ferramenta que mostra se a promoção é boa mesmo" + one honest screenshot |
| US | r/buildapc (answer questions, don't post ads), r/buildapcsales (comments only), r/pcmasterrace, r/SideProject, Hacker News "Show HN" (math angle: Pareto + TOPSIS) | "I built a Pareto-frontier picker for GPUs and whole PCs" |

Tip: a post that *teaches* (how to tell a fake discount, why a 3060 12 GB at R$ X is a trap) gets far more reach than "check my site".

## 4. Go / No-Go (Thu 2026-11-26, 20:00 BRT)

Go only if all are true:
1. Site loads on the real domain on a phone in under 3 s on 4G.
2. Beginner flow gives a GPU and a whole-PC answer in pt-BR and en-US.
3. Top 40 prices verified within the last 24 h; the rest labelled as reference.
4. No store link 404s in the top 40; no unapproved affiliate tag anywhere.
5. Analytics shows your own test visit.
6. Footer has privacy notice + affiliate disclosure.

If something fails: launch anyway with the failing part hidden (e.g. hide prices for a store), never with wrong information.

## 5. Launch-week metrics to record

Visitors (BR/US split), % who reach a recommendation, outbound store clicks, share-card downloads, feedback reports, top 10 budgets entered. These numbers set the Phase B plan and the income target (D-8).
