import React, { useState } from 'react';
import { PriorityEntry, weightsFromChoices } from '../lib/math/priorityModel';
import { AppLocale, tp } from '../utils/i18n';
import { PriorityTranslations } from '../utils/locales/priorities';
import { priorityLabel } from '../utils/priorityLabels';
import { DEFAULT_PRIORITY_PROFILE } from '../lib/math/priorityProfiles';

/** "This or that" questions (PRI-11): each answer gives one point to the chosen side. */
const QUESTIONS: {
  prompt: keyof PriorityTranslations;
  a: string;
  b: string;
}[] = [
  { prompt: 'quizPriceVsFps', a: 'price', b: 'rasterFps1440p' },
  { prompt: 'quizFpsVsVram', a: 'rasterFps1440p', b: 'vramGb' },
  { prompt: 'quizRtVsPrice', a: 'rtFps1440p', b: 'price' },
  { prompt: 'quizPowerVsFps', a: 'tdpWatts', b: 'rasterFps1440p' },
  { prompt: 'quizVramVsPrice', a: 'vramGb', b: 'price' },
  { prompt: 'quizRtVsFps', a: 'rtFps1440p', b: 'rasterFps1440p' },
];

const QUIZ_IDS = [
  'price',
  'rasterFps1440p',
  'rtFps1440p',
  'vramGb',
  'tdpWatts',
];

export const PriorityQuiz: React.FC<{
  locale: AppLocale;
  onFinish: (entries: PriorityEntry[]) => void;
  onCancel: () => void;
}> = ({ locale, onFinish, onCancel }) => {
  const [answers, setAnswers] = useState<string[]>([]);
  const step = answers.length;
  const q = QUESTIONS[step];

  const choose = (id: string) => {
    const next = [...answers, id];
    if (next.length >= QUESTIONS.length) {
      onFinish(weightsFromChoices(QUIZ_IDS, next));
    } else {
      setAnswers(next);
    }
  };

  if (!q) return null;
  return (
    <div
      data-testid="priority-quiz"
      className="rounded-2xl border border-violet-500/40 bg-violet-500/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-violet-300">
          {tp('quizTitle', locale)}
        </span>
        <span className="text-slate-400">
          {tp('quizProgress', locale, { n: step + 1, total: QUESTIONS.length })}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded bg-slate-800">
        <div
          className="h-full bg-violet-400 transition-all"
          style={{ width: `${(step / QUESTIONS.length) * 100}%` }}
        />
      </div>
      <p className="text-sm font-bold text-white">{tp(q.prompt, locale)}</p>
      <div className="grid grid-cols-2 gap-2">
        {[q.a, q.b].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-slate-100 hover:border-violet-400 hover:bg-violet-500/15 transition"
          >
            {priorityLabel(id, DEFAULT_PRIORITY_PROFILE, locale)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-[11px] font-semibold text-slate-400 hover:text-slate-200"
      >
        {tp('quizCancel', locale)}
      </button>
    </div>
  );
};
