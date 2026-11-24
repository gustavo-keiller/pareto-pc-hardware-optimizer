import { AppLocale, isAppLocale } from './i18n';

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
  StorePriceMetadata,
} from '../lib/math/buildTypes';
import { GpuCandidate } from '../lib/math/types';
import {
  AffiliatePartnerProfile,
  resolveRegionalPrice,
} from '../lib/math/pricingEngine';
import { getRegionalStorePrices } from '../data/storePrices';
import {
  HOUSE_PARTNER_PROFILE,
  resolveActivePartnerFromSearch,
} from '../data/partnerProfiles';
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

function getActivePartnerFromBrowser(): AffiliatePartnerProfile | null {
  if (typeof window === 'undefined' || !window.location.search) return null;
  return resolveActivePartnerFromSearch(window.location.search);
}

function applyRegionalStoreOverlay<
  T extends {
    id: string;
    price: number;
    checkedAt?: string;
  } & StorePriceMetadata,
>(
  items: readonly T[],
  currency: 'USD' | 'BRL',
  rate: number,
  partner: AffiliatePartnerProfile | null,
): T[] {
  const storeOffers = getRegionalStorePrices(currency);
  return items.map((item) => {
    const resolved = resolveRegionalPrice(item, storeOffers, {
      currency,
      exchangeRate: rate,
      preferCashDiscount: true,
      partner,
      fallbackPartner: HOUSE_PARTNER_PROFILE,
    });
    return {
      ...item,
      price: resolved.effectivePrice,
      currency,
      store: resolved.store ?? item.store,
      url: resolved.storeUrl ?? item.url,
      priceCash: resolved.cashPrice ?? item.priceCash,
      priceInstallment: resolved.installmentPrice ?? item.priceInstallment,
      installments: resolved.installments ?? item.installments,
      isPriceEstimated: resolved.isEstimated,
      checkedAt: resolved.checkedAt ?? item.checkedAt,
    };
  });
}

/**
 * Overlays regional store pricing (br.json / us.json) onto GPU catalog items,
 * tracking original USD baseline and applying optional creator affiliate tags (`[AFF-05]`).
 */
export function applyRegionalGpuOverlay(
  gpus: readonly GpuCandidate[],
  currency: 'USD' | 'BRL' = 'USD',
  rate = DEFAULT_USD_TO_BRL_RATE,
  partner?: AffiliatePartnerProfile | null,
): GpuCandidate[] {
  const effectivePartner =
    partner === undefined ? getActivePartnerFromBrowser() : partner;
  const storeOffers = getRegionalStorePrices(currency);
  return gpus.map((gpu) => {
    const resolved = resolveRegionalPrice(gpu, storeOffers, {
      currency,
      exchangeRate: rate,
      preferCashDiscount: true,
      partner: effectivePartner,
      fallbackPartner: HOUSE_PARTNER_PROFILE,
    });
    return {
      ...gpu,
      originalUsdPrice: gpu.originalUsdPrice ?? gpu.price,
      price: resolved.effectivePrice,
      currency,
      store: resolved.store ?? gpu.store,
      url: resolved.storeUrl ?? gpu.url,
      priceCash: resolved.cashPrice ?? gpu.priceCash,
      priceInstallment: resolved.installmentPrice ?? gpu.priceInstallment,
      installments: resolved.installments ?? gpu.installments,
      isPriceEstimated: resolved.isEstimated,
      checkedAt: resolved.checkedAt ?? gpu.checkedAt,
    };
  });
}

/**
 * Returns complete hardware catalogs overlaid with real regional store prices
 * (KaBuM!, TerabyteShop, Pichau for BRL; Newegg, Best Buy, B&H for USD; never Amazon, see BF-B5),
 * falling back to USD conversion only when a component lacks an in-stock store listing.
 */
export function getCurrencyAdjustedCatalogs(
  currency: 'USD' | 'BRL' = 'USD',
  rate = DEFAULT_USD_TO_BRL_RATE,
  partner?: AffiliatePartnerProfile | null,
): CurrencyAdjustedCatalogs {
  const effectivePartner =
    partner === undefined ? getActivePartnerFromBrowser() : partner;
  return {
    cpus: applyRegionalStoreOverlay(
      SEED_CPUS,
      currency,
      rate,
      effectivePartner,
    ),
    motherboards: applyRegionalStoreOverlay(
      SEED_MOTHERBOARDS,
      currency,
      rate,
      effectivePartner,
    ),
    ramKits: applyRegionalStoreOverlay(
      SEED_RAM_KITS,
      currency,
      rate,
      effectivePartner,
    ),
    psus: applyRegionalStoreOverlay(
      SEED_PSUS,
      currency,
      rate,
      effectivePartner,
    ),
    storages: applyRegionalStoreOverlay(
      SEED_STORAGES,
      currency,
      rate,
      effectivePartner,
    ),
    cases: applyRegionalStoreOverlay(
      SEED_CASES,
      currency,
      rate,
      effectivePartner,
    ),
    coolers: applyRegionalStoreOverlay(
      SEED_COOLERS,
      currency,
      rate,
      effectivePartner,
    ),
  };
}

/**
 * Returns honest estimated price notice only when prices fell back to currency conversion.
 */
export function getEstimatedPriceNotice(
  locale: AppLocale = 'pt-BR',
  currency: 'USD' | 'BRL' = 'BRL',
  isPriceEstimated = true,
): string {
  if (currency !== 'BRL' || !isPriceEstimated) return '';
  return locale === 'pt-BR'
    ? 'Preço estimado (convertido de US$)'
    : 'Estimated price (converted from USD)';
}
