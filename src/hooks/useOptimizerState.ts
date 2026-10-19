import { useEffect, useMemo, useState } from 'react';
import { PHASE1_SEED_GPUS } from '../data/seedGpus';
import { REAL_WORLD_GPUS } from '../data/realGpus';
import {
  GpuCandidate,
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

export type DatasetMode = 'real' | 'custom' | 'synthetic';
export type UiMode = 'simple' | 'explorer' | 'pro';
export type ChartViewMode = '2d' | '3d' | 'hyper' | 'axes' | 'residuals';

export const DEFAULT_CUSTOM_GPUS: GpuCandidate[] = [
  {
    id: 'deal-pichau-rx9060xt',
    name: 'PowerColor Radeon RX 9060 XT 16GB',
    chip: 'RX 9060 XT',
    brand: 'PowerColor',
    vendor: 'AMD',
    store: 'Pichau',
    price: 3899.99,
    priceCash: 3899.99,
    priceInstallment: 4588.22,
    originalPrice: 5176.46,
    currency: 'BRL',
    vramGb: 16,
    rasterFps1440p: 96,
    rtFps1440p: 58,
    tdpWatts: 200,
    isCustom: true,
    notes: 'Pichau · PIX: R$ 3.899,99 | 12x: R$ 4.588,22 (15% off PIX)',
  },
  {
    id: 'deal-pcyes-rx7600xt',
    name: 'AMD Radeon RX 7600 XT 16GB',
    chip: 'RX 7600 XT',
    brand: 'PCYes',
    vendor: 'AMD',
    store: 'PCYes',
    url: 'https://www.pcyes.com.br/placa-de-video-amd-radeon-rx-7600xt-16gb-gddr6-128-bits-projeto-edge-pvr760016gbpedf',
    price: 2944.05,
    priceCash: 2944.05,
    priceInstallment: 3099.0,
    currency: 'BRL',
    vramGb: 16,
    rasterFps1440p: 70,
    rtFps1440p: 37,
    tdpWatts: 190,
    isCustom: true,
    notes: 'PCYes · PIX: R$ 2.944,05 | 10x: R$ 3.099,00 (5% off PIX)',
  },
  {
    id: 'deal-terabyte-gtx1660s',
    name: 'Gamer Ninja GeForce GTX 1660 Super 6GB',
    chip: 'GTX 1660 Super',
    brand: 'Gamer Ninja',
    vendor: 'NVIDIA',
    store: 'TerabyteShop',
    url: 'https://www.terabyteshop.com.br/hardware/placas-de-video',
    price: 1389.99,
    priceCash: 1389.99,
    priceInstallment: 1635.28,
    originalPrice: 1449.99,
    currency: 'BRL',
    vramGb: 6,
    rasterFps1440p: 34,
    rtFps1440p: 0,
    tdpWatts: 125,
    isCustom: true,
    notes: 'TerabyteShop · PIX: R$ 1.389,99 | 12x: R$ 1.635,28 (15% off PIX)',
  },
  {
    id: 'deal-kabum-rtx5060',
    name: 'Palit GeForce RTX 5060 8GB',
    chip: 'RTX 5060',
    brand: 'Palit',
    vendor: 'NVIDIA',
    store: 'KaBuM!',
    price: 2499.0,
    priceCash: 2499.0,
    priceInstallment: 2899.0,
    currency: 'BRL',
    vramGb: 8,
    rasterFps1440p: 82,
    rtFps1440p: 60,
    tdpWatts: 130,
    isCustom: true,
    notes: 'KaBuM! · Blackwell Architecture DLSS 4 Support',
  },
];

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
  selectedVendors: [],
  selectedArchitectures: [],
  requiredFeatures: [],
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

  // Dataset switcher: defaults to 'real' (18 real-world GPUs), 'custom' (My Deals), or 'synthetic' (Phase 1 seed)
  const [datasetMode, setDatasetMode] = useState<DatasetMode>(() => {
    const saved = safeGetString('paretopc_dataset', 'real');
    if (saved === 'custom' || saved === 'synthetic') return saved;
    return 'real';
  });

  // User Custom Deals Database (Stored safely in localStorage)
  const [customGpus, setCustomGpus] = useState<GpuCandidate[]>(() =>
    safeGetJSON('paretopc_custom_gpus', DEFAULT_CUSTOM_GPUS),
  );
  const [isDealImporterOpen, setIsDealImporterOpen] = useState<boolean>(false);

  // 3 Proportional UI Complexity Modes: 'simple' (Level 1) | 'explorer' (Level 2) | 'pro' (Level 3)
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const saved = safeGetString('paretopc_ui_mode', 'simple');
    if (saved === 'pro' || saved === 'explorer') return saved;
    return 'simple';
  });

  // Chart View Mode: '2d' (Pareto Scatter), '3d' (3D Cube Cloud), 'residuals' (OLS Fair Value)
  const [chartView, setChartView] = useState<ChartViewMode>('2d');

  // Stage 1: Hard Constraints
  const [constraints, setConstraints] = useState<HardConstraints>(() => ({
    ...DEFAULT_CONSTRAINTS_REAL,
    ...safeGetJSON('paretopc_constraints', DEFAULT_CONSTRAINTS_REAL),
  }));

  // Stage 2: Axes & Pareto Mode
  const [xMetric, setXMetric] = useState<MetricKey>('price');
  const [yMetric, setYMetric] = useState<MetricKey>('rasterFps1440p');
  const [zMetric, setZMetric] = useState<MetricKey>('vramGb');
  const [paretoMode, setParetoMode] = useState<'2d-axes' | 'all-5d'>(() => {
    const saved = safeGetString('paretopc_pareto_mode', 'all-5d');
    return saved === '2d-axes' ? '2d-axes' : 'all-5d';
  });

  // Linear & Non-Linear Value Extrapolation Tool
  const [extrapolation, setExtrapolation] = useState<ExtrapolationConfig>(
    () => ({
      ...DEFAULT_EXTRAPOLATION_CONFIG,
      ...safeGetJSON('paretopc_extrapolation', DEFAULT_EXTRAPOLATION_CONFIG),
    }),
  );

  // Stage 3: TOPSIS Weights
  const [weights, setWeights] = useState<PreferenceWeights>(() =>
    safeGetJSON('paretopc_weights', DEFAULT_PREFERENCE_WEIGHTS),
  );
  const [activePresetId, setActivePresetId] = useState<string>('balanced');

  // Selection & Hover
  const [hoveredGpuId, setHoveredGpuId] = useState<string | null>(null);
  const [selectedGpuIds, setSelectedGpuIds] = useState<string[]>(() =>
    safeGetJSON('paretopc_selected_ids', [
      'arc-b580',
      'rx-7800-xt',
      'rtx-4070-super',
    ]),
  );
  const [hideTrapsInTable, setHideTrapsInTable] = useState<boolean>(() =>
    safeGetBool('paretopc_hide_traps', false),
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

  useEffect(() => {
    safeSetJSON('paretopc_custom_gpus', customGpus);
  }, [customGpus]);

  // Raw catalog based on datasetMode
  const rawCatalog = useMemo(() => {
    if (datasetMode === 'custom') {
      return customGpus.length > 0 ? customGpus : DEFAULT_CUSTOM_GPUS;
    }
    return datasetMode === 'real' ? REAL_WORLD_GPUS : PHASE1_SEED_GPUS;
  }, [datasetMode, customGpus]);

  // Detected active currency ('BRL' or 'USD')
  const activeCurrency = useMemo<'USD' | 'BRL'>(() => {
    if (
      datasetMode === 'custom' &&
      rawCatalog.some((g) => g.currency === 'BRL')
    ) {
      return 'BRL';
    }
    return 'USD';
  }, [datasetMode, rawCatalog]);

  // Compute Hedonic OLS Regression across the full catalog so fair-value baselines remain anchored
  const olsModel = useMemo(
    () => computeHedonicRegression(rawCatalog),
    [rawCatalog],
  );

  // Stage 1: Hard Constraint Filtering
  const validGpus = useMemo(
    () => filterByHardConstraints(rawCatalog, constraints),
    [rawCatalog, constraints],
  );

  // Stage 2: Active Pareto Objectives
  const activeObjectives = useMemo<MetricKey[]>(
    () =>
      paretoMode === '2d-axes'
        ? Array.from(new Set([xMetric, yMetric]))
        : ALL_METRIC_KEYS,
    [paretoMode, xMetric, yMetric],
  );

  const paretoGpus = useMemo(
    () => evaluateParetoFrontier(validGpus, activeObjectives),
    [validGpus, activeObjectives],
  );

  // Stage 3: TOPSIS Ranking + Attach Phase 2 OLS Valuations
  const rankedGpus = useMemo<RankedGpu[]>(() => {
    const ranked = rankByTopsis(paretoGpus, weights);
    return ranked.map((g) => ({
      ...g,
      valuation: olsModel.valuations[g.id],
    }));
  }, [paretoGpus, weights, olsModel]);

  const normalizedWeights = useMemo(() => normalizeWeights(weights), [weights]);

  const topWinner = useMemo(
    () => rankedGpus.find((g) => g.isParetoOptimal) ?? rankedGpus[0] ?? null,
    [rankedGpus],
  );

  const hoveredGpu = useMemo(
    () => rankedGpus.find((g) => g.id === hoveredGpuId) ?? null,
    [rankedGpus, hoveredGpuId],
  );

  const selectedGpus = useMemo(
    () => rankedGpus.filter((g) => selectedGpuIds.includes(g.id)),
    [rankedGpus, selectedGpuIds],
  );

  const optimalCount = useMemo(
    () => rankedGpus.filter((g) => g.isParetoOptimal).length,
    [rankedGpus],
  );
  const trapCount = useMemo(
    () => rankedGpus.filter((g) => g.isDominated).length,
    [rankedGpus],
  );

  const displayedTableGpus = useMemo(
    () =>
      hideTrapsInTable
        ? rankedGpus.filter((g) => g.isParetoOptimal)
        : rankedGpus,
    [rankedGpus, hideTrapsInTable],
  );

  const handleSwitchDataset = (mode: DatasetMode) => {
    setDatasetMode(mode);
    setHoveredGpuId(null);
    if (mode === 'synthetic') {
      setConstraints({
        maxPrice: 1000,
        minVram: 8,
        maxWatts: 350,
        selectedVendors: [],
        selectedArchitectures: [],
        requiredFeatures: [],
      });
      setSelectedGpuIds(['gpu-4', 'gpu-6', 'gpu-7']);
      setExtrapolation((prev) => ({ ...prev, anchorGpuId: 'gpu-6' }));
    } else if (mode === 'custom') {
      const maxCustomPrice = Math.max(
        6000,
        ...(customGpus.length ? customGpus.map((g) => g.price) : [6000]),
      );
      setConstraints({
        maxPrice: maxCustomPrice,
        minVram: 6,
        maxWatts: 450,
        selectedVendors: [],
        selectedArchitectures: [],
        requiredFeatures: [],
      });
      if (customGpus.length > 0) {
        setSelectedGpuIds(customGpus.slice(0, 3).map((g) => g.id));
        setExtrapolation((prev) => ({
          ...prev,
          anchorGpuId: customGpus[0].id,
        }));
      }
    } else {
      setConstraints(DEFAULT_CONSTRAINTS_REAL);
      setSelectedGpuIds(['arc-b580', 'rx-7800-xt', 'rtx-4070-super']);
      setExtrapolation((prev) => ({ ...prev, anchorGpuId: 'arc-b580' }));
    }
  };

  const addCustomGpus = (newGpus: GpuCandidate[]) => {
    setCustomGpus((prev) => {
      const existingIds = new Set(prev.map((g) => g.id));
      const filtered = newGpus.filter((g) => !existingIds.has(g.id));
      return [...filtered, ...prev];
    });
    setDatasetMode('custom');
    const maxCustomPrice = Math.max(
      6000,
      ...newGpus.map((g) => g.price),
      ...(customGpus.length ? customGpus.map((g) => g.price) : [6000]),
    );
    setConstraints((prev) => ({
      ...prev,
      maxPrice: Math.max(prev.maxPrice, maxCustomPrice),
    }));
  };

  const updateCustomGpu = (updatedGpu: GpuCandidate) => {
    setCustomGpus((prev) =>
      prev.map((g) => (g.id === updatedGpu.id ? updatedGpu : g)),
    );
  };

  const removeCustomGpu = (id: string) => {
    setCustomGpus((prev) => prev.filter((g) => g.id !== id));
    setSelectedGpuIds((prev) => prev.filter((i) => i !== id));
  };

  const clearCustomGpus = () => {
    setCustomGpus([]);
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
      datasetMode === 'custom'
        ? {
            maxPrice: Math.max(
              6000,
              ...(customGpus.length ? customGpus.map((g) => g.price) : [6000]),
            ),
            minVram: 6,
            maxWatts: 450,
            selectedVendors: [],
            selectedArchitectures: [],
            requiredFeatures: [],
          }
        : datasetMode === 'real'
          ? DEFAULT_CONSTRAINTS_REAL
          : {
              maxPrice: 1000,
              minVram: 8,
              maxWatts: 350,
              selectedVendors: [],
              selectedArchitectures: [],
              requiredFeatures: [],
            },
    );
    setXMetric('price');
    setYMetric('rasterFps1440p');
    setZMetric('vramGb');
    setParetoMode('all-5d');
    setExtrapolation({
      ...DEFAULT_EXTRAPOLATION_CONFIG,
      anchorGpuId:
        datasetMode === 'custom' && customGpus.length > 0
          ? customGpus[0].id
          : datasetMode === 'real'
            ? 'arc-b580'
            : 'gpu-6',
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
    customGpus,
    addCustomGpus,
    updateCustomGpu,
    removeCustomGpu,
    clearCustomGpus,
    isDealImporterOpen,
    setIsDealImporterOpen,
    activeCurrency,
  };
}
