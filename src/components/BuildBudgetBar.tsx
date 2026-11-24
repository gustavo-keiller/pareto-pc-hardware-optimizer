import React from 'react';
import { PcBuild } from '../lib/math/buildTypes';
import { formatCurrency } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';

export interface BuildBudgetBarProps {
  build: PcBuild;
  currency: 'USD' | 'BRL';
  locale: AppLocale;
}

export const BuildBudgetBar: React.FC<BuildBudgetBarProps> = ({
  build,
  currency,
  locale,
}) => {
  const total = Math.max(1, build.totalPrice);
  const segments = [
    {
      key: 'gpu',
      label: t('partGpu', locale),
      price: build.gpu.price,
      color: 'bg-indigo-500',
    },
    {
      key: 'cpu',
      label: t('partCpu', locale),
      price: build.cpu.price,
      color: 'bg-emerald-500',
    },
    {
      key: 'motherboard',
      label: t('partMotherboard', locale),
      price: build.motherboard.price,
      color: 'bg-amber-500',
    },
    {
      key: 'ram',
      label: t('partRam', locale),
      price: build.ram.price,
      color: 'bg-sky-500',
    },
    {
      key: 'storage',
      label: t('partStorage', locale),
      price: build.storage.price,
      color: 'bg-purple-500',
    },
    {
      key: 'cooler',
      label: t('partCooler', locale),
      price: build.cooler.price,
      color: 'bg-cyan-500',
    },
    {
      key: 'case',
      label: t('partCase', locale),
      price: build.case.price,
      color: 'bg-rose-500',
    },
    {
      key: 'psu',
      label: t('partPsu', locale),
      price: build.psu.price,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="mt-6 border-t border-slate-800/80 pt-5">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-semibold text-slate-300">
          {t('budgetDistributionTitle', locale)}
        </span>
        <span>
          {t('partGpu', locale)}: {Math.round((build.gpu.price / total) * 100)}%
          · {t('partCpu', locale)}:{' '}
          {Math.round((build.cpu.price / total) * 100)}% ·{' '}
          {t('budgetDistributionOtherParts', locale)}:{' '}
          {Math.round(
            ((total - build.gpu.price - build.cpu.price) / total) * 100,
          )}
          %
        </span>
      </div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
        {segments.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${(seg.price / total) * 100}%` }}
            className={seg.color}
            title={`${seg.label}: ${formatCurrency(seg.price, currency)}`}
          />
        ))}
      </div>
    </div>
  );
};
