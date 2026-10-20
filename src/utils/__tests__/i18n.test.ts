import { describe, it, expect } from 'vitest';
import { t, TRANSLATIONS, DEFAULT_LOCALE } from '../i18n';
import { formatCurrency, getEstimatedPriceNotice } from '../currency';

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
        // Exclude mathGuide heading/subheading, pro modes, and multidimensional charts from beginner prohibition
        if (
          key.startsWith('mathGuide') ||
          key.includes('Pro') ||
          key.startsWith('verdict') ||
          key.startsWith('radar') ||
          key.startsWith('parallel') ||
          key.startsWith('drawer')
        )
          continue;
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

  it('provides honest estimated price notices when viewing BRL converted prices (Decision D-1)', () => {
    expect(getEstimatedPriceNotice('pt-BR', 'BRL')).toBe(
      'Preço estimado (convertido de US$)',
    );
    expect(getEstimatedPriceNotice('en-US', 'BRL')).toBe(
      'Estimated price (converted from USD)',
    );
    expect(getEstimatedPriceNotice('pt-BR', 'USD')).toBe('');
    expect(getEstimatedPriceNotice('en-US', 'USD')).toBe('');
  });

  it('translates full build and leaderboard keys cleanly in pt-BR', () => {
    expect(t('buildTotalHardwareCost', 'pt-BR')).toBe(
      'Custo Total de Hardware',
    );
    expect(t('tableVerdict', 'pt-BR')).toBe('Veredito');
    expect(t('specRasterFps', 'pt-BR')).toBe('Desempenho 1440p');
    expect(t('savePrefix', 'pt-BR')).toBe('Economize');
    expect(t('moreSuffix', 'pt-BR')).toBe('a mais');
    expect(t('verdictSmartBuy', 'pt-BR')).toBe('Compra Inteligente');
    expect(t('verdictTrap', 'pt-BR')).toBe('Armadilha de Custo');
  });
});
