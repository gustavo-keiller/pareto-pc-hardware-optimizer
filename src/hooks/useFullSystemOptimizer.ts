import { useState, useEffect, useRef } from 'react';
import {
  ComponentCatalogs,
  BuildFilterCriteria,
  OptimizationResult,
  optimizeFullSystemBuilds,
} from '../lib/math/combinatorial';
import {
  BuilderWorkerInput,
  BuilderWorkerOutput,
} from '../workers/builderWorker';

export interface UseFullSystemOptimizerParams {
  catalogs: ComponentCatalogs;
  filterCriteria: BuildFilterCriteria;
  enabled?: boolean;
}

export interface UseFullSystemOptimizerResult {
  optimizationResult: OptimizationResult;
  isCalculating: boolean;
}

const EMPTY_RESULT: OptimizationResult = {
  allCompatibleBuilds: [],
  totalCompatibleBuilds: 0,
  optimalBuilds: [],
  dominatedBuilds: [],
  prunedPartCounts: {
    cpus: 0,
    gpus: 0,
    motherboards: 0,
    ramKits: 0,
    psus: 0,
    storages: 0,
    cases: 0,
    coolers: 0,
  },
};

const MAX_LRU_ENTRIES = 24;
const OPTIMIZATION_CACHE = new Map<string, OptimizationResult>();

function getCacheKey(
  catalogs: ComponentCatalogs,
  filterCriteria: BuildFilterCriteria,
): string {
  const catSig = `${catalogs.cpus.length}_${catalogs.gpus.length}_${catalogs.motherboards.length}_${catalogs.ramKits.length}_${catalogs.psus.length}_${catalogs.storages?.length ?? 0}_${catalogs.cases?.length ?? 0}_${catalogs.coolers?.length ?? 0}`;
  return `${catSig}::${JSON.stringify(filterCriteria)}`;
}

function getCachedResult(key: string): OptimizationResult | undefined {
  const result = OPTIMIZATION_CACHE.get(key);
  if (result) {
    // Refresh LRU access order
    OPTIMIZATION_CACHE.delete(key);
    OPTIMIZATION_CACHE.set(key, result);
  }
  return result;
}

function setCachedResult(key: string, result: OptimizationResult): void {
  if (OPTIMIZATION_CACHE.size >= MAX_LRU_ENTRIES) {
    const oldestKey = OPTIMIZATION_CACHE.keys().next().value;
    if (oldestKey) OPTIMIZATION_CACHE.delete(oldestKey);
  }
  OPTIMIZATION_CACHE.set(key, result);
}

export function clearOptimizerCache(): void {
  OPTIMIZATION_CACHE.clear();
}

export function useFullSystemOptimizer({
  catalogs,
  filterCriteria,
  enabled = true,
}: UseFullSystemOptimizerParams): UseFullSystemOptimizerResult {
  // Synchronous initial result ensures zero flashing or blank screens on mount
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult>(() => {
      if (!enabled) return EMPTY_RESULT;
      const key = getCacheKey(catalogs, filterCriteria);
      const cached = getCachedResult(key);
      if (cached) return cached;

      try {
        const computed = optimizeFullSystemBuilds(catalogs, filterCriteria);
        setCachedResult(key, computed);
        return computed;
      } catch {
        return EMPTY_RESULT;
      }
    });

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const activeDispatchKeyRef = useRef<string>('');
  const lastDispatchedKeyRef = useRef<string>(
    JSON.stringify({ filterCriteria, enabled }),
  );
  const prevCatalogsRef = useRef<ComponentCatalogs>(catalogs);

  // Initialize Web Worker once with safe fallback
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return;
    }

    try {
      const worker = new Worker(
        new URL('../workers/builderWorker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (event: MessageEvent<BuilderWorkerOutput>) => {
        const { requestId, result } = event.data;
        // Ignore stale responses to prevent out-of-order race conditions
        if (requestId === requestIdRef.current) {
          if (activeDispatchKeyRef.current) {
            setCachedResult(activeDispatchKeyRef.current, result);
          }
          setOptimizationResult(result);
          setIsCalculating(false);
        }
      };

      worker.onerror = () => {
        setIsCalculating(false);
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch {
      workerRef.current = null;
    }
  }, []);

  // Dispatch work whenever catalogs or filter criteria semantically change
  useEffect(() => {
    const dispatchKey = JSON.stringify({ filterCriteria, enabled });
    const catalogsChanged = prevCatalogsRef.current !== catalogs;

    // Prevent redundant dispatches and infinite render loops from unmemoized inline objects
    if (!catalogsChanged && dispatchKey === lastDispatchedKeyRef.current) {
      return;
    }

    lastDispatchedKeyRef.current = dispatchKey;
    prevCatalogsRef.current = catalogs;

    if (!enabled) {
      setOptimizationResult(EMPTY_RESULT);
      setIsCalculating(false);
      return;
    }

    // Check fast in-memory LRU cache to return instant 0ms result on previously visited budgets (PERF-06)
    const cacheKey = getCacheKey(catalogs, filterCriteria);
    const cached = getCachedResult(cacheKey);
    if (cached) {
      setOptimizationResult(cached);
      setIsCalculating(false);
      return;
    }

    activeDispatchKeyRef.current = cacheKey;
    const currentRequestId = ++requestIdRef.current;

    if (workerRef.current) {
      setIsCalculating(true);
      const input: BuilderWorkerInput = {
        requestId: currentRequestId,
        catalogs,
        filterCriteria,
      };
      workerRef.current.postMessage(input);
    } else {
      // Fallback: synchronous execution on main thread
      try {
        const result = optimizeFullSystemBuilds(catalogs, filterCriteria);
        setCachedResult(cacheKey, result);
        setOptimizationResult(result);
      } catch {
        setOptimizationResult(EMPTY_RESULT);
      }
      setIsCalculating(false);
    }
  }, [catalogs, filterCriteria, enabled]);

  return {
    optimizationResult,
    isCalculating,
  };
}
