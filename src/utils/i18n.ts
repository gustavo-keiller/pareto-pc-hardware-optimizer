/**
 * i18n.ts — Lightweight typed dictionary and localization helper for ParetoPC.
 * Supports Brazil-first testing ('pt-BR' default) and English ('en-US').
 * Complies with GLOSSARY.md for beginner-friendly, jargon-free hardware copywriting.
 */

import { enUS } from './locales/enUS';
import { ptBR } from './locales/ptBR';
import { AppLocale, Translations } from './locales/types';
import type { MetricKey } from '../lib/math/types';

export type { AppLocale, Translations } from './locales/types';
export { DEFAULT_LOCALE, isAppLocale } from './locales/types';

export const TRANSLATIONS: Record<AppLocale, Translations> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

/**
 * Access a typed localized string by its dictionary key.
 */
export function t(
  key: keyof Translations,
  locale: AppLocale = 'pt-BR',
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS['pt-BR'];
  return dict[key] ?? TRANSLATIONS['pt-BR'][key] ?? String(key);
}

/**
 * Returns dynamic header badges for the active UI mode.
 */
export function getHeaderBadge(
  uiMode: string,
  locale: AppLocale = 'pt-BR',
): string {
  if (locale === 'pt-BR') {
    switch (uiMode) {
      case 'simple':
        return 'Guia do Comprador';
      case 'explorer':
        return 'Explorador Visual';
      case 'builds':
        return 'Montador de PCs';
      default:
        return 'Laboratório Matemático';
    }
  }
  switch (uiMode) {
    case 'simple':
      return 'Easy Buyer Guide';
    case 'explorer':
      return 'Visual Axis Explorer';
    case 'builds':
      return 'Balanced Full-PC Builder';
    default:
      return 'Pro MCDM Lab';
  }
}

/**
 * Returns dynamic header subtitles for the active UI mode.
 */
export function getHeaderSubtitle(
  mode: 'simple' | 'explorer' | 'pro' | 'builds',
  locale: AppLocale = 'pt-BR',
): string {
  if (locale === 'pt-BR') {
    switch (mode) {
      case 'simple':
        return 'Recomendações diretas, passo a passo, sem complicação ou termos difíceis';
      case 'explorer':
        return 'Explore eixos customizados, visualizações 3D, Hiper-Gráficos 4D–7D e regras de extrapolação';
      case 'builds':
        return 'Monte Processador, Placa de Vídeo, Placa-Mãe, RAM, Armazenamento, Fonte, Gabinete e Cooler em configurações completas balanceadas';
      default:
        return 'Fronteira Hiper-Espacial 4D–7D, Proximidade TOPSIS, Extrapolação e Regressão Hedônica OLS';
    }
  }

  switch (mode) {
    case 'simple':
      return 'Direct step-by-step recommendations without jargon or guesswork';
    case 'explorer':
      return 'Explore custom hardware axes, 3D views, 4D–7D Hyper-Graphs, and custom $/spec extrapolation rules';
    case 'builds':
      return 'Assemble CPU, GPU, Motherboard, RAM, Storage, PSU, Case, and Cooler into Pareto-optimal complete PC systems';
    default:
      return 'Full 4D–7D Hyper-Space Frontier, TOPSIS Closeness, Non-Linear Extrapolation & Hedonic OLS Lab';
  }
}

export function formatAltSavingsText(
  savingsFormatted: string,
  pctSavings: number,
  score: number,
  unit: string,
  pctSpeed: number,
  locale: AppLocale = 'pt-BR',
): string {
  if (locale === 'pt-BR') {
    return `Economize ${savingsFormatted} (${pctSavings}% a menos), mantendo ${score} ${unit} (${pctSpeed}% do desempenho da primeira opção).`;
  }
  return `Save ${savingsFormatted} (${pctSavings}% less) while keeping ${score} ${unit} (${pctSpeed}% speed of the top build).`;
}

export function formatAltStepUpText(
  scoreDiff: number,
  unit: string,
  pctScore: number,
  stepUpScore: number,
  extraPriceFormatted: string,
  locale: AppLocale = 'pt-BR',
): string {
  if (locale === 'pt-BR') {
    return `Entrega +${scoreDiff} ${unit} (+${pctScore}%) chegando a ${stepUpScore} ${unit} por +${extraPriceFormatted} adicionais.`;
  }
  return `Delivers +${scoreDiff} ${unit} (+${pctScore}%) reaching ${stepUpScore} ${unit} for +${extraPriceFormatted} more.`;
}

/**
 * Localized short label for a TOPSIS metric (Explorer & Pro Lab panels).
 */
export function getMetricShortLabel(
  metric: MetricKey,
  locale: AppLocale = 'pt-BR',
): string {
  switch (metric) {
    case 'price':
      return t('xpMetricPrice', locale);
    case 'rasterFps1440p':
      return t('xpMetricRaster', locale);
    case 'rtFps1440p':
      return t('xpMetricRt', locale);
    case 'vramGb':
      return t('xpMetricVram', locale);
    case 'tdpWatts':
      return t('xpMetricPower', locale);
    default: {
      const _exhaustive: never = metric;
      return String(_exhaustive);
    }
  }
}

/**
 * Localized label and description for a built-in weight preset.
 * Unknown preset ids fall back to the caller's English copy.
 */
export function getPresetCopy(
  presetId: string,
  fallback: { label: string; shortDesc: string },
  locale: AppLocale = 'pt-BR',
): { label: string; shortDesc: string } {
  switch (presetId) {
    case 'balanced':
      return {
        label: t('xpPresetBalancedLabel', locale),
        shortDesc: t('xpPresetBalancedDesc', locale),
      };
    case 'budget':
      return {
        label: t('xpPresetBudgetLabel', locale),
        shortDesc: t('xpPresetBudgetDesc', locale),
      };
    case 'esports':
      return {
        label: t('xpPresetEsportsLabel', locale),
        shortDesc: t('xpPresetEsportsDesc', locale),
      };
    case 'pathtracing':
      return {
        label: t('xpPresetPathtracingLabel', locale),
        shortDesc: t('xpPresetPathtracingDesc', locale),
      };
    default:
      return fallback;
  }
}
