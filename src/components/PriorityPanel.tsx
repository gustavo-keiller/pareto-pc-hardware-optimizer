import React, { useState } from 'react';
import { HelpCircle, Star, X } from 'lucide-react';
import {
  PriorityProfile,
  isFeatureParameter,
  weightShares,
} from '../lib/math/priorityModel';
import { GpuCandidate } from '../lib/math/types';
import { AppLocale, tp } from '../utils/i18n';
import {
  LEVEL_WEIGHTS,
  levelName,
  priorityDescription,
  priorityLabel,
  weightToLevel,
} from '../utils/priorityLabels';
import { PriorityAddMenu, CustomRatingEditor } from './PriorityAddMenu';
import { PriorityQuiz } from './PriorityQuiz';

export interface PriorityPanelProps {
  profile: PriorityProfile;
  onChangeProfile: (
    updater: (prev: PriorityProfile) => PriorityProfile,
  ) => void;
  gpus: GpuCandidate[];
  locale: AppLocale;
}

const FPS_GOALS = [60, 90, 120, 165, 240];
const VRAM_GOALS = [8, 12, 16, 24];

/**
 * "What matters to you" (PRI-07): one row per priority with 0–5 importance dots,
 * the share of the score it carries, and the user's "good enough" goals.
 */
export const PriorityPanel: React.FC<PriorityPanelProps> = ({
  profile,
  onChangeProfile,
  gpus,
  locale,
}) => {
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const shares = weightShares(profile.entries);

  const setWeight = (id: string, weight: number) =>
    onChangeProfile((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === id ? { ...e, weight } : e)),
    }));

  const toggleMustHave = (id: string) =>
    onChangeProfile((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === id ? { ...e, mustHave: !e.mustHave } : e,
      ),
    }));

  const remove = (id: string) =>
    onChangeProfile((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
      custom: prev.custom.filter((c) => c.id !== id),
    }));

  const ratingParam = profile.custom.find((c) => c.id === ratingId) ?? null;

  return (
    <div data-testid="priority-panel" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-300">
            {tp('panelTitle', locale)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl">
            {tp('panelSubtitle', locale)}
          </p>
        </div>
        {!quizOpen && (
          <button
            type="button"
            onClick={() => {
              setQuizOpen(true);
              setQuizDone(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20 transition"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {tp('quizOpen', locale)}
          </button>
        )}
      </div>

      {quizOpen ? (
        <PriorityQuiz
          locale={locale}
          onCancel={() => setQuizOpen(false)}
          onFinish={(entries) => {
            onChangeProfile((prev) => ({
              ...prev,
              entries: [
                ...entries,
                ...prev.entries.filter(
                  (e) => !entries.some((n) => n.id === e.id),
                ),
              ],
            }));
            setQuizOpen(false);
            setQuizDone(true);
          }}
        />
      ) : (
        <>
          {quizDone && (
            <p className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-200">
              {tp('quizResult', locale)}
            </p>
          )}
          <ul className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/60">
            {profile.entries.map((entry) => {
              const label = priorityLabel(entry.id, profile, locale);
              const level = weightToLevel(entry.weight);
              const sharePct = Math.round((shares[entry.id] ?? 0) * 100);
              const isCustom = profile.custom.some((c) => c.id === entry.id);
              return (
                <li
                  key={entry.id}
                  data-testid={`priority-row-${entry.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5"
                >
                  <div className="basis-full sm:basis-0 sm:min-w-[9rem] sm:flex-1">
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[10px] text-slate-500 leading-snug">
                      {priorityDescription(entry.id, locale)}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div
                      role="radiogroup"
                      aria-label={label}
                      className="flex items-center gap-1"
                    >
                      {LEVEL_WEIGHTS.map((w, i) =>
                        i === 0 ? (
                          <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={level === 0}
                            aria-label={`${label}: ${levelName(0, locale)}`}
                            title={levelName(0, locale)}
                            onClick={() => setWeight(entry.id, 0)}
                            className={`mr-0.5 h-6 w-6 rounded-full border text-[10px] font-bold transition ${
                              level === 0
                                ? 'border-slate-500 bg-slate-700 text-white'
                                : 'border-slate-700 text-slate-500 hover:border-slate-500'
                            }`}
                          >
                            0
                          </button>
                        ) : (
                          <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={level === i}
                            aria-label={`${label}: ${levelName(i, locale)}`}
                            title={levelName(i, locale)}
                            onClick={() => setWeight(entry.id, w)}
                            className="p-0.5"
                          >
                            <Star
                              className={`h-5 w-5 transition ${
                                i <= level
                                  ? 'fill-violet-400 text-violet-400'
                                  : 'text-slate-700 hover:text-slate-500'
                              }`}
                            />
                          </button>
                        ),
                      )}
                    </div>
                    <div className="w-16 text-right">
                      <div className="font-mono text-xs font-bold text-violet-200">
                        {sharePct}%
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {levelName(level, locale)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isFeatureParameter(entry.id) && (
                        <label className="flex items-center gap-1 text-[10px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={entry.mustHave === true}
                            onChange={() => toggleMustHave(entry.id)}
                            className="accent-violet-500"
                          />
                          {tp('mustHave', locale)}
                        </label>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => setRatingId(entry.id)}
                          className="rounded-lg border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white"
                        >
                          {tp('customEdit', locale)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        aria-label={`${tp('remove', locale)} ${label}`}
                        title={tp('remove', locale)}
                        className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {ratingParam && (
            <CustomRatingEditor
              param={ratingParam}
              gpus={gpus}
              locale={locale}
              onChange={(ratings) =>
                onChangeProfile((prev) => ({
                  ...prev,
                  custom: prev.custom.map((c) =>
                    c.id === ratingParam.id ? { ...c, ratings } : c,
                  ),
                }))
              }
              onClose={() => setRatingId(null)}
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PriorityAddMenu
              profile={profile}
              locale={locale}
              onAdd={(id, custom) => {
                onChangeProfile((prev) => ({
                  ...prev,
                  entries: [...prev.entries, { id, weight: LEVEL_WEIGHTS[3] }],
                  custom: custom ? [...prev.custom, custom] : prev.custom,
                }));
                if (custom) setRatingId(custom.id);
              }}
            />
            <GoalChips
              label={tp('goalFps', locale)}
              values={FPS_GOALS}
              current={profile.targets.fps}
              suffix=" FPS"
              onPick={(fps) =>
                onChangeProfile((prev) => ({
                  ...prev,
                  targets: { ...prev.targets, fps },
                }))
              }
            />
            <GoalChips
              label={tp('goalVram', locale)}
              values={VRAM_GOALS}
              current={profile.targets.vramGb}
              suffix=" GB"
              onPick={(vramGb) =>
                onChangeProfile((prev) => ({
                  ...prev,
                  targets: { ...prev.targets, vramGb },
                }))
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

function GoalChips({
  label,
  values,
  current,
  suffix,
  onPick,
}: {
  label: string;
  values: number[];
  current: number;
  suffix: string;
  onPick: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-semibold text-slate-400">{label}:</span>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={current === v}
          onClick={() => onPick(v)}
          className={`rounded-lg border px-2 py-0.5 font-mono font-bold transition ${
            current === v
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          {v}
          {suffix}
        </button>
      ))}
    </div>
  );
}
