import { useEffect, useMemo, useState } from 'react';
import { PHASE1_SEED_GPUS } from '../data/seedGpus';
import { REAL_WORLD_GPUS } from '../data/realGpus';
import {
  HardConstraints,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
} from '../lib/math/types';
import {
  evaluateParetoFrontier,
  filterByHardConstraints,
} from '../lib/math/pareto';
import {
  ALL_METRIC_KEYS,
  DEFAULT_PREFERENCE_WEIGHTS,
  normalizeWeights,
  rankByTopsis,
} from '../lib/math/topsis';
import { computeHedonicRegression } from '../lib/math/regression';
import { ExtrapolationConfig } from '../lib/math/extrapolation';
import {
  runStorageMigrations,
  safeGetBool,
  safeGetJSON,
  safeGetString,
  safeSetJSON,
} from '../utils/storage';

export type DatasetMode = 'real' | 'synthetic';
export type UiMode = 'simple' | 'explorer' | 'pro';
export type ChartViewMode = '2d' | '3d' | 'hyper' | 'axes' | 'residuals';

export interface PresetProfile {
  id: string;
  label: string;
  shortDesc: string;
  weights: PreferenceWeights;
}

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'balanced',
    label: 'Balanced 1440p Sweet-Spot',
    shortDesc: 'Best mix of price, raster FPS, and 12–16GB VRAM longevity',
    weights: {
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 8,
    },
  },
  {
    id: 'budget',
    label: 'Budget Value Hunter',
    shortDesc: 'Maximizes frames per dollar and low power draw',
    weights: {
      price: 65,
      rasterFps1440p: 20,
      rtFps1440p: 0,
      vramGb: 5,
      tdpWatts: 10,
    },
  },
  {
    id: 'esports',
    label: 'Pure Raster / Competitive FPS',
    shortDesc: 'Prioritizes raw 1440p frame rates over Ray Tracing',
    weights: {
      price: 25,
      rasterFps1440p: 55,
      rtFps1440p: 5,
      vramGb: 10,
      tdpWatts: 5,
    },
  },
  {
    id: 'pathtracing',
    label: 'Heavy Ray Tracing & 16GB+ VRAM',
    shortDesc: 'Built for Cyberpunk/Alan Wake path tracing and local AI',
    weights: {
      price: 5,
      rasterFps1440p: 25,
      rtFps1440p: 45,
      vramGb: 25,
      tdpWatts: 0,
    },
  },
];

const DEFAULT_CONSTRAINTS_REAL: HardConstraints = {
  maxPrice: 1800,
  minVram: 8,
  maxWatts: 450,
};

export const DEFAULT_EXTRAPOLATION_CONFIG: ExtrapolationConfig = {
  enabled: false,
  mode: 'gpu',
  scalingModel: 'linear-ratio',
  anchorGpuId: 'arc-b580',
  secondGpuId: 'rx-7800-xt',
  customXValue: 1000,
  customYValue: 10,
  exponent: 0.8,
  tolerancePct: 0,
  whatIfX: 600,
  enforceAsTrap: true,
};

export function useOptimizerState() {
  useEffect(() => {
    runStorageMigrations();
  }, []);

  // Dataset switcher: defaults to 'real' (18 real-world GPUs) or 'synthetic' (Phase 1 seed)
  const [datasetMode, setDatasetMode] = useState<DatasetMode>(() => {
    const saved = safeGetString('paretopc_dataset', 'real');
    return saved === 'synthetic' ? 'synthetic' : 'real';
  });

  // 3 Proportional UI Complexity Modes: 'simple' (Level 1) | 'explorer' (Level 2) | 'pro' (Level 3)
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const saved = safeGetString('paretopc_ui_mode', 'simple');
    if (saved === 'pro' || saved === 'explorer') return saved;
    return 'simple';
  });

  // Chart View Mode: '2d' (Pareto Scatter), '3d' (3D Cube Cloud), 'residuals' (OLS Fair Value)
  const [chartView, setChartView] = useState<ChartViewMode>('2d');

  // Stage 1: Hard Constraints
  const [constraints, setConstraints] = useState<HardConstraints>(() =>
    safeGetJSON('paretopc_constraints', DEFAULT_CONSTRAINTS_REAL)
  );

  // Stage 2: Axes & Pareto Mode
  const [xMetric, setXMetric] = useState<MetricKey>('price');
  const [yMetric, setYMetric] = useState<MetricKey>('rasterFps1440p');
  const [zMetric, setZMetric] = useState<MetricKey>('vramGb');
  const [paretoMode, setParetoMode] = useState<'2d-axes' | 'all-5d'>(() => {
    const saved = safeGetString('paretopc_pareto_mode', 'all-5d');
    return saved === '2d-axes' ? '2d-axes' : 'all-5d';
  });

  // Linear & Non-Linear Value Extrapolation Tool
  const [extrapolation, setExtrapolation] = useState<ExtrapolationConfig>(() => ({
    ...DEFAULT_EXTRAPOLATION_CONFIG,
    ...safeGetJSON('paretopc_extrapolation', DEFAULT_EXTRAPOLATION_CONFIG),
  }));

  // Stage 3: TOPSIS Weights
  const [weights, setWeights] = useState<PreferenceWeights>(() =>
    safeGetJSON('paretopc_weights', DEFAULT_PREFERENCE_WEIGHTS)
  );
  const [activePresetId, setActivePresetId] = useState<string>('balanced');

  // Selection & Hover
  const [hoveredGpuId, setHoveredGpuId] = useState<string | null>(null);
  const [selectedGpuIds, setSelectedGpuIds] = useState<string[]>(() =>
    safeGetJSON('paretopc_selected_ids', [
      'arc-b580',
      'rx-7800-xt',
      'rtx-4070-super',
    ])
  );
  const [hideTrapsInTable, setHideTrapsInTable] = useState<boolean>(() =>
    safeGetBool('paretopc_hide_traps', false)
  );

  // Persist changes to localStorage
  useEffect(() => {
    safeSetJSON('paretopc_dataset', datasetMode);
  }, [datasetMode]);

  useEffect(() => {
    safeSetJSON('paretopc_ui_mode', uiMode);
  }, [uiMode]);

  useEffect(() => {
    safeSetJSON('paretopc_constraints', constraints);
  }, [constraints]);

  useEffect(() => {
    safeSetJSON('paretopc_pareto_mode', paretoMode);
  }, [paretoMode]);

  useEffect(() => {
    safeSetJSON('paretopc_extrapolation', extrapolation);
  }, [extrapolation]);

  useEffect(() => {
    safeSetJSON('paretopc_weights', weights);
  }, [weights]);

  useEffect(() => {
    safeSetJSON('paretopc_selected_ids', selectedGpuIds);
  }, [selectedGpuIds]);

  useEffect(() => {
    safeSetJSON('paretopc_hide_traps', hideTrapsInTable);
  }, [hideTrapsInTable]);

  // Raw catalog based on datasetMode
  const rawCatalog = useMemo(
    () => (datasetMode === 'real' ? REAL_WORLD_GPUS : PHASE1_SEED_GPUS),
    [datasetMode]
  );

  // Compute Hedonic OLS Regression across the full catalog so fair-value baselines remain anchored
  const olsModel = useMemo(
    () => computeHedonicRegression(rawCatalog),
    [rawCatalog]
  );

  // Stage 1: Hard Constraint Filtering
  const validGpus = useMemo(
    () => filterByHardConstraints(rawCatalog, constraints),
    [rawCatalog, constraints]
  );

  // Stage 2: Active Pareto Objectives
  const activeObjectives = useMemo<MetricKey[]>(
    () =>
      paretoMode === '2d-axes'
        ? Array.from(new Set([xMetric, yMetric]))
        : ALL_METRIC_KEYS,
    [paretoMode, xMetric, yMetric]
  );

  const paretoGpus = useMemo(
    () => evaluateParetoFrontier(validGpus, activeObjectives),
    [validGpus, activeObjectives]
  );

  // Stage 3: TOPSIS Ranking + Attach Phase 2 OLS Valuations
  const rankedGpus = useMemo<RankedGpu[]>(() => {
    const ranked = rankByTopsis(paretoGpus, weights);
    return ranked.map((g) => ({
      ...g,
      valuation: olsModel.valuations[g.id],
    }));
  }, [paretoGpus, weights, olsModel]);

  const normalizedWeights = useMemo(
    () => normalizeWeights(weights),
    [weights]
  );

  const topWinner = useMemo(
    () => rankedGpus.find((g) => g.isParetoOptimal) ?? rankedGpus[0] ?? null,
    [rankedGpus]
  );

  const hoveredGpu = useMemo(
    () => rankedGpus.find((g) => g.id === hoveredGpuId) ?? null,
    [rankedGpus, hoveredGpuId]
  );

  const selectedGpus = useMemo(
    () => rankedGpus.filter((g) => selectedGpuIds.includes(g.id)),
    [rankedGpus, selectedGpuIds]
  );

  const optimalCount = useMemo(
    () => rankedGpus.filter((g) => g.isParetoOptimal).length,
    [rankedGpus]
  );
  const trapCount = useMemo(
    () => rankedGpus.filter((g) => g.isDominated).length,
    [rankedGpus]
  );

  const displayedTableGpus = useMemo(
    () =>
      hideTrapsInTable
        ? rankedGpus.filter((g) => g.isParetoOptimal)
        : rankedGpus,
    [rankedGpus, hideTrapsInTable]
  );

  const handleSwitchDataset = (mode: DatasetMode) => {
    setDatasetMode(mode);
    setHoveredGpuId(null);
    if (mode === 'synthetic') {
      setConstraints({ maxPrice: 1000, minVram: 8, maxWatts: 350 });
      setSelectedGpuIds(['gpu-4', 'gpu-6', 'gpu-7']);
      setExtrapolation((prev) => ({ ...prev, anchorGpuId: 'gpu-6' }));
    } else {
      setConstraints(DEFAULT_CONSTRAINTS_REAL);
      setSelectedGpuIds(['arc-b580', 'rx-7800-xt', 'rtx-4070-super']);
      setExtrapolation((prev) => ({ ...prev, anchorGpuId: 'arc-b580' }));
    }
  };

  const handleApplyPreset = (preset: PresetProfile) => {
    setActivePresetId(preset.id);
    setWeights(preset.weights);
  };

  const handleToggleSelectGpu = (id: string) => {
    setSelectedGpuIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleResetAll = () => {
    setConstraints(
      datasetMode === 'real'
        ? DEFAULT_CONSTRAINTS_REAL
        : { maxPrice: 1000, minVram: 8, maxWatts: 350 }
    );
    setXMetric('price');
    setYMetric('rasterFps1440p');
    setZMetric('vramGb');
    setParetoMode('all-5d');
    setExtrapolation({
      ...DEFAULT_EXTRAPOLATION_CONFIG,
      anchorGpuId: datasetMode === 'real' ? 'arc-b580' : 'gpu-6',
    });
    setWeights(DEFAULT_PREFERENCE_WEIGHTS);
    setActivePresetId('balanced');
  };

  return {
    datasetMode,
    uiMode,
    setUiMode,
    chartView,
    setChartView,
    constraints,
    setConstraints,
    xMetric,
    setXMetric,
    yMetric,
    setYMetric,
    zMetric,
    setZMetric,
    paretoMode,
    setParetoMode,
    extrapolation,
    setExtrapolation,
    weights,
    setWeights,
    activePresetId,
    setActivePresetId,
    hoveredGpuId,
    setHoveredGpuId,
    selectedGpuIds,
    setSelectedGpuIds,
    hideTrapsInTable,
    setHideTrapsInTable,
    rawCatalog,
    validGpus,
    rankedGpus,
    displayedTableGpus,
    normalizedWeights,
    olsModel,
    topWinner,
    hoveredGpu,
    selectedGpus,
    optimalCount,
    trapCount,
    handleSwitchDataset,
    handleApplyPreset,
    handleToggleSelectGpu,
    handleResetAll,
  };
}
