/**
 * Format currency amount based on detected or selected currency ('USD' or 'BRL').
 */
export function formatCurrency(
  val: number,
  currency: 'USD' | 'BRL' = 'USD',
  showCents = false,
): string {
  if (isNaN(val)) return currency === 'BRL' ? 'R$ 0' : '$0';

  if (currency === 'BRL') {
    return `R$ ${val.toLocaleString('pt-BR', {
      minimumFractionDigits: showCents || val % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: showCents && val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Returns currency symbol string ('R$' or '$').
 */
export function getCurrencySymbol(currency: 'USD' | 'BRL' = 'USD'): string {
  return currency === 'BRL' ? 'R$' : '$';
}

/**
 * Standard default exchange rate for BRL conversion when evaluating USD benchmarks against Brazilian deals.
 */
export const DEFAULT_USD_TO_BRL_RATE = 5.7;

/**
 * Converts a USD amount to Brazilian Real (BRL) rounded to the nearest integer.
 */
export function convertUsdToBrl(
  amountUsd: number,
  rate = DEFAULT_USD_TO_BRL_RATE,
): number {
  if (isNaN(amountUsd) || amountUsd <= 0) return 0;
  const effectiveRate = rate > 0 ? rate : DEFAULT_USD_TO_BRL_RATE;
  return Math.round(amountUsd * effectiveRate);
}

/**
 * Converts a BRL amount to US Dollars (USD), guarded against divide-by-zero.
 */
export function convertBrlToUsd(
  amountBrl: number,
  rate = DEFAULT_USD_TO_BRL_RATE,
): number {
  if (isNaN(amountBrl) || amountBrl <= 0) return 0;
  if (rate <= 0) return amountBrl;
  return Math.round((amountBrl / rate) * 100) / 100;
}
