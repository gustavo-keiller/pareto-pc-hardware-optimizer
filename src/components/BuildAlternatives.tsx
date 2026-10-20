import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { formatCurrency } from '../utils/currency';
import { AppLocale } from '../utils/i18n';

export interface BuildAlternativesProps {
  activeBuild: PcBuild;
  stepDownBuild: PcBuild | null;
  stepUpBuild: PcBuild | null;
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  onSelectBuild: (buildId: string) => void;
}

export const BuildAlternatives: React.FC<BuildAlternativesProps> = ({
  activeBuild,
  stepDownBuild,
  stepUpBuild,
  currency,
  locale = 'pt-BR',
  onSelectBuild,
}) => {
  if (!stepDownBuild && !stepUpBuild) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stepDownBuild && (
        <div
          onClick={() => onSelectBuild(stepDownBuild.id)}
          className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900 transition flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <ArrowDownRight className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {locale === 'pt-BR'
                  ? 'Opção Mais Barata (Economize Dinheiro)'
                  : 'Step Down (Save Money)'}
              </div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(stepDownBuild.totalPrice, currency)} ·{' '}
                {stepDownBuild.effectiveFps1440p} FPS
              </div>
              <div className="text-xs text-emerald-400 font-medium">
                {locale === 'pt-BR' ? 'Economize ' : 'Save '}
                {formatCurrency(
                  activeBuild.totalPrice - stepDownBuild.totalPrice,
                  currency,
                )}{' '}
                ({locale === 'pt-BR' ? 'perde ' : 'lose '}
                {(
                  activeBuild.effectiveFps1440p -
                  stepDownBuild.effectiveFps1440p
                ).toFixed(1)}{' '}
                FPS)
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
          >
            {locale === 'pt-BR' ? 'Inspecionar' : 'Inspect'}
          </button>
        </div>
      )}

      {stepUpBuild && (
        <div
          onClick={() => onSelectBuild(stepUpBuild.id)}
          className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900 transition flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <ArrowUpRight className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {locale === 'pt-BR'
                  ? 'Opção Superior (Próximo Nível)'
                  : 'Step Up (Next Performance Tier)'}
              </div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(stepUpBuild.totalPrice, currency)} ·{' '}
                {stepUpBuild.effectiveFps1440p} FPS
              </div>
              <div className="text-xs text-indigo-300 font-medium">
                +
                {formatCurrency(
                  stepUpBuild.totalPrice - activeBuild.totalPrice,
                  currency,
                )}{' '}
                {locale === 'pt-BR' ? 'por +' : 'for +'}
                {(
                  stepUpBuild.effectiveFps1440p - activeBuild.effectiveFps1440p
                ).toFixed(1)}{' '}
                FPS
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
          >
            {locale === 'pt-BR' ? 'Inspecionar' : 'Inspect'}
          </button>
        </div>
      )}
    </div>
  );
};
