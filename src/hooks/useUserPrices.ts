import { useCallback, useSyncExternalStore } from 'react';
import type {
  SupportedPricingCurrency,
  UserPriceMap,
} from '../lib/math/pricingEngine';
import { safeGetJSON, safeSetJSON } from '../utils/storage';

/**
 * Prices the user typed in for parts ("I found it for R$ 899"), saved in
 * localStorage per currency so a BRL price never leaks into USD mode.
 * A module-level store (not a context) so every hook instance stays in sync.
 */

const STORAGE_KEY = 'paretopc_user_prices';

export type UserPricesByCurrency = Readonly<
  Record<SupportedPricingCurrency, UserPriceMap>
>;

const EMPTY: UserPricesByCurrency = { BRL: {}, USD: {} };

function sanitizeMap(raw: unknown): UserPriceMap {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[id] = value;
    }
  }
  return out;
}

/** Validates stored data; anything malformed is dropped, never thrown. */
export function sanitizeUserPrices(raw: unknown): UserPricesByCurrency {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return EMPTY;
  }
  return {
    BRL: sanitizeMap('BRL' in raw ? raw.BRL : undefined),
    USD: sanitizeMap('USD' in raw ? raw.USD : undefined),
  };
}

let current: UserPricesByCurrency = sanitizeUserPrices(
  safeGetJSON<unknown>(STORAGE_KEY, {}),
);
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserPricesByCurrency {
  return current;
}

function setUserPrice(
  currency: SupportedPricingCurrency,
  componentId: string,
  price: number | null,
): void {
  const next: Record<string, number> = { ...current[currency] };
  if (price !== null && Number.isFinite(price) && price > 0) {
    next[componentId] = price;
  } else {
    delete next[componentId];
  }
  current = { ...current, [currency]: next };
  safeSetJSON(STORAGE_KEY, current);
  listeners.forEach((l) => l());
}

export function useUserPrices(currency: SupportedPricingCurrency): {
  userPrices: UserPriceMap;
  setPrice: (componentId: string, price: number | null) => void;
} {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setPrice = useCallback(
    (componentId: string, price: number | null) =>
      setUserPrice(currency, componentId, price),
    [currency],
  );
  return { userPrices: all[currency], setPrice };
}
