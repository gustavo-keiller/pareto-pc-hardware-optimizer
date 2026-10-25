import React, { useMemo, useState } from 'react';
import {
  Award,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  TrendingUp,
  Layers,
  Zap,
  CheckCircle2,
  HardDrive,
  Wind,
  Box,
  Share2,
  Copy,
  Check,
  Wrench,
} from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { SwappableCategory } from './PartSwapperModal';
import { PartCardHeader } from './PartCardHeader';
import { formatCurrency, getBuildPriceNotice } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { generateBuildShoppingReasons } from '../utils/shoppingReasons';
import {
  copyTextToClipboard,
  encodeBuildShareUrl,
  formatBuildShareText,
} from '../utils/shareBuild';

export interface BuildHeroCardProps {
  build: PcBuild;
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
  onSwapPart?: (category: SwappableCategory) => void;
  isCustomized?: boolean;
  onResetCustomization?: () => void;
}

export const BuildHeroCard: React.FC<BuildHeroCardProps> = ({
  build,
  currency = 'USD',
  locale = 'pt-BR',
  onSwapPart,
  isCustomized = false,
  onResetCustomization,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const reasons = useMemo(() => {
    return generateBuildShoppingReasons(build, currency, locale);
  }, [build, currency, locale]);

  const priceNotice = useMemo(
    () =>
      getBuildPriceNotice(
        [
          build.cpu,
          build.gpu,
          build.motherboard,
          build.ram,
          build.storage,
          build.cooler,
          build.case,
          build.psu,
        ],
        currency,
        locale,
      ),
    [build, currency, locale],
  );

  const shareUrl = useMemo(() => {
    return encodeBuildShareUrl({
      cpuId: build.cpu.id,
      gpuId: build.gpu.id,
      moboId: build.motherboard.id,
      ramId: build.ram.id,
      psuId: build.psu.id,
      storageId: build.storage.id,
      caseId: build.case.id,
      coolerId: build.cooler.id,
      budget: build.totalPrice,
      workload: build.workloadProfile,
      currency,
      buildId: build.id,
    });
  }, [build, currency]);

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopySpecs = async () => {
    const formatted = formatBuildShareText(build, shareUrl, currency, locale);
    const ok = await copyTextToClipboard(formatted);
    if (ok) {
      setCopiedSpecs(true);
      setTimeout(() => setCopiedSpecs(false), 2000);
    }
  };
  return (
    <section
      data-testid="top-build-card"
      className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Top Banner & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                {t('heroTopBuildHeader', locale)}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                {build.workloadMetricLabel ?? 'Max FPS Under Budget'}
              </span>
              {build.bottleneckPct === 0 ? (
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('buildThroughput100', locale)} (
                  {t('estimateBadge', locale)})
                </span>
              ) : (
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {build.bottleneckPct}% {t('buildCpuBottleneck', locale)} (
                  {t('estimateBadge', locale)})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {formatCurrency(build.totalPrice, currency)}{' '}
                  <span className="text-lg font-normal text-slate-400">
                    {t('buildTotalHardwareCost', locale)}
                  </span>
                </h3>
                {priceNotice.text && (
                  <div
                    data-testid="build-price-notice"
                    className={`text-[10px] font-normal mt-0.5 ${priceNotice.isEstimate ? 'text-amber-300/80' : 'text-emerald-300/80'}`}
                  >
                    {priceNotice.text}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition shadow-sm"
                  title={t('btnCopyBuildLink', locale)}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {t('btnLinkCopied', locale)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>{t('btnShare', locale)}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopySpecs}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition shadow-sm"
                  title={t('btnCopySpecsTitle', locale)}
                >
                  {copiedSpecs ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {t('btnSpecsCopied', locale)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t('btnCopySpecs', locale)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Power Quick Telemetry */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
              <div className="text-slate-400 font-medium flex items-center gap-1.5">
                <span>
                  {build.workloadMetricLabel
                    ? t('telemetryTargetWorkload', locale)
                    : t('telemetryEffectiveGaming', locale)}
                </span>
                <span
                  data-testid="workload-score-estimate-badge"
                  className="rounded bg-slate-800 border border-slate-700 px-1 py-0.2 text-[9px] font-semibold text-slate-400 uppercase tracking-wider"
                >
                  {t('estimateBadge', locale)}
                </span>
              </div>
              <div className="text-xl font-black text-emerald-400">
                {build.workloadScore ?? build.effectiveFps1440p}{' '}
                {build.workloadScore != null
                  ? build.workloadProfile === 'creator-ai'
                    ? 'pts'
                    : 'FPS'
                  : 'FPS'}
              </div>
              <div className="text-[10px] text-slate-400">
                {build.workloadMetricLabel ?? '1440p Ultra Geomean'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
              <div className="text-slate-400 font-medium">
                {t('buildRawGpuCapacity', locale)}
              </div>
              <div className="text-xl font-black text-slate-200">
                {build.rawGpuFps1440p} FPS
              </div>
              <div className="text-[10px] text-slate-400">
                {Math.round(build.bottleneckFactor * 100)}%{' '}
                {t('buildFedByCpu', locale)} ({t('estimateBadge', locale)})
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
              <div className="text-slate-400 font-medium">
                {t('buildEstimatedPowerDraw', locale)}
              </div>
              <div className="text-xl font-black text-teal-400">
                {build.estimatedPowerDrawWatts} W
              </div>
              <div className="text-[10px] text-slate-400">
                +{build.powerHeadroomWatts}W{' '}
                {t('buildPsuHeadroomWatts', locale)}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            * {t('estimateExplanation', locale)}
          </div>
        </div>
      </div>

      {/* Customized Swapped Parts Banner [BLD-05] */}
      {isCustomized && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Wrench className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{t('swapCustomizedBuildBadge', locale)}</span>
          </div>
          {onResetCustomization && (
            <button
              type="button"
              onClick={onResetCustomization}
              className="font-bold text-amber-400 hover:text-white underline transition"
            >
              {t('swapResetToRecommended', locale)}
            </button>
          )}
        </div>
      )}

      {/* 8-Component Bill of Materials Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CPU Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="emerald"
            part={build.cpu}
            partLabel={t('partCpu', locale)}
            onSwap={onSwapPart ? () => onSwapPart('cpu') : undefined}
            currency={currency}
            locale={locale}
          >
            <Cpu className="h-3.5 w-3.5" /> CPU
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.cpu.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardPlatform', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cpu.socket}
              </span>
            </div>
            <div>
              {t('cardCores', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cpu.cores}C / {build.cpu.threads}T
              </span>
            </div>
            <div>
              TDP:{' '}
              <span className="text-slate-200 font-medium">
                {build.cpu.tdpWatts}W
              </span>{' '}
              · {t('cardScore', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cpu.gamingScore}/100
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.cpu}
          </p>
        </div>

        {/* GPU Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="indigo"
            part={build.gpu}
            partLabel={t('partGpu', locale)}
            onSwap={onSwapPart ? () => onSwapPart('gpu') : undefined}
            currency={currency}
            locale={locale}
          >
            <TrendingUp className="h-3.5 w-3.5" /> {t('partGpu', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.gpu.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              VRAM:{' '}
              <span className="text-sky-400 font-medium">
                {build.gpu.vramGb} GB
              </span>
            </div>
            <div>
              {t('cardDesempenho', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.gpu.rasterFps1440p} FPS
              </span>
            </div>
            <div>
              TBP:{' '}
              <span className="text-slate-200 font-medium">
                {build.gpu.tdpWatts}W
              </span>{' '}
              · {t('cardFabricante', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.gpu.vendor}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-indigo-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.gpu}
          </p>
        </div>

        {/* Motherboard Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="amber"
            part={build.motherboard}
            partLabel={t('partMotherboard', locale)}
            onSwap={onSwapPart ? () => onSwapPart('motherboard') : undefined}
            currency={currency}
            locale={locale}
          >
            <Layers className="h-3.5 w-3.5" /> {t('partMotherboard', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.motherboard.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              Chipset:{' '}
              <span className="text-slate-200 font-medium">
                {build.motherboard.chipset ?? 'Standard'}
              </span>
            </div>
            <div>
              {t('cardRamSlots', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.motherboard.ramSlots} ({build.motherboard.ramGeneration})
              </span>
            </div>
            <div>
              {t('cardFormFactor', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.motherboard.formFactor}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-amber-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.motherboard}
          </p>
        </div>

        {/* RAM Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="sky"
            part={build.ram}
            partLabel={t('partRam', locale)}
            onSwap={onSwapPart ? () => onSwapPart('ram') : undefined}
            currency={currency}
            locale={locale}
          >
            <Zap className="h-3.5 w-3.5" /> {t('partRam', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.ram.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardCapacity', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.ram.capacityGb} GB ({build.ram.modulesCount}{' '}
                {t('cardSticks', locale)})
              </span>
            </div>
            <div>
              {t('cardSpeed', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.ram.speedMhz} MHz
              </span>
            </div>
            <div>
              {t('cardGeneration', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.ram.generation}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-sky-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.ram}
          </p>
        </div>

        {/* Storage Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="purple"
            part={build.storage}
            partLabel={t('partStorage', locale)}
            onSwap={onSwapPart ? () => onSwapPart('storage') : undefined}
            currency={currency}
            locale={locale}
          >
            <HardDrive className="h-3.5 w-3.5" /> {t('partStorage', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.storage.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardCapacity', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.storage.capacityGb >= 1000
                  ? `${build.storage.capacityGb / 1000} TB`
                  : `${build.storage.capacityGb} GB`}
              </span>
            </div>
            <div>
              {t('cardType', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.storage.type}
              </span>
            </div>
            {build.storage.readSpeedMbps && (
              <div>
                {t('cardReadSpeed', locale)}{' '}
                <span className="text-slate-200 font-medium">
                  {build.storage.readSpeedMbps} MB/s
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-purple-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.storage}
          </p>
        </div>

        {/* Cooler Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="cyan"
            part={build.cooler}
            partLabel={t('partCooler', locale)}
            onSwap={onSwapPart ? () => onSwapPart('cooler') : undefined}
            currency={currency}
            locale={locale}
          >
            <Wind className="h-3.5 w-3.5" /> {t('partCooler', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.cooler.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardCoolingTdp', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cooler.maxTdpWatts} W
              </span>
            </div>
            <div>
              {t('cardHeight', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cooler.heightMm} mm
              </span>
            </div>
            <div>
              {t('cardType', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.cooler.type === 'Air' || !build.cooler.type
                  ? t('cardAir', locale)
                  : build.cooler.type}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.cooler}
          </p>
        </div>

        {/* Case Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="rose"
            part={build.case}
            partLabel={t('partCase', locale)}
            onSwap={onSwapPart ? () => onSwapPart('case') : undefined}
            currency={currency}
            locale={locale}
          >
            <Box className="h-3.5 w-3.5" /> {t('partCase', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.case.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardMaxGpu', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.case.maxGpuLengthMm} mm
              </span>
            </div>
            <div>
              {t('cardMaxCooler', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.case.maxCpuCoolerHeightMm} mm
              </span>
            </div>
            <div>
              {t('cardSupports', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.case.supportedFormFactors.join(', ')}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-rose-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.casePart}
          </p>
        </div>

        {/* PSU Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <PartCardHeader
            tone="teal"
            part={build.psu}
            partLabel={t('partPsu', locale)}
            onSwap={onSwapPart ? () => onSwapPart('psu') : undefined}
            currency={currency}
            locale={locale}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {t('partPsu', locale)}
          </PartCardHeader>
          <div className="text-sm font-bold text-white leading-tight">
            {build.psu.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {t('cardPsuCapacity', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.psu.wattage} W
              </span>
            </div>
            <div>
              {t('cardRating', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.psu.efficiencyRating}
              </span>
            </div>
            <div>
              {t('cardCables', locale)}{' '}
              <span className="text-slate-200 font-medium">
                {build.psu.modular} {t('cardModular', locale)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-teal-300/90 border-t border-slate-800/80 pt-1.5 leading-snug">
            {reasons.psu}
          </p>
        </div>
      </div>

      {/* Budget Allocation Breakdown Bar */}
      <div className="mt-6 border-t border-slate-800/80 pt-5">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300">
            {t('budgetDistributionTitle', locale)}
          </span>
          <span>
            {t('partGpu', locale)}:{' '}
            {Math.round((build.gpu.price / build.totalPrice) * 100)}% ·{' '}
            {t('partCpu', locale)}:{' '}
            {Math.round((build.cpu.price / build.totalPrice) * 100)}% ·{' '}
            {t('budgetDistributionOtherParts', locale)}:{' '}
            {Math.round(
              ((build.totalPrice - build.gpu.price - build.cpu.price) /
                build.totalPrice) *
                100,
            )}
            %
          </span>
        </div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
          <div
            style={{
              width: `${(build.gpu.price / build.totalPrice) * 100}%`,
            }}
            className="bg-indigo-500"
            title={`${t('partGpu', locale)}: ${formatCurrency(build.gpu.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.cpu.price / build.totalPrice) * 100}%`,
            }}
            className="bg-emerald-500"
            title={`${t('partCpu', locale)}: ${formatCurrency(build.cpu.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.motherboard.price / build.totalPrice) * 100}%`,
            }}
            className="bg-amber-500"
            title={`${t('partMotherboard', locale)}: ${formatCurrency(build.motherboard.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.ram.price / build.totalPrice) * 100}%`,
            }}
            className="bg-sky-500"
            title={`${t('partRam', locale)}: ${formatCurrency(build.ram.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.storage.price / build.totalPrice) * 100}%`,
            }}
            className="bg-purple-500"
            title={`${t('partStorage', locale)}: ${formatCurrency(build.storage.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.cooler.price / build.totalPrice) * 100}%`,
            }}
            className="bg-cyan-500"
            title={`${t('partCooler', locale)}: ${formatCurrency(build.cooler.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.case.price / build.totalPrice) * 100}%`,
            }}
            className="bg-rose-500"
            title={`${t('partCase', locale)}: ${formatCurrency(build.case.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.psu.price / build.totalPrice) * 100}%`,
            }}
            className="bg-teal-500"
            title={`${t('partPsu', locale)}: ${formatCurrency(build.psu.price, currency)}`}
          />
        </div>
      </div>
    </section>
  );
};
