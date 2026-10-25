import { AppLocale, isAppLocale, t } from './i18n';

export type Currency = 'USD' | 'BRL';

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
import { getRegionalStorePrices } from '../data/storePrices';
import { REAL_WORLD_GPUS } from '../data/realGpus';
import { GpuCandidate } from '../lib/math/types';
import {
  ResolvedPriceInfo,
  UserPriceMap,
  overlayRegionalPrices,
  summarizePriceSources,
} from '../lib/math/pricingEngine';

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
 * Returns complete hardware catalogs priced for the active currency.
 * Each part's price is, in order: the price the user typed in, the cheapest
 * in-stock store offer from `src/data/prices/`, or (BRL only) the USD
 * catalog price converted at `rate`. `priceInfo` records which one was used.
 */
export function getCurrencyAdjustedCatalogs(
  currency: 'USD' | 'BRL' = 'USD',
  rate = DEFAULT_USD_TO_BRL_RATE,
  userPrices: UserPriceMap = {},
): CurrencyAdjustedCatalogs {
  const offers = getRegionalStorePrices(currency);
  const options = { currency, exchangeRate: rate, userPrices };
  return {
    cpus: overlayRegionalPrices(SEED_CPUS, offers, options),
    motherboards: overlayRegionalPrices(SEED_MOTHERBOARDS, offers, options),
    ramKits: overlayRegionalPrices(SEED_RAM_KITS, offers, options),
    psus: overlayRegionalPrices(SEED_PSUS, offers, options),
    storages: overlayRegionalPrices(SEED_STORAGES, offers, options),
    cases: overlayRegionalPrices(SEED_CASES, offers, options),
    coolers: overlayRegionalPrices(SEED_COOLERS, offers, options),
  };
}

/**
 * Real-world GPUs priced the same way as `getCurrencyAdjustedCatalogs`,
 * keeping the USD catalog price in `originalUsdPrice` for reference.
 */
export function getPricedRealGpus(
  currency: 'USD' | 'BRL',
  rate = DEFAULT_USD_TO_BRL_RATE,
  userPrices: UserPriceMap = {},
): GpuCandidate[] {
  const priced = overlayRegionalPrices(
    REAL_WORLD_GPUS,
    getRegionalStorePrices(currency),
    { currency, exchangeRate: rate, userPrices },
  );
  return priced.map((g, i) => ({
    ...g,
    originalUsdPrice: REAL_WORLD_GPUS[i].price,
    currency,
  }));
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

/**
 * One plain sentence about how a build's parts were priced, e.g.
 * "3 de 8 peças com preço estimado (convertido de US$) · 1 com o seu preço".
 * `isEstimate` is true while any part still uses an estimated price.
 */
export function getBuildPriceNotice(
  parts: readonly { readonly priceInfo?: ResolvedPriceInfo }[],
  currency: 'USD' | 'BRL',
  locale: AppLocale,
): { text: string; isEstimate: boolean } {
  const summary = summarizePriceSources(parts);
  const total = parts.length;
  const segments: string[] = [];
  if (summary.estimate > 0) {
    const estimateKey =
      currency === 'BRL' ? 'buildPricesEstimated' : 'buildPricesEstimatedList';
    segments.push(
      `${summary.estimate} ${t('buildPricesOf', locale)} ${total} ${t('buildPricesParts', locale)} ${t(estimateKey, locale)}`,
    );
  } else if (summary.store > 0) {
    const date = summary.oldestStoreCheck
      ? `, ${t('priceCheckedOn', locale)} ${summary.oldestStoreCheck}`
      : '';
    segments.push(`${t('buildPricesFromStores', locale)}${date}`);
  }
  if (summary.user > 0) {
    segments.push(`${summary.user} ${t('buildPricesYours', locale)}`);
  }
  return { text: segments.join(' · '), isEstimate: summary.estimate > 0 };
}
