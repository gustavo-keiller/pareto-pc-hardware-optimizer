import { PcBuild } from '../lib/math/buildTypes';
import { GpuCandidate } from '../lib/math/types';
import { formatCurrency } from './currency';
import { AppLocale } from './i18n';

export interface GpuShoppingReasonParams {
  topPick: GpuCandidate;
  stepDownAlt?: GpuCandidate | null;
  stepUpAlt?: GpuCandidate | null;
  currency?: 'USD' | 'BRL';
  locale?: AppLocale;
}

export interface GpuShoppingReasons {
  topPickSummary: string;
  vramLongevity: string;
  stepDownReason?: string;
  stepUpReason?: string;
}

export interface BuildShoppingReasons {
  cpu: string;
  gpu: string;
  motherboard: string;
  ram: string;
  storage: string;
  psu: string;
  casePart: string;
  cooler: string;
}

/**
 * Generates unslop, plain shopping reasons for GPU recommendations.
 * Follows .agents/skills/hardware-copywriting/SKILL.md and GLOSSARY.md.
 */
export function generateGpuShoppingReasons(
  params: GpuShoppingReasonParams,
): GpuShoppingReasons {
  const {
    topPick,
    stepDownAlt,
    stepUpAlt,
    currency = 'USD',
    locale = 'pt-BR',
  } = params;

  const isPt = locale === 'pt-BR';

  // Top pick summary rationale
  let topPickSummary = '';
  if (topPick.vramGb >= 16) {
    topPickSummary = isPt
      ? `Destaque em custo-benefício com 16 GB de VRAM para rodar jogos pesados no Ultra com longevidade garantida.`
      : `Top-tier value with 16 GB VRAM to handle demanding games on Ultra with long-term buffer.`;
  } else if (topPick.vramGb >= 12) {
    topPickSummary = isPt
      ? `Melhor equilíbrio entre preço e desempenho: entrega ${topPick.rasterFps1440p} FPS e 12 GB de VRAM para jogos em 1440p sem engasgos.`
      : `Best balance of price and performance: delivers ${topPick.rasterFps1440p} FPS and 12 GB VRAM for 1440p gaming without stutter.`;
  } else {
    topPickSummary = isPt
      ? `Excelente desempenho em 1080p competitivo com ${topPick.rasterFps1440p} FPS, baixo consumo (${topPick.tdpWatts}W) e menor custo de entrada.`
      : `Solid competitive 1080p performance with ${topPick.rasterFps1440p} FPS, low power draw (${topPick.tdpWatts}W), and low entry price.`;
  }

  // VRAM longevity note
  let vramLongevity = '';
  if (topPick.vramGb >= 16) {
    vramLongevity = isPt
      ? `${topPick.vramGb} GB de VRAM: tranquilidade para texturas no Ultra e lançamentos futuros.`
      : `${topPick.vramGb} GB VRAM: ample buffer for Ultra textures and upcoming demanding titles.`;
  } else if (topPick.vramGb >= 12) {
    vramLongevity = isPt
      ? `${topPick.vramGb} GB de VRAM: ideal para jogos modernos em 1440p sem preocupação com memória.`
      : `${topPick.vramGb} GB VRAM: sweet spot for modern 1440p gaming without texture stutter.`;
  } else {
    vramLongevity = isPt
      ? `${topPick.vramGb} GB de VRAM: capacidade recomendada para eSports e jogos em 1080p.`
      : `${topPick.vramGb} GB VRAM: recommended buffer for 1080p esports and lighter titles.`;
  }

  // Step-down alternative reason
  let stepDownReason: string | undefined;
  if (stepDownAlt) {
    const savings = Math.max(0, topPick.price - stepDownAlt.price);
    const pctSavings =
      topPick.price > 0 ? Math.round((savings / topPick.price) * 100) : 0;
    const pctSpeed =
      topPick.rasterFps1440p > 0
        ? Math.round(
            (stepDownAlt.rasterFps1440p / topPick.rasterFps1440p) * 100,
          )
        : 100;

    stepDownReason = isPt
      ? `Economize ${formatCurrency(savings, currency, false, locale)} (${pctSavings}% a menos) com a ${stepDownAlt.name}, mantendo ${stepDownAlt.rasterFps1440p} FPS (${pctSpeed}% da velocidade).`
      : `Save ${formatCurrency(savings, currency, false, locale)} (${pctSavings}% less) with ${stepDownAlt.name}, keeping ${stepDownAlt.rasterFps1440p} FPS (${pctSpeed}% speed of the top pick).`;
  }

  // Step-up alternative reason
  let stepUpReason: string | undefined;
  if (stepUpAlt) {
    const extraPrice = Math.max(0, stepUpAlt.price - topPick.price);
    const fpsDiff = Math.max(
      0,
      stepUpAlt.rasterFps1440p - topPick.rasterFps1440p,
    );
    const pctFps =
      topPick.rasterFps1440p > 0
        ? Math.round((fpsDiff / topPick.rasterFps1440p) * 100)
        : 0;

    stepUpReason = isPt
      ? `A ${stepUpAlt.name} entrega +${fpsDiff} FPS (+${pctFps}%) e ${stepUpAlt.vramGb} GB de VRAM por +${formatCurrency(extraPrice, currency, false, locale)} adicionais.`
      : `${stepUpAlt.name} delivers +${fpsDiff} FPS (+${pctFps}%) and ${stepUpAlt.vramGb} GB VRAM for +${formatCurrency(extraPrice, currency, false, locale)} more.`;
  }

  return {
    topPickSummary,
    vramLongevity,
    stepDownReason,
    stepUpReason,
  };
}

/**
 * Generates unslop shopping reasons for complete PC build components.
 */
export function generateBuildShoppingReasons(
  build: PcBuild,
  _currency: 'USD' | 'BRL' = 'USD',
  locale: AppLocale = 'pt-BR',
): BuildShoppingReasons {
  const isPt = locale === 'pt-BR';

  const cpuThroughput =
    build.bottleneckPct === 0
      ? isPt
        ? '100% de aproveitamento (0% de gargalo)'
        : '100% throughput (0% bottleneck)'
      : isPt
        ? `baixo gargalo (${build.bottleneckPct}%)`
        : `low bottleneck (${build.bottleneckPct}%)`;

  const cpu = isPt
    ? `${build.cpu.name}: ${build.cpu.cores} núcleos / ${build.cpu.threads} threads alimentam a GPU com ${cpuThroughput}.`
    : `${build.cpu.name}: ${build.cpu.cores} cores / ${build.cpu.threads} threads feed the GPU with ${cpuThroughput}.`;

  const gpu = isPt
    ? `${build.gpu.name}: entrega ${build.gpu.rasterFps1440p} FPS em 1440p com ${build.gpu.vramGb} GB de memória de vídeo.`
    : `${build.gpu.name}: delivers ${build.gpu.rasterFps1440p} FPS at 1440p with ${build.gpu.vramGb} GB video memory.`;

  const motherboard = isPt
    ? `${build.motherboard.name}: plataforma ${build.motherboard.socket} formato ${build.motherboard.formFactor} com ${build.motherboard.m2Slots} slot(s) M.2 NVMe.`
    : `${build.motherboard.name}: ${build.motherboard.socket} platform in ${build.motherboard.formFactor} with ${build.motherboard.m2Slots} M.2 NVMe slot(s).`;

  const ram = isPt
    ? `${build.ram.name}: memórias em Dual-Channel (${build.ram.modulesCount} pentes) para largura de banda máxima e quadros estáveis.`
    : `${build.ram.name}: Dual-channel setup (${build.ram.modulesCount} sticks) for maximum memory bandwidth and stable frame rates.`;

  const readSpeedText = build.storage.readSpeedMbps
    ? ` com ${build.storage.readSpeedMbps} MB/s`
    : '';
  const readSpeedTextEn = build.storage.readSpeedMbps
    ? ` with ${build.storage.readSpeedMbps} MB/s`
    : '';

  const storage = isPt
    ? `${build.storage.name}: SSD ${build.storage.type}${readSpeedText} para carregamentos rápidos.`
    : `${build.storage.name}: ${build.storage.type} SSD${readSpeedTextEn} for fast game loading.`;

  const psu = isPt
    ? `${build.psu.name}: ${build.psu.wattage}W com certificação 80+ ${build.psu.efficiencyRating} e +${build.powerHeadroomWatts}W de folga para segurança.`
    : `${build.psu.name}: ${build.psu.wattage}W with 80+ ${build.psu.efficiencyRating} efficiency and +${build.powerHeadroomWatts}W headroom for safety.`;

  const casePart = isPt
    ? `${build.case.name}: gabinete com suporte a GPUs de até ${build.case.maxGpuLengthMm} mm e dissipadores de até ${build.case.maxCpuCoolerHeightMm} mm.`
    : `${build.case.name}: chassis supporting up to ${build.case.maxGpuLengthMm} mm GPUs and ${build.case.maxCpuCoolerHeightMm} mm CPU coolers.`;

  const cooler = isPt
    ? `${build.cooler.name}: capacidade de ${build.cooler.maxTdpWatts}W de TDP que resfria com folga o processador de ${build.cpu.tdpWatts}W.`
    : `${build.cooler.name}: ${build.cooler.maxTdpWatts}W TDP rating easily cools the ${build.cpu.tdpWatts}W processor.`;

  return {
    cpu,
    gpu,
    motherboard,
    ram,
    storage,
    psu,
    casePart,
    cooler,
  };
}
