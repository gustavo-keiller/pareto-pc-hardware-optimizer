import { BuildWorkloadProfile, PcBuild } from '../lib/math/buildTypes';
import { formatCurrency } from './currency';
import { AppLocale } from './i18n';

export interface BuildShareParams {
  cpuId?: string;
  gpuId?: string;
  moboId?: string;
  ramId?: string;
  psuId?: string;
  storageId?: string;
  caseId?: string;
  coolerId?: string;
  budget?: number;
  workload?: BuildWorkloadProfile;
  currency?: 'USD' | 'BRL';
  buildId?: string;
}

export function isBuildWorkloadProfile(
  value: string | null,
): value is BuildWorkloadProfile {
  return (
    value === 'esports-1080p' ||
    value === 'sweetspot-1440p' ||
    value === 'enthusiast-4k' ||
    value === 'creator-ai'
  );
}

/**
 * Encodes complete build parameters and filters into a shareable URL string.
 */
export function encodeBuildShareUrl(
  params: BuildShareParams,
  baseUrl?: string,
): string {
  const origin =
    baseUrl ??
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'https://paretopc.com');
  const url = new URL(origin);
  url.pathname = '/';
  url.searchParams.set('mode', 'builds');

  if (params.cpuId) url.searchParams.set('cpu', params.cpuId);
  if (params.gpuId) url.searchParams.set('gpu', params.gpuId);
  if (params.moboId) url.searchParams.set('mobo', params.moboId);
  if (params.ramId) url.searchParams.set('ram', params.ramId);
  if (params.psuId) url.searchParams.set('psu', params.psuId);
  if (params.storageId) url.searchParams.set('storage', params.storageId);
  if (params.caseId) url.searchParams.set('case', params.caseId);
  if (params.coolerId) url.searchParams.set('cooler', params.coolerId);
  if (params.budget && params.budget > 0)
    url.searchParams.set('budget', String(params.budget));
  if (params.workload) url.searchParams.set('workload', params.workload);
  if (params.currency) url.searchParams.set('curr', params.currency);
  if (params.buildId) url.searchParams.set('build', params.buildId);

  return url.toString();
}

/**
 * Safely decodes search parameters from a shared URL.
 * Returns null if the query string contains no build-related parameters.
 */
export function decodeBuildShareUrl(search: string): BuildShareParams | null {
  if (!search || !search.includes('=')) return null;

  try {
    const params = new URLSearchParams(search);

    const mode = params.get('mode');
    const cpuId = params.get('cpu') ?? undefined;
    const gpuId = params.get('gpu') ?? undefined;
    const moboId = params.get('mobo') ?? undefined;
    const ramId = params.get('ram') ?? undefined;
    const psuId = params.get('psu') ?? undefined;
    const storageId = params.get('storage') ?? undefined;
    const caseId = params.get('case') ?? undefined;
    const coolerId = params.get('cooler') ?? undefined;
    const buildId = params.get('build') ?? undefined;

    const rawBudget = params.get('budget');
    const budget =
      rawBudget && !isNaN(Number(rawBudget)) ? Number(rawBudget) : undefined;

    const rawWorkload = params.get('workload');
    const workload = isBuildWorkloadProfile(rawWorkload)
      ? rawWorkload
      : undefined;

    const rawCurr = params.get('curr');
    const currency =
      rawCurr === 'USD' || rawCurr === 'BRL' ? rawCurr : undefined;

    const hasAnyComponent =
      Boolean(cpuId) ||
      Boolean(gpuId) ||
      Boolean(moboId) ||
      Boolean(ramId) ||
      Boolean(psuId) ||
      Boolean(storageId) ||
      Boolean(caseId) ||
      Boolean(coolerId) ||
      Boolean(buildId);

    if (mode !== 'builds' && !hasAnyComponent) {
      return null;
    }

    return {
      cpuId,
      gpuId,
      moboId,
      ramId,
      psuId,
      storageId,
      caseId,
      coolerId,
      budget,
      workload,
      currency,
      buildId,
    };
  } catch {
    return null;
  }
}

/**
 * Formats an unslop, plain-language text parts summary for Discord, Reddit, and WhatsApp.
 */
export function formatBuildShareText(
  build: PcBuild,
  shareUrl: string,
  currency: 'USD' | 'BRL' = 'USD',
  locale: AppLocale = 'pt-BR',
): string {
  const isPt = locale === 'pt-BR';
  const unit = build.workloadProfile === 'creator-ai' ? 'pts' : 'FPS';
  const score = build.workloadScore ?? build.effectiveFps1440p;
  const targetLabel = build.workloadMetricLabel ?? '1440p Ultra';

  if (isPt) {
    return [
      '🖥️ *Recomendação de PC Completo • ParetoPC*',
      `💰 *Custo Total de Hardware:* ${formatCurrency(build.totalPrice, currency, false, locale)}`,
      `🎯 *Desempenho Alvo:* ${score} ${unit} (${targetLabel})`,
      `⚡ *Consumo Estimado:* ${build.estimatedPowerDrawWatts}W (Fonte ${build.psu.wattage}W recomendada)`,
      '',
      '📋 *Lista de Peças Selecionadas (8 Componentes):*',
      `• Processador: ${build.cpu.name} (${build.cpu.socket}, ${build.cpu.cores}C/${build.cpu.threads}T)`,
      `• Placa de Vídeo: ${build.gpu.name} (${build.gpu.vramGb}GB)`,
      `• Placa-Mãe: ${build.motherboard.name} (${build.motherboard.formFactor})`,
      `• Memória RAM: ${build.ram.name} (${build.ram.capacityGb}GB ${build.ram.generation}-${build.ram.speedMhz})`,
      `• Armazenamento: ${build.storage.name} (${build.storage.capacityGb >= 1000 ? `${build.storage.capacityGb / 1000}TB` : `${build.storage.capacityGb}GB`} NVMe M.2)`,
      `• Cooler: ${build.cooler.name} (${build.cooler.type === 'AIO' ? 'Water Cooler' : 'Air Cooler'})`,
      `• Gabinete: ${build.case.name}`,
      `• Fonte: ${build.psu.name} (${build.psu.wattage}W ${build.psu.efficiencyRating})`,
      '',
      `🔗 *Inspecione ou personalize no ParetoPC:*`,
      shareUrl,
    ].join('\n');
  }

  return [
    '🖥️ **ParetoPC Build Recommendation (Best Value)**',
    `💰 **Total Hardware Cost:** ${formatCurrency(build.totalPrice, currency, false, locale)}`,
    `🎯 **Target Performance:** ${score} ${unit} (${targetLabel})`,
    `⚡ **Estimated Power Draw:** ${build.estimatedPowerDrawWatts}W (${build.psu.wattage}W PSU)`,
    '',
    '📋 **8-Component Bill of Materials:**',
    `• CPU: ${build.cpu.name} (${build.cpu.socket}, ${build.cpu.cores}C/${build.cpu.threads}T)`,
    `• GPU: ${build.gpu.name} (${build.gpu.vramGb}GB)`,
    `• Motherboard: ${build.motherboard.name} (${build.motherboard.formFactor})`,
    `• RAM: ${build.ram.name} (${build.ram.capacityGb}GB ${build.ram.generation}-${build.ram.speedMhz})`,
    `• Storage: ${build.storage.name} (${build.storage.capacityGb >= 1000 ? `${build.storage.capacityGb / 1000}TB` : `${build.storage.capacityGb}GB`} NVMe M.2)`,
    `• Cooler: ${build.cooler.name}`,
    `• Case: ${build.case.name}`,
    `• Power Supply: ${build.psu.name} (${build.psu.wattage}W ${build.psu.efficiencyRating})`,
    '',
    `🔗 **Inspect & Customize on ParetoPC:**`,
    shareUrl,
  ].join('\n');
}

/**
 * Copies a string to clipboard with fallback for non-secure / restricted environments.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
