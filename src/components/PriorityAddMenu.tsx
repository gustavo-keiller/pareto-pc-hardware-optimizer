import React, { useState } from 'react';
import {
  BUILT_IN_PARAMETER_IDS,
  CUSTOM_PARAMETER_PREFIX,
  CustomRatingParameter,
  PriorityProfile,
} from '../lib/math/priorityModel';
import { GpuCandidate } from '../lib/math/types';
import { AppLocale, tp } from '../utils/i18n';
import { priorityDescription, priorityLabel } from '../utils/priorityLabels';

/** "+ Add what matters": built-in library plus "create your own rating" (PRI-08, PRI-09). */
export const PriorityAddMenu: React.FC<{
  profile: PriorityProfile;
  locale: AppLocale;
  onAdd: (id: string, custom?: CustomRatingParameter) => void;
}> = ({ profile, locale, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const available = BUILT_IN_PARAMETER_IDS.filter(
    (id) => !profile.entries.some((e) => e.id === id),
  );

  const createCustom = () => {
    const label = name.trim().slice(0, 40);
    if (!label) return;
    let n = profile.custom.length + 1;
    while (
      profile.custom.some((c) => c.id === `${CUSTOM_PARAMETER_PREFIX}${n}`)
    )
      n++;
    const custom: CustomRatingParameter = {
      kind: 'manual-rating',
      id: `${CUSTOM_PARAMETER_PREFIX}${n}`,
      label,
      ratings: {},
    };
    onAdd(custom.id, custom);
    setName('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-dashed border-violet-500/50 px-3 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-500/10 transition"
      >
        {tp('addButton', locale)}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl space-y-3">
          {available.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {tp('addLibraryTitle', locale)}
              </div>
              <ul className="space-y-1">
                {available.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => {
                        onAdd(id);
                        setOpen(false);
                      }}
                      className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-800"
                    >
                      <div className="text-xs font-bold text-white">
                        {priorityLabel(id, profile, locale)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {priorityDescription(id, locale)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {tp('addCustomTitle', locale)}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createCustom();
                }}
                placeholder={tp('addCustomPlaceholder', locale)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={createCustom}
                disabled={!name.trim()}
                className="rounded-lg bg-violet-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
              >
                {tp('addCustomCreate', locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Lets the user type a 0–10 rating per card for one of their own parameters. */
export const CustomRatingEditor: React.FC<{
  param: CustomRatingParameter;
  gpus: GpuCandidate[];
  locale: AppLocale;
  onChange: (ratings: Record<string, number>) => void;
  onClose: () => void;
}> = ({ param, gpus, locale, onChange, onClose }) => (
  <div className="rounded-2xl border border-violet-500/40 bg-slate-950/80 p-3 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-bold text-white">{param.label}</div>
        <div className="text-[10px] text-slate-400">
          {tp('customRateHint', locale)}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-violet-500 px-3 py-1 text-xs font-bold text-white"
      >
        {tp('customDone', locale)}
      </button>
    </div>
    <ul className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {gpus.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between gap-2 text-[11px]"
        >
          <span className="truncate text-slate-300" title={g.name}>
            {g.name}
          </span>
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            aria-label={`${param.label}: ${g.name}`}
            value={param.ratings[g.id] ?? ''}
            placeholder="5"
            onChange={(e) => {
              const next = { ...param.ratings };
              if (e.target.value === '') {
                delete next[g.id];
              } else {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  next[g.id] = Math.max(0, Math.min(10, v));
              }
              onChange(next);
            }}
            className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right font-mono text-white"
          />
        </li>
      ))}
    </ul>
  </div>
);
