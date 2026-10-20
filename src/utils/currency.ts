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

import {
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from '../lib/math/buildTypes';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../data/seedComponents';

export interface CurrencyAdjustedCatalogs {
  cpus: CpuCandidate[];
  motherboards: MotherboardCandidate[];
  ramKits: RamCandidate[];
  psus: PsuCandidate[];
  storages: StorageCandidate[];
  cases: CaseCandidate[];
  coolers: CoolerCandidate[];
}

/**
 * Returns complete hardware catalogs adjusted for active currency.
 * When currency is BRL, prices are centralized and converted from USD baseline.
 */
export function getCurrencyAdjustedCatalogs(
  currency: 'USD' | 'BRL' = 'USD',
  rate = DEFAULT_USD_TO_BRL_RATE,
): CurrencyAdjustedCatalogs {
  if (currency !== 'BRL') {
    return {
      cpus: SEED_CPUS,
      motherboards: SEED_MOTHERBOARDS,
      ramKits: SEED_RAM_KITS,
      psus: SEED_PSUS,
      storages: SEED_STORAGES,
      cases: SEED_CASES,
      coolers: SEED_COOLERS,
    };
  }

  return {
    cpus: SEED_CPUS.map((c) => ({
      ...c,
      price: convertUsdToBrl(c.price, rate),
    })),
    motherboards: SEED_MOTHERBOARDS.map((m) => ({
      ...m,
      price: convertUsdToBrl(m.price, rate),
    })),
    ramKits: SEED_RAM_KITS.map((r) => ({
      ...r,
      price: convertUsdToBrl(r.price, rate),
    })),
    psus: SEED_PSUS.map((p) => ({
      ...p,
      price: convertUsdToBrl(p.price, rate),
    })),
    storages: SEED_STORAGES.map((s) => ({
      ...s,
      price: convertUsdToBrl(s.price, rate),
    })),
    cases: SEED_CASES.map((c) => ({
      ...c,
      price: convertUsdToBrl(c.price, rate),
    })),
    coolers: SEED_COOLERS.map((c) => ({
      ...c,
      price: convertUsdToBrl(c.price, rate),
    })),
  };
}

/**
 * Returns honest estimated price notice for converted BRL benchmarks.
 */
export function getEstimatedPriceNotice(
  locale: AppLocale = 'pt-BR',
  currency: 'USD' | 'BRL' = 'BRL',
): string {
  if (currency !== 'BRL') return '';
  return locale === 'pt-BR'
    ? 'Preço estimado (convertido de US$)'
    : 'Estimated price (converted from USD)';
}
