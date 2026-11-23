# Spec: Business Strategy, Creator BYOA Distribution, Data Ingestion & Social Spec Card Studio (`[SHARE-01]`, `[UX-10]`, `[AFF-05]`)

**Status:** Active Master Plan (Stages 1–5) & `[SHARE-01]` Shipped
**Date:** 2026-11-22
**Markets:** Brazil (`BRL` / `pt-BR`) and United States (`USD` / `en-US`) first

---

## 1. Strategic Objective

Build **ParetoPC** (brand/domain placeholder `paretopc.com`) from an honest multi-objective PC hardware optimizer into a self-sustaining business:

1. **Solve the buyer dilemma** for single GPUs and complete 8-component PC builds (CPU, GPU, Motherboard, RAM, Storage, Cooler, Case, PSU) using Pareto dominance, TOPSIS percentage weights, physical clearance/compatibility validation, and plain-language shopping rationales.
2. **Use Black Friday (Nov 23–30, 2026) as the launch wedge** by exposing fake discounts ("Black Fraude") and dominated value traps using historical price baselines and frontier math.
3. **Turn hardware YouTubers and Telegram/WhatsApp/Discord deal groups into our distribution engine** via **Bring-Your-Own-Affiliate (BYOA)** links and **1-click Social Spec Cards (`[SHARE-01]`)**: advertisers want visual proof that convinces buyers without extra effort. Our page and shareable PNG cards explain *why* a pick wins on the Pareto frontier, while outbound store links preserve the creator's own affiliate tag.
4. **Keep rankings 100% mathematically neutral:** affiliate partnerships or sponsorships must never change Pareto dominance, compatibility checks, or TOPSIS ordering.

---

## 2. Five-Stage Master Plan & Target Dates (Nov 2026 – Q2 2027)

### Stage 1: Black Friday Blitz & Public Launch (Nov 23 – Nov 30, 2026)
- **`[LAUNCH-01]` Hosting & Domain:** Deploy static build to Cloudflare Pages or Vercel with automatic PR previews and custom domain (`paretopc.com` placeholder until finalized).
- **`[LAUNCH-02]` & `[LAUNCH-03]` Analytics, Error Tracking & Legal:** Privacy-friendly analytics (Cloudflare Web Analytics / Plausible), client error reporting, LGPD/GDPR privacy notice, and affiliate disclosure footer.
- **`[DATA-BF26]` Black Friday Catalog & Price Audit:** Refresh `src/data/prices/br.json` (KaBuM!, Pichau, TerabyteShop, Amazon BR), `us.json` (Amazon US, Newegg, Best Buy, B&H), and `history.json` to flag genuine all-time-low (ATL) frontier deals vs. dominated value traps.
- **Community Seeding:** Share live frontier comparisons and generated spec cards on `r/computadores`, `r/hardwarebrasil`, `r/buildapcsales`, `r/buildapc`, Adrenaline, and Clube do Hardware.

### Stage 2: Creator Attribution & Social Spec Card Studio (Dec 1 – Dec 21, 2026)
- **`[SHARE-01]` (Shipped Nov 22, 2026):** 1200×630 PNG spec card studio (`SocialShareModal.tsx` + `socialShareCard.ts`) for both single GPUs and 8-part PC builds showing:
  - Website brand and domain watermark (`ParetoPC • paretopc.com`, editable placeholder).
  - Price in active currency (`R$` / `$`) and TOPSIS match / workload performance.
  - Exact priority percentage split (`normalizePriorityPercentages` / `getBuildPriorityPercentages`) showing why the pick sits on the Pareto frontier.
  - Optional `@Handle` attribution badge and creator store affiliate link baked into a 1-click **"Download PNG + Copy Ready Caption"** workflow for WhatsApp, Telegram, Discord, X, and YouTube.
- **`[AFF-01]` & `[AFF-05]` Partner Affiliate URL Resolver & Co-Branded Banner:**
  - Extend `src/data/storePrices.ts` and `src/utils/shareBuild.ts` so registered creator slugs (`?p=creator`) or stateless URL tags (`?ref=...&amz=...&awin=...`) render a co-branded banner and inject the creator's affiliate tag across outbound store links on all 8 PC components.
- **Dual-Audience View Polish:** Keep Simple mode jargon-free for casual buyers while exposing a 1-click step-up into Explorer/Pro 2D/3D/7D charts for tech YouTubers presenting on camera.

### Stage 3: Low-Friction Store Data & 1-Click Ingestion (Dec 22, 2026 – Jan 25, 2027)
- **`[DATA-07]` Multi-Category Smart Paste (`Ctrl+A, Ctrl+C`):** Extend `src/lib/parser/gpuListingParser.ts` from GPUs to CPUs, Motherboards, RAM, SSDs, PSUs, Cases, and Coolers across KaBuM!, Pichau, TerabyteShop, Amazon, and Newegg.
- **`[DATA-08]` 1-Click Browser Bookmarklet & Manifest V3 Extension:** Zero-friction DOM reader for store product and search pages that launches ParetoPC with `#import=...` encoded directly in the URL hash so live store listings plot immediately on the frontier.
- **`[DATA-09]` Automated Official Product Feeds:** Integrate Amazon PA-API 5.0 and Awin/Lomadee XML/CSV feeds via nightly GitHub Actions committing validated updates to `br.json` and `us.json`, backed by Hedonic OLS sanity guards ($\pm 40\%$ of $\hat{P}_i$).

### Stage 4: Search Growth & Creator Outreach (Feb 1 – Mar 15, 2027)
- **`[LAUNCH-04]` Pre-Rendered SEO Buyer Guides:** Static indexable guides in `pt-BR` and `en-US` (*"Best GPU under R$ 2,500"*, *"Best Complete Gaming PC under $1,000"*).
- **"Done-For-You" Outreach Playbook:** Pre-build co-branded frontier links and 4K/HD spec cards from mid-tier tech YouTubers' latest recommendation videos (20k–300k subscribers) and Telegram deal groups so creators adopt ParetoPC with zero setup work.

### Stage 5: Direct Revenue & Ethical Sponsorships (Mar 16 – Jun 2027)
- **Default House Affiliate Commissions (`[AFF-04]`):** Organic, search, and untagged shared links route outbound store buttons through house affiliate IDs (Amazon BR/US, KaBuM!/Awin, Pichau, Terabyte, Newegg).
- **Pareto-Verified Sponsored Deals (`[AFF-02]`–`[AFF-03]`):** Brands or stores can sponsor a featured coupon/deal badge **only** when the promotional price mathematically qualifies the product on the Pareto frontier.
- **B2B Store Builder Licensing:** Offer regional PC retailers a white-label version of the 8-part compatible Pareto builder.

---

## 3. Autonomous `[UX-10]` Usability & Friction Audit (Nov 22, 2026)

Because live external testers were not yet available, we audited the beginner 2-minute journey end-to-end across Simple GPU mode, Simple Whole-PC mode, Explorer/Pro, and Full Builds on desktop and mobile:

1. **Findings Resolved in This Cycle:**
   - **Share Parity Gap:** Full Builds (`BuildHeroCard.tsx`) had link/text copy buttons, while Simple GPU recommendations (`SimpleGuidePickHero.tsx`) and Explorer winners (`TopWinnerBanner.tsx`) had no 1-click sharing or visual card export. Closed via `[SHARE-01]`.
   - **GPU Link Restoration Gap:** Full builds restored state from `?mode=builds&...`, whereas single-GPU links did not restore budget ceiling, currency, TOPSIS priority weights, or selected GPU IDs. Closed via `encodeGpuShareUrl` / `decodeGpuShareUrl` wired into `useOptimizerState.ts`.
   - **Copywriting Hygiene Check:** Verified via `plainLanguage.test.tsx` that Simple mode hero cards expose zero MCDM math jargon while the Share Card Studio explicitly surfaces the Pareto Frontier percentage split requested for influencers and deal groups.
2. **Research Tracks Status:**
   - **R-1 (Live Non-Tech Testing):** Ready to run 3–5 unassisted 2-minute sessions once live hosting is connected (`[LAUNCH-01]` shipped).
   - **R-2 (Affiliate URL Formats — Resolved):** Documented and implemented store tag injection in `src/lib/math/pricingEngine.ts` (`?tag=` Amazon BR/US, `?partner_tag=` KaBuM!, `?p=` TerabyteShop, `?ref=` Pichau, `?cm_mmc=` Newegg + `utm_source=paretopc`), creator overrides (`[AFF-05]`), and house fallback (`[AFF-04]`).
   - **R-3 (Multi-Category Store Copy — Resolved):** Implemented multi-category tokenization, unit normalization (`1 TB -> 1tb`, `650 W -> 650w`), and 124-part catalog matching in `src/lib/parser/hardwareListingParser.ts` (`[DATA-07]`) plus `#import=` bookmarklet (`[DATA-08]`).
   - **R-4 (Sponsorship Neutrality & Guardrails — Resolved):** Added `verifyFrontierSponsorship` (`[AFF-07]`) in `pricingEngine.ts` plus static Schema.org SEO buyer guides (`[LAUNCH-04]`) and `/go/:offerId` serverless redirect (`[AFF-06]`).

---

## 4. Technical Architecture of `[SHARE-01]`

- **URL Serialization (`src/utils/shareBuild.ts`):**
  - `encodeGpuShareUrl` / `decodeGpuShareUrl` serialize `mode`, `gpu`, `budget`, `curr`, `w=price-raster-rt-vram-tdp`, `ref`, `amz`, and `store` (validated via `sanitizeHttpUrl` to allow only `http:` / `https:`).
  - `encodeBuildShareUrl` / `decodeBuildShareUrl` reject `mode=simple|explorer|pro` and carry optional `ref`, `amz`, and `store` params.
- **Visual Spec Card & Caption Engine (`src/utils/socialShareCard.ts`):**
  - `normalizePriorityPercentages` guarantees integer percentages summing strictly to `100` via Hamilton largest-remainder rounding, with uniform `20%` fallback when all weights are zero.
  - `buildGpuSocialCardSvg` and `buildPcBuildSocialCardSvg` produce XML-escaped `1200×630` SVGs rendered safely in `<img src="data:image/svg+xml...">` (no `dangerouslySetInnerHTML`) and exported to `2400×1260` HD PNGs via `downloadSvgAsPng`.
- **Lazy Modal Studio (`src/components/SocialShareModal.tsx`):**
  - Mounted lazily from `src/App.tsx` to preserve the initial bundle performance budget (`npm run check:perf`).
  - Persists creator handle, Amazon tag, store URL, and website brand/domain placeholder safely via `safeGetJSON` / `safeSetJSON`.
