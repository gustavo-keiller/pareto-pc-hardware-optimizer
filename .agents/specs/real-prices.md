# Specification — Real Prices: your price, weekly store refresh, store links (`[DATA-07]`)

> **Status:** Shipped in the PR that adds this file.
> **Builds on:** [`store-prices.md`](store-prices.md) (`[DATA-04]`) and decision D-2 in [`ROADMAP.md`](../../ROADMAP.md) (no server; the repo is the database).

## Problem

Prices shown in the app were the USD catalog price × 5.7. The store price files (`src/data/prices/br.json`, `us.json`) were never wired into the UI, and their entries could not be verified (links unreachable, all dated the same day). Buyers had no way to check a price or correct it.

## What ships

1. **One price order everywhere** (`resolveRegionalPrice` in `src/lib/math/pricingEngine.ts`): the price the user typed in → the cheapest in-stock store offer → an estimate (USD × rate in BRL, list price in USD). Every part carries `priceInfo.source: 'user' | 'store' | 'estimate'`. `getCurrencyAdjustedCatalogs` and `getPricedRealGpus` (`src/utils/currency.ts`) apply it to all 8 categories, so the builder ranks on the same prices the buyer sees.
2. **Your price** (`src/hooks/useUserPrices.ts`): typed prices are saved per currency in localStorage (`paretopc_user_prices`, validated on read) and immediately re-run the builder. The optimizer cache key includes every part's price.
3. **Price panel per part** (`src/components/PartPriceTag.tsx`): clicking a price shows where it came from (store + date, flagged after 14 days), the product page when a store link exists, search links for KaBuM!, Pichau, Terabyte, Mercado Livre and Google Shopping (Newegg, Amazon, PCPartPicker in USD), and a box for the user's own price. The build total says how many parts are still estimated.
4. **Weekly price script** (`npm run prices:update`, `scripts/update-prices.mjs`): run on a maintainer's machine. It opens every product link in `src/data/prices/sources/<region>.json` in Playwright's Chromium, reads the price from the page's schema.org data (`scripts/lib/store-page-parser.mjs`), and writes `src/data/prices/<region>.json` plus today's point in `history.json`. A link that fails keeps its last price and date (it then shows as possibly out of date). A price is refused when the page's product title does not name the catalog part (`nameMatchesPart`; stores reuse product ids) unless `--accept-names`, and when it is outside 0.4×–2.5× of the last price, or of the catalog estimate for a new link, unless `--accept-jumps`. Pichau and TerabyteShop show headless browsers a Cloudflare check; `--headed` opens a visible browser with a kept profile (`.prices-browser/`) so the check is solved once. `--missing` lists parts without a link plus store search URLs; `--add <id> <url>` adds one.

## Data decision

The 25 unverified entries in each store file moved to `src/data/prices/sources/` as candidate links, and the store files start empty, so nothing is shown as a store price until the script has read it from the store. `history.json` was left as it was (it is not shown in the UI yet).

## Invariants (tested)

- A positive finite user price always wins; zero, negative and non-finite ones are ignored (`pricingEngine.test.ts`).
- The chosen store offer is the cheapest in-stock one regardless of file order (`pricingEngine.test.ts`).
- `isEstimated` is true exactly when `source === 'estimate'`; the build notice never claims store prices while any part is estimated (`userPrices.test.ts`).
- Malformed stored user prices and malformed price file entries are dropped, never thrown (`userPrices.test.ts`).
- The page parser reads pt-BR and en-US number formats identically and never returns a non-positive price (`scripts/__tests__/store-page-parser.test.mjs`).

## Later

Affiliate or official feeds (Mercado Livre API, Awin/Lomadee, Amazon Creators API) can write the same `src/data/prices/<region>.json` format, replacing scraping store by store (Phase 6).
