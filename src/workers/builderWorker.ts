import {
  ComponentCatalogs,
  BuildFilterCriteria,
  OptimizationResult,
  optimizeFullSystemBuilds,
} from '../lib/math/combinatorial';

export interface BuilderWorkerInput {
  requestId: number;
  catalogs: ComponentCatalogs;
  filterCriteria: BuildFilterCriteria;
}

export interface BuilderWorkerOutput {
  requestId: number;
  result: OptimizationResult;
}

self.onmessage = (event: MessageEvent<BuilderWorkerInput>) => {
  const { requestId, catalogs, filterCriteria } = event.data;
  try {
    const result = optimizeFullSystemBuilds(catalogs, filterCriteria);
    const output: BuilderWorkerOutput = {
      requestId,
      result,
    };
    self.postMessage(output);
  } catch (error) {
    // If an error occurs, post back empty/safe fallback result with original requestId
    const fallback: OptimizationResult = {
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
    self.postMessage({
      requestId,
      result: fallback,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
