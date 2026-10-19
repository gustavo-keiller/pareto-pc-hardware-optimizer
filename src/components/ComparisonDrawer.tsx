import React, { useMemo, useState } from 'react';
import { EChartsRenderer } from './EChartsRenderer';
import { RankedGpu } from '../lib/math/types';
import { Layers, Activity, X, Trash2 } from 'lucide-react';

import { formatCurrency } from '../utils/currency';
import { AppLocale } from '../utils/i18n';

interface ComparisonDrawerProps {
  selectedGpus: RankedGpu[];
  allGpus: RankedGpu[];
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  onRemoveGpu: (id: string) => void;
  onClearAll: () => void;
}

const COMPARE_COLORS = ['#10b981', '#f59e0b', '#38bdf8', '#a855f7'];

export const ComparisonDrawer: React.FC<ComparisonDrawerProps> = ({
  selectedGpus,
  allGpus,
  currency = 'USD',
  locale = 'pt-BR',
  onRemoveGpu,
  onClearAll,
}) => {
  const [chartType, setChartType] = useState<'radar' | 'parallel'>('radar');

  // Compute min/max bounds across dataset so we can normalize all 5 metrics onto a 0-100 "higher is better" utility scale for Radar
  const bounds = useMemo(() => {
    const prices = allGpus.map((g) => g.price);
    const rasters = allGpus.map((g) => g.rasterFps1440p);
    const rts = allGpus.map((g) => g.rtFps1440p);
    const vrams = allGpus.map((g) => g.vramGb);
    const watts = allGpus.map((g) => g.tdpWatts);

    return {
      minPrice: Math.min(...prices, 100),
      maxPrice: Math.max(...prices, 1000),
      maxRaster: Math.max(...rasters, 180),
      maxRt: Math.max(...rts, 140),
      maxVram: Math.max(...vrams, 24),
      minWatts: Math.min(...watts, 100),
      maxWatts: Math.max(...watts, 350),
    };
  }, [allGpus]);

  const radarOption = useMemo(() => {
    // Convert each GPU's raw specs into a 0-100 utility score where 100 is always outer-ring best
    const seriesData = selectedGpus.map((g, idx) => {
      const priceUtility = Math.round(
        ((bounds.maxPrice - g.price) /
          Math.max(1, bounds.maxPrice - bounds.minPrice)) *
          85 +
          15,
      );
      const rasterUtility = Math.round(
        (g.rasterFps1440p / bounds.maxRaster) * 100,
      );
      const rtUtility = Math.round((g.rtFps1440p / bounds.maxRt) * 100);
      const vramUtility = Math.round((g.vramGb / bounds.maxVram) * 100);
      const efficiencyUtility = Math.round(
        ((bounds.maxWatts - g.tdpWatts) /
          Math.max(1, bounds.maxWatts - bounds.minWatts)) *
          85 +
          15,
      );
      const topsisUtility = Math.round(g.topsisScorePct);

      const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];

      return {
        name: g.name,
        value: [
          priceUtility,
          rasterUtility,
          rtUtility,
          vramUtility,
          efficiencyUtility,
          topsisUtility,
        ],
        itemStyle: { color },
        lineStyle: { color, width: 2.5 },
        areaStyle: { color, opacity: 0.16 },
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#cbd5e1', fontSize: 12 },
      },
      radar: {
        radius: '64%',
        center: ['50%', '46%'],
        indicator: [
          {
            name:
              locale === 'pt-BR'
                ? `Preço (${currency === 'BRL' ? 'R$' : '$'})`
                : `Price (${currency === 'BRL' ? 'R$' : '$'})`,
            max: 100,
          },
          {
            name: locale === 'pt-BR' ? 'Desempenho 1440p' : '1440p Raster FPS',
            max: 100,
          },
          {
            name:
              locale === 'pt-BR' ? 'Ray Tracing 1440p' : '1440p Ray Tracing',
            max: 100,
          },
          {
            name: locale === 'pt-BR' ? 'Capacidade VRAM' : 'VRAM Capacity',
            max: 100,
          },
          {
            name:
              locale === 'pt-BR' ? 'Eficiência Energética' : 'Power Efficiency',
            max: 100,
          },
          {
            name: locale === 'pt-BR' ? 'Nota TOPSIS' : 'TOPSIS Score',
            max: 100,
          },
        ],
        axisName: {
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 600,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(30, 41, 59, 0.35)', 'rgba(15, 23, 42, 0.35)'],
          },
        },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#334155' } },
      },
      series: [
        {
          name: 'Multi-Objective Radar Comparison',
          type: 'radar',
          data: seriesData,
        },
      ],
    };
  }, [selectedGpus, bounds, currency, locale]);

  const parallelOption = useMemo(() => {
    const series = selectedGpus.map((g, idx) => {
      const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
      return {
        name: g.name,
        type: 'parallel',
        lineStyle: {
          width: 3.5,
          opacity: 0.9,
          color,
        },
        data: [
          [
            g.price,
            g.rasterFps1440p,
            g.rtFps1440p,
            g.vramGb,
            g.tdpWatts,
            g.topsisScorePct,
          ],
        ],
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#cbd5e1', fontSize: 12 },
      },
      parallelAxis: [
        {
          dim: 0,
          name:
            locale === 'pt-BR'
              ? `Preço (${currency === 'BRL' ? 'R$' : '$'})\n[Mínimo]`
              : `Price (${currency === 'BRL' ? 'R$' : '$'})\n[Min]`,
          inverse: true,
          nameLocation: 'start',
        },
        {
          dim: 1,
          name:
            locale === 'pt-BR'
              ? '1440p Bruto\n(FPS) [Máx]'
              : '1440p Raster\n(FPS) [Max]',
        },
        {
          dim: 2,
          name:
            locale === 'pt-BR'
              ? '1440p RT\n(FPS) [Máx]'
              : '1440p RT\n(FPS) [Max]',
        },
        {
          dim: 3,
          name: locale === 'pt-BR' ? 'VRAM\n(GB) [Máx]' : 'VRAM\n(GB) [Max]',
        },
        {
          dim: 4,
          name:
            locale === 'pt-BR' ? 'Consumo\n(W) [Mín]' : 'Power TBP\n(W) [Min]',
          inverse: true,
          nameLocation: 'start',
        },
        {
          dim: 5,
          name: locale === 'pt-BR' ? 'Nota TOPSIS\n(%)' : 'TOPSIS\nScore (%)',
        },
      ],
      parallel: {
        left: '7%',
        right: '7%',
        top: 42,
        bottom: 48,
        parallelAxisDefault: {
          type: 'value',
          nameTextStyle: {
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: 600,
          },
          axisLine: { lineStyle: { color: '#475569' } },
          axisTick: { lineStyle: { color: '#475569' } },
          splitLine: { show: false },
          axisLabel: { color: '#cbd5e1', fontSize: 10 },
        },
      },
      series,
    };
  }, [selectedGpus, currency, locale]);

  if (selectedGpus.length === 0) {
    return null;
  }

  return (
    <section className="dashboard-region mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">
              {locale === 'pt-BR'
                ? `Comparação de Placas Finalistas (${selectedGpus.length}/4 Selecionadas)`
                : `Multi-Dimensional Finalist Comparison (${selectedGpus.length}/4 Selected)`}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {locale === 'pt-BR'
              ? 'Sobrepondo 6 dimensões de hardware simultaneamente. Vértices externos indicam custo-benefício e velocidade superiores.'
              : 'Overlaying 6 hardware dimensions simultaneously. Outer vertices / upper parallel tracks indicate superior value & performance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setChartType('radar')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                chartType === 'radar'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {locale === 'pt-BR' ? 'Gráfico Radar' : 'Radar Overlay'}
            </button>
            <button
              type="button"
              onClick={() => setChartType('parallel')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                chartType === 'parallel'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              {locale === 'pt-BR'
                ? 'Coordenadas Paralelas'
                : 'Parallel Coordinates'}
            </button>
          </div>

          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-rose-500/40 hover:text-rose-300 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {locale === 'pt-BR' ? 'Limpar' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Selected GPU Pills + Side-by-Side Spec Matrix */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 h-[340px]">
          <EChartsRenderer
            option={chartType === 'radar' ? radarOption : parallelOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
          />
        </div>

        <div className="lg:col-span-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">
                  {locale === 'pt-BR' ? 'Placa de Vídeo' : 'GPU Candidate'}
                </th>
                <th className="py-2 px-2 font-medium">
                  {locale === 'pt-BR' ? 'Preço' : 'Price'}
                </th>
                <th className="py-2 px-2 font-medium">1440p</th>
                <th className="py-2 px-2 font-medium">RT</th>
                <th className="py-2 px-2 font-medium">VRAM</th>
                <th className="py-2 px-2 font-medium">
                  {currency === 'BRL' ? 'FPS/R$' : 'FPS/$'}
                </th>
                <th className="py-2 px-2 font-medium">TOPSIS</th>
                <th className="py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {selectedGpus.map((g, idx) => {
                const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
                const fpsPerDollar = (g.rasterFps1440p / g.price).toFixed(2);
                return (
                  <tr key={g.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-semibold text-white flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{g.name}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-200">
                      {formatCurrency(g.price, currency, false, locale)}
                    </td>
                    <td className="py-2.5 px-2 text-slate-200">
                      {g.rasterFps1440p} FPS
                    </td>
                    <td className="py-2.5 px-2 text-slate-200">
                      {g.rtFps1440p} FPS
                    </td>
                    <td className="py-2.5 px-2 text-sky-400 font-medium">
                      {g.vramGb} GB
                    </td>
                    <td className="py-2.5 px-2 text-emerald-400 font-mono">
                      {fpsPerDollar}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-amber-400">
                      {g.topsisScorePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveGpu(g.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove from comparison"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
