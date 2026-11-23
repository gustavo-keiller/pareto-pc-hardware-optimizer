import { PcBuild } from '../lib/math/buildTypes';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { MetricKey, PreferenceWeights, RankedGpu } from '../lib/math/types';
import { formatCurrency } from './currency';
import { AppLocale } from './i18n';
import { sanitizeCreatorRef, sanitizeHttpUrl } from './shareBuild';

export interface CreatorShareConfig {
  refTag?: string;
  amazonTag?: string;
  customStoreUrl?: string;
  siteName?: string;
  siteDomain?: string;
}

export interface SharePrioritySlice {
  id: string;
  label: string;
  pct: number;
  color: string;
}

const DEFAULT_SITE_NAME = 'ParetoPC';
const DEFAULT_SITE_DOMAIN = 'paretopc.com';

const METRIC_META: Record<
  MetricKey,
  { pt: string; en: string; color: string }
> = {
  price: { pt: 'Preço', en: 'Price', color: '#10b981' },
  rasterFps1440p: { pt: 'FPS Jogos', en: 'Gaming FPS', color: '#38bdf8' },
  rtFps1440p: { pt: 'Ray Tracing', en: 'Ray Tracing', color: '#a855f7' },
  vramGb: { pt: 'Memória VRAM', en: 'VRAM', color: '#f59e0b' },
  tdpWatts: { pt: 'Eficiência (W)', en: 'Efficiency (W)', color: '#14b8a6' },
};

/**
 * Escapes special XML characters so user-entered GPU names or handles cannot break SVG markup.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value: string, maxChars: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
}

/**
 * Normalizes TOPSIS weights into integer percentages summing strictly to 100%
 * using the largest-remainder (Hamilton) method. Falls back to uniform 20% when all weights are 0.
 */
export function normalizePriorityPercentages(
  weights: Partial<PreferenceWeights>,
  locale: AppLocale = 'pt-BR',
): SharePrioritySlice[] {
  const rawValues = ALL_METRIC_KEYS.map((key) => {
    const val = weights[key] ?? 0;
    return Number.isFinite(val) && val > 0 ? val : 0;
  });
  const total = rawValues.reduce((acc, v) => acc + v, 0);

  const effective = total > 0 ? rawValues : ALL_METRIC_KEYS.map(() => 1);
  const effectiveSum = effective.reduce((acc, v) => acc + v, 0);

  const exact = effective.map((v) => (v / effectiveSum) * 100);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((acc, v) => acc + v, 0);

  const rankedRemainders = exact
    .map((v, idx) => ({ idx, rem: v - floors[idx] }))
    .sort((a, b) => b.rem - a.rem);

  for (let i = 0; i < rankedRemainders.length && remainder > 0; i++) {
    floors[rankedRemainders[i].idx] += 1;
    remainder -= 1;
  }

  return ALL_METRIC_KEYS.map((key, idx) => ({
    id: key,
    label: locale === 'pt-BR' ? METRIC_META[key].pt : METRIC_META[key].en,
    pct: floors[idx],
    color: METRIC_META[key].color,
  })).sort((a, b) => b.pct - a.pct);
}

/**
 * Returns the target workload optimization split (%) that placed a full PC build on the Pareto frontier.
 */
export function getBuildPriorityPercentages(
  build: PcBuild,
  locale: AppLocale = 'pt-BR',
): SharePrioritySlice[] {
  const isPt = locale === 'pt-BR';
  switch (build.workloadProfile) {
    case 'esports-1080p':
      return [
        {
          id: 'cpu',
          label: isPt ? 'Equilíbrio CPU (1080p)' : 'CPU Balance (1080p)',
          pct: 35,
          color: '#38bdf8',
        },
        {
          id: 'gpu',
          label: isPt ? 'Velocidade GPU' : 'GPU Speed',
          pct: 35,
          color: '#a855f7',
        },
        {
          id: 'price',
          label: isPt ? 'Menor Custo' : 'Lowest Price',
          pct: 30,
          color: '#10b981',
        },
      ];
    case 'enthusiast-4k':
      return [
        {
          id: 'gpu',
          label: isPt ? 'Potência GPU & VRAM 4K' : '4K GPU & VRAM Power',
          pct: 55,
          color: '#a855f7',
        },
        {
          id: 'price',
          label: isPt ? 'Custo-Benefício' : 'Value / Price',
          pct: 30,
          color: '#10b981',
        },
        {
          id: 'cpu',
          label: isPt ? 'Estabilidade CPU' : 'CPU Headroom',
          pct: 15,
          color: '#38bdf8',
        },
      ];
    case 'creator-ai':
      return [
        {
          id: 'vram',
          label: isPt ? 'VRAM & CUDA / IA' : 'VRAM & CUDA / AI',
          pct: 45,
          color: '#f59e0b',
        },
        {
          id: 'cpu',
          label: isPt ? 'Núcleos CPU & RAM' : 'Multi-Core & RAM',
          pct: 30,
          color: '#38bdf8',
        },
        {
          id: 'price',
          label: isPt ? 'Menor Custo' : 'Lowest Price',
          pct: 25,
          color: '#10b981',
        },
      ];
    case 'sweetspot-1440p':
    default:
      return [
        {
          id: 'gpu',
          label: isPt ? 'Desempenho 1440p' : '1440p GPU Speed',
          pct: 40,
          color: '#38bdf8',
        },
        {
          id: 'price',
          label: isPt ? 'Menor Custo' : 'Lowest Price',
          pct: 35,
          color: '#10b981',
        },
        {
          id: 'cpu',
          label: isPt ? 'Equilíbrio CPU/GPU' : 'CPU/GPU Balance',
          pct: 25,
          color: '#f59e0b',
        },
      ];
  }
}

/**
 * Builds a clean outbound store URL, attaching an Amazon associate tag when appropriate.
 */
export function buildAffiliateStoreUrl(
  customStoreUrl?: string,
  amazonTag?: string,
): string | undefined {
  const safeUrl = sanitizeHttpUrl(customStoreUrl);
  if (!safeUrl) return undefined;
  const safeTag = sanitizeCreatorRef(amazonTag);
  if (!safeTag) return safeUrl;

  try {
    const parsed = new URL(safeUrl);
    if (
      parsed.hostname.toLowerCase().includes('amazon.') &&
      !parsed.searchParams.has('tag')
    ) {
      parsed.searchParams.set('tag', safeTag);
    }
    return parsed.toString();
  } catch {
    return safeUrl;
  }
}

function renderStackedPriorityBar(
  slices: SharePrioritySlice[],
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const active = slices.filter((s) => s.pct > 0);
  if (active.length === 0) return '';

  let cursorX = x;
  const segments = active
    .map((slice, idx) => {
      const segW =
        idx === active.length - 1
          ? Math.max(0, x + width - cursorX)
          : (slice.pct / 100) * width;
      const rect = `<rect x="${cursorX.toFixed(1)}" y="${y}" width="${segW.toFixed(1)}" height="${height}" fill="${slice.color}" />`;
      cursorX += segW;
      return rect;
    })
    .join('');

  const legendItems = active
    .slice(0, 5)
    .map((slice, idx) => {
      const colX = x + idx * 218;
      return `<g transform="translate(${colX}, ${y + height + 22})">
        <circle cx="6" cy="-4" r="5" fill="${slice.color}" />
        <text x="17" y="0" fill="#e2e8f0" font-size="14" font-weight="700" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(slice.label, 18))}: <tspan fill="${slice.color}">${slice.pct}%</tspan></text>
      </g>`;
    })
    .join('');

  return `<clipPath id="priorityBarClip"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="7" /></clipPath>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="#1e293b" />
    <g clip-path="url(#priorityBarClip)">${segments}</g>
    ${legendItems}`;
}

function renderCardShell(params: {
  siteName: string;
  siteDomain: string;
  frontierBadge: string;
  isFrontierHighlight: boolean;
  creatorHandle?: string;
  footerLeft: string;
  footerRight: string;
  bodySvg: string;
}): string {
  const badgeBg = params.isFrontierHighlight ? '#064e3b' : '#334155';
  const badgeBorder = params.isFrontierHighlight ? '#10b981' : '#64748b';
  const badgeText = params.isFrontierHighlight ? '#6ee7b7' : '#e2e8f0';

  const creatorPill = params.creatorHandle
    ? `<rect x="860" y="28" width="292" height="34" rx="17" fill="#312e81" stroke="#6366f1" stroke-width="1.2" />
       <text x="1006" y="50" text-anchor="middle" fill="#c7d2fe" font-size="14" font-weight="700" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.creatorHandle, 30))}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${escapeXml(params.siteName)} Spec Card">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="55%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#06231d" />
    </linearGradient>
    <linearGradient id="accentBorder" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="24" fill="url(#cardBg)" />
  <rect x="2" y="2" width="1196" height="626" rx="22" fill="none" stroke="url(#accentBorder)" stroke-width="2" stroke-opacity="0.45" />

  <!-- Top Header Bar -->
  <rect x="48" y="26" width="154" height="38" rx="10" fill="#10b981" />
  <text x="125" y="51" text-anchor="middle" fill="#020617" font-size="18" font-weight="900" letter-spacing="0.8" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.siteName.toUpperCase(), 14))}</text>
  <text x="216" y="51" fill="#94a3b8" font-size="16" font-weight="700" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.siteDomain, 28))}</text>

  <rect x="456" y="28" width="388" height="34" rx="17" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.2" />
  <text x="650" y="50" text-anchor="middle" fill="${badgeText}" font-size="13" font-weight="800" letter-spacing="0.6" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.frontierBadge, 42))}</text>

  ${creatorPill}
  <line x1="48" y1="80" x2="1152" y2="80" stroke="#1e293b" stroke-width="1.5" />

  ${params.bodySvg}

  <!-- Bottom Watermark Footer -->
  <line x1="48" y1="564" x2="1152" y2="564" stroke="#1e293b" stroke-width="1.5" />
  <text x="48" y="598" fill="#10b981" font-size="16" font-weight="800" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.siteDomain, 32))}</text>
  <text x="230" y="598" fill="#94a3b8" font-size="14" font-weight="500" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.footerLeft, 58))}</text>
  <text x="1152" y="598" text-anchor="end" fill="#cbd5e1" font-size="13" font-weight="600" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(truncateText(params.footerRight, 52))}</text>
</svg>`;
}

/**
 * Generates a 1200x630 dark-mode social spec card SVG for a single GPU pick,
 * displaying price, benchmark specs, Pareto Frontier status, and priority percentages.
 */
export function buildGpuSocialCardSvg(params: {
  gpu: RankedGpu;
  weights: PreferenceWeights;
  shoppingReason?: string;
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  creator?: CreatorShareConfig;
  shareUrl?: string;
}): string {
  const locale = params.locale ?? 'pt-BR';
  const isPt = locale === 'pt-BR';
  const siteName = params.creator?.siteName?.trim() || DEFAULT_SITE_NAME;
  const siteDomain = params.creator?.siteDomain?.trim() || DEFAULT_SITE_DOMAIN;
  const safeRef = sanitizeCreatorRef(params.creator?.refTag);
  const creatorHandle = safeRef
    ? isPt
      ? `Indicado por ${safeRef}`
      : `Shared via ${safeRef}`
    : undefined;

  const slices = normalizePriorityPercentages(params.weights, locale);
  const formattedPrice = formatCurrency(
    params.gpu.price,
    params.currency,
    false,
    locale,
  );
  const fpsPer100 =
    params.gpu.price > 0
      ? ((params.gpu.rasterFps1440p / params.gpu.price) * 100).toFixed(1)
      : '0';
  const unit100 = params.currency === 'BRL' ? 'R$100' : '$100';

  const frontierBadge = params.gpu.isParetoOptimal
    ? isPt
      ? `FRONTEIRA DE PARETO • ${params.gpu.topsisScorePct.toFixed(0)}% MATCH`
      : `PARETO FRONTIER PICK • ${params.gpu.topsisScorePct.toFixed(0)}% MATCH`
    : isPt
      ? `OPCAO AVALIADA • ${params.gpu.topsisScorePct.toFixed(0)}% MATCH`
      : `EVALUATED PICK • ${params.gpu.topsisScorePct.toFixed(0)}% MATCH`;

  const subtitleParts = [
    params.gpu.store ? `${params.gpu.store}` : undefined,
    params.gpu.vendor ?? undefined,
    `${params.gpu.vramGb} GB VRAM`,
    `${params.gpu.tdpWatts}W TDP`,
  ].filter(Boolean);

  const reasonLine =
    params.shoppingReason?.trim() ||
    (isPt
      ? `Melhor equilíbrio para suas prioridades: ${params.gpu.rasterFps1440p} FPS em 1440p com ${params.gpu.vramGb} GB VRAM.`
      : `Top choice for your priorities: ${params.gpu.rasterFps1440p} FPS at 1440p with ${params.gpu.vramGb} GB VRAM.`);

  const specCards = [
    {
      label: isPt ? 'JOGOS 1440p' : '1440p GAMING',
      val: `${params.gpu.rasterFps1440p} FPS`,
      color: '#ffffff',
    },
    {
      label: 'RAY TRACING',
      val: `${params.gpu.rtFps1440p} FPS`,
      color: '#38bdf8',
    },
    {
      label: isPt ? 'MEMÓRIA VRAM' : 'VRAM MEMORY',
      val: `${params.gpu.vramGb} GB`,
      color: '#fbbf24',
    },
    {
      label: isPt ? `EFICIÊNCIA / ${unit100}` : `VALUE / ${unit100}`,
      val: `${fpsPer100} FPS`,
      color: '#34d399',
    },
  ]
    .map((card, idx) => {
      const x = 48 + idx * 280;
      return `<rect x="${x}" y="220" width="264" height="106" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <text x="${x + 20}" y="252" fill="#94a3b8" font-size="13" font-weight="700" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(card.label)}</text>
      <text x="${x + 20}" y="298" fill="${card.color}" font-size="30" font-weight="900" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(card.val)}</text>`;
    })
    .join('');

  const bodySvg = `
  <!-- Hero Title & Price -->
  <text x="48" y="132" fill="#ffffff" font-size="38" font-weight="900" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(params.gpu.name, 34))}</text>
  <text x="48" y="168" fill="#94a3b8" font-size="18" font-weight="600" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(subtitleParts.join(' • '))}</text>

  <rect x="836" y="100" width="316" height="94" rx="18" fill="#064e3b" fill-opacity="0.55" stroke="#10b981" stroke-opacity="0.6" stroke-width="1.5" />
  <text x="1130" y="130" text-anchor="end" fill="#6ee7b7" font-size="13" font-weight="800" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(isPt ? 'PREÇO REFERÊNCIA / PIX' : 'STREET PRICE')}</text>
  <text x="1130" y="176" text-anchor="end" fill="#34d399" font-size="40" font-weight="900" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(formattedPrice)}</text>

  ${specCards}

  <!-- Priority % Section -->
  <rect x="48" y="348" width="1104" height="194" rx="18" fill="#0b1220" stroke="#1e293b" stroke-width="1.5" />
  <text x="72" y="382" fill="#f59e0b" font-size="13" font-weight="800" letter-spacing="0.6" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(isPt ? 'PORCENTAGEM QUE COLOCA ESTA OPÇÃO NA FRONTEIRA DE PARETO' : 'PRIORITY PERCENTAGES THAT PUT THIS PICK ON THE PARETO FRONTIER')}</text>
  ${renderStackedPriorityBar(slices, 72, 398, 1056, 16)}

  <rect x="72" y="468" width="1056" height="54" rx="12" fill="#111c30" />
  <text x="90" y="501" fill="#e2e8f0" font-size="16" font-weight="600" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(reasonLine, 96))}</text>
  `;

  return renderCardShell({
    siteName,
    siteDomain,
    frontierBadge,
    isFrontierHighlight: params.gpu.isParetoOptimal,
    creatorHandle,
    footerLeft: isPt
      ? 'Compare peças sem cair em armadilhas de preço'
      : 'Compare GPUs & PC builds without overpriced traps',
    footerRight: (params.shareUrl ?? `https://${siteDomain}`).replace(
      /^https?:\/\//,
      '',
    ),
    bodySvg,
  });
}

/**
 * Generates a 1200x630 dark-mode social spec card SVG for a complete 8-component PC build,
 * showing every part, total price, compatibility status, and Pareto workload percentages.
 */
export function buildPcBuildSocialCardSvg(params: {
  build: PcBuild;
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  creator?: CreatorShareConfig;
  shareUrl?: string;
}): string {
  const locale = params.locale ?? 'pt-BR';
  const isPt = locale === 'pt-BR';
  const siteName = params.creator?.siteName?.trim() || DEFAULT_SITE_NAME;
  const siteDomain = params.creator?.siteDomain?.trim() || DEFAULT_SITE_DOMAIN;
  const safeRef = sanitizeCreatorRef(params.creator?.refTag);
  const creatorHandle = safeRef
    ? isPt
      ? `Indicado por ${safeRef}`
      : `Shared via ${safeRef}`
    : undefined;

  const slices = getBuildPriorityPercentages(params.build, locale);
  const totalFormatted = formatCurrency(
    params.build.totalPrice,
    params.currency,
    false,
    locale,
  );
  const unit = params.build.workloadProfile === 'creator-ai' ? 'pts' : 'FPS';
  const score = params.build.workloadScore ?? params.build.effectiveFps1440p;
  const targetLabel = params.build.workloadMetricLabel ?? '1440p Ultra';

  const frontierBadge = isPt
    ? 'PC COMPLETO COMPATÍVEL • FRONTEIRA DE PARETO'
    : 'COMPATIBLE FULL PC • PARETO FRONTIER';

  const parts: Array<{ cat: string; name: string; price: number }> = [
    { cat: 'CPU', name: params.build.cpu.name, price: params.build.cpu.price },
    { cat: 'GPU', name: params.build.gpu.name, price: params.build.gpu.price },
    {
      cat: isPt ? 'PLACA-MÃE' : 'MOTHERBOARD',
      name: params.build.motherboard.name,
      price: params.build.motherboard.price,
    },
    { cat: 'RAM', name: params.build.ram.name, price: params.build.ram.price },
    {
      cat: 'SSD NVMe',
      name: params.build.storage.name,
      price: params.build.storage.price,
    },
    {
      cat: 'COOLER',
      name: params.build.cooler.name,
      price: params.build.cooler.price,
    },
    {
      cat: isPt ? 'GABINETE' : 'CASE',
      name: params.build.case.name,
      price: params.build.case.price,
    },
    {
      cat: isPt ? 'FONTE PSU' : 'PSU',
      name: params.build.psu.name,
      price: params.build.psu.price,
    },
  ];

  const partGridSvg = parts
    .map((part, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = 48 + col * 280;
      const y = 200 + row * 102;
      return `<rect x="${x}" y="${y}" width="264" height="88" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <text x="${x + 16}" y="${y + 26}" fill="#38bdf8" font-size="11" font-weight="800" letter-spacing="0.5" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(part.cat)}</text>
      <text x="${x + 248}" y="${y + 26}" text-anchor="end" fill="#34d399" font-size="13" font-weight="800" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(formatCurrency(part.price, params.currency, false, locale))}</text>
      <text x="${x + 16}" y="${y + 56}" fill="#f8fafc" font-size="13.5" font-weight="700" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(part.name, 29))}</text>`;
    })
    .join('');

  const bottleneckText =
    params.build.bottleneckPct === 0
      ? isPt
        ? '0% Gargalo • 100% Compatível'
        : '0% Bottleneck • 100% Compatible'
      : isPt
        ? `${params.build.bottleneckPct}% Gargalo Estimado`
        : `${params.build.bottleneckPct}% Est. Bottleneck`;

  const scoreLabel = targetLabel.toLowerCase().includes(unit.toLowerCase())
    ? `${score} ${targetLabel}`
    : `${score} ${unit} (${targetLabel})`;

  const bodySvg = `
  <!-- Build Hero Banner -->
  <text x="48" y="130" fill="#ffffff" font-size="28" font-weight="900" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(truncateText(`${params.build.cpu.name} + ${params.build.gpu.name}`, 52))}</text>
  <text x="48" y="166" fill="#94a3b8" font-size="17" font-weight="600" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(`${scoreLabel} • ${params.build.estimatedPowerDrawWatts}W/${params.build.psu.wattage}W • ${bottleneckText}`)}</text>

  <rect x="856" y="96" width="296" height="84" rx="18" fill="#064e3b" fill-opacity="0.55" stroke="#10b981" stroke-opacity="0.6" stroke-width="1.5" />
  <text x="1130" y="124" text-anchor="end" fill="#6ee7b7" font-size="12" font-weight="800" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(isPt ? 'CUSTO TOTAL DAS 8 PEÇAS' : 'TOTAL 8-PART BUILD COST')}</text>
  <text x="1130" y="166" text-anchor="end" fill="#34d399" font-size="36" font-weight="900" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(totalFormatted)}</text>

  ${partGridSvg}

  <!-- Priority % Section -->
  <rect x="48" y="416" width="1104" height="128" rx="18" fill="#0b1220" stroke="#1e293b" stroke-width="1.5" />
  <text x="72" y="446" fill="#f59e0b" font-size="13" font-weight="800" letter-spacing="0.6" font-family="Inter, system-ui, -apple-system, sans-serif">${escapeXml(isPt ? 'EQUILÍBRIO DA FRONTEIRA DE PARETO PARA ESTE PERFIL' : 'PARETO FRONTIER PRIORITY SPLIT FOR THIS BUILD')}</text>
  ${renderStackedPriorityBar(slices, 72, 462, 1056, 16)}
  `;

  return renderCardShell({
    siteName,
    siteDomain,
    frontierBadge,
    isFrontierHighlight: true,
    creatorHandle,
    footerLeft: isPt
      ? '8 peças verificadas: encaixe físico, fonte e desempenho'
      : '8 verified parts: physical fit, PSU headroom & performance',
    footerRight: (params.shareUrl ?? `https://${siteDomain}`).replace(
      /^https?:\/\//,
      '',
    ),
    bodySvg,
  });
}

/**
 * Generates a ready-to-post message for WhatsApp, Telegram, Discord, X, or YouTube descriptions
 * containing specs, price, Pareto priority percentages, optional creator affiliate link, and ParetoPC proof link.
 */
export function formatSocialPostCaption(params: {
  target:
    | {
        kind: 'gpu';
        gpu: RankedGpu;
        weights: PreferenceWeights;
        reason?: string;
      }
    | { kind: 'build'; build: PcBuild };
  currency: 'USD' | 'BRL';
  locale?: AppLocale;
  creator?: CreatorShareConfig;
  shareUrl: string;
}): string {
  const locale = params.locale ?? 'pt-BR';
  const isPt = locale === 'pt-BR';
  const siteName = params.creator?.siteName?.trim() || DEFAULT_SITE_NAME;
  const safeRef = sanitizeCreatorRef(params.creator?.refTag);
  const storeUrl = buildAffiliateStoreUrl(
    params.creator?.customStoreUrl,
    params.creator?.amazonTag,
  );

  if (params.target.kind === 'gpu') {
    const { gpu, weights, reason } = params.target;
    const price = formatCurrency(gpu.price, params.currency, false, locale);
    const slices = normalizePriorityPercentages(weights, locale).filter(
      (s) => s.pct > 0,
    );
    const pctSummary = slices.map((s) => `${s.label} ${s.pct}%`).join(' • ');
    const lines = [
      isPt
        ? `🔥 *${gpu.name} — ${price}* (${gpu.topsisScorePct.toFixed(0)}% Match na Fronteira de Pareto)`
        : `🔥 **${gpu.name} — ${price}** (${gpu.topsisScorePct.toFixed(0)}% Match on the Pareto Frontier)`,
      isPt
        ? `📊 ${gpu.rasterFps1440p} FPS (1440p) | ${gpu.rtFps1440p} FPS (RT) | ${gpu.vramGb}GB VRAM | ${gpu.tdpWatts}W`
        : `📊 ${gpu.rasterFps1440p} FPS (1440p) | ${gpu.rtFps1440p} FPS (RT) | ${gpu.vramGb}GB VRAM | ${gpu.tdpWatts}W`,
      reason ? `✅ ${reason}` : undefined,
      isPt
        ? `🎯 *Critérios (%):* ${pctSummary}`
        : `🎯 **Priority Split (%):** ${pctSummary}`,
      storeUrl
        ? isPt
          ? `🛒 *Link da oferta${safeRef ? ` (${safeRef})` : ''}:* ${storeUrl}`
          : `🛒 **Buy at store${safeRef ? ` (${safeRef})` : ''}:** ${storeUrl}`
        : undefined,
      isPt
        ? `📈 *Compare e ajuste suas porcentagens no ${siteName}:* ${params.shareUrl}`
        : `📈 **Inspect & tune your percentages on ${siteName}:** ${params.shareUrl}`,
    ].filter((line): line is string => Boolean(line));

    return lines.join('\n');
  }

  const { build } = params.target;
  const totalFormatted = formatCurrency(
    build.totalPrice,
    params.currency,
    false,
    locale,
  );
  const slices = getBuildPriorityPercentages(build, locale).filter(
    (s) => s.pct > 0,
  );
  const pctSummary = slices.map((s) => `${s.label} ${s.pct}%`).join(' • ');
  const unit = build.workloadProfile === 'creator-ai' ? 'pts' : 'FPS';
  const score = build.workloadScore ?? build.effectiveFps1440p;

  const lines = [
    isPt
      ? `🖥️ *PC Completo na Fronteira de Pareto — ${totalFormatted}*`
      : `🖥️ **Pareto Frontier Full PC Build — ${totalFormatted}**`,
    `⚡ ${build.cpu.name} + ${build.gpu.name} (${score} ${unit})`,
    `🧩 ${build.motherboard.name} | ${build.ram.name} | ${build.storage.name} | ${build.psu.wattage}W`,
    isPt
      ? `🎯 *Equilíbrio (%):* ${pctSummary}`
      : `🎯 **Priority Split (%):** ${pctSummary}`,
    storeUrl
      ? isPt
        ? `🛒 *Link do anunciante${safeRef ? ` (${safeRef})` : ''}:* ${storeUrl}`
        : `🛒 **Partner store link${safeRef ? ` (${safeRef})` : ''}:** ${storeUrl}`
      : undefined,
    isPt
      ? `📈 *Veja as 8 peças e compatibilidade no ${siteName}:* ${params.shareUrl}`
      : `📈 **Inspect all 8 compatible parts on ${siteName}:** ${params.shareUrl}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports a 1200x630 SVG card as a high-resolution 2400x1260 PNG file in the browser,
 * gracefully falling back to SVG download if Canvas rendering is unavailable.
 */
export async function downloadSvgAsPng(
  svgString: string,
  filenameBase: string,
): Promise<'png' | 'svg'> {
  const safeBase =
    filenameBase
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'paretopc-card';

  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return 'svg';
  }

  try {
    const svgUrl = URL.createObjectURL(svgBlob);
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 2400;
          canvas.height = 1260;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(svgUrl);
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, 2400, 1260);
          URL.revokeObjectURL(svgUrl);
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        } catch {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(null);
      };
      img.src = svgUrl;
    });

    if (pngBlob) {
      triggerFileDownload(pngBlob, `${safeBase}.png`);
      return 'png';
    }
  } catch {
    // Fall through to SVG fallback
  }

  triggerFileDownload(svgBlob, `${safeBase}.svg`);
  return 'svg';
}
