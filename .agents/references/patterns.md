# TypeScript Patterns Reference

Code examples for the rules in [`.agents/skills/typescript-best-practices/SKILL.md`](../skills/typescript-best-practices/SKILL.md).

## Branded Types

Brand primitives when multiple IDs or normalized vs. raw numbers could be mixed up. Validate once at creation; downstream code trusts the type.

```ts
type GpuId = string & { readonly __brand: 'GpuId' };

function parseGpuId(input: string): GpuId {
  if (!input.trim()) throw new Error('Empty GPU id');
  return input as GpuId;
}
```

## Discriminated Unions

If a bug forces the question "wait, can this combination actually happen?", the type is too loose. Model variants with a literal discriminant (`kind` or `type`) so impossible combinations cannot be represented.

```ts
// Don't: boolean + optionals lets contradictory states exist
type RegressionState = { loading: boolean; result?: OlsResult; error?: string };

// Do: only valid states exist
type RegressionState =
  | { kind: 'idle' }
  | { kind: 'ready'; result: OlsResult }
  | { kind: 'insufficient_data'; minRequired: number };
```

## Constructive Modeling (`NonEmpty<T>`)

Build types from parts that are legal instead of restricting a loose type with repeated runtime checks:

```ts
type NonEmpty<T> = [T, ...T[]];

const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0;
```

## Simplest Total Type

Don't over-complicate signatures when an operation is naturally total on `T[]`:

```ts
// [] -> [] is total and well-defined for Pareto and TOPSIS functions
export function evaluateParetoFrontier(candidates: GpuCandidate[]): ParetoEvaluatedGpu[]
```

## `unknown` Over `any`

`any` disables type checking for everything it touches. External data (`JSON.parse`, `localStorage`, URL params) is always `unknown`. Narrow before use.

```ts
// Don't
function loadCustomPreset(input: any): PreferenceWeights {
  return input.weights;
}

// Do
function isPreferenceWeights(input: unknown): input is PreferenceWeights {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.price === 'number' &&
    typeof obj.rasterFps1440p === 'number' &&
    typeof obj.rtFps1440p === 'number' &&
    typeof obj.vramGb === 'number' &&
    typeof obj.tdpWatts === 'number'
  );
}
```

## Narrowing Hierarchy

From best to last-resort:

1. **Discriminated union `switch` / `if`.** Compiler narrows automatically.
2. **`in` operator.** `'key' in obj` narrows to variants containing that key.
3. **`typeof` / `instanceof`.** For primitives and class instances.
4. **User-defined type guard (`x is T`).** When the above aren't enough.
5. **`as` cast.** Only after explicit validation or when populating a known exhaustive `Record<MetricKey, V>`.

## Exhaustiveness (`_exhaustive: never`)

In `default` arms, assign the discriminant to a `never`-typed local so the compiler errors immediately if a new `MetricKey` or hardware category is added without handling:

```ts
function metricUnit(metric: MetricKey): string {
  switch (metric) {
    case 'price':
      return '$';
    case 'rasterFps1440p':
    case 'rtFps1440p':
      return 'FPS';
    case 'vramGb':
      return 'GB';
    case 'tdpWatts':
      return 'W';
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}
```

## `satisfies` Over `as`

`satisfies` validates conformance to a type without widening literal types:

```ts
const DEFAULT_CONSTRAINTS = {
  maxPrice: 1000,
  minVram: 8,
  maxWatts: 350,
} satisfies HardConstraints;
```
