import { useMemo, useState } from 'react';
import {
  HardConstraints,
  METRIC_DEFINITIONS,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
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
} from 'lucide-react';

interface SimpleParetoGuideProps {
  gpus: RankedGpu[];
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints
  ) => void;
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  onSelectXMetric: (m: MetricKey) => void;
  onSelectYMetric: (m: MetricKey) => void;
  onSelectZMetric: (m: MetricKey) => void;
  weights: PreferenceWeights;
  onChangeWeights: (updater: (prev: PreferenceWeights) => PreferenceWeights) => void;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  onSwitchToExplorer: () => void;
  onSwitchTo3D: () => void;
  onSwitchToHyper: () => void;
  maxBudgetBound: number;
}

type StoryStep = 1 | 2 | 3 | 4 | 5;

/**
 * Vertical fill meter displaying normalized weight share.
 */
function MiniWeightBar({
  pct,
  color,
}: {
  pct: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <span
      className="inline-flex h-5 w-3 flex-col justify-end overflow-hidden rounded-[3px] border border-slate-600 bg-slate-950 p-[1px] align-middle shadow-inner"
      title={`${Math.round(clamped)}% Priority Weight`}
    >
      <span
        className="w-full rounded-[1px] transition-all duration-150"
        style={{
          height: `${clamped}%`,
          backgroundColor: color,
        }}
      />
    </span>
  );
}

/**
 * Clean hardware spec comparison bar.
 */
function SkewedStatBar({
  label,
  valueText,
  pct,
  colorClass = 'bg-amber-400',
}: {
  label: string;
  valueText: string;
  pct: number;
  colorClass?: string;
}) {
  const clamped = Math.max(6, Math.min(100, pct));
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-bold italic tracking-wide text-amber-300">
          {label}
        </span>
        <span className="font-mono font-bold text-white">{valueText}</span>
      </div>
      <div className="relative h-3.5 w-full -skew-x-12 overflow-hidden rounded bg-slate-800/90 p-0.5 shadow-inner border border-slate-700/70">
        <div
          className={`h-full rounded-sm ${colorClass} transition-all duration-300 shadow-sm`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Normalize a metric value into [0.05, 1.0] utility where 1.0 is Always Better
 * (respecting METRIC_DEFINITIONS[m].direction).
 */
function computeDirectionalUtility(
  gpu: RankedGpu,
  metric: MetricKey,
  minVal: number,
  maxVal: number
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
  maxBudgetBound,
}: SimpleParetoGuideProps) {
  // Default to Step 5 (Interactive Priority & Top Valor) or let the user step 1 -> 5 through the story
  const [activeStep, setActiveStep] = useState<StoryStep>(5);
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
    [gpus, pareto2DMap]
  );

  const dominated2DGpus = useMemo(
    () => gpus.filter((g) => !pareto2DMap.get(g.id)?.isParetoOptimal),
    [gpus, pareto2DMap]
  );

  // Step 1 Leader: Best GPU on yMetric alone
  const step1Leader = useMemo(() => {
    if (gpus.length === 0) return null;
    const sorted = [...gpus].sort((a, b) =>
      yDef.direction === 'min'
        ? a[yMetric] - b[yMetric]
        : b[yMetric] - a[yMetric]
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
      (g) => paretoActiveMap.get(g.id)?.isParetoOptimal
    );
    const pool = candidates.length > 0 ? candidates : gpus;

    const scored = pool.map((gpu) => {
      const ux = computeDirectionalUtility(
        gpu,
        xMetric,
        bounds.x.min,
        bounds.x.max
      );
      const uy = computeDirectionalUtility(
        gpu,
        yMetric,
        bounds.y.min,
        bounds.y.max
      );
      const uz = computeDirectionalUtility(
        gpu,
        zMetric,
        bounds.z.min,
        bounds.z.max
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

  // In Step 1 ("1 Variable No-Brainer"), all points collapse onto a 1D horizontal line ranked by yMetric!
  const toStep1ScreenX = (val: number) => {
    const span = bounds.y.max - bounds.y.min || 1;
    const t = (val - bounds.y.min) / span;
    return padL + t * plotW;
  };

  // Build 2D Pareto Frontier Staircase SVG path
  const frontierStaircasePath = useMemo(() => {
    if (frontier2DGpus.length === 0) return '';
    const sorted = [...frontier2DGpus].sort(
      (a, b) => a[xMetric] - b[xMetric]
    );
    const pts: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const sx = toScreenX(sorted[i][xMetric]);
      const sy = toScreenY(sorted[i][yMetric]);
      if (i === 0) {
        pts.push(`M ${sx.toFixed(1)} ${sy.toFixed(1)}`);
      } else {
        // Horizontal then vertical step
        pts.push(`L ${sx.toFixed(1)} ${toScreenY(sorted[i - 1][yMetric]).toFixed(1)}`);
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
        `${pathSegments.length === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`
      );
    }
    return pathSegments.join(' ');
  }, [bestChoice, activeStep, priorityShares, bounds, xDef.direction, yDef.direction]);

  // X and Y ticks
  const xTicks = useMemo(() => {
    const count = 5;
    const span = bounds.x.max - bounds.x.min || 1;
    return Array.from({ length: count + 1 }, (_, i) =>
      Math.round(bounds.x.min + (i / count) * span)
    );
  }, [bounds.x]);

  const yTicks = useMemo(() => {
    const count = 4;
    const span = bounds.y.max - bounds.y.min || 1;
    return Array.from({ length: count + 1 }, (_, i) =>
      Math.round(bounds.y.min + (i / count) * span)
    );
  }, [bounds.y]);

  const hoveredGpu = useMemo(
    () => gpus.find((g) => g.id === hoveredId) ?? null,
    [gpus, hoveredId]
  );

  return (
    <div className="space-y-6">
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
              New to PC building? Follow Steps 1 to 4 to see how economists
              and smart buyers eliminate overpriced hardware traps, or use{' '}
              <strong className="text-amber-300">
                Step 5 (Priority Matcher)
              </strong>{' '}
              to set your priorities and get your top value recommendations.
            </p>
          </div>

          {/* 5 Step Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { step: 1 as StoryStep, label: '1. One Spec' },
                { step: 2 as StoryStep, label: '2. Trade-Offs' },
                { step: 3 as StoryStep, label: '3. Avoid Bad Deals' },
                { step: 4 as StoryStep, label: '4. Value Frontier' },
                { step: 5 as StoryStep, label: '5. Priorities & Top Picks' },
              ] as const
            ).map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  setActiveStep(item.step);
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
          </div>

          {/* STEP 1 CARD: One Dimension ("Looking at One Spec") */}
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
              Comparing graphics cards by just one metric seems simple. If you
              only rank GPUs by{' '}
              <select
                aria-label="Step 1 Metric"
                value={yMetric}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectYMetric(e.target.value as MetricKey);
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
              for ${step1Leader?.price}) is the obvious pick. But looking at
              only one specification ignores price and power consumption, which
              is how buyers overspend by hundreds of dollars.
            </p>
          </div>

          {/* STEP 2 CARD: Two Variables ("Balancing Trade-Offs") */}
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
              Smart shoppers never evaluate performance in isolation. You have to balance{' '}
              <span className="italic text-sky-300">{yDef.shortLabel}</span>{' '}
              against{' '}
              <span className="italic text-emerald-300">{xDef.shortLabel}</span>.
              Finding the right card means making a clear trade-off between{' '}
              <select
                aria-label="Trade-off Variable 1"
                value={xMetric}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectXMetric(e.target.value as MetricKey);
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
                  onSelectYMetric(e.target.value as MetricKey);
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
                  <strong>{frontier2DGpus[0].name}</strong> wins on both specs
                  simultaneously with no compromise required!
                </span>
              </div>
            )}
          </div>

          {/* STEP 3 CARD: Value Traps ("Strictly Dominated Bad Deals") */}
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
                  Inspect Next Bad Deal ({(trapSpotlightIdx % dominated2DGpus.length) + 1}/
                  {dominated2DGpus.length}) →
                </button>
              )}
            </div>
            {spotlightTrap ? (
              <div className="text-sm leading-relaxed text-slate-200 space-y-1.5">
                <p>
                  Some graphics cards on retail shelves are strictly worse than competitors.
                  In economics and decision theory, these are called{' '}
                  <strong className="text-rose-400 font-bold">strictly dominated traps</strong>.
                  For example, look at{' '}
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
                  <strong className="text-rose-300">{spotlightTrap.name}</strong>{' '}
                  — you get higher performance for less money with the alternatives above.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No dominated bad deals found for this pair of variables!
              </p>
            )}
          </div>

          {/* STEP 4 CARD: The Value Frontier */}
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
                    <Eye className="h-3 w-3" /> Show All {gpus.length} GPUs
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide {dominated2DGpus.length}{' '}
                    Bad Deals
                  </>
                )}
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">
              There are {gpus.length} graphics cards in your budget. Instead of
              analyzing dozens of mediocre options, the{' '}
              <span className="rounded bg-amber-400 px-1.5 py-0.5 font-black text-slate-950">
                Value Frontier
              </span>{' '}
              narrows the field to the{' '}
              <strong className="text-emerald-400">
                {frontier2DGpus.length} most efficient options
              </strong>
              . Every card on this line delivers the maximum performance at its price bracket.
            </p>
          </div>

          {/* STEP 5 CARD: Interactive Variable & Priority Selector (Tug-of-War & 3-Way Split Bar) */}
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
                      1 - splitX2
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
              on one statistic over the other to reveal the frontier GPU with
              the highest value for you:
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
                        onSelectXMetric(e.target.value as MetricKey);
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
                        onSelectYMetric(e.target.value as MetricKey);
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
                          onSelectXMetric(e.target.value as MetricKey)
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
                          onSelectYMetric(e.target.value as MetricKey)
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
                          onSelectZMetric(e.target.value as MetricKey)
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
                        Divider 1 ({xDef.shortLabel} ↔ {yDef.shortLabel})
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
                            splitX2 - 0.05
                          );
                          setSplitX1(v);
                          syncGlobalWeights(v, splitX2 - v, 1 - splitX2);
                        }}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-300 font-semibold mb-0.5">
                        Divider 2 ({yDef.shortLabel} ↔ {zDef.shortLabel})
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
                            splitX1 + 0.05
                          );
                          setSplitX2(v);
                          syncGlobalWeights(splitX1, v - splitX1, 1 - v);
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
                    <Award className="h-3.5 w-3.5" /> Best Match For Your Priorities
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
        </div>

        {/* RIGHT COLUMN (7 cols): Interactive Graphic & Value Recommendations */}
        <div className="space-y-6 lg:col-span-7">
          {/* Interactive SVG Canvas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {activeStep === 1
                    ? `Step 1: Single-Metric Ranking by ${yDef.shortLabel}`
                    : activeStep === 2
                    ? `Step 2: Trade-Off Between ${xDef.shortLabel} & ${yDef.shortLabel}`
                    : activeStep === 3
                    ? `Step 3: Why ${spotlightTrap?.name ?? 'a Bad Deal'} Is Strictly Dominated`
                    : activeStep === 4
                    ? `Step 4: The Value Frontier (${frontier2DGpus.length} Efficient Options)`
                    : `Step 5: Value Trade-Off Curve & Top Recommendations`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeStep === 1
                    ? 'When you only look at 1 metric, every GPU sits on a single line.'
                    : activeStep === 5
                    ? 'Drag the priority slider on the left to balance what matters most to your setup.'
                    : 'Green points sit on the Value Frontier. Red points are bad deals beaten on both axes.'}
                </p>
              </div>

              {/* Prev / Next Step Navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activeStep === 1}
                  onClick={() =>
                    setActiveStep((s) => Math.max(1, s - 1) as StoryStep)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button
                  type="button"
                  disabled={activeStep === 5}
                  onClick={() =>
                    setActiveStep((s) => Math.min(5, s + 1) as StoryStep)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* SVG Interactive Plot */}
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto select-none"
              >
                <defs>
                  <filter
                    id="pareto-gold-glow"
                    x="-40%"
                    y="-40%"
                    width="180%"
                    height="180%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="0"
                      stdDeviation="5"
                      floodColor="#fbbf24"
                      floodOpacity="0.85"
                    />
                  </filter>
                </defs>

                {/* Grid Lines & Axes when in 2D mode (Steps 2–5) */}
                {activeStep > 1 ? (
                  <>
                    {/* Horizontal Y grid lines */}
                    {yTicks.map((tick) => {
                      const sy = toScreenY(tick);
                      return (
                        <g key={`y-${tick}`}>
                          <line
                            x1={padL}
                            y1={sy}
                            x2={svgW - padR}
                            y2={sy}
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 8}
                            y={sy + 4}
                            textAnchor="end"
                            className="fill-slate-400 font-mono text-[10px]"
                          >
                            {tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical X grid lines */}
                    {xTicks.map((tick) => {
                      const sx = toScreenX(tick);
                      return (
                        <g key={`x-${tick}`}>
                          <line
                            x1={sx}
                            y1={padT}
                            x2={sx}
                            y2={svgH - padB}
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={sx}
                            y={svgH - padB + 18}
                            textAnchor="middle"
                            className="fill-slate-400 font-mono text-[10px]"
                          >
                            {xDef.unit === '$' ? `$${tick}` : tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* X Axis Label */}
                    <text
                      x={padL + plotW / 2}
                      y={svgH - 10}
                      textAnchor="middle"
                      className="fill-emerald-400 text-xs font-bold"
                    >
                      {xDef.label} ({xDef.unit}) —{' '}
                      {xDef.direction === 'min'
                        ? 'Lower (Left) is Better'
                        : 'Higher (Right) is Better'}
                    </text>

                    {/* Y Axis Label */}
                    <text
                      x={-(padT + plotH / 2)}
                      y={16}
                      transform="rotate(-90)"
                      textAnchor="middle"
                      className="fill-sky-400 text-xs font-bold"
                    >
                      {yDef.label} ({yDef.unit})
                    </text>
                  </>
                ) : (
                  /* Step 1: Single 1D Horizontal Axis */
                  <>
                    <line
                      x1={padL}
                      y1={svgH / 2}
                      x2={svgW - padR}
                      y2={svgH / 2}
                      stroke="#334155"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    {yTicks.map((tick) => {
                      const sx = toStep1ScreenX(tick);
                      return (
                        <g key={`s1-${tick}`}>
                          <line
                            x1={sx}
                            y1={svgH / 2 - 8}
                            x2={sx}
                            y2={svgH / 2 + 8}
                            stroke="#475569"
                          />
                          <text
                            x={sx}
                            y={svgH / 2 + 26}
                            textAnchor="middle"
                            className="fill-slate-300 font-mono text-[11px]"
                          >
                            {tick} {yDef.unit}
                          </text>
                        </g>
                      );
                    })}
                    <text
                      x={padL + plotW / 2}
                      y={svgH / 2 + 52}
                      textAnchor="middle"
                      className="fill-amber-400 text-xs font-bold"
                    >
                      {yDef.label} ({yDef.unit}) — Single-Metric Ranking
                    </text>
                  </>
                )}

                {/* Steps 4 & 5: Pareto Frontier Staircase Line */}
                {activeStep >= 4 && frontierStaircasePath && (
                  <path
                    d={frontierStaircasePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    opacity={0.85}
                  />
                )}

                {/* Step 3: Domination Arrows from Better GPUs to Bad Deal GPU */}
                {activeStep === 3 &&
                  spotlightTrap &&
                  spotlightDominators.map((dom) => {
                    const x1 = toScreenX(dom[xMetric]);
                    const y1 = toScreenY(dom[yMetric]);
                    const x2 = toScreenX(spotlightTrap[xMetric]);
                    const y2 = toScreenY(spotlightTrap[yMetric]);
                    return (
                      <g key={`dom-${dom.id}`}>
                        {/* Shaded domination rectangle */}
                        <rect
                          x={Math.min(x1, x2)}
                          y={Math.min(y1, y2)}
                          width={Math.abs(x2 - x1)}
                          height={Math.abs(y2 - y1)}
                          fill="#f43f5e"
                          opacity={0.1}
                        />
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#f43f5e"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      </g>
                    );
                  })}

                {/* Step 5: Live "Max Utility" Iso-Curve */}
                {activeStep === 5 && isoUtilityPath && (
                  <g>
                    <path
                      id="pareto-isoutility-curve"
                      d={isoUtilityPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                    />
                    <text dy="-6" className="fill-amber-300 text-[11px] font-bold">
                      <textPath
                        href="#pareto-isoutility-curve"
                        startOffset="12%"
                      >
                        Optimal Value Boundary (Your Priorities)
                      </textPath>
                    </text>
                  </g>
                )}

                {/* GPU Nodes */}
                {gpus.map((gpu) => {
                  const is2DFrontier =
                    pareto2DMap.get(gpu.id)?.isParetoOptimal ?? false;
                  const isActiveFrontier =
                    paretoActiveMap.get(gpu.id)?.isParetoOptimal ?? false;
                  const isBestWinner =
                    activeStep === 5 && bestChoice?.gpu.id === gpu.id;
                  const isStep1Top =
                    activeStep === 1 && step1Leader?.id === gpu.id;
                  const isSpotlightTrap =
                    activeStep === 3 && spotlightTrap?.id === gpu.id;
                  const isSpotlightDom =
                    activeStep === 3 &&
                    spotlightDominators.some((d) => d.id === gpu.id);

                  // Hide traps when onlyFrontier is toggled in Step 4
                  if (activeStep === 4 && onlyFrontier && !is2DFrontier) {
                    return null;
                  }

                  const cx =
                    activeStep === 1
                      ? toStep1ScreenX(gpu[yMetric])
                      : toScreenX(gpu[xMetric]);
                  const cy =
                    activeStep === 1 ? svgH / 2 : toScreenY(gpu[yMetric]);

                  // Opacity based on step focus
                  let opacity = 0.9;
                  if (activeStep === 3) {
                    opacity =
                      isSpotlightTrap || isSpotlightDom ? 1.0 : 0.18;
                  } else if (activeStep === 4) {
                    opacity = is2DFrontier ? 1.0 : 0.25;
                  } else if (activeStep === 5) {
                    opacity = isBestWinner
                      ? 1.0
                      : isActiveFrontier
                      ? 0.92
                      : 0.22;
                  }

                  // Node color & radius
                  let fill = '#38bdf8';
                  let stroke = '#0f172a';
                  let radius = 7;

                  if (isBestWinner || isStep1Top) {
                    fill = '#fbbf24';
                    stroke = '#ffffff';
                    radius = 12;
                  } else if (isSpotlightTrap) {
                    fill = '#f43f5e';
                    stroke = '#ffffff';
                    radius = 11;
                  } else if (isSpotlightDom) {
                    fill = '#10b981';
                    stroke = '#ffffff';
                    radius = 10;
                  } else if (
                    (activeStep >= 4 && is2DFrontier) ||
                    (activeStep === 5 && isActiveFrontier)
                  ) {
                    fill = '#10b981';
                    stroke = '#052e16';
                    radius = 8.5;
                  } else if (activeStep >= 3 && !is2DFrontier) {
                    fill = '#f43f5e';
                  }

                  const showLabel =
                    isBestWinner ||
                    isStep1Top ||
                    isSpotlightTrap ||
                    isSpotlightDom ||
                    hoveredId === gpu.id ||
                    (activeStep >= 4 && is2DFrontier);

                  return (
                    <g
                      key={gpu.id}
                      style={{
                        transition: 'all 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                        opacity,
                      }}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredId(gpu.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onToggleSelectGpu(gpu.id)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isBestWinner || isSpotlightTrap ? 2.5 : 1.5}
                        filter={
                          isBestWinner || isStep1Top
                            ? 'url(#pareto-gold-glow)'
                            : undefined
                        }
                      />
                      {showLabel && (
                        <text
                          x={cx}
                          y={cy - radius - 5}
                          textAnchor="middle"
                          className={`text-[10px] font-bold pointer-events-none ${
                            isBestWinner || isStep1Top
                              ? 'fill-amber-300'
                              : isSpotlightTrap
                              ? 'fill-rose-300'
                              : 'fill-slate-200'
                          }`}
                        >
                          {gpu.name.replace('GeForce ', '').replace('Radeon ', '')}{' '}
                          (${gpu.price})
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover Inspector Pill */}
              {hoveredGpu && (
                <div className="absolute bottom-3 right-3 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
                  <div className="font-bold text-white">
                    {hoveredGpu.name}{' '}
                    <span className="text-emerald-400">${hoveredGpu.price}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {xDef.shortLabel}: <strong>{hoveredGpu[xMetric]} {xDef.unit}</strong> •{' '}
                    {yDef.shortLabel}: <strong>{hoveredGpu[yMetric]} {yDef.unit}</strong> •{' '}
                    VRAM: <strong>{hoveredGpu.vramGb} GB</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOP VALUE RECOMMENDATIONS: Top 3 Pareto Choices */}
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">
                    Top Value Recommendations (Best Choices For Your Budget)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked along the Value Frontier using your selected variables (
                  <strong className="text-emerald-300">{xDef.shortLabel}</strong>
                  , <strong className="text-sky-300">{yDef.shortLabel}</strong>
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
                const fpsPer100Usd = ((gpu.rasterFps1440p / gpu.price) * 100).toFixed(
                  1
                );

                return (
                  <div
                    key={gpu.id}
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
  );
}
