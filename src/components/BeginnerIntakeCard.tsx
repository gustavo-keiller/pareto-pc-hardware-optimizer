import React from 'react';
import { Monitor, Sparkles, Zap, Flame, Bot, Layers } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export type BeginnerGoal = 'gpu' | 'pc';

export type BeginnerUseCase =
  'esports-1080p' | 'sweetspot-1440p' | 'enthusiast-4k' | 'creator-ai';

export interface BeginnerIntakeCardProps {
  goal: BeginnerGoal;
  useCase: BeginnerUseCase;
  budget: number;
  currency: 'USD' | 'BRL';
  maxBudgetBound: number;
  onSelectGoal: (goal: BeginnerGoal) => void;
  onSelectUseCase: (useCase: BeginnerUseCase) => void;
  onSelectBudget: (budget: number) => void;
}

interface UseCaseOption {
  id: BeginnerUseCase;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const USE_CASES: UseCaseOption[] = [
  {
    id: 'esports-1080p',
    title: '1080p Esports / Budget',
    subtitle:
      'Max FPS per dollar for Valorant, CS2, Fortnite, and low-latency gaming.',
    icon: Zap,
  },
  {
    id: 'sweetspot-1440p',
    title: '1440p High Refresh (Sweet Spot)',
    subtitle:
      'Optimal value: 12GB+ VRAM, high FPS in modern AAA titles at 1440p.',
    icon: Sparkles,
  },
  {
    id: 'enthusiast-4k',
    title: '4K & Ray Tracing Enthusiast',
    subtitle:
      'High visual fidelity, modern Ray Tracing, and 16GB+ VRAM capacity.',
    icon: Flame,
  },
  {
    id: 'creator-ai',
    title: 'Creator & AI Workloads',
    subtitle:
      'High VRAM, CUDA/Tensor cores for video editing, 3D render, and local LLMs.',
    icon: Bot,
  },
];

const GPU_BUDGET_PRESETS_USD = [250, 350, 550, 800, 1200];
const GPU_BUDGET_PRESETS_BRL = [1800, 2500, 3500, 5000, 8000];

const PC_BUDGET_PRESETS_USD = [750, 1000, 1500, 2200, 3200];
const PC_BUDGET_PRESETS_BRL = [4500, 6000, 9000, 14000, 20000];

export const BeginnerIntakeCard: React.FC<BeginnerIntakeCardProps> = ({
  goal,
  useCase,
  budget,
  currency,
  maxBudgetBound,
  onSelectGoal,
  onSelectUseCase,
  onSelectBudget,
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

  return (
    <section
      data-testid="beginner-intake"
      className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-xl space-y-6"
    >
      {/* Step 1: Goal (GPU vs Whole PC) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Step 1 • What Are You Building?
          </span>
          <span className="text-xs text-slate-400">
            {goal === 'gpu' ? 'Graphics Card Only' : 'Complete PC Build'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSelectGoal('gpu')}
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
              <div className="text-sm font-bold">Just a Graphics Card</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upgrading your current PC or replacing an older card.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectGoal('pc')}
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
              <div className="text-sm font-bold">A Whole PC Build</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full balanced system: CPU, GPU, RAM, Motherboard, and PSU.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Use Case / Target Resolution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-sky-400">
            Step 2 • Gaming Style &amp; Workload
          </span>
          <span className="text-xs text-slate-400">
            Tailors priorities to your games
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {USE_CASES.map((uc) => {
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

      {/* Step 3: Budget Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Step 3 • Maximum Budget Limit
          </span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            Up to {formatCurrency(budget, currency)}
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
                ≤ {formatCurrency(amount, currency)}
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
            All Limits
          </button>
        </div>
      </div>
    </section>
  );
};
