---
name: typescript-best-practices
description: TypeScript best practices and type-safety rules for ParetoPC. Use when reading, writing, or editing any .ts or .tsx file in src/.
---

# TypeScript Best Practices

Ground rules for type safety, maintainability, and crash prevention in ParetoPC.

---

## 1. Core Rules Matrix

| Rule | Requirement | Why It Matters |
| :--- | :--- | :--- |
| **No `as` Type-Casts** | Never cast with `as TargetType` unless immediately preceded by validation or initializing a typed `Record<MetricKey, ...>` loop. | An unchecked `as` lies to the compiler. When dataset schemas evolve, it causes runtime crashes. |
| **Discriminated Unions** | Model multi-category hardware (`'gpu' \| 'cpu' \| 'ram' \| 'motherboard' \| 'psu'`) or optimization directions (`'min' \| 'max'`) with explicit literal unions. | Makes impossible states unrepresentable. |
| **`_exhaustive: never`** | Place `const _exhaustive: never = x;` in `default` arms of `switch` statements over `MetricKey`, `OptimizationDirection`, or component categories. | When a new metric (e.g. `lengthMm`, `computeScore`) is added to `MetricKey`, TypeScript fails at compile time until every switch handles it. |
| **`unknown` at Boundaries** | External data (`localStorage`, imported JSON benchmarks, URL state) must start as `unknown`. | Forces explicit validation before entering the math pipeline. |
| **Never Use `any`** | `any` is strictly prohibited per `AGENTS.md` Rule 5. | `any` disables type-checking transitively, including on ECharts tooltip formatters. |
| **Safe Storage Helpers** | Always use typed helpers from `src/utils/storage.ts` (`safeGetJSON`, `safeSetJSON`, `safeGetInt`, `safeGetBool`). | Prevents `JSON.parse` exceptions on corrupted browser storage (`AGENTS.md` Rule 6). |

---

## 2. Examples & Patterns

### ❌ Anti-Pattern: Hardcoded Metric String Checks Without Exhaustiveness

```typescript
// BAD: Adding 'lengthMm' to MetricKey silently falls through with wrong formatting
function formatMetric(metric: MetricKey, value: number): string {
  if (metric === 'price') return `$${value}`;
  if (metric === 'vramGb') return `${value} GB`;
  return `${value} FPS`; // Wrong for tdpWatts!
}
```

### ✅ Best Practice: Driven by `METRIC_DEFINITIONS` or Exhaustive Switch

```typescript
// GOOD: Uses METRIC_DEFINITIONS or exhaustive switch
function formatMetric(metric: MetricKey, value: number): string {
  switch (metric) {
    case 'price':
      return `$${value}`;
    case 'rasterFps1440p':
    case 'rtFps1440p':
      return `${value} FPS`;
    case 'vramGb':
      return `${value} GB`;
    case 'tdpWatts':
      return `${value} W`;
    default: {
      const _exhaustive: never = metric;
      throw new Error(`Unhandled metric: ${_exhaustive}`);
    }
  }
}
```

---

## 3. Verification Checklist

Before completing any task:

- [ ] No `any` keywords introduced in `.ts` or `.tsx` files.
- [ ] No unguarded `as` casts added.
- [ ] All `switch` statements on unions include `_exhaustive: never`.
- [ ] `npx tsc --noEmit` exits with code 0.
