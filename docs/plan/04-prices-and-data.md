# 04 — Prices, stores and specs for Brazil and the US

> Phase D: **Mon 2027-01-04 → Wed 2027-03-31**, with a manual process starting Black Friday week.
> Goal: **≥ 70% of shown prices less than 72 hours old, without gustavo typing them**, and every price traceable to a real product page.

## 1. What exists

`src/data/prices/{br,us}.json` (one offer per part per region), `history.json`, `priceSanityGuard.ts` (rejects prices outside ±40% of the hedonic fair value), Smart Paste for 8 categories (`hardwareListingParser.ts`), a bookmarklet that opens ParetoPC with `#import=…`, a `sync-store-feeds.cjs` script and a daily workflow that currently only runs a dry run. PR #7 (still open) has a store refresh script that learned some stores sit behind Cloudflare.

Main weakness today: one offer per part, many links are search pages, and nothing refreshes automatically.

## 2. Data tiers — from manual to automatic

| Tier | Source | Who does the work | Freshness | Status / date |
|---|---|---|---|---|
| T0 | gustavo checks top 40 parts by hand | G, ~1 h/day | daily | **Black Friday week** |
| T1 | **Smart Paste**: user opens a store search page, `Ctrl+A`, `Ctrl+C`, pastes into ParetoPC → all matched parts plotted with *their* prices | any user | live, for that user | exists; verify on 5 BR + 4 US stores by 2026-12-11 (🔬 R-08) |
| T2 | **Bookmarklet**: one click on a store page sends its listings to ParetoPC | any user | live | exists; same verification |
| T3 | **Browser extension (Manifest V3)**: on a store page it shows a small badge "on the frontier / dominated by X for R$ less", and (opt-in) contributes anonymous prices | users | crowdsourced, hours | build Jan–Feb 2027 |
| T4 | **Official feeds / APIs**: affiliate network product feeds (Awin, Lomadee, Impact, Rakuten), Amazon Product Advertising API, Best Buy Products API, Mercado Livre API | automatic, nightly | daily | after affiliate approvals (🔬 R-09) |
| T5 | Low-rate scripted checks of specific product pages we link to | automatic | daily | only where ToS allows (🔬 R-09); never the main source |

**Principle:** the user's own paste/bookmarklet/extension is the *live* layer (always fresh for them, no ToS issue because it's their browser), the repo JSON is the *reference* layer, and feeds keep the reference fresh.

## 3. Steps and dates

### Black Friday week (2026-11-24 → 11-30)
- [ ] T0: top 40 by hand, daily, from **product pages** (not search pages). Record `checkedAt` and the real product URL.
- [ ] Show "reference price · checked <date>" on everything else.

### Phase B (2026-12-01 → 12-20)
- [ ] 🔬 R-08: test Smart Paste and the bookmarklet on KaBuM!, Pichau, Terabyte, Amazon BR, Mercado Livre, Amazon US, Newegg, Best Buy, B&H. For each: does `Ctrl+A/C` capture name + price? Does the bookmarklet run (some sites block scripts with CSP)? Save one anonymized sample per store as a parser test fixture.
- [ ] **Multiple offers per part**: change prices from "one offer" to "list of offers" (store, price, cash/PIX price, installments, URL, checkedAt) and use the cheapest *fresh* one. BR needs PIX vs. card prices; they often differ 10–15%.
- [ ] **Product identity**: add `gtin`/`ean` and `mpn` fields to catalog parts. EAN is printed on most BR listings and is the safest way to match a store item to a catalog part. Fuzzy name matching stays as fallback, with a review queue for low-confidence matches.

### Phase D (2027-01-04 → 03-31)
- [ ] T3 extension MVP (Chrome + Firefox, MV3): read-only badge on product/search pages of the 9 stores; "open in ParetoPC" button; no data leaves the browser unless the user opts in. Target: published in the Chrome Web Store by **2027-02-26**.
- [ ] Opt-in price contribution → Cloudflare Worker + D1 (first backend). Accept a contributed price only if it passes the sanity guard and 2 independent users or 1 trusted user agree. Becomes the price history the "Black Fraude" pitch needs.
- [ ] T4 feeds for approved programs; nightly GitHub Action opens a **PR** with price changes (not a direct push), CI checks it, gustavo merges with one click. Large changes (> 25%) need a human look.
- [ ] Specs pipeline: new parts come from manufacturer spec pages + creator reviews. `npm run add-part` stays the entry point; 💡 add "paste the spec table" parsing so adding a part takes 2 minutes.
- [ ] Coverage target: 300 parts by 2027-02-26 (see [02](02-whole-pc-builds.md)), 500 by 2027-06-30.

## 4. Specs and benchmarks

- Specs: manufacturer pages first; TechPowerUp's databases are a good cross-check but have their own terms (🔬 R-09). Don't scrape PCPartPicker; it has no public API and its data is its business.
- Benchmarks: keep D-3 (public creator results with citations). Add 1080p and 4K numbers (TODO PRI-13 in PR #9).
- Every catalog row keeps `source` + date (validated by `check:catalogs`).

## 5. Honesty rules in the UI

1. Price age always visible; greyed after 72 h, hidden from "deal" claims after 7 days.
2. Converted currency labelled as an estimate (already an invariant).
3. Amazon: link only, no stored price (🔬 R-03).
4. A user's pasted prices are theirs: shown only to them unless they opt in to share.

## 6. Creative shortcuts

- 💡 **"Paste a deal link"** box: user pastes a KaBuM!/Amazon URL from a deal group; ParetoPC identifies the product from the URL slug/EAN and tells them where it sits on the frontier. No scraping: the price is typed or pasted by the user.
- 💡 **Telegram bot**: forward a deal message → bot answers "good deal / dominated by X". Same engine, huge reach in BR deal culture.
- 💡 **Community price reports** from the existing feedback modal ("price is wrong, now it's R$ X") flow into a review queue.
