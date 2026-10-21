/**
 * Price History & Trend Engine (`src/utils/priceHistory.ts`)
 *
 * Tracks price evolution across catalog audit commits, computes
 * All-Time Low (ATL) price baselines, and determines market price trends
 * (dropping, rising, stable).
 *
 * Pure TypeScript — zero React, DOM, or localStorage imports (Rule 1).
 */

export interface PriceHistoryPoint {
  readonly date: string; // ISO YYYY-MM-DD
  readonly price: number;
  readonly store?: string;
  readonly currency?: 'USD' | 'BRL';
}

export type PriceTrendDirection = 'dropping' | 'rising' | 'stable';

export interface PriceTrendSummary {
  readonly currentPrice: number;
  readonly lowestPrice: number;
  readonly highestPrice: number;
  readonly averagePrice: number;
  readonly changeFromLowestPct: number;
  readonly isAllTimeLow: boolean;
  readonly trend: PriceTrendDirection;
  readonly dataPointsCount: number;
}

/**
 * Computes price trends, all-time-low (ATL) statistics, and directionality from price points.
 *
 * Guarantees Numerical & Boundary Safety (Rule 3):
 * - Empty array returns safe defaults with 0 prices.
 * - Single point returns `isAllTimeLow: true`, `trend: 'stable'`, and 0 delta.
 * - Guard all denominators against zero.
 */
export function computePriceTrend(
  history: readonly PriceHistoryPoint[],
): PriceTrendSummary {
  if (history.length === 0) {
    return {
      currentPrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      changeFromLowestPct: 0,
      isAllTimeLow: false,
      trend: 'stable',
      dataPointsCount: 0,
    };
  }

  // Sort chronological by date ascending
  const sorted = [...history].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const currentPoint = sorted[sorted.length - 1];
  const currentPrice = currentPoint.price;

  let lowestPrice = Infinity;
  let highestPrice = -Infinity;
  let sumPrice = 0;

  for (const point of sorted) {
    if (point.price < lowestPrice) lowestPrice = point.price;
    if (point.price > highestPrice) highestPrice = point.price;
    sumPrice += point.price;
  }

  const averagePrice = Math.round((sumPrice / sorted.length) * 100) / 100;
  const denom = lowestPrice > 0 ? lowestPrice : 1;
  const changeFromLowestPct =
    Math.round(((currentPrice - lowestPrice) / denom) * 1000) / 10;

  // True if within 1% threshold of historic lowest
  const isAllTimeLow = currentPrice <= lowestPrice * 1.01;

  let trend: PriceTrendDirection = 'stable';
  if (sorted.length >= 2) {
    const previousPrice = sorted[sorted.length - 2].price;
    const diffPct =
      (currentPrice - previousPrice) / (previousPrice > 0 ? previousPrice : 1);
    if (diffPct <= -0.03) {
      trend = 'dropping';
    } else if (diffPct >= 0.03) {
      trend = 'rising';
    }
  }

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    changeFromLowestPct,
    isAllTimeLow,
    trend,
    dataPointsCount: sorted.length,
  };
}

/**
 * Checks whether the active price is within `thresholdPct` (default 2%) of the all-time-low.
 */
export function isNearAllTimeLow(
  currentPrice: number,
  history: readonly PriceHistoryPoint[],
  thresholdPct = 0.02,
): boolean {
  if (history.length === 0 || currentPrice <= 0) return false;
  const lowest = Math.min(...history.map((h) => h.price));
  return currentPrice <= lowest * (1 + thresholdPct);
}
