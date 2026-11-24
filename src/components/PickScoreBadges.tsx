import React from 'react';
import { PriorityScoredGpu } from '../lib/math/priorityModel';
import { PickConfidence } from '../lib/math/priorityInsights';
import { AppLocale, tp } from '../utils/i18n';

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
