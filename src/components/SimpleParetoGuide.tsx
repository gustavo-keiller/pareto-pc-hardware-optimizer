import { useMemo, useState, useEffect } from 'react';
import {
  GpuCandidate,
  HardConstraints,
  METRIC_DEFINITIONS,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
  isMetricKey,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { evaluateParetoFrontier } from '../lib/math/pareto';
import {
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Compass,
  Sliders,
  EyeOff,
  Eye,
  Layers,
  DollarSign,
  CheckCircle2,
  Check,
  RotateCcw,
  Cpu,
} from 'lucide-react';

import { MiniWeightBar, SkewedStatBar } from './SimpleGuideWidgets';
import {
  BeginnerIntakeCard,
  BeginnerGoal,
  BeginnerUseCase,
} from './BeginnerIntakeCard';
import { SimpleGuidePickHero } from './SimpleGuidePickHero';
import { FullBuildPickHero } from './FullBuildPickHero';
import { SimpleGuideScatterPlot, StoryStep } from './SimpleGuideScatterPlot';
import { optimizeFullSystemBuilds } from '../lib/math/combinatorial';
import {
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
} from '../data/seedComponents';

interface SimpleParetoGuideProps {
  gpus: RankedGpu[];
  rawCatalog?: GpuCandidate[];
  currency?: 'USD' | 'BRL';
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints,
  ) => void;
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  onSelectXMetric: (m: MetricKey) => void;
  onSelectYMetric: (m: MetricKey) => void;
  onSelectZMetric: (m: MetricKey) => void;
  weights: PreferenceWeights;
  onChangeWeights: (
    updater: (prev: PreferenceWeights) => PreferenceWeights,
  ) => void;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  onSwitchToExplorer: () => void;
  onSwitchTo3D: () => void;
  onSwitchToHyper: () => void;
  onSwitchToBuilds?: () => void;
  maxBudgetBound: number;
}

/** Clamps any number into a valid StoryStep (1..5). */
function toStoryStep(n: number): StoryStep {
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : 5;
}

/**
 * Normalize a metric value into [0.05, 1.0] utility where 1.0 is Always Better
 * (respecting METRIC_DEFINITIONS[m].direction).
 */
function computeDirectionalUtility(
  gpu: RankedGpu,
  metric: MetricKey,
  minVal: number,
  maxVal: number,
): number {
  const dir = METRIC_DEFINITIONS[metric].direction;
  const val = gpu[metric];
  const span = maxVal - minVal;
  if (span <= 1e-9) return 1.0;
  const raw = dir === 'min' ? (maxVal - val) / span : (val - minVal) / span;
  return 0.05 + 0.95 * Math.max(0, Math.min(1, raw));
}

export function SimpleParetoGuide({
  gpus,
  rawCatalog,
  currency = 'USD',
  constraints,
  onChangeConstraints,
  xMetric,
  yMetric,
  zMetric,
  onSelectXMetric,
  onSelectYMetric,
  onSelectZMetric,
  onChangeWeights,
  selectedGpuIds,
  onToggleSelectGpu,
  onSwitchToExplorer,
  onSwitchTo3D,
  onSwitchToHyper,
  onSwitchToBuilds,
  maxBudgetBound,
}: SimpleParetoGuideProps) {
  // Beginner Intake Flow State (UX-01 & UX-11)
  const [beginnerGoal, setBeginnerGoal] = useState<BeginnerGoal>('gpu');
  const [beginnerUseCase, setBeginnerUseCase] =
    useState<BeginnerUseCase>('sweetspot-1440p');
  const [showDeepMath, setShowDeepMath] = useState<boolean>(false);

  // Step 1 -> 5 walkthrough (shows 1 step at a time until Step 5 unlocks all 5 steps)
  const [activeStep, setActiveStep] = useState<StoryStep>(1);
  const [unlockedAllSteps, setUnlockedAllSteps] = useState<boolean>(false);
  const [focusStep5Only, setFocusStep5Only] = useState<boolean>(false);

  // Handlers for Beginner Intake
  const handleSelectUseCase = (uc: BeginnerUseCase) => {
    setBeginnerUseCase(uc);
    if (uc === 'esports-1080p') {
      onSelectXMetric('price');
      onSelectYMetric('rasterFps1440p');
      onSelectZMetric('tdpWatts');
      onChangeWeights(() => ({
        price: 40,
        rasterFps1440p: 50,
        rtFps1440p: 5,
        vramGb: 5,
        tdpWatts: 0,
      }));
    } else if (uc === 'sweetspot-1440p') {
      onSelectXMetric('price');
      onSelectYMetric('rasterFps1440p');
      onSelectZMetric('vramGb');
      onChangeWeights(() => ({
        price: 30,
        rasterFps1440p: 40,
        vramGb: 25,
        rtFps1440p: 5,
        tdpWatts: 0,
      }));
    } else if (uc === 'enthusiast-4k') {
      onSelectXMetric('price');
      onSelectYMetric('rtFps1440p');
      onSelectZMetric('vramGb');
      onChangeWeights(() => ({
        price: 15,
        rtFps1440p: 40,
        rasterFps1440p: 25,
        vramGb: 20,
        tdpWatts: 0,
      }));
    } else if (uc === 'creator-ai') {
      onSelectXMetric('price');
      onSelectYMetric('vramGb');
      onSelectZMetric('rtFps1440p');
      onChangeWeights(() => ({
        price: 20,
        vramGb: 45,
        rtFps1440p: 20,
        rasterFps1440p: 15,
        tdpWatts: 0,
      }));
    }
  };

  const handleSelectBudget = (amount: number) => {
    onChangeConstraints((prev) => ({
      ...prev,
      maxPrice: amount,
    }));
  };

  // Automatically unlock all steps once the user reaches Step 5
  useEffect(() => {
    if (activeStep === 5 && !unlockedAllSteps) {
      setUnlockedAllSteps(true);
    }
  }, [activeStep, unlockedAllSteps]);

  // When unlocked (or activeStep is 5), all 5 steps are displayed unless explicitly focusing on Step 5 only
  const showAllSteps =
    (unlockedAllSteps || activeStep === 5) && !focusStep5Only;
  const [useThreeVars, setUseThreeVars] = useState<boolean>(false);

  // 2-variable tug-of-war slider (alpha = share of Variable 2, 1-alpha = share of Variable 1)
  const [twoVarAlpha, setTwoVarAlpha] = useState<number>(0.5);

  // 3-variable dual-handle split bar (x1 and x2 in [0.05, 0.95], just like Mayerowitz's `hu` component)
  const [splitX1, setSplitX1] = useState<number>(0.4);
  const [splitX2, setSplitX2] = useState<number>(0.75);

  // Selected trap index for Step 3 (Bad deal / Value trap spotlight)
  const [trapSpotlightIdx, setTrapSpotlightIdx] = useState<number>(0);
  const [onlyFrontier, setOnlyFrontier] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];
  const zDef = METRIC_DEFINITIONS[zMetric];

  // Evaluate strict 2D Pareto dominance on the currently chosen (xMetric, yMetric)
  // (or 3D when useThreeVars is active in Step 5)
  const activeObjectives = useMemo<MetricKey[]>(() => {
    if (useThreeVars && activeStep === 5) {
      return Array.from(new Set([xMetric, yMetric, zMetric]));
    }
    return Array.from(new Set([xMetric, yMetric]));
  }, [xMetric, yMetric, zMetric, useThreeVars, activeStep]);

  const pareto2DMap = useMemo(() => {
    const res = evaluateParetoFrontier(gpus, [xMetric, yMetric]);
    return new Map(res.map((r) => [r.id, r]));
  }, [gpus, xMetric, yMetric]);

  const paretoActiveMap = useMemo(() => {
    const res = evaluateParetoFrontier(gpus, activeObjectives);
    return new Map(res.map((r) => [r.id, r]));
  }, [gpus, activeObjectives]);

  // Separate 2D frontier GPUs vs 2D dominated traps
  const frontier2DGpus = useMemo(
    () => gpus.filter((g) => pareto2DMap.get(g.id)?.isParetoOptimal),
    [gpus, pareto2DMap],
  );

  const dominated2DGpus = useMemo(
    () => gpus.filter((g) => !pareto2DMap.get(g.id)?.isParetoOptimal),
    [gpus, pareto2DMap],
  );

  // Step 1 Leader: Best GPU on yMetric alone
  const step1Leader = useMemo(() => {
    if (gpus.length === 0) return null;
    const sorted = [...gpus].sort((a, b) =>
      yDef.direction === 'min'
        ? a[yMetric] - b[yMetric]
        : b[yMetric] - a[yMetric],
    );
    return sorted[0];
  }, [gpus, yMetric, yDef.direction]);

  // Step 3 Bad Deal / Value Trap Spotlight
  const spotlightTrap = useMemo(() => {
    if (dominated2DGpus.length === 0) return null;
    const safeIdx = trapSpotlightIdx % dominated2DGpus.length;
    return dominated2DGpus[safeIdx];
  }, [dominated2DGpus, trapSpotlightIdx]);

  // Dominators that strictly beat the spotlighted trap in 2D
  const spotlightDominators = useMemo(() => {
    if (!spotlightTrap) return [];
    const domIds = pareto2DMap.get(spotlightTrap.id)?.dominatedBy ?? [];
    const gpuById = new Map(gpus.map((g) => [g.id, g]));
    return domIds
      .map((id) => gpuById.get(id))
      .filter((g): g is RankedGpu => g !== undefined);
  }, [spotlightTrap, pareto2DMap, gpus]);

  // Compute priority shares (w1, w2, w3) summing to 1.0
  const priorityShares = useMemo(() => {
    if (!useThreeVars) {
      const w1 = 1 - twoVarAlpha;
      const w2 = twoVarAlpha;
      return { w1, w2, w3: 0 };
    }
    const w1 = Math.max(0.02, splitX1);
    const w2 = Math.max(0.02, splitX2 - splitX1);
    const w3 = Math.max(0.02, 1 - splitX2);
    const sum = w1 + w2 + w3;
    return { w1: w1 / sum, w2: w2 / sum, w3: w3 / sum };
  }, [useThreeVars, twoVarAlpha, splitX1, splitX2]);

  // Sync priority shares back to global TOPSIS weights when adjusted
  const syncGlobalWeights = (w1: number, w2: number, w3: number) => {
    onChangeWeights(() => {
      const next: PreferenceWeights = {
        price: 0,
        rasterFps1440p: 0,
        rtFps1440p: 0,
        vramGb: 0,
        tdpWatts: 0,
      };
      next[xMetric] = Math.round(w1 * 100);
      next[yMetric] = Math.round((next[yMetric] ?? 0) + w2 * 100);
      if (useThreeVars) {
        next[zMetric] = Math.round((next[zMetric] ?? 0) + w3 * 100);
      }
      return next;
    });
  };

  // Metric bounds across valid GPUs
  const bounds = useMemo(() => {
    const calc = (m: MetricKey) => {
      if (gpus.length === 0) return { min: 0, max: 100 };
      const vals = gpus.map((g) => g[m]);
      return { min: Math.min(...vals), max: Math.max(...vals) };
    };
    return {
      x: calc(xMetric),
      y: calc(yMetric),
      z: calc(zMetric),
      price: calc('price'),
      fps: calc('rasterFps1440p'),
    };
  }, [gpus, xMetric, yMetric, zMetric]);

  // Compute Cobb-Douglas log utility (exact formula from Mayerowitz's `zf` and `mu` functions!)
  // u(gpu) = w1 * ln(u_x) + w2 * ln(u_y) + w3 * ln(u_z)
  // Restricted to Pareto-optimal candidates on the active objectives so dominated traps never win!
  const rankedFrontierChoices = useMemo(() => {
    const candidates = gpus.filter(
      (g) =>
        paretoActiveMap.get(g.id)?.isParetoOptimal &&
        !g.name.includes('[TRAP]'),
    );
    const pool =
      candidates.length > 0
        ? candidates
        : gpus.filter((g) => !g.name.includes('[TRAP]'));

    const scored = pool.map((gpu) => {
      const ux = computeDirectionalUtility(
        gpu,
        xMetric,
        bounds.x.min,
        bounds.x.max,
      );
      const uy = computeDirectionalUtility(
        gpu,
        yMetric,
        bounds.y.min,
        bounds.y.max,
      );
      const uz = computeDirectionalUtility(
        gpu,
        zMetric,
        bounds.z.min,
        bounds.z.max,
      );

      const logUtility = useThreeVars
        ? priorityShares.w1 * Math.log(ux) +
          priorityShares.w2 * Math.log(uy) +
          priorityShares.w3 * Math.log(uz)
        : priorityShares.w1 * Math.log(ux) + priorityShares.w2 * Math.log(uy);

      // Convert logUtility back to a 0-100% geometric match score
      const matchPct = Math.exp(logUtility) * 100;

      return {
        gpu,
        ux,
        uy,
        uz,
        logUtility,
        matchPct,
      };
    });

    scored.sort((a, b) => b.logUtility - a.logUtility);
    return scored;
  }, [
    gpus,
    paretoActiveMap,
    xMetric,
    yMetric,
    zMetric,
    bounds,
    useThreeVars,
    priorityShares,
  ]);

  const bestChoice = rankedFrontierChoices[0] ?? null;
  const topThreeChoices = rankedFrontierChoices.slice(0, 3);

  // Top pick + Step-Down & Step-Up alternatives for SimpleGuidePickHero (UX-01)
  const { topPick, stepDownAlt, stepUpAlt } = useMemo(() => {
    if (!bestChoice) {
      return { topPick: null, stepDownAlt: null, stepUpAlt: null };
    }
    const currentGpu = bestChoice.gpu;
    const cheaper = rankedFrontierChoices
      .map((c) => c.gpu)
      .filter((g) => g.id !== currentGpu.id && g.price < currentGpu.price)
      .sort((a, b) => b.price - a.price);
    const upgrade = rankedFrontierChoices
      .map((c) => c.gpu)
      .filter(
        (g) =>
          g.id !== currentGpu.id &&
          (g.rasterFps1440p > currentGpu.rasterFps1440p ||
            g.price > currentGpu.price),
      )
      .sort((a, b) => a.price - b.price);

    const otherChoices = rankedFrontierChoices
      .map((c) => c.gpu)
      .filter((g) => g.id !== currentGpu.id);

    const stepDown = cheaper[0] ?? otherChoices[0] ?? null;
    const stepUp =
      upgrade[0] ??
      otherChoices.find((g) => g.id !== stepDown?.id) ??
      otherChoices[1] ??
      null;

    return {
      topPick: currentGpu,
      stepDownAlt: stepDown,
      stepUpAlt: stepUp,
    };
  }, [bestChoice, rankedFrontierChoices]);

  // Combinatorial PC build optimization for Whole PC Goal (UX-11)
  const pcBuildsResult = useMemo(() => {
    const catalog = rawCatalog ?? gpus;
    return optimizeFullSystemBuilds(
      {
        cpus: SEED_CPUS,
        gpus: catalog,
        motherboards: SEED_MOTHERBOARDS,
        ramKits: SEED_RAM_KITS,
        psus: SEED_PSUS,
      },
      { maxBudget: constraints.maxPrice },
    );
  }, [rawCatalog, gpus, constraints.maxPrice]);

  const { topBuild, stepDownBuild, stepUpBuild } = useMemo(() => {
    const { optimalBuilds } = pcBuildsResult;
    if (optimalBuilds.length === 0) {
      return { topBuild: null, stepDownBuild: null, stepUpBuild: null };
    }
    const underBudget = optimalBuilds.filter(
      (b) => b.totalPrice <= constraints.maxPrice,
    );
    const top =
      underBudget.length > 0
        ? underBudget[underBudget.length - 1]
        : optimalBuilds[0];
    const topIdx = optimalBuilds.findIndex((b) => b.id === top.id);
    const stepDown = topIdx > 0 ? optimalBuilds[topIdx - 1] : null;
    const stepUp =
      topIdx >= 0 && topIdx < optimalBuilds.length - 1
        ? optimalBuilds[topIdx + 1]
        : null;

    return { topBuild: top, stepDownBuild: stepDown, stepUpBuild: stepUp };
  }, [pcBuildsResult, constraints.maxPrice]);

  // SVG Chart Geometry (Bottom-Left = Base Better, Top-Right = Y Better)
  const svgW = 680;
  const svgH = 400;
  const padL = 64;
  const padR = 36;
  const padT = 34;
  const padB = 52;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  // Map metric value to screen X (left = better when xMetric is Price, or standard min->max)
  // Wait: earlier the user asked for Base (Money) on the Bottom-Left!
  // So X goes from min (left) to max (right), and Y goes from min (bottom) to max (top).
  const toScreenX = (val: number) => {
    const span = bounds.x.max - bounds.x.min || 1;
    const t = (val - bounds.x.min) / span;
    return padL + t * plotW;
  };

  const toScreenY = (val: number) => {
    const span = bounds.y.max - bounds.y.min || 1;
    const t = (val - bounds.y.min) / span;
    return padT + plotH - t * plotH;
  };

  // Build 2D Pareto Frontier Staircase SVG path
  const frontierStaircasePath = useMemo(() => {
    if (frontier2DGpus.length === 0) return '';
    const sorted = [...frontier2DGpus].sort((a, b) => a[xMetric] - b[xMetric]);
    const pts: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const sx = toScreenX(sorted[i][xMetric]);
      const sy = toScreenY(sorted[i][yMetric]);
      if (i === 0) {
        pts.push(`M ${sx.toFixed(1)} ${sy.toFixed(1)}`);
      } else {
        // Horizontal then vertical step
        pts.push(
          `L ${sx.toFixed(1)} ${toScreenY(sorted[i - 1][yMetric]).toFixed(1)}`,
        );
        pts.push(`L ${sx.toFixed(1)} ${sy.toFixed(1)}`);
      }
    }
    return pts.join(' ');
  }, [frontier2DGpus, xMetric, yMetric, bounds]);

  // Build Mayerowitz's Iso-Utility Curve (`#isoutility`) passing through `bestChoice`!
  // w1 * ln(ux) + w2 * ln(uy) = U*  =>  uy(x) = exp((U* - w1 * ln(ux)) / w2)
  const isoUtilityPath = useMemo(() => {
    if (!bestChoice || activeStep !== 5) return '';
    const w1 = Math.max(0.05, priorityShares.w1);
    const w2 = Math.max(0.05, priorityShares.w2);
    const uStar = w1 * Math.log(bestChoice.ux) + w2 * Math.log(bestChoice.uy);

    const xSpan = bounds.x.max - bounds.x.min || 1;
    const ySpan = bounds.y.max - bounds.y.min || 1;

    const pathSegments: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const xVal = bounds.x.min + t * xSpan;
      // ux from xVal
      const rawUx =
        xDef.direction === 'min'
          ? (bounds.x.max - xVal) / xSpan
          : (xVal - bounds.x.min) / xSpan;
      const ux = 0.05 + 0.95 * Math.max(0, Math.min(1, rawUx));

      const reqUy = Math.exp((uStar - w1 * Math.log(ux)) / w2);
      const rawUy = (reqUy - 0.05) / 0.95;
      if (rawUy < -0.05 || rawUy > 1.08) continue;

      const yVal =
        yDef.direction === 'min'
          ? bounds.y.max - rawUy * ySpan
          : bounds.y.min + rawUy * ySpan;

      const sx = toScreenX(xVal);
      const sy = toScreenY(yVal);
      if (sy < padT - 10 || sy > padT + plotH + 10) continue;

      pathSegments.push(
        `${pathSegments.length === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`,
      );
    }
    return pathSegments.join(' ');
  }, [
    bestChoice,
    activeStep,
    priorityShares,
    bounds,
    xDef.direction,
    yDef.direction,
  ]);

  return (
    <div className="space-y-6">
      {/* 3-Question Intake Flow (UX-01 & UX-11) */}
      <BeginnerIntakeCard
        goal={beginnerGoal}
        useCase={beginnerUseCase}
        budget={constraints.maxPrice}
        currency={currency}
        maxBudgetBound={maxBudgetBound}
        onSelectGoal={setBeginnerGoal}
        onSelectUseCase={handleSelectUseCase}
        onSelectBudget={handleSelectBudget}
      />

      {/* Immediate Answer Above the Fold (UX-01 & UX-11) */}
      {beginnerGoal === 'gpu' ? (
        <SimpleGuidePickHero
          topPick={topPick}
          stepDownAlt={stepDownAlt}
          stepUpAlt={stepUpAlt}
          currency={currency}
          selectedGpuIds={selectedGpuIds}
          onToggleSelectGpu={onToggleSelectGpu}
          onOpenAccordion={() => setShowDeepMath(true)}
        />
      ) : (
        <FullBuildPickHero
          topBuild={topBuild}
          stepDownBuild={stepDownBuild}
          stepUpBuild={stepUpBuild}
          currency={currency}
          onSwitchToBuilds={() => {
            if (onSwitchToBuilds) onSwitchToBuilds();
            else onSwitchToExplorer();
          }}
        />
      )}

      {/* Expandable Accordion: 5-Step Math Guide & 2D Frontier Graphic */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl">
        <button
          type="button"
          onClick={() => setShowDeepMath((prev) => !prev)}
          className="flex w-full items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                Want to see the math? 5-Step Pareto Value Guide &amp;
                Interactive Graph
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore why certain cards are value traps, inspect the 2D
                frontier curve, and adjust fine-grained priority weights.
              </p>
            </div>
          </div>
          <span className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 group-hover:bg-slate-700 transition">
            {showDeepMath ? 'Hide Math Walkthrough ▲' : 'Explore Math Guide ▼'}
          </span>
        </button>

        {showDeepMath && (
          <div className="mt-6 border-t border-slate-800/80 pt-6 space-y-6">
            {/* Top Interactive Story Stepper Bar */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-500/10 p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-950">
                      <Award className="h-3.5 w-3.5" />
                      Smart Hardware Buyer Guide
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Spot Great Deals &amp; Filter Out Overpriced Hardware
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    New to PC building? Follow Steps 1 to 4 to see how
                    economists and smart buyers eliminate overpriced hardware
                    traps, or use{' '}
                    <strong className="text-amber-300">
                      Step 5 (Priority Matcher)
                    </strong>{' '}
                    to set your priorities and get your top value
                    recommendations.
                  </p>
                </div>

                {/* 5 Step Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { step: 1, label: '1. One Spec' },
                      { step: 2, label: '2. Trade-Offs' },
                      { step: 3, label: '3. Avoid Bad Deals' },
                      { step: 4, label: '4. Value Frontier' },
                      { step: 5, label: '5. Priorities & Top Picks' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => {
                        setActiveStep(item.step);
                        if (item.step === 5) setUnlockedAllSteps(true);
                        if (item.step !== 4) setOnlyFrontier(false);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                        activeStep === item.step
                          ? item.step === 5
                            ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.step === 5 && <Award className="h-3 w-3 inline" />}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main 2-Column Layout: Left = Conversational Interactive Cards, Right = Live Graphic + Top Value Recommendations */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN (5 cols): Interactive Story & Priority Controls */}
              <div className="space-y-4 lg:col-span-5">
                {/* Quick Wallet Budget Filter (Always accessible so budget buyers never get $1000 picks) */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-lg">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1.5 font-bold text-slate-200">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      Maximum Budget Limit:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      Up to ${constraints.maxPrice}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[350, 550, 800, 1100, maxBudgetBound].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() =>
                          onChangeConstraints((prev) => ({
                            ...prev,
                            maxPrice: cap,
                          }))
                        }
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                          constraints.maxPrice === cap
                            ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cap === maxBudgetBound ? `All ($${cap})` : `≤ $${cap}`}
                      </button>
                    ))}
                  </div>

                  {/* Quick Brand Filter */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 font-bold text-slate-200">
                        <Cpu className="h-3.5 w-3.5 text-sky-400" />
                        GPU Brand:
                      </span>
                      {constraints.selectedVendors &&
                        constraints.selectedVendors.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeConstraints((prev) => ({
                                ...prev,
                                selectedVendors: [],
                              }))
                            }
                            className="text-[10px] text-amber-400 hover:underline"
                          >
                            Clear (Show All)
                          </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['ALL', 'NVIDIA', 'AMD', 'Intel'] as const).map((v) => {
                        const isAll = v === 'ALL';
                        const active = isAll
                          ? !constraints.selectedVendors ||
                            constraints.selectedVendors.length === 0
                          : constraints.selectedVendors?.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              onChangeConstraints((prev) => {
                                if (isAll)
                                  return { ...prev, selectedVendors: [] };
                                const current = prev.selectedVendors ?? [];
                                const next = current.includes(v)
                                  ? current.filter((x) => x !== v)
                                  : [...current, v];
                                return { ...prev, selectedVendors: next };
                              })
                            }
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                              active
                                ? v === 'NVIDIA'
                                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                                  : v === 'AMD'
                                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                                    : v === 'Intel'
                                      ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                                      : 'border-amber-400 bg-amber-400 text-slate-950 shadow-sm'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {v === 'ALL' ? 'All Brands' : v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Walkthrough Progress Banner (When in 1-by-1 walkthrough mode) */}
                {!showAllSteps && !focusStep5Only && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        Walkthrough:
                      </span>
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[11px] font-extrabold text-amber-300">
                        Step {activeStep} of 5
                      </span>
                    </div>
                    {/* 5 mini dots/pills showing progress */}
                    <div className="flex items-center gap-1.5">
                      {([1, 2, 3, 4, 5] as const).map((stepNum) => (
                        <button
                          key={stepNum}
                          type="button"
                          onClick={() => {
                            setActiveStep(stepNum);
                            if (stepNum === 5) setUnlockedAllSteps(true);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            activeStep === stepNum
                              ? 'w-6 bg-amber-400'
                              : activeStep > stepNum
                                ? 'w-2 bg-emerald-400/80'
                                : 'w-2 bg-slate-700'
                          }`}
                          title={`Go to Step ${stepNum}`}
                          aria-label={`Go to Step ${stepNum}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Steps Unlocked Banner (When all 5 steps are available) */}
                {showAllSteps && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2.5 shadow-md">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-200">
                        All 5 Steps Available
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        — Walkthrough completed
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setFocusStep5Only(true)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition"
                      >
                        Focus Step 5 Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnlockedAllSteps(false);
                          setFocusStep5Only(false);
                          setActiveStep(1);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
                        title="Restart step-by-step walkthrough"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restart
                      </button>
                    </div>
                  </div>
                )}

                {/* Focused on Step 5 Banner (When user chose to focus on Step 5 only) */}
                {focusStep5Only && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 shadow-md">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-200">
                        Step 5 Focused View
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        (Priority Controls &amp; Top Picks)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setFocusStep5Only(false)}
                        className="rounded-lg border border-amber-400/50 bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/30 transition"
                      >
                        Show All 5 Steps
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnlockedAllSteps(false);
                          setFocusStep5Only(false);
                          setActiveStep(1);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
                        title="Restart step-by-step walkthrough"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restart
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 1 CARD: One Dimension ("Looking at One Spec") */}
                {(showAllSteps || activeStep === 1) && (
                  <div
                    onClick={() => setActiveStep(1)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      activeStep === 1
                        ? 'border-amber-400 bg-slate-900 shadow-lg shadow-amber-500/10'
                        : 'border-slate-800/80 bg-slate-900/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                        Step 1 • The Single-Spec Trap
                      </span>
                      {activeStep === 1 && (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Active on Graph →
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      Comparing graphics cards by just one metric seems simple.
                      If you only rank GPUs by{' '}
                      <select
                        aria-label="Step 1 Metric"
                        value={yMetric}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isMetricKey(e.target.value)) {
                            onSelectYMetric(e.target.value);
                          }
                          setActiveStep(1);
                        }}
                        className="mx-1 rounded border border-amber-400/50 bg-slate-950 px-2 py-0.5 font-bold text-amber-300 focus:outline-none"
                      >
                        {ALL_METRIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {METRIC_DEFINITIONS[k].shortLabel}
                          </option>
                        ))}
                      </select>
                      , you might think{' '}
                      <strong className="text-emerald-400">
                        {step1Leader?.name ?? 'the flagship GPU'}
                      </strong>{' '}
                      (
                      {step1Leader
                        ? `${step1Leader[yMetric]} ${yDef.unit}`
                        : ''}{' '}
                      for ${step1Leader?.price}) is the obvious pick. But
                      looking at only one specification ignores price and power
                      consumption, which is how buyers overspend by hundreds of
                      dollars.
                    </p>

                    {!showAllSteps && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-[11px] font-medium text-slate-400">
                          Step 1 of 5
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(2);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300 shadow-md shadow-amber-500/20"
                        >
                          Next: The Budget Trade-Off{' '}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2 CARD: Two Variables ("Balancing Trade-Offs") */}
                {(showAllSteps || activeStep === 2) && (
                  <div
                    onClick={() => setActiveStep(2)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      activeStep === 2
                        ? 'border-amber-400 bg-slate-900 shadow-lg shadow-amber-500/10'
                        : 'border-slate-800/80 bg-slate-900/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                        Step 2 • The Budget Trade-Off
                      </span>
                      {activeStep === 2 && (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Active on Graph →
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      Smart shoppers never evaluate performance in isolation.
                      You have to balance{' '}
                      <span className="italic text-sky-300">
                        {yDef.shortLabel}
                      </span>{' '}
                      against{' '}
                      <span className="italic text-emerald-300">
                        {xDef.shortLabel}
                      </span>
                      . Finding the right card means making a clear trade-off
                      between{' '}
                      <select
                        aria-label="Trade-off Variable 1"
                        value={xMetric}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isMetricKey(e.target.value)) {
                            onSelectXMetric(e.target.value);
                          }
                          setActiveStep(2);
                        }}
                        className="my-1 rounded border border-emerald-400/50 bg-slate-950 px-2 py-0.5 font-bold text-emerald-300 focus:outline-none"
                      >
                        {ALL_METRIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {METRIC_DEFINITIONS[k].shortLabel} (
                            {METRIC_DEFINITIONS[k].direction === 'min'
                              ? 'lower is better'
                              : 'higher is better'}
                            )
                          </option>
                        ))}
                      </select>{' '}
                      and{' '}
                      <select
                        aria-label="Trade-off Variable 2"
                        value={yMetric}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isMetricKey(e.target.value)) {
                            onSelectYMetric(e.target.value);
                          }
                          setActiveStep(2);
                        }}
                        className="my-1 rounded border border-sky-400/50 bg-slate-950 px-2 py-0.5 font-bold text-sky-300 focus:outline-none"
                      >
                        {ALL_METRIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {METRIC_DEFINITIONS[k].shortLabel} (
                            {METRIC_DEFINITIONS[k].direction === 'min'
                              ? 'lower is better'
                              : 'higher is better'}
                            )
                          </option>
                        ))}
                      </select>
                      .
                    </p>
                    {frontier2DGpus.length === 1 && xMetric !== yMetric && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/10 p-2 text-xs text-amber-200">
                        <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>
                          Clear winner: In this comparison,{' '}
                          <strong>{frontier2DGpus[0].name}</strong> wins on both
                          specs simultaneously with no compromise required!
                        </span>
                      </div>
                    )}

                    {!showAllSteps && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(1);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back: Step 1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(3);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300 shadow-md shadow-amber-500/20"
                        >
                          Next: Eliminating Bad Deals{' '}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3 CARD: Value Traps ("Strictly Dominated Bad Deals") */}
                {(showAllSteps || activeStep === 3) && (
                  <div
                    onClick={() => setActiveStep(3)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      activeStep === 3
                        ? 'border-rose-400 bg-slate-900 shadow-lg shadow-rose-500/10'
                        : 'border-slate-800/80 bg-slate-900/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400">
                        Step 3 • Eliminating Bad Deals (Value Traps)
                      </span>
                      {dominated2DGpus.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(3);
                            setTrapSpotlightIdx((prev) => prev + 1);
                          }}
                          className="rounded border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500/25"
                        >
                          Inspect Next Bad Deal (
                          {(trapSpotlightIdx % dominated2DGpus.length) + 1}/
                          {dominated2DGpus.length}) →
                        </button>
                      )}
                    </div>
                    {spotlightTrap ? (
                      <div className="text-sm leading-relaxed text-slate-200 space-y-1.5">
                        <p>
                          Some graphics cards on retail shelves are strictly
                          worse than competitors. In economics and decision
                          theory, these are called{' '}
                          <strong className="text-rose-400 font-bold">
                            strictly dominated traps
                          </strong>
                          . For example, look at{' '}
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-bold text-rose-300 border border-rose-500/30">
                            {spotlightTrap.name} (${spotlightTrap.price})
                          </span>
                          :
                        </p>
                        {spotlightDominators.slice(0, 2).map((dom) => (
                          <div
                            key={dom.id}
                            className="flex items-start gap-2 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300 border border-slate-800"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-emerald-400">
                                {dom.name} (${dom.price})
                              </strong>{' '}
                              costs less and performs better: gives you{' '}
                              <strong className="text-sky-300">
                                {dom[yMetric]} {yDef.unit}
                              </strong>{' '}
                              vs {spotlightTrap[yMetric]} {yDef.unit} and{' '}
                              <strong className="text-emerald-300">
                                {dom[xMetric]} {xDef.unit}
                              </strong>{' '}
                              vs {spotlightTrap[xMetric]} {xDef.unit}.
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-slate-400 italic">
                          Smart buyer rule: Skip{' '}
                          <strong className="text-rose-300">
                            {spotlightTrap.name}
                          </strong>{' '}
                          — you get higher performance for less money with the
                          alternatives above.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No dominated bad deals found for this pair of variables!
                      </p>
                    )}

                    {!showAllSteps && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(2);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back: Step 2
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(4);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300 shadow-md shadow-amber-500/20"
                        >
                          Next: The Value Frontier{' '}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4 CARD: The Value Frontier */}
                {(showAllSteps || activeStep === 4) && (
                  <div
                    onClick={() => setActiveStep(4)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      activeStep === 4
                        ? 'border-emerald-400 bg-slate-900 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-800/80 bg-slate-900/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Step 4 • The Value Frontier (Smart Shortlist)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStep(4);
                          setOnlyFrontier((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold transition ${
                          onlyFrontier
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'
                        }`}
                      >
                        {onlyFrontier ? (
                          <>
                            <Eye className="h-3 w-3" /> Show All {gpus.length}{' '}
                            GPUs
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Hide{' '}
                            {dominated2DGpus.length} Bad Deals
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      There are {gpus.length} graphics cards in your budget.
                      Instead of analyzing dozens of mediocre options, the{' '}
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 font-black text-slate-950">
                        Value Frontier
                      </span>{' '}
                      narrows the field to the{' '}
                      <strong className="text-emerald-400">
                        {frontier2DGpus.length} most efficient options
                      </strong>
                      . Every card on this line delivers the maximum performance
                      at its price bracket.
                    </p>

                    {!showAllSteps && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(3);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back: Step 3
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(5);
                            setUnlockedAllSteps(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-slate-950 transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                        >
                          <Award className="h-3.5 w-3.5" /> Unlock Step 5:
                          Priorities &amp; Top Picks{' '}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5 CARD: Interactive Variable & Priority Selector (Tug-of-War & 3-Way Split Bar) */}
                {(showAllSteps || activeStep === 5) && (
                  <div
                    onClick={() => setActiveStep(5)}
                    className={`rounded-2xl border-2 p-4 transition-all ${
                      activeStep === 5
                        ? 'border-amber-400 bg-slate-900 shadow-xl shadow-amber-500/15'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                          Step 5 • Choose Variables &amp; Priority
                        </span>
                      </div>
                      {/* 2-Var vs 3-Var Switcher */}
                      <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(5);
                            setUseThreeVars(false);
                            syncGlobalWeights(1 - twoVarAlpha, twoVarAlpha, 0);
                          }}
                          className={`rounded px-2 py-0.5 font-bold transition ${
                            !useThreeVars
                              ? 'bg-amber-400 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          2 Variables
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStep(5);
                            setUseThreeVars(true);
                            syncGlobalWeights(
                              splitX1,
                              splitX2 - splitX1,
                              1 - splitX2,
                            );
                          }}
                          className={`rounded px-2 py-0.5 font-bold transition ${
                            useThreeVars
                              ? 'bg-amber-400 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          3 Variables (3D Split)
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Given your needs, put more{' '}
                      <span className="rounded bg-amber-400 px-1 font-bold text-slate-950">
                        weight
                      </span>{' '}
                      on one statistic over the other to reveal the frontier GPU
                      with the highest value for you:
                    </p>

                    {!useThreeVars ? (
                      /* 2-VARIABLE TUG-OF-WAR PRIORITY WIDGET (Mayerowitz's `su` component) */
                      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Variable 1 */}
                          <div className="flex items-center gap-1.5">
                            <MiniWeightBar
                              pct={priorityShares.w1 * 100}
                              color="#10b981"
                            />
                            <span className="font-mono font-bold text-emerald-400">
                              {Math.round(priorityShares.w1 * 100)}%
                            </span>
                            <select
                              aria-label="Priority Variable 1"
                              value={xMetric}
                              onChange={(e) => {
                                if (isMetricKey(e.target.value))
                                  onSelectXMetric(e.target.value);
                                setActiveStep(5);
                              }}
                              className="rounded border border-emerald-500/40 bg-slate-900 px-2 py-1 font-bold text-emerald-300 focus:outline-none"
                            >
                              {ALL_METRIC_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {METRIC_DEFINITIONS[k].shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>

                          <span className="text-[11px] font-bold text-slate-500">
                            VS
                          </span>

                          {/* Variable 2 */}
                          <div className="flex items-center gap-1.5">
                            <MiniWeightBar
                              pct={priorityShares.w2 * 100}
                              color="#38bdf8"
                            />
                            <span className="font-mono font-bold text-sky-400">
                              {Math.round(priorityShares.w2 * 100)}%
                            </span>
                            <select
                              aria-label="Priority Variable 2"
                              value={yMetric}
                              onChange={(e) => {
                                if (isMetricKey(e.target.value))
                                  onSelectYMetric(e.target.value);
                                setActiveStep(5);
                              }}
                              className="rounded border border-sky-500/40 bg-slate-900 px-2 py-1 font-bold text-sky-300 focus:outline-none"
                            >
                              {ALL_METRIC_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {METRIC_DEFINITIONS[k].shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Single Tug-of-War Range Slider */}
                        <div>
                          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800 flex">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-75"
                              style={{ width: `${priorityShares.w1 * 100}%` }}
                            />
                            <div
                              className="h-full bg-sky-400 transition-all duration-75"
                              style={{ width: `${priorityShares.w2 * 100}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            aria-label="Balance priority between Variable 1 and Variable 2"
                            min={0.05}
                            max={0.95}
                            step={0.05}
                            value={twoVarAlpha}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTwoVarAlpha(val);
                              setActiveStep(5);
                              syncGlobalWeights(1 - val, val, 0);
                            }}
                            className="-mt-3 w-full cursor-pointer accent-amber-400 relative z-10"
                          />
                          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                            <span>← Favor {xDef.shortLabel}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setTwoVarAlpha(0.5);
                                syncGlobalWeights(0.5, 0.5, 0);
                              }}
                              className="text-amber-400 hover:underline font-semibold"
                            >
                              50 / 50 Balance
                            </button>
                            <span>Favor {yDef.shortLabel} →</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 3-VARIABLE SPLIT BAR WIDGET (Mayerowitz's `hu` 2-handle 3-color bar!) */
                      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 space-y-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                          {/* Var 1 */}
                          <div className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 p-1.5">
                            <MiniWeightBar
                              pct={priorityShares.w1 * 100}
                              color="#10b981"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[10px] font-bold text-emerald-400">
                                {Math.round(priorityShares.w1 * 100)}% Weight
                              </div>
                              <select
                                aria-label="3-Var Priority 1"
                                value={xMetric}
                                onChange={(e) =>
                                  isMetricKey(e.target.value) &&
                                  onSelectXMetric(e.target.value)
                                }
                                className="w-full bg-transparent font-bold text-emerald-200 text-[11px] focus:outline-none"
                              >
                                {ALL_METRIC_KEYS.map((k) => (
                                  <option
                                    key={k}
                                    value={k}
                                    className="bg-slate-900 text-white"
                                  >
                                    {METRIC_DEFINITIONS[k].shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Var 2 */}
                          <div className="flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 p-1.5">
                            <MiniWeightBar
                              pct={priorityShares.w2 * 100}
                              color="#38bdf8"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[10px] font-bold text-sky-400">
                                {Math.round(priorityShares.w2 * 100)}% Weight
                              </div>
                              <select
                                aria-label="3-Var Priority 2"
                                value={yMetric}
                                onChange={(e) =>
                                  isMetricKey(e.target.value) &&
                                  onSelectYMetric(e.target.value)
                                }
                                className="w-full bg-transparent font-bold text-sky-200 text-[11px] focus:outline-none"
                              >
                                {ALL_METRIC_KEYS.map((k) => (
                                  <option
                                    key={k}
                                    value={k}
                                    className="bg-slate-900 text-white"
                                  >
                                    {METRIC_DEFINITIONS[k].shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Var 3 */}
                          <div className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 p-1.5">
                            <MiniWeightBar
                              pct={priorityShares.w3 * 100}
                              color="#fbbf24"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[10px] font-bold text-amber-400">
                                {Math.round(priorityShares.w3 * 100)}% Weight
                              </div>
                              <select
                                aria-label="3-Var Priority 3"
                                value={zMetric}
                                onChange={(e) =>
                                  isMetricKey(e.target.value) &&
                                  onSelectZMetric(e.target.value)
                                }
                                className="w-full bg-transparent font-bold text-amber-200 text-[11px] focus:outline-none"
                              >
                                {ALL_METRIC_KEYS.map((k) => (
                                  <option
                                    key={k}
                                    value={k}
                                    className="bg-slate-900 text-white"
                                  >
                                    {METRIC_DEFINITIONS[k].shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 3-Color Segmented Bar + 2 Divider Sliders */}
                        <div className="space-y-1.5 pt-1">
                          <div className="relative h-3.5 w-full overflow-hidden rounded-full flex border border-slate-700">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-75"
                              style={{ width: `${priorityShares.w1 * 100}%` }}
                            />
                            <div
                              className="h-full bg-sky-400 transition-all duration-75"
                              style={{ width: `${priorityShares.w2 * 100}%` }}
                            />
                            <div
                              className="h-full bg-amber-400 transition-all duration-75"
                              style={{ width: `${priorityShares.w3 * 100}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[10px] text-emerald-300 font-semibold mb-0.5">
                                Divider 1 ({xDef.shortLabel} ↔ {yDef.shortLabel}
                                )
                              </label>
                              <input
                                type="range"
                                min={0.05}
                                max={0.85}
                                step={0.05}
                                value={splitX1}
                                onChange={(e) => {
                                  const v = Math.min(
                                    Number(e.target.value),
                                    splitX2 - 0.05,
                                  );
                                  setSplitX1(v);
                                  syncGlobalWeights(
                                    v,
                                    splitX2 - v,
                                    1 - splitX2,
                                  );
                                }}
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-amber-300 font-semibold mb-0.5">
                                Divider 2 ({yDef.shortLabel} ↔ {zDef.shortLabel}
                                )
                              </label>
                              <input
                                type="range"
                                min={0.15}
                                max={0.95}
                                step={0.05}
                                value={splitX2}
                                onChange={(e) => {
                                  const v = Math.max(
                                    Number(e.target.value),
                                    splitX1 + 0.05,
                                  );
                                  setSplitX2(v);
                                  syncGlobalWeights(
                                    splitX1,
                                    v - splitX1,
                                    1 - v,
                                  );
                                }}
                                className="w-full accent-amber-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instant Best Winner Callout Inside Card (Like Mayerowitz's `Best driver: { ... }`) */}
                    {bestChoice && (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-400/50 bg-amber-500/15 px-3.5 py-2.5">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            <Award className="h-3.5 w-3.5" /> Best Match For
                            Your Priorities
                          </div>
                          <div className="text-base font-extrabold text-white">
                            {bestChoice.gpu.name}{' '}
                            <span className="text-emerald-400">
                              (${bestChoice.gpu.price})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-950">
                            {bestChoice.matchPct.toFixed(0)}% Score
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (7 cols): Interactive Graphic & Value Recommendations */}
              <div className="space-y-6 lg:col-span-7">
                {/* Interactive SVG Canvas */}
                <SimpleGuideScatterPlot
                  gpus={gpus}
                  activeStep={activeStep}
                  setActiveStep={setActiveStep}
                  toStoryStep={toStoryStep}
                  xMetric={xMetric}
                  yMetric={yMetric}
                  xDef={xDef}
                  yDef={yDef}
                  frontier2DGpus={frontier2DGpus}
                  spotlightTrap={spotlightTrap}
                  spotlightDominators={spotlightDominators}
                  bestChoice={bestChoice}
                  step1Leader={step1Leader}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                  onToggleSelectGpu={onToggleSelectGpu}
                  bounds={bounds}
                  pareto2DMap={pareto2DMap}
                  paretoActiveMap={paretoActiveMap}
                  onlyFrontier={onlyFrontier}
                  frontierStaircasePath={frontierStaircasePath}
                  isoUtilityPath={isoUtilityPath}
                />

                {/* TOP VALUE RECOMMENDATIONS: Top 3 Pareto Choices */}
                <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 p-5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-400" />
                        <h3 className="text-base font-extrabold text-white">
                          Top Value Recommendations (Best Choices For Your
                          Budget)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ranked along the Value Frontier using your selected
                        variables (
                        <strong className="text-emerald-300">
                          {xDef.shortLabel}
                        </strong>
                        ,{' '}
                        <strong className="text-sky-300">
                          {yDef.shortLabel}
                        </strong>
                        {useThreeVars ? (
                          <>
                            , and{' '}
                            <strong className="text-amber-300">
                              {zDef.shortLabel}
                            </strong>
                          </>
                        ) : null}
                        ) and priority balance.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onSwitchToHyper}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Compare 6+ Specs (Hyper-Graph)
                      </button>
                      <button
                        type="button"
                        onClick={onSwitchTo3D}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        View in 3D Cube
                      </button>
                      <button
                        type="button"
                        onClick={onSwitchToExplorer}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        Open Explorer Mode →
                      </button>
                    </div>
                  </div>

                  {/* Top 3 Cards Grid */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {topThreeChoices.map((item, idx) => {
                      const { gpu, matchPct, ux, uy, uz } = item;
                      const isSelected = selectedGpuIds.includes(gpu.id);
                      const fpsPer100Usd = (
                        (gpu.rasterFps1440p / gpu.price) *
                        100
                      ).toFixed(1);

                      return (
                        <div
                          key={gpu.id}
                          data-testid="top-choice"
                          className={`flex flex-col justify-between rounded-xl border-2 p-4 transition-all ${
                            idx === 0
                              ? 'border-amber-400 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 shadow-lg shadow-amber-500/10'
                              : 'border-slate-800 bg-slate-950/90 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Rank Badge & Match % */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black uppercase ${
                                  idx === 0
                                    ? 'bg-amber-400 text-slate-950'
                                    : idx === 1
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {idx === 0 && <Award className="h-3 w-3" />}
                                {idx === 0
                                  ? '#1 Top Pick'
                                  : idx === 1
                                    ? '#2 Runner-Up'
                                    : '#3 Value Pick'}
                              </span>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {matchPct.toFixed(0)}% Match
                              </span>
                            </div>

                            {/* GPU Name & Price */}
                            <h4 className="text-base font-extrabold text-white">
                              {gpu.name}
                            </h4>
                            <div className="mt-0.5 flex items-baseline gap-2">
                              <span className="text-xl font-black text-emerald-400">
                                ${gpu.price}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                ({fpsPer100Usd} FPS per $100)
                              </span>
                            </div>

                            {/* Hardware Spec Comparison Meters */}
                            <div className="mt-3.5 space-y-2.5 border-t border-slate-800/80 pt-3">
                              <SkewedStatBar
                                label={xDef.shortLabel}
                                valueText={
                                  xDef.unit === '$'
                                    ? `$${gpu[xMetric]}`
                                    : `${gpu[xMetric]} ${xDef.unit}`
                                }
                                pct={ux * 100}
                                colorClass="bg-emerald-400"
                              />
                              <SkewedStatBar
                                label={yDef.shortLabel}
                                valueText={
                                  yDef.unit === '$'
                                    ? `$${gpu[yMetric]}`
                                    : `${gpu[yMetric]} ${yDef.unit}`
                                }
                                pct={uy * 100}
                                colorClass="bg-sky-400"
                              />
                              {useThreeVars ? (
                                <SkewedStatBar
                                  label={zDef.shortLabel}
                                  valueText={
                                    zDef.unit === '$'
                                      ? `$${gpu[zMetric]}`
                                      : `${gpu[zMetric]} ${zDef.unit}`
                                  }
                                  pct={uz * 100}
                                  colorClass="bg-amber-400"
                                />
                              ) : (
                                <SkewedStatBar
                                  label="VRAM Capacity"
                                  valueText={`${gpu.vramGb} GB`}
                                  pct={(gpu.vramGb / 24) * 100}
                                  colorClass="bg-amber-400"
                                />
                              )}
                            </div>
                          </div>

                          {/* Compare Button */}
                          <button
                            type="button"
                            onClick={() => onToggleSelectGpu(gpu.id)}
                            className={`mt-4 w-full rounded-lg border py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            {isSelected ? (
                              <span className="flex items-center justify-center gap-1">
                                <Check className="h-3.5 w-3.5 text-amber-300" />
                                Added to Compare
                              </span>
                            ) : (
                              '+ Compare Specs'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
