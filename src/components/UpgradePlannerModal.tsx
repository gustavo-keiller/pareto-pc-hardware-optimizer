import React, { useMemo, useState } from 'react';
import {
  X,
  Wrench,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Zap,
  Box,
  HardDrive,
  Fan,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BuildWorkloadProfile,
  CaseCandidate,
  CoolerCandidate,
  CpuCandidate,
  MotherboardCandidate,
  PcBuild,
  PsuCandidate,
  RamCandidate,
  StorageCandidate,
} from '../lib/math/buildTypes';
import { ComponentCatalogs } from '../lib/math/combinatorial';
import { GpuCandidate } from '../lib/math/types';
import {
  ComponentCategory,
  optimizeUpgradePaths,
  OwnedHardwareProfile,
  UpgradeBuild,
} from '../lib/math/upgradeOptimizer';
import { formatCurrency } from '../utils/currency';
import { AppLocale } from '../utils/i18n';

export interface UpgradePlannerModalProps {
  catalogs: ComponentCatalogs;
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  workloadProfile?: BuildWorkloadProfile;
  onClose: () => void;
  onSelectBuild: (build: PcBuild) => void;
}

interface OwnedPartCardProps {
  label: string;
  icon: React.ReactNode;
  owned: boolean;
  value: string;
  options: Array<{ id: string; label: string }>;
  locale: AppLocale;
  borderClass: string;
  bgClass: string;
  onChange: (id: string) => void;
}

const OwnedPartCard: React.FC<OwnedPartCardProps> = ({
  label,
  icon,
  owned,
  value,
  options,
  locale,
  borderClass,
  bgClass,
  onChange,
}) => (
  <div
    className={`rounded-xl border p-3 transition ${
      owned ? `${borderClass} ${bgClass}` : 'border-slate-800 bg-slate-950/40'
    }`}
  >
    <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {owned && (
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
          <CheckCircle2 className="h-3 w-3" />
          {locale === 'pt-BR' ? 'Já Tenho' : 'Owned'}
        </span>
      )}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
    >
      <option value="">
        {locale === 'pt-BR' ? 'Quero Comprar Nova' : 'None / Upgrade'}
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const UpgradePlannerModal: React.FC<UpgradePlannerModalProps> = ({
  catalogs,
  currency = 'USD',
  locale = 'pt-BR',
  workloadProfile = 'sweetspot-1440p',
  onClose,
  onSelectBuild,
}) => {
  const isBrl = currency === 'BRL';

  // Find standard seed parts for default popular AM4 base
  const defaultAm4Mobo = useMemo(
    () => catalogs.motherboards.find((m) => m.socket === 'AM4'),
    [catalogs.motherboards],
  );
  const defaultDdr4Ram = useMemo(
    () => catalogs.ramKits.find((r) => r.generation === 'DDR4'),
    [catalogs.ramKits],
  );
  const defaultPsu550w = useMemo(
    () => catalogs.psus.find((p) => p.wattage === 550) ?? catalogs.psus[0],
    [catalogs.psus],
  );
  const defaultRyzenCpu = useMemo(
    () => catalogs.cpus.find((c) => c.socket === 'AM4') ?? catalogs.cpus[0],
    [catalogs.cpus],
  );
  const defaultEntryGpu = useMemo(
    () => catalogs.gpus.find((g) => g.price <= 200) ?? catalogs.gpus[0],
    [catalogs.gpus],
  );
  const defaultCase = catalogs.cases?.[0];
  const defaultCooler = catalogs.coolers?.[0];
  const defaultStorage = catalogs.storages?.[0];

  // Owned parts state
  const [ownedCpu, setOwnedCpu] = useState<CpuCandidate | undefined>(
    () => defaultRyzenCpu,
  );
  const [ownedGpu, setOwnedGpu] = useState<GpuCandidate | undefined>(
    () => defaultEntryGpu,
  );
  const [ownedMobo, setOwnedMobo] = useState<MotherboardCandidate | undefined>(
    () => defaultAm4Mobo,
  );
  const [ownedRam, setOwnedRam] = useState<RamCandidate | undefined>(
    () => defaultDdr4Ram,
  );
  const [ownedPsu, setOwnedPsu] = useState<PsuCandidate | undefined>(
    () => defaultPsu550w,
  );
  const [ownedCase, setOwnedCase] = useState<CaseCandidate | undefined>(
    () => defaultCase,
  );
  const [ownedCooler, setOwnedCooler] = useState<CoolerCandidate | undefined>(
    () => defaultCooler,
  );
  const [ownedStorage, setOwnedStorage] = useState<
    StorageCandidate | undefined
  >(() => defaultStorage);

  // Upgrade budget state
  const [upgradeBudget, setUpgradeBudget] = useState<number>(
    isBrl ? 2500 : 400,
  );

  const budgetPresets = useMemo(
    () =>
      isBrl
        ? [
            { label: 'R$ 1.500', value: 1500 },
            { label: 'R$ 2.500', value: 2500 },
            { label: 'R$ 4.000', value: 4000 },
            { label: 'R$ 6.000', value: 6000 },
          ]
        : [
            { label: '$250', value: 250 },
            { label: '$400', value: 400 },
            { label: '$650', value: 650 },
            { label: '$1,000', value: 1000 },
          ],
    [isBrl],
  );

  const handleApplyPreset = (presetType: 'am4' | 'clear') => {
    if (presetType === 'am4') {
      setOwnedCpu(defaultRyzenCpu);
      setOwnedGpu(defaultEntryGpu);
      setOwnedMobo(defaultAm4Mobo);
      setOwnedRam(defaultDdr4Ram);
      setOwnedPsu(defaultPsu550w);
      setOwnedCase(defaultCase);
      setOwnedCooler(defaultCooler);
      setOwnedStorage(defaultStorage);
    } else {
      setOwnedCpu(undefined);
      setOwnedGpu(undefined);
      setOwnedMobo(undefined);
      setOwnedRam(undefined);
      setOwnedPsu(undefined);
      setOwnedCase(undefined);
      setOwnedCooler(undefined);
      setOwnedStorage(undefined);
    }
  };

  const ownedProfile: OwnedHardwareProfile = useMemo(
    () => ({
      cpu: ownedCpu,
      gpu: ownedGpu,
      motherboard: ownedMobo,
      ram: ownedRam,
      psu: ownedPsu,
      pcCase: ownedCase,
      cooler: ownedCooler,
      storage: ownedStorage,
    }),
    [
      ownedCpu,
      ownedGpu,
      ownedMobo,
      ownedRam,
      ownedPsu,
      ownedCase,
      ownedCooler,
      ownedStorage,
    ],
  );

  const optimizationResult = useMemo(
    () =>
      optimizeUpgradePaths(catalogs, ownedProfile, {
        maxUpgradeBudget: upgradeBudget,
        workloadProfile,
      }),
    [catalogs, ownedProfile, upgradeBudget, workloadProfile],
  );

  const topUpgrade: UpgradeBuild | undefined =
    optimizationResult.optimalUpgrades[
      optimizationResult.optimalUpgrades.length - 1
    ] ?? optimizationResult.optimalUpgrades[0];

  const componentActions: Array<{
    key: ComponentCategory;
    label: string;
    part: { name: string };
  }> = topUpgrade
    ? [
        { key: 'cpu', label: 'CPU', part: topUpgrade.build.cpu },
        { key: 'gpu', label: 'GPU', part: topUpgrade.build.gpu },
        {
          key: 'motherboard',
          label: 'Mobo',
          part: topUpgrade.build.motherboard,
        },
        { key: 'ram', label: 'RAM', part: topUpgrade.build.ram },
        { key: 'psu', label: 'PSU', part: topUpgrade.build.psu },
        { key: 'storage', label: 'SSD', part: topUpgrade.build.storage },
        { key: 'pcCase', label: 'Gabinete', part: topUpgrade.build.case },
        { key: 'cooler', label: 'Cooler', part: topUpgrade.build.cooler },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Wrench className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {locale === 'pt-BR'
                    ? 'Planejador de Upgrade ("Já Tenho Peças")'
                    : 'Upgrade Planner ("I Already Have...")'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {locale === 'pt-BR'
                    ? 'Trave as peças do seu PC atual com custo R$ 0 e encontre o maior ganho de performance pelo seu orçamento.'
                    : 'Lock hardware you already own to $0 cost and discover the highest performance leap for your budget.'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 hover:text-white hover:border-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets & Budget Slider */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Presets */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {locale === 'pt-BR'
                ? 'Base do Computador Atual'
                : 'Current Setup Presets'}
            </span>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('am4')}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                {locale === 'pt-BR'
                  ? 'Base Popular AM4 (Ryzen + B550 + 550W)'
                  : 'Popular AM4 Base (Ryzen + B550 + 550W)'}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('clear')}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                {locale === 'pt-BR' ? 'Limpar Tudo' : 'Clear All'}
              </button>
            </div>
          </div>

          {/* Upgrade Budget */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {locale === 'pt-BR'
                  ? 'Orçamento Máximo do Upgrade'
                  : 'Upgrade Budget Ceiling'}
              </span>
              <span className="text-base font-black text-amber-400">
                {formatCurrency(upgradeBudget, currency, locale)}
              </span>
            </div>
            <div className="flex gap-2 mt-2.5">
              {budgetPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setUpgradeBudget(preset.value)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition ${
                    upgradeBudget === preset.value
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Owned Parts Selector Grid */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            {locale === 'pt-BR'
              ? 'Selecione as Peças que Você Já Possui'
              : 'Select Components You Already Own'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <OwnedPartCard
              label="CPU"
              icon={<Cpu className="h-3.5 w-3.5 text-emerald-400" />}
              owned={Boolean(ownedCpu)}
              value={ownedCpu?.id ?? ''}
              options={catalogs.cpus.map((c) => ({
                id: c.id,
                label: `${c.name} (${c.socket})`,
              }))}
              locale={locale}
              borderClass="border-emerald-500/40"
              bgClass="bg-emerald-950/10"
              onChange={(id) =>
                setOwnedCpu(catalogs.cpus.find((c) => c.id === id))
              }
            />

            <OwnedPartCard
              label="GPU"
              icon={<Layers className="h-3.5 w-3.5 text-indigo-400" />}
              owned={Boolean(ownedGpu)}
              value={ownedGpu?.id ?? ''}
              options={catalogs.gpus.map((g) => ({
                id: g.id,
                label: g.name,
              }))}
              locale={locale}
              borderClass="border-indigo-500/40"
              bgClass="bg-indigo-950/10"
              onChange={(id) =>
                setOwnedGpu(catalogs.gpus.find((g) => g.id === id))
              }
            />

            <OwnedPartCard
              label="Placa-Mãe"
              icon={<Box className="h-3.5 w-3.5 text-amber-400" />}
              owned={Boolean(ownedMobo)}
              value={ownedMobo?.id ?? ''}
              options={catalogs.motherboards.map((m) => ({
                id: m.id,
                label: `${m.name} (${m.socket})`,
              }))}
              locale={locale}
              borderClass="border-amber-500/40"
              bgClass="bg-amber-950/10"
              onChange={(id) =>
                setOwnedMobo(catalogs.motherboards.find((m) => m.id === id))
              }
            />

            <OwnedPartCard
              label="RAM"
              icon={<Cpu className="h-3.5 w-3.5 text-sky-400" />}
              owned={Boolean(ownedRam)}
              value={ownedRam?.id ?? ''}
              options={catalogs.ramKits.map((r) => ({
                id: r.id,
                label: `${r.name} (${r.generation})`,
              }))}
              locale={locale}
              borderClass="border-sky-500/40"
              bgClass="bg-sky-950/10"
              onChange={(id) =>
                setOwnedRam(catalogs.ramKits.find((r) => r.id === id))
              }
            />

            <OwnedPartCard
              label="Fonte (PSU)"
              icon={<Zap className="h-3.5 w-3.5 text-teal-400" />}
              owned={Boolean(ownedPsu)}
              value={ownedPsu?.id ?? ''}
              options={catalogs.psus.map((p) => ({
                id: p.id,
                label: `${p.name} (${p.wattage}W)`,
              }))}
              locale={locale}
              borderClass="border-teal-500/40"
              bgClass="bg-teal-950/10"
              onChange={(id) =>
                setOwnedPsu(catalogs.psus.find((p) => p.id === id))
              }
            />

            <OwnedPartCard
              label="Gabinete"
              icon={<Box className="h-3.5 w-3.5 text-purple-400" />}
              owned={Boolean(ownedCase)}
              value={ownedCase?.id ?? ''}
              options={(catalogs.cases ?? []).map((c) => ({
                id: c.id,
                label: c.name,
              }))}
              locale={locale}
              borderClass="border-purple-500/40"
              bgClass="bg-purple-950/10"
              onChange={(id) =>
                setOwnedCase(catalogs.cases?.find((c) => c.id === id))
              }
            />

            <OwnedPartCard
              label="Cooler"
              icon={<Fan className="h-3.5 w-3.5 text-cyan-400" />}
              owned={Boolean(ownedCooler)}
              value={ownedCooler?.id ?? ''}
              options={(catalogs.coolers ?? []).map((c) => ({
                id: c.id,
                label: c.name,
              }))}
              locale={locale}
              borderClass="border-cyan-500/40"
              bgClass="bg-cyan-950/10"
              onChange={(id) =>
                setOwnedCooler(catalogs.coolers?.find((c) => c.id === id))
              }
            />

            <OwnedPartCard
              label="SSD / Armazenamento"
              icon={<HardDrive className="h-3.5 w-3.5 text-emerald-400" />}
              owned={Boolean(ownedStorage)}
              value={ownedStorage?.id ?? ''}
              options={(catalogs.storages ?? []).map((s) => ({
                id: s.id,
                label: s.name,
              }))}
              locale={locale}
              borderClass="border-emerald-500/40"
              bgClass="bg-emerald-950/10"
              onChange={(id) =>
                setOwnedStorage(catalogs.storages?.find((s) => s.id === id))
              }
            />
          </div>
        </div>

        {/* Recommended Upgrade Hero Card */}
        {topUpgrade ? (
          <div className="mt-8 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-900 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-0.5 text-xs font-bold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {locale === 'pt-BR'
                    ? '#1 Melhor Rota de Upgrade'
                    : '#1 Top Recommended Upgrade Path'}
                </span>
                <h4 className="text-xl font-black text-white mt-2">
                  {topUpgrade.upgradedPartCategories.length === 0
                    ? locale === 'pt-BR'
                      ? 'Manter Setup Atual (Sem Custo Adicional)'
                      : 'Keep Current Setup (Zero Additional Cost)'
                    : locale === 'pt-BR'
                      ? `Upgrade: ${topUpgrade.upgradedPartCategories
                          .map((c) => c.toUpperCase())
                          .join(' + ')}`
                      : `Upgrade: ${topUpgrade.upgradedPartCategories
                          .map((c) => c.toUpperCase())
                          .join(' + ')}`}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">
                  {locale === 'pt-BR' ? 'Custo do Upgrade' : 'Upgrade Cost'}
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(topUpgrade.upgradeCost, currency, locale)}
                </span>
              </div>
            </div>

            {/* Performance Leap Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <span className="text-[11px] text-slate-400 font-semibold block">
                  {locale === 'pt-BR'
                    ? 'Desempenho no Alvo'
                    : 'Target Workload Score'}
                </span>
                <span className="text-lg font-black text-white">
                  {topUpgrade.build.workloadScore ??
                    topUpgrade.build.effectiveFps1440p}{' '}
                  {topUpgrade.build.workloadMetricLabel ?? 'FPS'}
                </span>
              </div>

              {typeof topUpgrade.percentGain === 'number' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                  <span className="text-[11px] text-emerald-400 font-semibold block flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {locale === 'pt-BR'
                      ? 'Salto vs. PC Atual'
                      : 'Leap vs Current Setup'}
                  </span>
                  <span className="text-lg font-black text-emerald-300">
                    +{Math.round(topUpgrade.percentGain)}%{' '}
                    {locale === 'pt-BR' ? 'mais rápido' : 'faster'}
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-teal-400" />
                  {locale === 'pt-BR'
                    ? 'Compatibilidade Física'
                    : 'Physical Fit'}
                </span>
                <span className="text-xs font-bold text-teal-300">
                  {topUpgrade.build.powerHeadroomWatts >= 0
                    ? locale === 'pt-BR'
                      ? `Fonte segura (${topUpgrade.build.powerHeadroomWatts}W de folga)`
                      : `Safe PSU (${topUpgrade.build.powerHeadroomWatts}W headroom)`
                    : locale === 'pt-BR'
                      ? 'Requer troca de fonte'
                      : 'Requires PSU upgrade'}
                </span>
              </div>
            </div>

            {/* Component Status Grid: Kept vs Upgraded */}
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                {locale === 'pt-BR'
                  ? 'Detalhamento do Que Fazer com Cada Peça'
                  : 'Action Per Component'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {componentActions.map((item) => {
                  const isRetained = topUpgrade.retainedPartCategories.includes(
                    item.key,
                  );
                  return (
                    <div
                      key={item.key}
                      className={`rounded-lg border p-2 text-xs ${
                        isRetained
                          ? 'border-slate-800 bg-slate-900/60'
                          : 'border-emerald-500/40 bg-emerald-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-0.5">
                        <span className="text-slate-400">{item.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isRetained
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isRetained
                            ? locale === 'pt-BR'
                              ? 'MANTER (R$ 0)'
                              : 'KEEP ($0)'
                            : locale === 'pt-BR'
                              ? 'COMPRAR'
                              : 'BUY NEW'}
                        </span>
                      </div>
                      <span className="text-white font-medium truncate block">
                        {item.part.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                {locale === 'pt-BR' ? 'Fechar' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => onSelectBuild(topUpgrade.build)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 shadow-lg transition"
              >
                <span>
                  {locale === 'pt-BR'
                    ? 'Ver Este Build Completo no Explorador'
                    : 'Inspect Full Build in Explorer'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
            {locale === 'pt-BR'
              ? 'Nenhuma opção de upgrade compatível encontrada para este orçamento. Tente aumentar o teto ou liberar peças.'
              : 'No compatible upgrade paths found for this budget. Try raising budget or unlocking parts.'}
          </div>
        )}
      </div>
    </div>
  );
};
