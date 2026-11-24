# 06 — Research tracks

> Each track: the question, why it matters, how to answer it, and the date it must be answered by. Record the answer in this file (with links and the date checked) in the same PR that acts on it.
> R-1 (live non-tech buyer tests) from the earlier business spec stays as is: first 3 sessions Thu 2026-11-26, 5 more by 2026-12-20.

| ID | Question | Blocks | How to answer | Owner | By |
|---|---|---|---|---|---|
| **R-01** | Is `paretopc.com` / `.com.br` free? Any trademark or app with the same name in BR (INPI) or US (USPTO)? Are the social handles free? | D-4, launch | Registrar search, INPI and USPTO search, try the handle on each network | G | **2026-11-25** |
| **R-02** | Which affiliate programs exist for KaBuM!, Pichau, Terabyte, Mercado Livre, Amazon BR (BR) and Amazon US, Newegg, Best Buy, B&H (US)? Direct program or network (Awin, Lomadee, Impact, Rakuten, CJ)? Link format (query param vs. network deep link)? | B4, house links, creator option A/B | Each store's footer "Afiliados/Affiliates" page; network directories; sign-up pages | G+AI | apply 2026-11-25; table by 2026-12-11 |
| **R-03** | Amazon Associates (BR and US) rules on showing prices, using static content, and the minimum sales in the first 180 days; when does Product Advertising API access open up? | B5, data tier T4 | Read the current Operating Agreement and Program Policies on each country's Associates site | G+AI | 2026-11-25 |
| **R-04** | May a creator's affiliate tag be used on links that live on *our* site? Per store / network. | Creator model option A, all creator outreach | Program terms; ask affiliate support in writing | G | **2026-12-18** |
| **R-05** | Disclosure rules: CONAR (BR) and FTC (US) wording and placement for affiliate links and sponsored badges | Phase F, launch footer | CONAR guide for influencer advertising; FTC Endorsement Guides | AI | 2026-12-11 |
| **R-06** | Creator and deal-group list: 40 BR + 40 US, size, recent budget-build content, contact, stores they use | Phase E | YouTube/TikTok search, Telegram group directories, social blade-style stats | G | 2027-01-08 |
| **R-07** | Current commission rates for PC parts at each program from R-02 | Income model (D-8) | Program rate cards | G | 2026-12-18 |
| **R-08** | Do Smart Paste and the bookmarklet work on each of the 9 stores today (content, CSP blocks, lazy-loaded prices)? | T1/T2 claims, Phase D | Manual test per store; save fixtures | AI (with G's browser) | 2026-12-11 |
| **R-09** | Terms of service: which stores/data sites allow automated price checks or reuse of specs (incl. TechPowerUp databases)? Which offer official feeds/APIs (Best Buy, Mercado Livre, network feeds)? | T4/T5 | Read ToS + robots.txt; developer portals | AI | 2027-01-15 |
| **R-10** | Board BIOS support for newer CPUs: how do stores label "BIOS ready"? Which catalog boards need an update for which CPUs? | Compatibility v2 | Manufacturer CPU support lists | AI | 2026-12-18 |
| **R-11** | M.2/SATA/PCIe lane sharing for the 16 catalog boards | Compatibility v2 | Board manuals | AI | 2027-01-15 |
| **R-12** | GPU transient power spikes per GPU family (PSU headroom) | Compatibility v2 | Creator power measurements (e.g. Gamers Nexus, Igor's Lab) | AI | 2027-01-15 |
| **R-13** | For each of ~15 technologies, measured evidence of how much it matters per workload | Technology relevance table | Creator/benchmark tests; record source + date | AI, reviewed by G | 2027-01-04 |
| **R-14** | Do our builds match or beat 30 human-made builds at the same budget? | Trust in whole-PC mode | Collect builds from creator videos and community wikis; compare | G+AI | 2027-02-22 |
| **R-15** | Hosting limits: Cloudflare Pages/Workers free tier limits for traffic, functions and D1 at our expected scale | Phase D backend | Provider docs | AI | 2027-01-04 |

## Answers

_Add answers here as `### R-xx — answered YYYY-MM-DD` with sources._
