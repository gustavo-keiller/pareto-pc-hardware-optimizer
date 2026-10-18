# Spec: User GPU Database & Smart Listing Importer / Validator

**Status:** Ready to Implement  
**Date:** 2026-10-18  
**Scope:** Architecture & MCDM Pipeline Extension  

---

## 1. Problem Statement

Hardware buyers frequently find live GPU offers across different e-commerce stores (e.g. Pichau, TerabyteShop, KaBuM!, PCYes, Amazon, Mercado Livre) with fragmented information:
- Prices in Brazilian Real ($R\$$) with significant differences between cash/PIX discounts (e.g. 15% off) and credit card installment plans (10x–12x sem juros).
- Unstructured text with model codes, AIB partners (PowerColor, Palit, Gamer Ninja, PCYes), memory bus specs, and marketing blurbs.
- Scraping these sites directly is blocked by CORS/Cloudflare/dynamic anti-bot protections.
- Users need an easy, frictionless way to paste messy listing text, have it parsed automatically, inspect and validate the extracted specs (matching known 1440p Raster/RT benchmark metrics), and save them into their personal "My Deals" database to evaluate on the Pareto frontier, TOPSIS ranking, 3D Cloud, and 4D parallel coordinates.

---

## 2. Technical Architecture & Data Flow

```
[Raw Pasted Text / Listings]
            │
            ▼
┌──────────────────────────────────────┐
│  src/lib/parser/gpuListingParser.ts  │
│  - Multi-item batch split            │
│  - Regex tokenization:               │
│    * Chip & Brand detection          │
│    * Cash/PIX vs. Card price parse   │
│    * VRAM extraction                 │
│    * Store / URL detection           │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  src/data/knownGpuBenchmarks.ts      │
│  - Lookup 40+ known desktop GPUs     │
│  - Attach 1440p Raster FPS, RT FPS,  │
│    TDP Watts, and default VRAM       │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  src/components/GpuDealImporter.tsx  │
│  - Interactive Validation Cards:     │
│    * PIX vs. Installment selector    │
│    * Editable specs & benchmark tag  │
│    * Store pill & direct link        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  useOptimizerState & localStorage    │
│  - Persists custom user deals        │
│  - Feeds into MCDM Pipeline:         │
│    * Pareto Dominance                │
│    * TOPSIS Ranking & OLS Model      │
│    * 2D / 3D / 4D Visualizations     │
└──────────────────────────────────────┘
```

---

## 3. Implementation Plan

1. **`src/lib/math/types.ts`:**
   - Extend `GpuCandidate` with optional store & deal fields: `store?: string`, `url?: string`, `currency?: 'USD' | 'BRL'`, `priceCash?: number`, `priceInstallment?: number`, `originalPrice?: number`, `chip?: string`, `brand?: string`, `isCustom?: boolean`, `isBenchmarkEstimated?: boolean`.

2. **`src/data/knownGpuBenchmarks.ts`:**
   - Catalog of known modern and legacy desktop GPUs across NVIDIA, AMD, and Intel.
   - Benchmark resolution function `matchKnownGpuChip(rawText: string)`.

3. **`src/lib/parser/gpuListingParser.ts`:**
   - Pure TypeScript parser with zero React/DOM imports.
   - Handles Brazilian e-commerce formats (`R$ 3.899,99`, `15% desconto no PIX`, `12x de R$ 382,35`, `Vendido por: TerabyteShop`, `KaBuM!`, `Pichau`, `PCYes`).
   - Supports single or batch pasting of multiple listings.

4. **`src/lib/parser/__tests__/gpuListingParser.test.ts`:**
   - Vitest tests validating the parser against the exact user-provided listings (Pichau RX 9060 XT, Terabyte GTX 1660 Super, PCYes RX 7600 XT, KaBuM RTX 5060) and edge cases.

5. **`src/utils/currency.ts`:**
   - Formatting helpers supporting `BRL` (`R$ 1.389,99`) and `USD` (`$250`).

6. **`src/hooks/useOptimizerState.ts`:**
   - Integrate `customGpus` state stored in `localStorage` under `paretopc_custom_gpus`.
   - Support `datasetMode: 'real' | 'custom' | 'synthetic'`.
   - Provide `addCustomGpus`, `removeCustomGpu`, `clearCustomGpus`.

7. **`src/components/GpuDealImporterModal.tsx`:**
   - Smart Paste tab with example buttons.
   - Live Validation card view with PIX vs. card price switcher.
   - "My Deals" catalog management tab.

8. **`src/App.tsx` & `src/components/GpuLeaderboardTable.tsx`:**
   - Header "+ Import Deals" button and "My Deals (N)" dataset option.
   - Store badge & link rendering in table rows and detail drawers.

---

## 4. Invariants & Rules

- **Pure Engine Isolation (Rule 1):** `gpuListingParser.ts` has zero React/DOM imports and is fully covered in Vitest.
- **Directionality Authority (Rule 2):** Minimizing price works identically regardless of whether `price` is BRL or USD.
- **Numerical & Boundary Safety (Rule 3):** No NaN prices, empty paste returns empty array without throwing.
- **Strict TypeScript (Rule 5):** Discriminated unions, no `any`, no unchecked `as`.
- **Safe Storage (Rule 6):** Custom GPU catalog loaded/saved with `safeGetJSON` / `safeSetJSON`.
