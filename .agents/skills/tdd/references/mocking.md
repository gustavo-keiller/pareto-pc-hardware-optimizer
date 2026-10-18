# When to Mock

Mock at **system boundaries** only:

- Browser `localStorage` (in unit tests running in Node environment, e.g. `src/utils/__tests__/storage.test.ts`)
- External HTTP APIs (if live pricing fetchers are added in the future)
- Time / randomness

Don't mock:

- Pure math functions in `src/lib/math/` (`pareto.ts`, `topsis.ts`, `regression.ts`, `combinatorial.ts`)
- `METRIC_DEFINITIONS` or seed datasets (`seedGpus.ts`)
- Internal collaborators you control
