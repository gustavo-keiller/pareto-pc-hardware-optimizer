import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USD_TO_BRL_RATE,
  convertBrlToUsd,
  convertUsdToBrl,
  formatCurrency,
  getCurrencySymbol,
} from '../currency';

describe('currency utilities (src/utils/currency.ts)', () => {
  it('formats USD and BRL currencies cleanly', () => {
    expect(formatCurrency(250, 'USD')).toBe('$250');
    expect(formatCurrency(3899.99, 'BRL', true)).toBe('R$ 3.899,99');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('BRL')).toBe('R$');
  });

  it('handles NaN gracefully with fallback', () => {
    expect(formatCurrency(NaN, 'USD')).toBe('$0');
    expect(formatCurrency(NaN, 'BRL')).toBe('R$ 0');
  });

  it('converts USD to BRL accurately using default and custom exchange rates', () => {
    // $250 at 5.70 = R$ 1425
    expect(convertUsdToBrl(250, 5.7)).toBe(1425);
    expect(convertUsdToBrl(0)).toBe(0);
    expect(convertUsdToBrl(100, DEFAULT_USD_TO_BRL_RATE)).toBe(
      Math.round(100 * DEFAULT_USD_TO_BRL_RATE),
    );
  });

  it('converts BRL to USD accurately and guards against zero or negative rate', () => {
    // R$ 1425 at 5.70 = $250
    expect(convertBrlToUsd(1425, 5.7)).toBe(250);
    // Boundary safety: if rate is 0 or negative, returns amount unchanged without throwing or dividing by zero
    expect(convertBrlToUsd(100, 0)).toBe(100);
    expect(convertBrlToUsd(100, -1)).toBe(100);
  });
});
