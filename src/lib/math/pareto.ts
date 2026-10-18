import {
  DominanceReason,
  GpuCandidate,
  HardConstraints,
  METRIC_DEFINITIONS,
  MetricKey,
  ParetoEvaluatedGpu,
} from './types';
import {
  inferGpuVendor,
  inferGpuArchitecture,
  inferGpuFeatures,
} from './capabilities';

/**
 * Stage 1: Hard-Constraint Filtering ("The Dealbreakers")
 * Filters out candidates that violate strict user thresholds or categorical filters:
 * 1. Numeric: x.price <= C.maxPrice && x.vramGb >= C.minVram && x.tdpWatts <= C.maxWatts
 * 2. Categorical: Brand / Vendor, Architecture, and Proprietary Ecosystem Technologies
 */
export function filterByHardConstraints(
  candidates: GpuCandidate[],
  constraints: Partial<HardConstraints>,
): GpuCandidate[] {
  const maxPrice = constraints.maxPrice ?? Infinity;
  const minVram = constraints.minVram ?? 0;
  const maxWatts = constraints.maxWatts ?? Infinity;
  const selectedVendors = constraints.selectedVendors;
  const selectedArchitectures = constraints.selectedArchitectures;
  const requiredFeatures = constraints.requiredFeatures;

  return candidates.filter((gpu) => {
    // 1. Numeric dealbreakers
    if (gpu.price > maxPrice) return false;
    if (gpu.vramGb < minVram) return false;
    if (gpu.tdpWatts > maxWatts) return false;

    // 2. Brand / Vendor filter (if active and non-empty)
    if (selectedVendors && selectedVendors.length > 0) {
      const vendor = gpu.vendor ?? inferGpuVendor(gpu);
      if (!selectedVendors.includes(vendor)) {
        return false;
      }
    }

    // 3. Architecture filter (if active and non-empty)
    if (selectedArchitectures && selectedArchitectures.length > 0) {
      const arch = gpu.architecture ?? inferGpuArchitecture(gpu);
      if (!selectedArchitectures.includes(arch)) {
        return false;
      }
    }

    // 4. Ecosystem & Technology requirements (if active and non-empty)
    if (requiredFeatures && requiredFeatures.length > 0) {
      const feats = gpu.features ?? inferGpuFeatures(gpu);
      const hasAll = requiredFeatures.every((req) => feats.includes(req));
      if (!hasAll) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks if candidate A Pareto-dominates candidate B (A ≻ B) across active objectives M.
 *
 * A dominates B iff:
 * 1. For ALL m in M, A is at least as good as B (A_m >= B_m for max, A_m <= B_m for min)
 * 2. For AT LEAST ONE m in M, A is strictly better than B (A_m > B_m for max, A_m < B_m for min)
 */
export function dominates(
  candidateA: GpuCandidate,
  candidateB: GpuCandidate,
  activeObjectives: MetricKey[],
): boolean {
  if (candidateA.id === candidateB.id || activeObjectives.length === 0) {
    return false;
  }

  let strictlyBetterInAtLeastOne = false;

  for (const metric of activeObjectives) {
    const def = METRIC_DEFINITIONS[metric];
    const valA = candidateA[metric];
    const valB = candidateB[metric];

    if (def.direction === 'max') {
      if (valA < valB) {
        return false; // Worse in a maximized metric
      }
      if (valA > valB) {
        strictlyBetterInAtLeastOne = true;
      }
    } else {
      // 'min'
      if (valA > valB) {
        return false; // Worse in a minimized metric
      }
      if (valA < valB) {
        strictlyBetterInAtLeastOne = true;
      }
    }
  }

  return strictlyBetterInAtLeastOne;
}

/**
 * Builds a human-readable diagnostic explaining why `dominator` beats `victim`.
 * Example: "Do not buy Apex 3060 Legacy [TRAP]: Vortex RX 760 is $35 cheaper and 11.5% faster in 1440p Raster."
 */
export function buildDominanceReason(
  dominator: GpuCandidate,
  victim: GpuCandidate,
  activeObjectives: MetricKey[],
): DominanceReason {
  const priceSaved = victim.price - dominator.price;
  const metricGains: Partial<Record<MetricKey, { diff: number; pct: number }>> =
    {};
  const clauses: string[] = [];

  for (const metric of activeObjectives) {
    const def = METRIC_DEFINITIONS[metric];
    const domVal = dominator[metric];
    const vicVal = victim[metric];

    if (metric === 'price') {
      if (priceSaved > 0) {
        const pct =
          vicVal > 0 ? Math.round((priceSaved / vicVal) * 1000) / 10 : 0;
        metricGains.price = { diff: priceSaved, pct };
        clauses.push(`$${priceSaved} cheaper`);
      }
      continue;
    }

    if (def.direction === 'max' && domVal > vicVal) {
      const diff = domVal - vicVal;
      const pct = vicVal > 0 ? Math.round((diff / vicVal) * 1000) / 10 : 0;
      metricGains[metric] = { diff, pct };
      if (metric === 'vramGb') {
        clauses.push(`+${diff} GB VRAM (${domVal} GB vs ${vicVal} GB)`);
      } else {
        clauses.push(
          `${pct}% faster in ${def.shortLabel} (+${diff} ${def.unit})`,
        );
      }
    } else if (def.direction === 'min' && domVal < vicVal) {
      const diff = vicVal - domVal;
      const pct = vicVal > 0 ? Math.round((diff / vicVal) * 1000) / 10 : 0;
      metricGains[metric] = { diff, pct };
      clauses.push(`${diff}${def.unit} lower ${def.shortLabel}`);
    }
  }

  const summaryText =
    clauses.length > 0
      ? `Do not buy ${victim.name}: ${dominator.name} is ${clauses.join(', ')}.`
      : `${dominator.name} dominates ${victim.name}.`;

  return {
    dominatorId: dominator.id,
    dominatorName: dominator.name,
    priceSaved,
    metricGains,
    summaryText,
  };
}

/**
 * Stage 2: Pareto Dominance & Frontier Identification
 * Evaluates all candidates against `activeObjectives` (defaults to ['price', 'rasterFps1440p']).
 * Identifies the Pareto Optimal Frontier and populates `dominatedBy` (Pareto-optimal dominators)
 * and diagnostic reasons for every trap card.
 */
export function evaluateParetoFrontier(
  candidates: GpuCandidate[],
  activeObjectives: MetricKey[] = ['price', 'rasterFps1440p'],
): ParetoEvaluatedGpu[] {
  // First pass: find all pairwise dominance relationships
  const allDominatorsMap = new Map<string, GpuCandidate[]>();

  for (const candidateB of candidates) {
    const dominatorsOfB: GpuCandidate[] = [];
    for (const candidateA of candidates) {
      if (dominates(candidateA, candidateB, activeObjectives)) {
        dominatorsOfB.push(candidateA);
      }
    }
    allDominatorsMap.set(candidateB.id, dominatorsOfB);
  }

  // Determine which candidates are Pareto-optimal (0 dominators)
  const paretoOptimalIds = new Set<string>();
  for (const candidate of candidates) {
    const doms = allDominatorsMap.get(candidate.id) ?? [];
    if (doms.length === 0) {
      paretoOptimalIds.add(candidate.id);
    }
  }

  // Second pass: construct ParetoEvaluatedGpu records.
  // Per spec Section 3.3: "For every dominated item B, store an array dominatedBy: string[]
  // listing the IDs of all Pareto-optimal items that strictly beat it."
  return candidates.map((candidate) => {
    const allDoms = allDominatorsMap.get(candidate.id) ?? [];
    const isDominated = allDoms.length > 0;
    const isParetoOptimal = !isDominated;

    // Filter dominators to those on the Pareto frontier (transitivity guarantees at least one exists for finite sets)
    const paretoDoms = allDoms.filter((d) => paretoOptimalIds.has(d.id));
    const effectiveDoms = paretoDoms.length > 0 ? paretoDoms : allDoms;

    const dominanceReasons = effectiveDoms.map((dom) =>
      buildDominanceReason(dom, candidate, activeObjectives),
    );

    return {
      ...candidate,
      isParetoOptimal,
      isDominated,
      dominatedBy: effectiveDoms.map((d) => d.id),
      paretoDominatedBy: paretoDoms.map((d) => d.id),
      dominanceReasons,
    };
  });
}

/**
 * Computes the ordered 2D Pareto Frontier points and step-line staircase coordinates
 * for plotting any 2D slice (xMetric vs yMetric).
 */
export function get2DParetoFrontierCurve(
  candidates: GpuCandidate[],
  xMetric: MetricKey = 'price',
  yMetric: MetricKey = 'rasterFps1440p',
): {
  frontierGpus: GpuCandidate[];
  stepLineCoords: [number, number][];
} {
  if (candidates.length === 0) {
    return { frontierGpus: [], stepLineCoords: [] };
  }

  const evaluated = evaluateParetoFrontier(candidates, [xMetric, yMetric]);
  const xDir = METRIC_DEFINITIONS[xMetric].direction;

  // Sort frontier GPUs along the X axis
  const frontierGpus = evaluated
    .filter((g) => g.isParetoOptimal)
    .sort((a, b) => {
      if (a[xMetric] !== b[xMetric]) {
        return xDir === 'min'
          ? a[xMetric] - b[xMetric]
          : b[xMetric] - a[xMetric];
      }
      return a[yMetric] - b[yMetric];
    });

  const stepLineCoords: [number, number][] = frontierGpus.map((g) => [
    g[xMetric],
    g[yMetric],
  ]);

  return {
    frontierGpus,
    stepLineCoords,
  };
}
