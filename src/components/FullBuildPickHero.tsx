import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { formatCurrency } from '../utils/currency';
import { BuildHeroCard } from './BuildHeroCard';

export interface FullBuildPickHeroProps {
  topBuild: PcBuild | null;
  stepDownBuild: PcBuild | null;
  stepUpBuild: PcBuild | null;
  currency: 'USD' | 'BRL';
  onSwitchToBuilds: () => void;
}

export const FullBuildPickHero: React.FC<FullBuildPickHeroProps> = ({
  topBuild,
  stepDownBuild,
  stepUpBuild,
  currency,
  onSwitchToBuilds,
}) => {
  if (!topBuild) {
    return (
      <div
        data-testid="full-build-pick-hero"
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-400"
      >
        <ShieldAlert className="h-8 w-8 text-rose-400 mx-auto mb-2" />
        <p className="text-sm font-semibold">
          No compatible complete PC builds found under your selected budget. Try
          raising the budget limit.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="full-build-pick-hero" className="space-y-4">
      {/* Top Build Hero Card */}
      <BuildHeroCard build={topBuild} currency={currency} />

      {/* Primary Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-5 py-3.5">
        <div className="text-xs text-slate-300">
          Want to swap components or check alternative sockets/wattages?
        </div>
        <button
          type="button"
          onClick={onSwitchToBuilds}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition shadow-sm"
        >
          <Compass className="h-4 w-4" />
          Inspect &amp; Swap Parts in Full Build Explorer →
        </button>
      </div>

      {/* 2 Trade-Off Alternative Builds */}
      {(stepDownBuild || stepUpBuild) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step-Down Build */}
          {stepDownBuild && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-sky-400">
                  <ArrowDownRight className="h-4 w-4" />
                  Budget-Saver System
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Save{' '}
                  {formatCurrency(
                    Math.max(0, topBuild.totalPrice - stepDownBuild.totalPrice),
                    currency,
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-bold text-white">
                  {stepDownBuild.cpu.name.split(' ')[2] ??
                    stepDownBuild.cpu.name}{' '}
                  + {stepDownBuild.gpu.name}
                </h4>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(stepDownBuild.totalPrice, currency)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Delivers {stepDownBuild.effectiveFps1440p} FPS (
                {stepDownBuild.ram.name}) with {stepDownBuild.psu.wattage}W
                power.
              </p>
              <button
                type="button"
                onClick={onSwitchToBuilds}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition"
              >
                Inspect Build in Explorer →
              </button>
            </div>
          )}

          {/* Step-Up Build */}
          {stepUpBuild && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <ArrowUpRight className="h-4 w-4" />
                  Enthusiast-Tier Upgrade
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  +
                  {formatCurrency(
                    Math.max(0, stepUpBuild.totalPrice - topBuild.totalPrice),
                    currency,
                  )}{' '}
                  More
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-bold text-white">
                  {stepUpBuild.cpu.name.split(' ')[2] ?? stepUpBuild.cpu.name} +{' '}
                  {stepUpBuild.gpu.name}
                </h4>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(stepUpBuild.totalPrice, currency)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Delivers {stepUpBuild.effectiveFps1440p} FPS (+
                {Math.max(
                  0,
                  stepUpBuild.effectiveFps1440p - topBuild.effectiveFps1440p,
                )}{' '}
                FPS) with {stepUpBuild.ram.name}.
              </p>
              <button
                type="button"
                onClick={onSwitchToBuilds}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition"
              >
                Inspect Build in Explorer →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
