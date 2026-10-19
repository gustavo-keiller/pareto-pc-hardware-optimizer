import React from 'react';
import { Sparkles } from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { formatCurrency } from '../utils/currency';

interface BuildLeaderboardTableProps {
  optimalBuilds: PcBuild[];
  activeBuildId: string | null;
  maxBudget: number;
  currency?: 'USD' | 'BRL';
  onSelectBuild: (buildId: string) => void;
}

export const BuildLeaderboardTable: React.FC<BuildLeaderboardTableProps> = ({
  optimalBuilds,
  activeBuildId,
  maxBudget,
  currency = 'USD',
  onSelectBuild,
}) => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Complete Pareto Optimal Build Frontier ({optimalBuilds.length}{' '}
            Builds)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Every build below strictly dominates or ties all other combinations at
          its price point
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Price</th>
              <th className="py-2.5 px-3">
                {optimalBuilds[0]?.workloadMetricLabel ?? 'Effective FPS'}
              </th>
              <th className="py-2.5 px-3">CPU</th>
              <th className="py-2.5 px-3">GPU</th>
              <th className="py-2.5 px-3">Memory</th>
              <th className="py-2.5 px-3">Motherboard</th>
              <th className="py-2.5 px-3">Power</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
            {optimalBuilds.map((build, index) => {
              const isSelected = activeBuildId === build.id;
              const isUnderBudget = build.totalPrice <= maxBudget;

              return (
                <tr
                  key={build.id}
                  onClick={() => onSelectBuild(build.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-500/15 text-white'
                      : isUnderBudget
                        ? 'hover:bg-slate-800/50'
                        : 'opacity-60 hover:opacity-100 hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white">
                    {formatCurrency(build.totalPrice, currency)}
                    {index === 0 && (
                      <span className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                        Anchor
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-emerald-400">
                    {build.workloadScore ?? build.effectiveFps1440p}{' '}
                    {build.workloadScore != null
                      ? build.workloadProfile === 'creator-ai'
                        ? 'pts'
                        : 'FPS'
                      : 'FPS'}
                    {build.bottleneckPct > 0 && (
                      <span className="ml-1 text-[10px] text-amber-400 font-normal">
                        (-{build.bottleneckPct}%)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {build.cpu.name}{' '}
                    <span className="text-[10px] text-slate-400">
                      ({build.cpu.socket})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-indigo-300">
                    {build.gpu.name}
                  </td>
                  <td className="py-2.5 px-3 text-sky-300">
                    {build.ram.capacityGb}GB {build.ram.generation}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {build.motherboard.name}
                  </td>
                  <td className="py-2.5 px-3 text-teal-300">
                    {build.psu.wattage}W (+{build.powerHeadroomWatts}W)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuild(build.id);
                      }}
                      className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'View'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
