import { AppLocale, isAppLocale } from './i18n';

/**
 * Format currency amount using Intl.NumberFormat based on currency and locale.
 */
export function formatCurrency(
  val: number,
  currency: 'USD' | 'BRL' = 'USD',
  showCents: boolean | AppLocale = false,
  locale?: AppLocale,
): string {
  let actualShowCents = false;
  let actualLocale = locale;

  if (isAppLocale(showCents)) {
    actualLocale = showCents;
    actualShowCents = false;
  } else {
    actualShowCents = Boolean(showCents);
  }

  const targetLocale = actualLocale ?? (currency === 'BRL' ? 'pt-BR' : 'en-US');
  if (isNaN(val)) {
    return currency === 'BRL' ? 'R$ 0' : '$0';
  }

  const fractionDigits = actualShowCents || val % 1 !== 0 ? 2 : 0;
  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .format(val)
    .replace(/\u00A0/g, ' ');
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
