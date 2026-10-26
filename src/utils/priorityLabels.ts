import {
  BuiltInParameterId,
  PriorityProfile,
  isBuiltInParameterId,
} from '../lib/math/priorityModel';
import { AppLocale, tp } from './i18n';
import { PriorityTranslations } from './locales/priorities';

const LABEL_KEYS: Record<
  BuiltInParameterId,
  [keyof PriorityTranslations, keyof PriorityTranslations]
> = {
  price: ['p_price', 'd_price'],
  rasterFps1440p: ['p_rasterFps1440p', 'd_rasterFps1440p'],
  rtFps1440p: ['p_rtFps1440p', 'd_rtFps1440p'],
  vramGb: ['p_vramGb', 'd_vramGb'],
  tdpWatts: ['p_tdpWatts', 'd_tdpWatts'],
  fpsPerPrice: ['p_fpsPerPrice', 'd_fpsPerPrice'],
  fpsPerWatt: ['p_fpsPerWatt', 'd_fpsPerWatt'],
  frameGen: ['p_frameGen', 'd_frameGen'],
  av1: ['p_av1', 'd_av1'],
  cuda: ['p_cuda', 'd_cuda'],
};

/** Display name of a priority parameter (built-in or the user's own). */
export function priorityLabel(
  id: string,
  profile: PriorityProfile,
  locale: AppLocale,
): string {
  if (isBuiltInParameterId(id)) return tp(LABEL_KEYS[id][0], locale);
  return profile.custom.find((c) => c.id === id)?.label ?? id;
}

/** One-line plain-words explanation of a priority parameter. */
export function priorityDescription(id: string, locale: AppLocale): string {
  if (isBuiltInParameterId(id)) return tp(LABEL_KEYS[id][1], locale);
  return tp('d_custom', locale);
}

/** Importance dots (0–5) ↔ weights. */
export const LEVEL_WEIGHTS = [0, 10, 25, 45, 70, 100] as const;

export function weightToLevel(weight: number): number {
  let best = 0;
  for (let i = 1; i < LEVEL_WEIGHTS.length; i++) {
    if (
      Math.abs(LEVEL_WEIGHTS[i] - weight) <
      Math.abs(LEVEL_WEIGHTS[best] - weight)
    )
      best = i;
  }
  return best;
}

const LEVEL_KEYS: (keyof PriorityTranslations)[] = [
  'level0',
  'level1',
  'level2',
  'level3',
  'level4',
  'level5',
];

export function levelName(level: number, locale: AppLocale): string {
  return tp(LEVEL_KEYS[Math.max(0, Math.min(5, level))], locale);
}
