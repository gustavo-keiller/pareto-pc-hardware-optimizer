import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { PreferenceWeights } from '../lib/math/types';
import { AppLocale, t } from '../utils/i18n';
import { safeGetJSON, safeSetJSON } from '../utils/storage';

export const SAVED_PROFILES_STORAGE_KEY = 'paretopc_saved_weight_profiles_v1';

export interface SavedWeightProfile {
  id: string;
  name: string;
  createdAt: number;
  weights: PreferenceWeights;
}

export interface CustomWeightProfilesManagerProps {
  currentWeights: PreferenceWeights;
  activeProfileId: string | null;
  onApplyProfile: (profile: SavedWeightProfile) => void;
  locale?: AppLocale;
}

export const CustomWeightProfilesManager: React.FC<
  CustomWeightProfilesManagerProps
> = ({ currentWeights, activeProfileId, onApplyProfile, locale = 'pt-BR' }) => {
  const [profiles, setProfiles] = useState<SavedWeightProfile[]>(() =>
    safeGetJSON<SavedWeightProfile[]>(SAVED_PROFILES_STORAGE_KEY, []),
  );
  const [nameInput, setNameInput] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const newProfile: SavedWeightProfile = {
      id: `profile-${Date.now()}`,
      name: trimmed,
      createdAt: Date.now(),
      weights: { ...currentWeights },
    };

    const updated = [newProfile, ...profiles];
    setProfiles(updated);
    safeSetJSON(SAVED_PROFILES_STORAGE_KEY, updated);
    setNameInput('');
    onApplyProfile(newProfile);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    safeSetJSON(SAVED_PROFILES_STORAGE_KEY, updated);
  };

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
        <Bookmark className="h-3.5 w-3.5 text-amber-400" />
        <span>{t('weightsProfilesTitle', locale)}</span>
      </div>

      {/* Save Input Form */}
      <form onSubmit={handleSave} className="flex gap-2 mb-3">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={t('weightsProfilesPlaceholder', locale)}
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!nameInput.trim()}
          className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('weightsProfilesSaveBtn', locale)}</span>
        </button>
      </form>

      {/* Saved Profiles List */}
      {profiles.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          {t('weightsProfilesNoProfiles', locale)}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {profiles.map((profile) => {
            const isActive = activeProfileId === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => onApplyProfile(profile)}
                className={`flex items-center justify-between rounded-lg border p-2 text-xs cursor-pointer transition ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-500/15 text-white'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">
                      {profile.name}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 shrink-0">
                        <Check className="h-2.5 w-2.5" />
                        {t('weightsProfilesActive', locale)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap gap-1.5">
                    <span>${profile.weights.price}%</span>
                    <span>FPS:{profile.weights.rasterFps1440p}%</span>
                    <span>RT:{profile.weights.rtFps1440p}%</span>
                    <span>VRAM:{profile.weights.vramGb}%</span>
                    <span>W:{profile.weights.tdpWatts}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(profile.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                    title={t('weightsProfilesDelete', locale)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
