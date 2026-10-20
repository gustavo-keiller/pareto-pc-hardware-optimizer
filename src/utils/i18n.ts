/**
 * i18n.ts — Lightweight typed dictionary and localization helper for ParetoPC.
 * Supports Brazil-first testing ('pt-BR' default) and English ('en-US').
 * Complies with GLOSSARY.md for beginner-friendly, jargon-free hardware copywriting.
 */

import { enUS } from './locales/enUS';
import { ptBR } from './locales/ptBR';
import { AppLocale, Translations } from './locales/types';

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
        return 'Nível 1: Guia do Comprador';
      case 'explorer':
        return 'Nível 2: Explorador Visual';
      case 'builds':
        return 'Nível 4: Montador de PCs';
      default:
        return 'Nível 3: Laboratório Pro';
    }
  }
  switch (uiMode) {
    case 'simple':
      return 'Level 1: Easy Buyer Guide';
    case 'explorer':
      return 'Level 2: Visual Axis Explorer';
    case 'builds':
      return 'Level 4: Mario Kart Full-Build Explorer';
    default:
      return 'Level 3: Pro MCDM Lab';
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

/**
 * Transparent currency conversion notice for Brazilian real estimates.
 */
export function getEstimatedPriceNotice(
  locale: AppLocale,
  currency: 'USD' | 'BRL',
): string {
  if (currency !== 'BRL') return '';
  return locale === 'pt-BR'
    ? 'Preços estimados com base em paridade cambial e impostos médios (câmbio R$ 5,65 + 18% ICMS).'
    : 'Estimated Brazilian Real prices based on currency parity and average duties.';
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
