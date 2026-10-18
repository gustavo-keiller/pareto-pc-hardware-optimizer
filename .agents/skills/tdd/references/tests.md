# Good and Bad Tests

## Good Tests

**Interface & Property Tests**: Test observable mathematical outcomes and invariants through exported functions.

```typescript
// GOOD: Tests observable mathematical behavior against known ground truth
it('flags gpu-3, gpu-5, and gpu-8 as dominated traps in Phase 1 dataset', () => {
  const evaluated = evaluateParetoFrontier(PHASE1_SEED_GPUS, ALL_METRIC_KEYS);
  const traps = evaluated.filter((g) => g.isDominated).map((g) => g.id);
  expect(traps).toEqual(['gpu-3', 'gpu-5', 'gpu-8']);
});
```

Characteristics:

- Tests mathematical properties and domain contracts callers care about
- Uses public exported functions only
- Survives internal algorithm refactors
- Describes WHAT property holds, not HOW it is computed

## Bad Tests

**Tautological Tests**: Expected value restates the implementation formula, so the test passes even if the formula is wrong.

```typescript
// BAD: Recomputes Euclidean norm the exact same way the implementation does
it('normalizes weights', () => {
  const w = { price: 30, rasterFps1440p: 70 };
  const sum = w.price + w.rasterFps1440p;
  expect(normalizeWeights(w).price).toBe(w.price / sum);
});

// GOOD: Asserts against an independent known literal
it('normalizes weights to sum to 1.0', () => {
  const norm = normalizeWeights({
    price: 25,
    rasterFps1440p: 75,
    rtFps1440p: 0,
    vramGb: 0,
    tdpWatts: 0,
  });
  expect(norm.price).toBeCloseTo(0.25, 6);
  expect(norm.rasterFps1440p).toBeCloseTo(0.75, 6);
});
```
