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
} from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { formatCurrency, getEstimatedPriceNotice } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { generateBuildShoppingReasons } from '../utils/shoppingReasons';
import {
  copyTextToClipboard,
  encodeBuildShareUrl,
  formatBuildShareText,
} from '../utils/shareBuild';

interface BuildHeroCardProps {
  build: PcBuild;
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
}

export const BuildHeroCard: React.FC<BuildHeroCardProps> = ({
  build,
  currency = 'USD',
  locale = 'pt-BR',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const reasons = useMemo(() => {
    return generateBuildShoppingReasons(build, currency, locale);
  }, [build, currency, locale]);

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
                {locale === 'pt-BR'
                  ? '#1 PC Recomendado (Melhor Custo-Benefício)'
                  : '#1 Recommended PC Build (Best Value)'}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                {build.workloadMetricLabel ?? 'Max FPS Under Budget'}
              </span>
              {build.bottleneckPct === 0 ? (
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('buildThroughput100', locale)}
                </span>
              ) : (
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {build.bottleneckPct}% {t('buildCpuBottleneck', locale)} (
                  {locale === 'pt-BR' ? 'estimado' : 'estimated'})
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
                {currency === 'BRL' && (
                  <div className="text-[10px] text-amber-300/80 font-normal mt-0.5">
                    {getEstimatedPriceNotice(locale, currency)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition shadow-sm"
                  title={
                    locale === 'pt-BR'
                      ? 'Copiar link desta build'
                      : 'Copy shareable build link'
                  }
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {locale === 'pt-BR' ? 'Link Copiado!' : 'Link Copied!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>
                        {locale === 'pt-BR' ? 'Compartilhar' : 'Share Link'}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopySpecs}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition shadow-sm"
                  title={
                    locale === 'pt-BR'
                      ? 'Copiar lista de peças para Discord / WhatsApp / Reddit'
                      : 'Copy parts list for Discord / Reddit'
                  }
                >
                  {copiedSpecs ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {locale === 'pt-BR'
                          ? 'Lista Copiada!'
                          : 'Specs Copied!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-emerald-400" />
                      <span>
                        {locale === 'pt-BR' ? 'Copiar Peças' : 'Copy List'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Power Quick Telemetry */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
            <div className="text-slate-400 font-medium">
              {build.workloadMetricLabel
                ? locale === 'pt-BR'
                  ? 'Alvo de Uso'
                  : 'Target Workload'
                : locale === 'pt-BR'
                  ? 'Desempenho em Jogos'
                  : 'Effective Gaming'}
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
              {t('buildFedByCpu', locale)}
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
              +{build.powerHeadroomWatts}W {t('buildPsuHeadroomWatts', locale)}
            </div>
          </div>
        </div>
      </div>

      {/* 8-Component Bill of Materials Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CPU Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> CPU
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.cpu.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.cpu.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'Plataforma: ' : 'Platform: '}
              <span className="text-slate-200 font-medium">
                {build.cpu.socket}
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Núcleos: ' : 'Cores: '}
              <span className="text-slate-200 font-medium">
                {build.cpu.cores}C / {build.cpu.threads}T
              </span>
            </div>
            <div>
              TDP:{' '}
              <span className="text-slate-200 font-medium">
                {build.cpu.tdpWatts}W
              </span>{' '}
              · {locale === 'pt-BR' ? 'Pontos: ' : 'Score: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Placa de Vídeo' : 'GPU'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.gpu.price, currency)}
            </span>
          </div>
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
              {locale === 'pt-BR' ? 'Desempenho: ' : 'Raster: '}
              <span className="text-slate-200 font-medium">
                {build.gpu.rasterFps1440p} FPS
              </span>
            </div>
            <div>
              TBP:{' '}
              <span className="text-slate-200 font-medium">
                {build.gpu.tdpWatts}W
              </span>{' '}
              · {locale === 'pt-BR' ? 'Fabricante: ' : 'Vendor: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Placa-Mãe' : 'Motherboard'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.motherboard.price, currency)}
            </span>
          </div>
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
              {locale === 'pt-BR' ? 'Slots de RAM: ' : 'RAM Slots: '}
              <span className="text-slate-200 font-medium">
                {build.motherboard.ramSlots} ({build.motherboard.ramGeneration})
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Formato: ' : 'Form Factor: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Memória RAM' : 'Memory'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.ram.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.ram.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'Capacidade: ' : 'Capacity: '}
              <span className="text-slate-200 font-medium">
                {build.ram.capacityGb} GB ({build.ram.modulesCount}{' '}
                {locale === 'pt-BR' ? 'pentes' : 'sticks'})
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Velocidade: ' : 'Speed: '}
              <span className="text-slate-200 font-medium">
                {build.ram.speedMhz} MHz
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Geração: ' : 'Generation: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Armazenamento' : 'Storage'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.storage.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.storage.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'Capacidade: ' : 'Capacity: '}
              <span className="text-slate-200 font-medium">
                {build.storage.capacityGb >= 1000
                  ? `${build.storage.capacityGb / 1000} TB`
                  : `${build.storage.capacityGb} GB`}
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Tipo: ' : 'Type: '}
              <span className="text-slate-200 font-medium">
                {build.storage.type}
              </span>
            </div>
            {build.storage.readSpeedMbps && (
              <div>
                {locale === 'pt-BR' ? 'Leitura: ' : 'Read Speed: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Cooler da CPU' : 'CPU Cooler'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.cooler.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.cooler.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'Dissipação: ' : 'Cooling TDP: '}
              <span className="text-slate-200 font-medium">
                {build.cooler.maxTdpWatts} W
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Altura: ' : 'Height: '}
              <span className="text-slate-200 font-medium">
                {build.cooler.heightMm} mm
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Tipo: ' : 'Type: '}
              <span className="text-slate-200 font-medium">
                {build.cooler.type === 'Air' || !build.cooler.type
                  ? locale === 'pt-BR'
                    ? 'Ar'
                    : 'Air'
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Gabinete' : 'PC Case'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.case.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.case.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'GPU Máxima: ' : 'Max GPU: '}
              <span className="text-slate-200 font-medium">
                {build.case.maxGpuLengthMm} mm
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Cooler Máximo: ' : 'Max Cooler: '}
              <span className="text-slate-200 font-medium">
                {build.case.maxCpuCoolerHeightMm} mm
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Suporta: ' : 'Supports: '}
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
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />{' '}
              {locale === 'pt-BR' ? 'Fonte de Alimentação' : 'Power Supply'}
            </span>
            <span className="font-black text-white">
              {formatCurrency(build.psu.price, currency)}
            </span>
          </div>
          <div className="text-sm font-bold text-white leading-tight">
            {build.psu.name}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>
              {locale === 'pt-BR' ? 'Potência: ' : 'Capacity: '}
              <span className="text-slate-200 font-medium">
                {build.psu.wattage} W
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Certificação: ' : 'Rating: '}
              <span className="text-slate-200 font-medium">
                {build.psu.efficiencyRating}
              </span>
            </div>
            <div>
              {locale === 'pt-BR' ? 'Cabos: ' : 'Cables: '}
              <span className="text-slate-200 font-medium">
                {build.psu.modular} Modular
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
            {locale === 'pt-BR'
              ? 'Distribuição do Orçamento'
              : 'Component Budget Distribution'}
          </span>
          <span>
            {locale === 'pt-BR' ? 'Placa de Vídeo' : 'GPU'}:{' '}
            {Math.round((build.gpu.price / build.totalPrice) * 100)}% ·{' '}
            {locale === 'pt-BR' ? 'Processador' : 'CPU'}:{' '}
            {Math.round((build.cpu.price / build.totalPrice) * 100)}% ·{' '}
            {locale === 'pt-BR' ? 'Outras Peças' : 'Other Parts'}:{' '}
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
            title={`${locale === 'pt-BR' ? 'Placa de Vídeo' : 'GPU'}: ${formatCurrency(build.gpu.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.cpu.price / build.totalPrice) * 100}%`,
            }}
            className="bg-emerald-500"
            title={`${locale === 'pt-BR' ? 'Processador' : 'CPU'}: ${formatCurrency(build.cpu.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.motherboard.price / build.totalPrice) * 100}%`,
            }}
            className="bg-amber-500"
            title={`${locale === 'pt-BR' ? 'Placa-Mãe' : 'Motherboard'}: ${formatCurrency(build.motherboard.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.ram.price / build.totalPrice) * 100}%`,
            }}
            className="bg-sky-500"
            title={`${locale === 'pt-BR' ? 'Memória RAM' : 'RAM'}: ${formatCurrency(build.ram.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.storage.price / build.totalPrice) * 100}%`,
            }}
            className="bg-purple-500"
            title={`${locale === 'pt-BR' ? 'Armazenamento' : 'Storage'}: ${formatCurrency(build.storage.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.cooler.price / build.totalPrice) * 100}%`,
            }}
            className="bg-cyan-500"
            title={`${locale === 'pt-BR' ? 'Cooler' : 'Cooler'}: ${formatCurrency(build.cooler.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.case.price / build.totalPrice) * 100}%`,
            }}
            className="bg-rose-500"
            title={`${locale === 'pt-BR' ? 'Gabinete' : 'Case'}: ${formatCurrency(build.case.price, currency)}`}
          />
          <div
            style={{
              width: `${(build.psu.price / build.totalPrice) * 100}%`,
            }}
            className="bg-teal-500"
            title={`${locale === 'pt-BR' ? 'Fonte' : 'PSU'}: ${formatCurrency(build.psu.price, currency)}`}
          />
        </div>
      </div>
    </section>
  );
};
