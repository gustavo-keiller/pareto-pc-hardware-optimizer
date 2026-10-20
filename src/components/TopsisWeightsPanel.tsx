import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import {
  MetricKey,
  METRIC_DEFINITIONS,
  PreferenceWeights,
} from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import {
  PRESET_PROFILES,
  PresetProfile,
  UiMode,
} from '../hooks/useOptimizerState';
import { AppLocale } from '../utils/i18n';
import { CustomWeightProfilesManager } from './CustomWeightProfilesManager';

export interface TopsisWeightsPanelProps {
  weights: PreferenceWeights;
  normalizedWeights: Record<MetricKey, number>;
  activePresetId: string;
  uiMode: UiMode;
  locale?: AppLocale;
  onChangeWeights: (
    updater: (prev: PreferenceWeights) => PreferenceWeights,
  ) => void;
  onApplyPreset: (preset: PresetProfile) => void;
  onSelectCustomPreset: () => void;
}

export const TopsisWeightsPanel: React.FC<TopsisWeightsPanelProps> = ({
  weights,
  normalizedWeights,
  activePresetId,
  uiMode,
  locale = 'pt-BR',
  onChangeWeights,
  onApplyPreset,
  onSelectCustomPreset,
}) => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Stage 3: TOPSIS Priority Weights
          </h2>
        </div>
        {uiMode === 'pro' && (
          <span className="text-[11px] text-slate-400">∑ wⱼ = 100%</span>
        )}
      </div>

      {/* Buyer Persona Cards */}
      <div className="mt-3">
        <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Quick Buyer Persona Presets:
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_PROFILES.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`rounded-xl border p-2.5 text-left transition ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/90 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.label}</span>
                  {isActive && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {preset.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Objective Weights */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
        <span className="block text-[11px] font-semibold text-slate-400">
          Individual Objective Weights:
        </span>

        <div className="space-y-3 pt-1">
          {ALL_METRIC_KEYS.map((metric) => {
            const def = METRIC_DEFINITIONS[metric];
            const rawVal = weights[metric];
            const normPct = Math.round(normalizedWeights[metric] * 100);

            return (
              <div key={metric}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor={`weight-${metric}`}
                    className="font-medium text-slate-200 flex items-center gap-1.5"
                  >
                    <span>{def.shortLabel}</span>
                    {uiMode === 'pro' && (
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
                          def.direction === 'min'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-sky-500/15 text-sky-400'
                        }`}
                      >
                        {def.direction}
                      </span>
                    )}
                  </label>
                  <div className="font-mono text-xs">
                    <span className="text-amber-400 font-semibold">
                      {normPct}%
                    </span>
                  </div>
                </div>
                <input
                  id={`weight-${metric}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={rawVal}
                  onChange={(e) => {
                    onSelectCustomPreset();
                    onChangeWeights((prev) => ({
                      ...prev,
                      [metric]: Number(e.target.value),
                    }));
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {uiMode === 'pro' && (
        <CustomWeightProfilesManager
          currentWeights={weights}
          activeProfileId={activePresetId}
          onApplyProfile={(profile) => {
            onSelectCustomPreset();
            onChangeWeights(() => profile.weights);
          }}
          locale={locale}
        />
      )}
    </section>
  );
};
