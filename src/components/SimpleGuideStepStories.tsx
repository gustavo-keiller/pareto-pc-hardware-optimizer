import React from 'react';
import {
  HardConstraints,
  METRIC_DEFINITIONS,
  MetricKey,
  RankedGpu,
  isMetricKey,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { StoryStep } from './SimpleGuideScatterPlot';
import {
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Cpu,
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Eye,
  EyeOff,
  Award,
} from 'lucide-react';

export interface SimpleGuideStepStoriesProps {
  gpus: RankedGpu[];
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints,
  ) => void;
  maxBudgetBound: number;
  activeStep: StoryStep;
  setActiveStep: (step: StoryStep) => void;
  showAllSteps: boolean;
  focusStep5Only: boolean;
  setFocusStep5Only: (focus: boolean) => void;
  setUnlockedAllSteps: (unlocked: boolean) => void;
  xMetric: MetricKey;
  yMetric: MetricKey;
  onSelectXMetric: (m: MetricKey) => void;
  onSelectYMetric: (m: MetricKey) => void;
  step1Leader: RankedGpu | null;
  frontier2DGpus: RankedGpu[];
  dominated2DGpus: RankedGpu[];
  spotlightTrap: RankedGpu | null;
  spotlightDominators: RankedGpu[];
  trapSpotlightIdx: number;
  setTrapSpotlightIdx: React.Dispatch<React.SetStateAction<number>>;
  onlyFrontier: boolean;
  setOnlyFrontier: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SimpleGuideStepStories: React.FC<SimpleGuideStepStoriesProps> = ({
  gpus,
  constraints,
  onChangeConstraints,
  maxBudgetBound,
  activeStep,
  setActiveStep,
  showAllSteps,
  focusStep5Only,
  setFocusStep5Only,
  setUnlockedAllSteps,
  xMetric,
  yMetric,
  onSelectXMetric,
  onSelectYMetric,
  step1Leader,
  frontier2DGpus,
  dominated2DGpus,
  spotlightTrap,
  spotlightDominators,
  trapSpotlightIdx,
  setTrapSpotlightIdx,
  onlyFrontier,
  setOnlyFrontier,
}) => {
  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];

  return (
    <>
      {/* Quick Wallet Budget Filter */}
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
                      if (isAll) return { ...prev, selectedVendors: [] };
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

      {/* Walkthrough Progress Banner */}
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

      {/* All Steps Unlocked Banner */}
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

      {/* Focused on Step 5 Banner */}
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

      {/* STEP 1 CARD */}
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
            Comparing graphics cards by just one metric seems simple. If you
            only rank GPUs by{' '}
            <select
              aria-label="Step 1 Metric"
              value={yMetric}
              onChange={(e) => {
                e.stopPropagation();
                if (isMetricKey(e.target.value))
                  onSelectYMetric(e.target.value);
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
            ({step1Leader ? `${step1Leader[yMetric]} ${yDef.unit}` : ''} for $
            {step1Leader?.price}) is the obvious pick. But looking at only one
            specification ignores price and power consumption, which is how
            buyers overspend by hundreds of dollars.
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

      {/* STEP 2 CARD */}
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
            Smart shoppers never evaluate performance in isolation. You have to
            balance{' '}
            <span className="italic text-sky-300">{yDef.shortLabel}</span>{' '}
            against{' '}
            <span className="italic text-emerald-300">{xDef.shortLabel}</span>.
            Finding the right card means making a clear trade-off between{' '}
            <select
              aria-label="Trade-off Variable 1"
              value={xMetric}
              onChange={(e) => {
                e.stopPropagation();
                if (isMetricKey(e.target.value))
                  onSelectXMetric(e.target.value);
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
                if (isMetricKey(e.target.value))
                  onSelectYMetric(e.target.value);
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

      {/* STEP 3 CARD */}
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
                Some graphics cards on retail shelves are strictly worse than
                competitors. In decision theory, these are called{' '}
                <strong className="text-rose-400 font-bold">value traps</strong>
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
                <strong className="text-rose-300">{spotlightTrap.name}</strong>{' '}
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
                Next: The Value Frontier <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4 CARD */}
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
            . Every card on this line delivers the maximum performance at its
            price bracket.
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
                <Award className="h-3.5 w-3.5" /> Unlock Step 5: Priorities
                &amp; Top Picks <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
