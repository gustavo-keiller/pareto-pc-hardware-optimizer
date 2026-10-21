export type HardwareVendor = 'NVIDIA' | 'AMD' | 'Intel' | 'Synthetic' | 'Other';

export interface GpuCandidate {
  id: string;
  name: string;
  vendor?: HardwareVendor;
  architecture?: string;
  generation?: string;
  features?: string[];
  price: number;
  rasterFps1440p: number;
  rtFps1440p: number;
  vramGb: number;
  tdpWatts: number;
  lengthMm?: number;
  computeScore?: number;
  notes?: string;

  // Store & Deal Listing Metadata
  store?: string;
  url?: string;
  currency?: 'USD' | 'BRL';
  priceCash?: number;
  priceInstallment?: number;
  originalPrice?: number;
  chip?: string;
  brand?: string;
  isCustom?: boolean;
  isBenchmarkEstimated?: boolean;
  isBenchmarkRef?: boolean;
  originalUsdPrice?: number;

  // Provenance & Audit Metadata (DATA-01)
  source?: string;
  checkedAt?: string;
}

export type MetricKey =
  'price' | 'rasterFps1440p' | 'rtFps1440p' | 'vramGb' | 'tdpWatts';

export type OptimizationDirection = 'min' | 'max';

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  direction: OptimizationDirection;
  description: string;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  price: {
    key: 'price',
    label: 'Retail Price ($ USD)',
    shortLabel: 'Price',
    unit: '$',
    direction: 'min',
    description: 'Lower is better. Minimizes initial hardware outlay.',
  },
  rasterFps1440p: {
    key: 'rasterFps1440p',
    label: '1440p Rasterization (FPS)',
    shortLabel: '1440p Raster',
    unit: 'FPS',
    direction: 'max',
    description:
      'Higher is better. Geomean frame rate across standard rasterized titles at 1440p Ultra.',
  },
  rtFps1440p: {
    key: 'rtFps1440p',
    label: '1440p Ray Tracing (FPS)',
    shortLabel: '1440p RT',
    unit: 'FPS',
    direction: 'max',
    description:
      'Higher is better. Geomean frame rate in heavy path-traced and ray-traced workloads.',
  },
  vramGb: {
    key: 'vramGb',
    label: 'VRAM Capacity (GB)',
    shortLabel: 'VRAM',
    unit: 'GB',
    direction: 'max',
    description:
      'Higher is better. Framebuffer capacity for high-res textures and local AI.',
  },
  tdpWatts: {
    key: 'tdpWatts',
    label: 'Board Power / TBP (Watts)',
    shortLabel: 'Power (TBP)',
    unit: 'W',
    direction: 'min',
    description: 'Lower is better. Thermal design power and PSU load.',
  },
};

/**
 * Type guard for untrusted strings (e.g. `<select>` values) that must be a MetricKey.
 * Use this instead of `value as MetricKey`.
 */
export function isMetricKey(value: string): value is MetricKey {
  return Object.prototype.hasOwnProperty.call(METRIC_DEFINITIONS, value);
}

export interface HardConstraints {
  maxPrice: number;
  minVram: number;
  maxWatts: number;

  // Categorical & Ecosystem filters (empty or omitted = allow all)
  selectedVendors?: HardwareVendor[];
  selectedArchitectures?: string[];
  requiredFeatures?: string[];
}

export interface FilterFacetOption {
  id: string;
  label: string;
  badge?: string;
  count?: number;
}

export interface FilterFacet {
  id: string;
  label: string;
  description?: string;
  options: FilterFacetOption[];
}

export type PreferenceWeights = Record<MetricKey, number>;

export interface DominanceReason {
  dominatorId: string;
  dominatorName: string;
  priceSaved: number;
  metricGains: Partial<Record<MetricKey, { diff: number; pct: number }>>;
  summaryText: string;
}

export interface ParetoEvaluatedGpu extends GpuCandidate {
  isParetoOptimal: boolean;
  isDominated: boolean;
  dominatedBy: string[];
  paretoDominatedBy: string[];
  dominanceReasons: DominanceReason[];
}

export type ValueTier = 'bargain' | 'fair' | 'overpriced';

export interface GpuValuation {
  fairPrice: number; // Predicted fair market price ($ USD) from log-linear OLS
  residualUsd: number; // actualPrice - fairPrice (negative = cheaper than fair value)
  residualPct: number; // ((actualPrice - fairPrice) / fairPrice) * 100
  valueTier: ValueTier;
}

export interface HedonicModelSummary {
  intercept: number;
  coefficients: {
    rasterFps1440p: number;
    rtFps1440p: number;
    vramGb: number;
    tdpWatts: number;
  };
  rSquared: number;
  valuations: Record<string, GpuValuation>;
}

export interface RankedGpu extends ParetoEvaluatedGpu {
  topsisScore: number; // C_i in [0, 1]
  topsisScorePct: number; // 0 to 100
  distanceToBest: number; // d_i^+
  distanceToWorst: number; // d_i^-
  normalizedMetrics: Record<MetricKey, number>;
  weightedMetrics: Record<MetricKey, number>;
  rank: number;
  frontierRank: number | null;
  valuation?: GpuValuation;
}

export interface MetricScoreBreakdown {
  metric: MetricKey;
  direction: 'min' | 'max';
  rawVal: number;
  normalizedVal: number;
  weight: number;
  weightedVal: number;
  idealBest: number;
  idealWorst: number;
  diffBestSq: number;
  diffWorstSq: number;
  closenessPct: number;
}

export interface TopsisScoreBreakdown {
  gpuId: string;
  gpuName: string;
  topsisScore: number;
  topsisScorePct: number;
  distanceToBest: number;
  distanceToWorst: number;
  metrics: MetricScoreBreakdown[];
}
