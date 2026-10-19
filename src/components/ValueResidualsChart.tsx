import React, { useMemo } from 'react';
import { EChartsRenderer } from './EChartsRenderer';
import { RankedGpu } from '../lib/math/types';

interface ValueResidualsChartProps {
  gpus: RankedGpu[];
  rSquared: number;
  hoveredGpuId: string | null;
  isExpanded?: boolean;
  hideDominatedNodes?: boolean;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export const ValueResidualsChart: React.FC<ValueResidualsChartProps> = ({
  gpus,
  rSquared,
  isExpanded = false,
  hideDominatedNodes = false,
  onHoverGpu,
  onToggleSelectGpu,
}) => {
  // Sort GPUs from best bargain (most negative residualPct) to most overpriced
  const sortedByValue = useMemo(() => {
    const filtered = hideDominatedNodes
      ? gpus.filter((g) => g.isParetoOptimal)
      : gpus;
    return [...filtered].sort(
      (a, b) =>
        (a.valuation?.residualPct ?? 0) - (b.valuation?.residualPct ?? 0),
    );
  }, [gpus, hideDominatedNodes]);

  const option = useMemo(() => {
    const names = sortedByValue.map((g) => g.name.replace(' [TRAP]', ''));
    const data = sortedByValue.map((g) => {
      const pct = g.valuation?.residualPct ?? 0;
      const usd = g.valuation?.residualUsd ?? 0;
      const isBargain = pct <= -5;
      const isOverpriced = pct >= 5;

      return {
        value: pct,
        gpu: g,
        itemStyle: {
          color: isBargain ? '#10b981' : isOverpriced ? '#f43f5e' : '#38bdf8',
          borderRadius: pct < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: pct <= 0 ? 'left' : 'right',
          formatter: () =>
            usd <= 0 ? `-$${Math.abs(usd)} (${pct}%)` : `+$${usd} (+${pct}%)`,
          color: isBargain ? '#34d399' : isOverpriced ? '#fb7185' : '#cbd5e1',
          fontSize: 10,
          fontWeight: 600,
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      grid: {
        top: 32,
        right: 95,
        bottom: 36,
        left: 175,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: Array<{ data?: { gpu?: RankedGpu } }>) => {
          const g = params[0]?.data?.gpu;
          if (!g || !g.valuation) return '';
          const { fairPrice, residualUsd, residualPct } = g.valuation;
          const isBargain = residualUsd <= 0;
          return `
            <div style="min-width:220px;font-family:Inter,system-ui,sans-serif;">
              <strong style="font-size:13px;color:#fff;">${g.name}</strong>
              <div style="margin-top:6px;font-size:12px;color:#cbd5e1;display:grid;gap:3px;">
                <div>Street Price: <strong style="color:#fff;">$${g.price}</strong></div>
                <div>OLS Fair Market Price: <strong style="color:#38bdf8;">$${fairPrice}</strong></div>
                <div>Price Delta: <strong style="color:${
                  isBargain ? '#34d399' : '#fb7185'
                };">${
                  isBargain
                    ? `$${Math.abs(residualUsd)} Below Fair Value (${residualPct}%)`
                    : `$${residualUsd} Above Fair Value (+${residualPct}%)`
                }</strong></div>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Price vs. Fair Market Baseline (%) — Negative (Left) = Undervalued Bargain',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 600 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          formatter: (v: number) => `${v > 0 ? '+' : ''}${v}%`,
        },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: names,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: 500 },
      },
      series: [
        {
          name: 'Fair Value Residual (%)',
          type: 'bar',
          data,
          barMaxWidth: 18,
        },
      ],
    };
  }, [sortedByValue]);

  const onEvents = useMemo(
    () => ({
      mouseover: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onHoverGpu(id);
      },
      mouseout: () => onHoverGpu(null),
      click: (params: { data?: { gpu?: RankedGpu } }) => {
        const id = params.data?.gpu?.id;
        if (id) onToggleSelectGpu(id);
      },
    }),
    [onHoverGpu, onToggleSelectGpu],
  );

  return (
    <div
      className={`w-full ${
        isExpanded ? 'h-[76vh] min-h-[580px]' : 'h-[460px]'
      } relative`}
    >
      <div className="absolute top-1 right-3 z-10 rounded-md border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-[11px] text-slate-400">
        Hedonic OLS Fit:{' '}
        <strong className="text-emerald-400">
          R² = {(rSquared * 100).toFixed(1)}%
        </strong>
      </div>
      <EChartsRenderer
        option={option}
        style={{ height: '100%', width: '100%' }}
        onEvents={onEvents}
        notMerge={true}
      />
    </div>
  );
};
