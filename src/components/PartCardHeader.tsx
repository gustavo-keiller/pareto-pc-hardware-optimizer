import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AppLocale, t } from '../utils/i18n';
import { PartPriceTag, PricedPart } from './PartPriceTag';

type Tone =
  'emerald' | 'indigo' | 'amber' | 'sky' | 'purple' | 'cyan' | 'rose' | 'teal';

// Full class strings so Tailwind can see them.
const TONE: Record<Tone, { label: string; swap: string }> = {
  emerald: {
    label: 'text-emerald-400',
    swap: 'hover:bg-emerald-500/20 hover:text-emerald-300',
  },
  indigo: {
    label: 'text-indigo-400',
    swap: 'hover:bg-indigo-500/20 hover:text-indigo-300',
  },
  amber: {
    label: 'text-amber-400',
    swap: 'hover:bg-amber-500/20 hover:text-amber-300',
  },
  sky: {
    label: 'text-sky-400',
    swap: 'hover:bg-sky-500/20 hover:text-sky-300',
  },
  purple: {
    label: 'text-purple-400',
    swap: 'hover:bg-purple-500/20 hover:text-purple-300',
  },
  cyan: {
    label: 'text-cyan-400',
    swap: 'hover:bg-cyan-500/20 hover:text-cyan-300',
  },
  rose: {
    label: 'text-rose-400',
    swap: 'hover:bg-rose-500/20 hover:text-rose-300',
  },
  teal: {
    label: 'text-teal-400',
    swap: 'hover:bg-teal-500/20 hover:text-teal-300',
  },
};

export interface PartCardHeaderProps {
  tone: Tone;
  part: PricedPart;
  /** Category name for the swap button's accessible label. */
  partLabel: string;
  onSwap?: () => void;
  currency: 'USD' | 'BRL';
  locale: AppLocale;
  /** Icon and category label shown on the left. */
  children: React.ReactNode;
}

/** Top row of a build part card: category, swap button and price tag. */
export const PartCardHeader: React.FC<PartCardHeaderProps> = ({
  tone,
  part,
  partLabel,
  onSwap,
  currency,
  locale,
  children,
}) => (
  <div className="flex items-center justify-between text-xs">
    <span
      className={`font-bold uppercase tracking-wider ${TONE[tone].label} flex items-center gap-1.5`}
    >
      {children}
    </span>
    <div className="flex items-center gap-1.5">
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 ${TONE[tone].swap} transition`}
          aria-label={`${t('swapPart', locale)} ${partLabel}`}
          title={`${t('swapPart', locale)} ${partLabel}`}
        >
          <RefreshCw className="h-2.5 w-2.5 inline mr-1" />
          {t('swapPart', locale)}
        </button>
      )}
      <PartPriceTag part={part} currency={currency} locale={locale} />
    </div>
  </div>
);
