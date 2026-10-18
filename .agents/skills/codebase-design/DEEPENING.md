# Deepening Modules

How to deepen a cluster of shallow modules safely in ParetoPC. Assumes the vocabulary in [`SKILL.md`](SKILL.md).

## Dependency Categories

When assessing a candidate for deepening, classify its dependencies:

### 1. In-Process Pure Math (`src/lib/math/`)

Pure computation over candidate arrays and weight records. Always deepenable: merge shallow helpers behind a single cohesive pipeline function (`evaluateParetoFrontier`, `rankByTopsis`, `fitHedonicOls`) and test through the exported function in Vitest. No mocks needed.

### 2. Local-Substitutable State (`src/utils/storage.ts` & Hooks)

Dependencies on `localStorage` or URL query parameters. Deepenable by encapsulating persistence inside `src/utils/storage.ts` and testing with an in-memory `Storage` stand-in (`src/utils/__tests__/storage.test.ts`).

### 3. Visualization Components (`src/components/`)

ECharts components (`ParetoScatterPlot`, `ComparisonDrawer`). Keep coordinate transformations (`get2DParetoFrontierCurve`) in `src/lib/math/` so the geometry is unit-testable without mounting a canvas/DOM, while the React component owns the ECharts `option` configuration and hover callbacks.

## Testing Strategy: Replace, Don't Layer

- Write tests at the deepened module's public interface (`npm run test`). The **interface is the test surface**.
