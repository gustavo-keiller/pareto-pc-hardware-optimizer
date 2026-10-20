// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullSystemOptimizer } from '../useFullSystemOptimizer';
import {
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_RAM_KITS,
  SEED_PSUS,
  SEED_STORAGES,
  SEED_CASES,
  SEED_COOLERS,
} from '../../data/seedComponents';
import { REAL_WORLD_GPUS } from '../../data/realGpus';
import { ComponentCatalogs } from '../../lib/math/combinatorial';

const testCatalogs: ComponentCatalogs = {
  cpus: SEED_CPUS.slice(0, 3),
  gpus: REAL_WORLD_GPUS.slice(0, 3),
  motherboards: SEED_MOTHERBOARDS.slice(0, 3),
  ramKits: SEED_RAM_KITS.slice(0, 2),
  psus: SEED_PSUS.slice(0, 2),
  storages: SEED_STORAGES.slice(0, 2),
  cases: SEED_CASES.slice(0, 2),
  coolers: SEED_COOLERS.slice(0, 2),
};

describe('useFullSystemOptimizer Hook [BLD-04]', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
  });

  it('provides synchronous initial state so UI renders instantly without blank frames', () => {
    const { result } = renderHook(() =>
      useFullSystemOptimizer({
        catalogs: testCatalogs,
        filterCriteria: { maxBudget: 2000 },
      }),
    );

    expect(result.current.isCalculating).toBe(false);
    expect(
      result.current.optimizationResult.totalCompatibleBuilds,
    ).toBeGreaterThan(0);
    expect(
      result.current.optimizationResult.optimalBuilds.length,
    ).toBeGreaterThan(0);
  });

  it('updates optimization result synchronously when Worker is unavailable (fallback mode)', () => {
    // @ts-expect-error simulating environment without Web Worker
    delete globalThis.Worker;

    const { result, rerender } = renderHook(
      ({ budget }) =>
        useFullSystemOptimizer({
          catalogs: testCatalogs,
          filterCriteria: { maxBudget: budget },
        }),
      { initialProps: { budget: 2000 } },
    );

    const initialTopBuild = result.current.optimizationResult.optimalBuilds[0];
    expect(initialTopBuild).toBeDefined();

    // Rerender with lower budget
    act(() => {
      rerender({ budget: 800 });
    });

    expect(result.current.isCalculating).toBe(false);
    for (const build of result.current.optimizationResult.optimalBuilds) {
      expect(build.totalPrice).toBeLessThanOrEqual(800);
    }
  });

  it('dispatches to Web Worker and handles async response when Worker is present', () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const postMessageSpy = vi.fn();
    const terminateSpy = vi.fn();

    class MockWorker {
      set onmessage(handler: (event: MessageEvent) => void) {
        messageHandler = handler;
      }
      postMessage = postMessageSpy;
      terminate = terminateSpy;
    }

    // @ts-expect-error mock worker
    globalThis.Worker = MockWorker;

    const { result, rerender, unmount } = renderHook(
      ({ budget }) =>
        useFullSystemOptimizer({
          catalogs: testCatalogs,
          filterCriteria: { maxBudget: budget },
        }),
      { initialProps: { budget: 2000 } },
    );

    expect(result.current.isCalculating).toBe(false);

    // Trigger update
    act(() => {
      rerender({ budget: 1500 });
    });

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isCalculating).toBe(true);

    const sentInput = postMessageSpy.mock.calls[0][0];
    expect(sentInput.requestId).toBe(1);
    expect(sentInput.filterCriteria.maxBudget).toBe(1500);

    // Simulate worker response
    act(() => {
      if (messageHandler) {
        messageHandler({
          data: {
            requestId: 1,
            result: {
              allCompatibleBuilds: [],
              totalCompatibleBuilds: 42,
              optimalBuilds: [],
              prunedPartCounts: {
                cpus: 3,
                gpus: 3,
                motherboards: 3,
                ramKits: 2,
                psus: 2,
                storages: 2,
                cases: 2,
                coolers: 2,
              },
            },
          },
        } as MessageEvent);
      }
    });

    expect(result.current.isCalculating).toBe(false);
    expect(result.current.optimizationResult.totalCompatibleBuilds).toBe(42);

    unmount();
    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores stale responses from out-of-order worker runs', () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const postMessageSpy = vi.fn();

    class MockWorker {
      set onmessage(handler: (event: MessageEvent) => void) {
        messageHandler = handler;
      }
      postMessage = postMessageSpy;
      terminate = vi.fn();
    }

    // @ts-expect-error mock worker
    globalThis.Worker = MockWorker;

    const { result, rerender } = renderHook(
      ({ budget }) =>
        useFullSystemOptimizer({
          catalogs: testCatalogs,
          filterCriteria: { maxBudget: budget },
        }),
      { initialProps: { budget: 2000 } },
    );

    // Trigger update 1 (requestId = 1)
    act(() => {
      rerender({ budget: 1500 });
    });

    // Trigger update 2 (requestId = 2)
    act(() => {
      rerender({ budget: 1200 });
    });

    expect(postMessageSpy).toHaveBeenCalledTimes(2);

    // Stale response with requestId = 1 arrives
    act(() => {
      if (messageHandler) {
        messageHandler({
          data: {
            requestId: 1,
            result: {
              allCompatibleBuilds: [],
              totalCompatibleBuilds: 111,
              optimalBuilds: [],
              prunedPartCounts: {
                cpus: 1,
                gpus: 1,
                motherboards: 1,
                ramKits: 1,
                psus: 1,
                storages: 1,
                cases: 1,
                coolers: 1,
              },
            },
          },
        } as MessageEvent);
      }
    });

    // Stale response is ignored; isCalculating remains true waiting for requestId = 2
    expect(result.current.isCalculating).toBe(true);
    expect(result.current.optimizationResult.totalCompatibleBuilds).not.toBe(
      111,
    );

    // Response for requestId = 2 arrives
    act(() => {
      if (messageHandler) {
        messageHandler({
          data: {
            requestId: 2,
            result: {
              allCompatibleBuilds: [],
              totalCompatibleBuilds: 222,
              optimalBuilds: [],
              prunedPartCounts: {
                cpus: 2,
                gpus: 2,
                motherboards: 2,
                ramKits: 2,
                psus: 2,
                storages: 2,
                cases: 2,
                coolers: 2,
              },
            },
          },
        } as MessageEvent);
      }
    });

    expect(result.current.isCalculating).toBe(false);
    expect(result.current.optimizationResult.totalCompatibleBuilds).toBe(222);
  });
});
