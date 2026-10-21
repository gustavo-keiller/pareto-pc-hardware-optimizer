import { describe, expect, it } from 'vitest';
import {
  PriceHistoryPoint,
  computePriceTrend,
  isNearAllTimeLow,
} from '../priceHistory';
import { getPriceHistory } from '../../data/storePrices';

describe('DATA-05: Price History & Market Trend Engine', () => {
  it('returns safe fallback values when history is empty', () => {
    const trend = computePriceTrend([]);
    expect(trend.currentPrice).toBe(0);
    expect(trend.lowestPrice).toBe(0);
    expect(trend.highestPrice).toBe(0);
    expect(trend.averagePrice).toBe(0);
    expect(trend.changeFromLowestPct).toBe(0);
    expect(trend.isAllTimeLow).toBe(false);
    expect(trend.trend).toBe('stable');
    expect(trend.dataPointsCount).toBe(0);
  });

  it('handles a single historical price point gracefully', () => {
    const history: PriceHistoryPoint[] = [
      { date: '2026-10-20', price: 1399, store: 'KaBuM!' },
    ];
    const trend = computePriceTrend(history);
    expect(trend.currentPrice).toBe(1399);
    expect(trend.lowestPrice).toBe(1399);
    expect(trend.highestPrice).toBe(1399);
    expect(trend.averagePrice).toBe(1399);
    expect(trend.changeFromLowestPct).toBe(0);
    expect(trend.isAllTimeLow).toBe(true);
    expect(trend.trend).toBe('stable');
    expect(trend.dataPointsCount).toBe(1);
  });

  it('detects dropping price trend and all-time-low', () => {
    const history: PriceHistoryPoint[] = [
      { date: '2024-01-15', price: 1699 },
      { date: '2024-06-20', price: 1499 },
      { date: '2026-10-20', price: 1399 },
    ];
    const trend = computePriceTrend(history);
    expect(trend.currentPrice).toBe(1399);
    expect(trend.lowestPrice).toBe(1399);
    expect(trend.highestPrice).toBe(1699);
    expect(trend.averagePrice).toBe(1532.33);
    expect(trend.changeFromLowestPct).toBe(0);
    expect(trend.isAllTimeLow).toBe(true);
    expect(trend.trend).toBe('dropping');
    expect(trend.dataPointsCount).toBe(3);
  });

  it('detects rising price trend and calculates percentage above lowest', () => {
    const history: PriceHistoryPoint[] = [
      { date: '2024-01-01', price: 2500 },
      { date: '2024-06-01', price: 2000 },
      { date: '2026-10-20', price: 2200 },
    ];
    const trend = computePriceTrend(history);
    expect(trend.currentPrice).toBe(2200);
    expect(trend.lowestPrice).toBe(2000);
    expect(trend.highestPrice).toBe(2500);
    expect(trend.changeFromLowestPct).toBe(10); // +10% above ATL
    expect(trend.isAllTimeLow).toBe(false);
    expect(trend.trend).toBe('rising');
  });

  it('correctly determines isNearAllTimeLow within customizable threshold', () => {
    const history: PriceHistoryPoint[] = [
      { date: '2024-01-01', price: 1000 },
      { date: '2024-06-01', price: 800 },
    ];

    expect(isNearAllTimeLow(800, history)).toBe(true);
    expect(isNearAllTimeLow(810, history, 0.02)).toBe(true); // +1.25% <= 2%
    expect(isNearAllTimeLow(850, history, 0.02)).toBe(false); // +6.25% > 2%
    expect(isNearAllTimeLow(0, history)).toBe(false);
    expect(isNearAllTimeLow(500, [])).toBe(false);
  });

  it('retrieves recorded price history from dataset and computes trends', () => {
    const rx6600History = getPriceHistory('rx-6600', 'BRL');
    expect(rx6600History.length).toBeGreaterThanOrEqual(2);

    const trend = computePriceTrend(rx6600History);
    expect(trend.isAllTimeLow).toBe(true);
    expect(trend.trend).toBe('dropping');
  });
});
