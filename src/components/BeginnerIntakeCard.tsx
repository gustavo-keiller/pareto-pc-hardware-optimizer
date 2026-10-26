import React from 'react';
import { Monitor, Sparkles, Zap, Flame, Bot, Layers } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';

export type BeginnerGoal = 'gpu' | 'pc';

export type BeginnerUseCase =
  'esports-1080p' | 'sweetspot-1440p' | 'enthusiast-4k' | 'creator-ai';

export interface BeginnerIntakeCardProps {
  goal: BeginnerGoal;
  useCase: BeginnerUseCase;
  budget: number;
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  maxBudgetBound: number;
  onSelectGoal: (goal: BeginnerGoal) => void;
  onSelectUseCase: (useCase: BeginnerUseCase) => void;
  onSelectBudget: (budget: number) => void;
  /** Rendered right after the use-case choice: the "What matters to you" panel (PRI-07). */
  priorityPanel?: React.ReactNode;
}

interface UseCaseOption {
  id: BeginnerUseCase;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

function getUseCases(locale: AppLocale): UseCaseOption[] {
  return [
    {
      id: 'esports-1080p',
      title: t('intakeUc1080pTitle', locale),
      subtitle: t('intakeUc1080pDesc', locale),
      icon: Zap,
    },
    {
      id: 'sweetspot-1440p',
      title: t('intakeUc1440pTitle', locale),
      subtitle: t('intakeUc1440pDesc', locale),
      icon: Sparkles,
    },
    {
      id: 'enthusiast-4k',
      title: t('intakeUc4kTitle', locale),
      subtitle: t('intakeUc4kDesc', locale),
      icon: Flame,
    },
    {
      id: 'creator-ai',
      title: t('intakeUcAiTitle', locale),
      subtitle: t('intakeUcAiDesc', locale),
      icon: Bot,
    },
  ];
}

const GPU_BUDGET_PRESETS_USD = [250, 350, 550, 800, 1200];
const GPU_BUDGET_PRESETS_BRL = [1800, 2500, 3500, 5000, 8000];

const PC_BUDGET_PRESETS_USD = [750, 1000, 1500, 2200, 3200];
const PC_BUDGET_PRESETS_BRL = [4500, 6000, 9000, 14000, 20000];

export const BeginnerIntakeCard: React.FC<BeginnerIntakeCardProps> = ({
  goal,
  useCase,
  budget,
  currency,
  locale = 'pt-BR',
  maxBudgetBound,
  onSelectGoal,
  onSelectUseCase,
  onSelectBudget,
  priorityPanel,
}) => {
  const isBrl = currency === 'BRL';
  const budgetPresets =
    goal === 'pc'
      ? isBrl
        ? PC_BUDGET_PRESETS_BRL
        : PC_BUDGET_PRESETS_USD
      : isBrl
        ? GPU_BUDGET_PRESETS_BRL
        : GPU_BUDGET_PRESETS_USD;

  const handleSelectGoal = (newGoal: 'gpu' | 'pc') => {
    onSelectGoal(newGoal);
    if (newGoal === 'pc' && budget < (isBrl ? 4500 : 750)) {
      onSelectBudget(isBrl ? 6000 : 1000);
    } else if (newGoal === 'gpu' && budget > (isBrl ? 8000 : 1200)) {
      onSelectBudget(isBrl ? 3500 : 550);
    }
  };

  const useCases = getUseCases(locale);

  return (
    <section
      data-testid="beginner-intake"
      className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-xl space-y-6"
    >
      {/* Step 1: Goal (GPU vs Whole PC) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            {t('intakeStep1Title', locale)}
          </span>
          <span className="text-xs text-slate-400">
            {goal === 'gpu'
              ? t('intakeGoalGpu', locale)
              : t('intakeGoalPc', locale)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSelectGoal('gpu')}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
              goal === 'gpu'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10'
                : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                goal === 'gpu'
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">
                {t('intakeGoalGpu', locale)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('intakeGoalGpuDesc', locale)}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectGoal('pc')}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
              goal === 'pc'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10'
                : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                goal === 'pc'
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">
                {t('intakeGoalPc', locale)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('intakeGoalPcDesc', locale)}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Use Case / Target Resolution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-sky-400">
            {t('intakeStep2Title', locale)}
          </span>
          <span className="text-xs text-slate-400">
            {t('intakeStep2Subtitle', locale)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            const isSelected = useCase === uc.id;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => onSelectUseCase(uc.id)}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-sky-500/60 bg-sky-500/15 text-white shadow-md shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-sky-300' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-bold leading-tight">
                      {uc.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {uc.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {priorityPanel}

      {/* Step 3: Budget Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            {t('intakeStep3Title', locale)}
          </span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {t('intakeUpTo', locale)}
            {formatCurrency(budget, currency, false, locale)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {budgetPresets.map((amount) => {
            const isSelected = budget === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => onSelectBudget(amount)}
                className={`flex-1 min-w-[100px] rounded-xl border px-3 py-2 text-xs font-bold transition text-center ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                ≤ {formatCurrency(amount, currency, false, locale)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectBudget(maxBudgetBound)}
            className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
              budget >= maxBudgetBound
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {t('intakeNoLimit', locale)}
          </button>
        </div>
      </div>
    </section>
  );
};
