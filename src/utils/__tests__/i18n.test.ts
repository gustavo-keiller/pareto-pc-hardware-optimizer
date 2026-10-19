import { describe, it, expect } from 'vitest';
import { t, TRANSLATIONS, DEFAULT_LOCALE } from '../i18n';
import { formatCurrency } from '../currency';

describe('i18n localization (src/utils/i18n.ts)', () => {
  it('defaults to pt-BR (Brazil-first)', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR');
  });

  it('translates beginner intake keys cleanly in pt-BR', () => {
    expect(t('intakeGoalGpu', 'pt-BR')).toBe('Apenas Placa de Vídeo');
    expect(t('intakeGoalPc', 'pt-BR')).toBe('Um PC Completo');
    expect(t('heroTopPickBadge', 'pt-BR')).toContain('Melhor Custo-Benefício');
  });

  it('translates keys cleanly in en-US', () => {
    expect(t('intakeGoalGpu', 'en-US')).toBe('Graphics Card Only');
    expect(t('intakeGoalPc', 'en-US')).toBe('A Whole PC Build');
    expect(t('heroTopPickBadge', 'en-US')).toContain('Best Value Pick');
  });

  it('contains zero forbidden math jargon in pt-BR and en-US beginner translations', () => {
    const forbidden = [
      'pareto',
      'topsis',
      'dominated',
      'frontier',
      'utility',
      'tradeoff hyperplane',
    ];
    for (const locale of ['pt-BR', 'en-US'] as const) {
      const dict = TRANSLATIONS[locale];
      for (const [key, text] of Object.entries(dict)) {
        // Exclude mathGuide heading/subheading from beginner prohibition since that is the explicit math explainer
        if (key.startsWith('mathGuide')) continue;
        const lower = text.toLowerCase();
        for (const word of forbidden) {
          expect(
            lower.includes(word),
            `Key "${key}" in ${locale} contains forbidden jargon "${word}": "${text}"`,
          ).toBe(false);
        }
      }
    }
  });

  it('formats currency according to specified locale', () => {
    expect(formatCurrency(1200, 'USD', false, 'en-US')).toBe('$1,200');
    expect(formatCurrency(4500, 'BRL', false, 'pt-BR')).toBe('R$ 4.500');
  });
});
