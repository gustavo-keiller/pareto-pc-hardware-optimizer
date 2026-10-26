import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { PriorityProfile, PriorityScoredGpu } from '../lib/math/priorityModel';
import {
  FlipPoint,
  PickConfidence,
  TopChangeReason,
  isPracticalTie,
} from '../lib/math/priorityInsights';
import { AppLocale, tp } from '../utils/i18n';
import { priorityLabel } from '../utils/priorityLabels';

const BAR_COLORS = [
  'bg-violet-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-teal-400',
  'bg-fuchsia-400',
  'bg-lime-400',
];

const CONFIDENCE_STYLE: Record<PickConfidence, string> = {
  confident: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  likely: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  'close-call': 'border-amber-500/40 bg-amber-500/15 text-amber-300',
};

const CONFIDENCE_KEY = {
  confident: 'confident',
  likely: 'likely',
  'close-call': 'closeCall',
} as const;

/** Score badge shown on the #1 card: "7.8/10 for you" + how sure we are. */
export const PickScoreBadges: React.FC<{
  top: PriorityScoredGpu;
  confidence: PickConfidence;
  locale: AppLocale;
}> = ({ top, confidence, locale }) => (
  <>
    <span
      data-testid="pick-score"
      className="rounded bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-200 border border-violet-500/30"
    >
      {tp('scoreForYou', locale, { score: top.score.toFixed(1) })}
    </span>
    <span
      className={`rounded border px-2 py-0.5 text-xs font-bold ${CONFIDENCE_STYLE[confidence]}`}
    >
      {tp(CONFIDENCE_KEY[confidence], locale)}
    </span>
  </>
);

/**
 * "Why this pick" (PRI-05, PRI-10): exact points per priority, ties, what just
 * changed, and the smallest slider move that would change the pick.
 */
export const PickInsights: React.FC<{
  ranked: PriorityScoredGpu[];
  profile: PriorityProfile;
  flips: FlipPoint[];
  rankChange: TopChangeReason | null;
  setAsideCount: number;
  locale: AppLocale;
  onApplyFlip: (flip: FlipPoint) => void;
}> = ({
  ranked,
  profile,
  flips,
  rankChange,
  setAsideCount,
  locale,
  onApplyFlip,
}) => {
  const [top, second] = ranked;
  if (!top) return null;
  const nameOf = (id: string) =>
    ranked.find((r) => r.gpu.id === id)?.gpu.name ?? id;
  const tie = second && isPracticalTie(top, second);
  // Flip points are in raw weights; show them as the share of the score the panel displays.
  const shareAfter = (f: FlipPoint) => {
    const others = profile.entries
      .filter((e) => e.id !== f.paramId)
      .reduce((a, e) => a + Math.max(0, e.weight), 0);
    const total = others + f.toWeight;
    return total > 0 ? Math.round((f.toWeight / total) * 100) : 0;
  };

  return (
    <div data-testid="pick-insights" className="mt-4 space-y-3">
      {rankChange && (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100"
        >
          <TrendingUp className="h-4 w-4 shrink-0 text-violet-300" />
          {tp(
            rankChange.raised ? 'rankChangeRaised' : 'rankChangeLowered',
            locale,
            {
              name: top.gpu.name,
              param: priorityLabel(rankChange.paramId, profile, locale),
            },
          )}
        </p>
      )}
      {tie && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {tp('practicalTie', locale, { name: second.gpu.name })}
        </p>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {tp('pointsTitle', locale)}
          </span>
          <span className="font-mono text-xs font-bold text-violet-200">
            {top.score.toFixed(1)}/10
          </span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          {top.contributions.map((c, i) => (
            <div
              key={c.id}
              className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full transition-all duration-300`}
              style={{ width: `${c.points * 10}%` }}
              title={`${priorityLabel(c.id, profile, locale)}: ${c.points.toFixed(1)}`}
            />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {top.contributions.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                />
                {priorityLabel(c.id, profile, locale)}
                {c.missing && (
                  <span className="text-[9px] text-slate-500">
                    ({tp('noData', locale)})
                  </span>
                )}
              </span>
              <span className="font-mono text-slate-400">
                {c.points.toFixed(1)} / {(c.share * 10).toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[10px] text-slate-500">
          {tp('pointsHint', locale)}
        </p>
      </div>

      {flips.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            {tp('flipTitle', locale)}
          </div>
          {flips.map((f) => (
            <div
              key={`${f.challengerId}-${f.paramId}`}
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
            >
              <span>
                {tp(
                  f.toWeight > f.fromWeight ? 'flipRaise' : 'flipLower',
                  locale,
                  {
                    param: priorityLabel(f.paramId, profile, locale),
                    to: shareAfter(f),
                    name: nameOf(f.challengerId),
                  },
                )}
              </span>
              <button
                type="button"
                onClick={() => onApplyFlip(f)}
                className="rounded-lg border border-violet-500/50 bg-violet-500/15 px-2.5 py-1 text-[11px] font-bold text-violet-200 hover:bg-violet-500/25"
              >
                {tp('flipTry', locale)}
              </button>
            </div>
          ))}
        </div>
      )}

      {setAsideCount > 0 && (
        <p className="text-[11px] text-slate-500">
          {tp('hiddenCards', locale, { n: setAsideCount })}
        </p>
      )}
    </div>
  );
};
