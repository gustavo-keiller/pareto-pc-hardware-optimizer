import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  GpuCandidate,
  HardConstraints,
  METRIC_DEFINITIONS,
  MetricKey,
  PreferenceWeights,
  RankedGpu,
} from '../lib/math/types';
import { evaluateParetoFrontier } from '../lib/math/pareto';
import { Award, Check, Sparkles, Layers, Compass } from 'lucide-react';
import { SkewedStatBar } from './SimpleGuideWidgets';
import { SimpleGuideScatterPlot, StoryStep } from './SimpleGuideScatterPlot';
import { SimpleGuideStepStories } from './SimpleGuideStepStories';
import { SimpleGuideStep5Priority } from './SimpleGuideStep5Priority';

export interface SimpleGuideMathWalkthroughProps {
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
  onChangeWeights: (
    updater: (prev: PreferenceWeights) => PreferenceWeights,
  ) => void;
  selectedGpuIds: string[];
  onToggleSelectGpu: (id: string) => void;
  onSwitchToExplorer: () => void;
  onSwitchTo3D: () => void;
  onSwitchToHyper: () => void;
  maxBudgetBound: number;
}

function toStoryStep(n: number): StoryStep {
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : 5;
}

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

export const SimpleGuideMathWalkthrough: React.FC<
  SimpleGuideMathWalkthroughProps
> = ({
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
}) => {
  const [activeStep, setActiveStep] = useState<StoryStep>(1);
  const [unlockedAllSteps, setUnlockedAllSteps] = useState<boolean>(false);
  const [focusStep5Only, setFocusStep5Only] = useState<boolean>(false);
  const [useThreeVars, setUseThreeVars] = useState<boolean>(false);
  const [twoVarAlpha, setTwoVarAlpha] = useState<number>(0.5);
  const [trapSpotlightIdx, setTrapSpotlightIdx] = useState<number>(0);
  const [onlyFrontier, setOnlyFrontier] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (activeStep === 5 && !unlockedAllSteps) {
      setUnlockedAllSteps(true);
    }
  }, [activeStep, unlockedAllSteps]);

  const showAllSteps =
    (unlockedAllSteps || activeStep === 5) && !focusStep5Only;

  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];
  const zDef = METRIC_DEFINITIONS[zMetric];

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

  const frontier2DGpus = useMemo(
    () => gpus.filter((g) => pareto2DMap.get(g.id)?.isParetoOptimal),
    [gpus, pareto2DMap],
  );

  const dominated2DGpus = useMemo(
    () => gpus.filter((g) => !pareto2DMap.get(g.id)?.isParetoOptimal),
    [gpus, pareto2DMap],
  );

  const step1Leader = useMemo(() => {
    if (gpus.length === 0) return null;
    const sorted = [...gpus].sort((a, b) =>
      yDef.direction === 'min'
        ? a[yMetric] - b[yMetric]
        : b[yMetric] - a[yMetric],
    );
    return sorted[0];
  }, [gpus, yMetric, yDef.direction]);

  const spotlightTrap = useMemo(() => {
    if (dominated2DGpus.length === 0) return null;
    const safeIdx = trapSpotlightIdx % dominated2DGpus.length;
    return dominated2DGpus[safeIdx];
  }, [dominated2DGpus, trapSpotlightIdx]);

  const spotlightDominators = useMemo(() => {
    if (!spotlightTrap) return [];
    const domIds = pareto2DMap.get(spotlightTrap.id)?.dominatedBy ?? [];
    const gpuById = new Map(gpus.map((g) => [g.id, g]));
    return domIds
      .map((id) => gpuById.get(id))
      .filter((g): g is RankedGpu => g !== undefined);
  }, [spotlightTrap, pareto2DMap, gpus]);

  const priorityShares = useMemo(() => {
    if (!useThreeVars) {
      const w1 = 1 - twoVarAlpha;
      const w2 = twoVarAlpha;
      return { w1, w2, w3: 0 };
    }
    return { w1: 0.4, w2: 0.35, w3: 0.25 };
  }, [useThreeVars, twoVarAlpha]);

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

      const matchPct = Math.exp(logUtility) * 100;
      return { gpu, ux, uy, uz, logUtility, matchPct };
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

  const svgW = 680;
  const svgH = 400;
  const padL = 64;
  const padR = 36;
  const padT = 34;
  const padB = 52;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const toScreenX = useCallback(
    (val: number) => {
      const span = bounds.x.max - bounds.x.min || 1;
      const t = (val - bounds.x.min) / span;
      return padL + t * plotW;
    },
    [bounds.x.max, bounds.x.min, padL, plotW],
  );

  const toScreenY = useCallback(
    (val: number) => {
      const span = bounds.y.max - bounds.y.min || 1;
      const t = (val - bounds.y.min) / span;
      return padT + plotH - t * plotH;
    },
    [bounds.y.max, bounds.y.min, padT, plotH],
  );

  const frontierStaircasePath = useMemo(() => {
    if (frontier2DGpus.length === 0) return '';
    const sorted = [...frontier2DGpus].sort((a, b) => a[xMetric] - b[xMetric]);
    let path = `M ${toScreenX(sorted[0][xMetric])} ${toScreenY(sorted[0][yMetric])}`;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const midX = toScreenX(curr[xMetric]);
      const midY = toScreenY(prev[yMetric]);
      path += ` L ${midX} ${midY}`;
      path += ` L ${toScreenX(curr[xMetric])} ${toScreenY(curr[yMetric])}`;
    }
    return path;
  }, [frontier2DGpus, xMetric, yMetric, toScreenX, toScreenY]);

  const isoUtilityPath = useMemo(() => {
    if (!bestChoice || activeStep !== 5) return '';
    const points: string[] = [];
    const targetU = bestChoice.logUtility;
    const w1 = priorityShares.w1;
    const w2 = priorityShares.w2;
    if (w2 <= 0.001) return '';

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const frac = 0.05 + (0.95 * i) / steps;
      const ux = frac;
      const term = (targetU - w1 * Math.log(ux)) / w2;
      const uy = Math.exp(term);
      if (uy >= 0.05 && uy <= 1.05) {
        const valX =
          xDef.direction === 'min'
            ? bounds.x.max -
              ((ux - 0.05) / 0.95) * (bounds.x.max - bounds.x.min)
            : bounds.x.min +
              ((ux - 0.05) / 0.95) * (bounds.x.max - bounds.x.min);
        const valY =
          yDef.direction === 'min'
            ? bounds.y.max -
              ((uy - 0.05) / 0.95) * (bounds.y.max - bounds.y.min)
            : bounds.y.min +
              ((uy - 0.05) / 0.95) * (bounds.y.max - bounds.y.min);
        points.push(`${toScreenX(valX)} ${toScreenY(valY)}`);
      }
    }
    if (points.length < 2) return '';
    return `M ${points.join(' L ')}`;
  }, [
    bestChoice,
    activeStep,
    priorityShares,
    xDef.direction,
    yDef.direction,
    bounds,
    toScreenX,
    toScreenY,
  ]);

  return (
    <div className="mt-6 border-t border-slate-800/80 pt-6 space-y-6">
      {/* Top Stepper Bar */}
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
              Follow Steps 1 to 4 to see how smart buyers eliminate overpriced
              hardware traps, or use{' '}
              <strong className="text-amber-300">
                Step 5 (Priority Matcher)
              </strong>{' '}
              to set priorities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { step: 1, label: '1. One Spec' },
                { step: 2, label: '2. Trade-Offs' },
                { step: 3, label: '3. Avoid Bad Deals' },
                { step: 4, label: '4. Best-Deal Line' },
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): Step stories & Priority Selector */}
        <div className="space-y-4 lg:col-span-5">
          <SimpleGuideStepStories
            gpus={gpus}
            constraints={constraints}
            onChangeConstraints={onChangeConstraints}
            maxBudgetBound={maxBudgetBound}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            showAllSteps={showAllSteps}
            focusStep5Only={focusStep5Only}
            setFocusStep5Only={setFocusStep5Only}
            setUnlockedAllSteps={setUnlockedAllSteps}
            xMetric={xMetric}
            yMetric={yMetric}
            onSelectXMetric={onSelectXMetric}
            onSelectYMetric={onSelectYMetric}
            step1Leader={step1Leader}
            frontier2DGpus={frontier2DGpus}
            dominated2DGpus={dominated2DGpus}
            spotlightTrap={spotlightTrap}
            spotlightDominators={spotlightDominators}
            trapSpotlightIdx={trapSpotlightIdx}
            setTrapSpotlightIdx={setTrapSpotlightIdx}
            onlyFrontier={onlyFrontier}
            setOnlyFrontier={setOnlyFrontier}
          />

          {/* Step 5 Priority Controls */}
          <SimpleGuideStep5Priority
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            showAllSteps={showAllSteps}
            useThreeVars={useThreeVars}
            setUseThreeVars={setUseThreeVars}
            twoVarAlpha={twoVarAlpha}
            setTwoVarAlpha={setTwoVarAlpha}
            priorityShares={priorityShares}
            xMetric={xMetric}
            yMetric={yMetric}
            zMetric={zMetric}
            onSelectXMetric={onSelectXMetric}
            onSelectYMetric={onSelectYMetric}
            onSelectZMetric={onSelectZMetric}
            syncGlobalWeights={syncGlobalWeights}
            xDef={xDef}
            yDef={yDef}
            bestChoice={bestChoice}
          />
        </div>

        {/* Right Column (7 cols): Graphic & Top Value Recommendations */}
        <div className="space-y-6 lg:col-span-7">
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

          {/* Top 3 Pareto Choices */}
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
                  Ranked along the best-deal line using {xDef.shortLabel} and{' '}
                  {yDef.shortLabel}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSwitchToHyper}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Hyper-Graph
                </button>
                <button
                  type="button"
                  onClick={onSwitchTo3D}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition"
                >
                  <Layers className="h-3.5 w-3.5" />
                  3D Cube
                </button>
                <button
                  type="button"
                  onClick={onSwitchToExplorer}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Explorer →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topThreeChoices.map((item, idx) => {
                const { gpu, matchPct, ux, uy, uz } = item;
                const isSelected = selectedGpuIds.includes(gpu.id);
                const fpsPer100 = (
                  (gpu.rasterFps1440p / gpu.price) *
                  100
                ).toFixed(1);

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
                              : '#3 Alternative'}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-amber-300">
                          {matchPct.toFixed(0)}% Match
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-white">
                        {gpu.name}
                      </h4>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-lg font-black text-emerald-400">
                          ${gpu.price}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {fpsPer100} FPS / $100
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
                        <SkewedStatBar
                          label={xDef.shortLabel}
                          valueText={
                            xMetric === 'price'
                              ? `$${gpu.price}`
                              : `${gpu[xMetric]} ${xDef.unit}`
                          }
                          pct={ux * 100}
                          colorClass="bg-emerald-400"
                        />
                        <SkewedStatBar
                          label={yDef.shortLabel}
                          valueText={`${gpu[yMetric]} ${yDef.unit}`}
                          pct={uy * 100}
                          colorClass="bg-sky-400"
                        />
                        {useThreeVars ? (
                          <SkewedStatBar
                            label={zDef.shortLabel}
                            valueText={
                              zMetric === 'price'
                                ? `$${gpu.price}`
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
};
