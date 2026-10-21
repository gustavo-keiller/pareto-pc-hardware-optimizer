# Specification — Regional Store Prices & Pricing Overlay Engine (`[DATA-04]`)

> **Status:** Approved / In Implementation  
> **Phase:** Phase 3 ("Real, fresh data")  
> **Scope:** Static JSON price datasets per region and store (`src/data/prices/br.json`, `src/data/prices/us.json`) and a pure mathematical pricing overlay engine (`src/lib/math/pricingEngine.ts`).

---

## 1. Context & Objectives

Currently, Brazilian Reais (BRL) prices are derived via flat currency multiplication (`USD * 5.7`). In reality, Brazilian retail hardware prices diverge substantially based on import taxes (ICMS/PIS/COFINS), local inventory, and payment methods (PIX/cash discounts vs. credit card installments).

`[DATA-04]` establishes:
1. Versioned static JSON price files in the repo:
   - `src/data/prices/br.json`: Brazilian retail stores (KaBuM!, Pichau, TerabyteShop, Amazon BR).
   - `src/data/prices/us.json`: US retail baseline stores (Newegg, Amazon US, Best Buy, B&H).
2. Pure pricing overlay engine (`src/lib/math/pricingEngine.ts`):
   - Overlays real regional shelf prices onto hardware components.
   - Provides honest uncertainty labeling: components with exact store entries are marked `isEstimated: false` with store attribution; fallback converted prices are marked `isEstimated: true`.
   - Supports cash/PIX price vs. installment price selection.
3. Automated validation in `scripts/validate-catalogs.cjs` (`npm run check:catalogs`).

---

## 2. Data Schema (`RegionalPriceOffer`)

```typescript
export interface RegionalPriceOffer {
  componentId: string;       // Matches item id in src/data/catalogs/
  store: string;             // e.g. "KaBuM!", "TerabyteShop", "Pichau", "Amazon BR"
  price: number;             // Active effective purchase price
  cashPrice?: number;        // Cash / PIX discount price
  installmentPrice?: number; // Total installment price
  installments?: number;     // Number of installment months (e.g. 10 or 12)
  url: string;               // Direct product purchase URL
  inStock: boolean;          // In-stock availability
  checkedAt: string;         // ISO YYYY-MM-DD
}
```

---

## 3. Mathematical & System Invariants

1. **Pure Math Isolation (Rule 1):** Pricing resolution functions in `src/lib/math/pricingEngine.ts` must have zero React or DOM dependencies.
2. **Safe Fallback (Rule 5):** If a component has no regional store offer, fall back to base USD price with currency rate and set `isEstimated: true`.
3. **Audit Dates & Links:** Every store price must have a valid `checkedAt` ISO date and valid HTTP/HTTPS URL.
4. **Validation in CI:** `scripts/validate-catalogs.cjs` must validate all price entries against catalog component IDs and assert positive finite prices.
