import { RankedGpu, PreferenceWeights } from '../lib/math/types';
import { Currency } from './currency';
import { AppLocale } from './i18n';

/**
 * Escapes a single string field according to RFC 4180 rules:
 * - If it contains a comma, quote, or newline, wrap in quotes.
 * - Any internal double-quotes are escaped as double-double-quotes ("").
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes ranked GPUs into an RFC 4180 compliant CSV string.
 */
export function exportRankedGpusToCsv(
  gpus: RankedGpu[],
  currency: Currency = 'USD',
  _locale: AppLocale = 'pt-BR',
): string {
  const headers = [
    'Rank',
    'Model',
    'Verdict',
    'TOPSIS_Score_Pct',
    `Price_${currency}`,
    `Fair_Price_${currency}`,
    `Residual_${currency}`,
    'Raster_1440p_FPS',
    'RayTracing_1440p_FPS',
    'VRAM_GB',
    'TDP_Watts',
    'Is_Pareto_Optimal',
    'Dominance_Reasons',
  ];

  const rows = gpus.map((gpu) => {
    let verdict = 'Standard Candidate';
    if (gpu.isParetoOptimal) {
      verdict = 'Pareto Frontier (Best Value)';
    } else if (gpu.isDominated) {
      verdict = 'Dominated (Bad Value Trap)';
    }

    const fairPrice = gpu.valuation ? gpu.valuation.fairPrice.toFixed(2) : '';
    const residual = gpu.valuation ? gpu.valuation.residualUsd.toFixed(2) : '';

    const reasons = gpu.dominanceReasons.map((r) => r.summaryText).join(' | ');

    return [
      gpu.rank,
      escapeCsvField(gpu.name),
      escapeCsvField(verdict),
      gpu.topsisScorePct.toFixed(1),
      gpu.price.toFixed(2),
      fairPrice,
      residual,
      gpu.rasterFps1440p,
      gpu.rtFps1440p,
      gpu.vramGb,
      gpu.tdpWatts,
      gpu.isParetoOptimal ? 'YES' : 'NO',
      escapeCsvField(reasons),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export interface GpuExportJsonPayload {
  exportDate: string;
  currency: Currency;
  activeWeights: PreferenceWeights;
  totalCandidates: number;
  paretoCount: number;
  candidates: Array<{
    rank: number;
    id: string;
    name: string;
    isParetoOptimal: boolean;
    isDominated: boolean;
    topsisScore: number;
    topsisScorePct: number;
    distanceToBest: number;
    distanceToWorst: number;
    price: number;
    specs: {
      rasterFps1440p: number;
      rtFps1440p: number;
      vramGb: number;
      tdpWatts: number;
    };
    valuation?: {
      fairPrice: number;
      residualUsd: number;
      valueTier: string;
    };
  }>;
}

/**
 * Serializes ranked GPUs and active weights into structured JSON.
 */
export function exportRankedGpusToJson(
  gpus: RankedGpu[],
  weights: PreferenceWeights,
  currency: Currency = 'USD',
): string {
  const payload: GpuExportJsonPayload = {
    exportDate: new Date().toISOString(),
    currency,
    activeWeights: weights,
    totalCandidates: gpus.length,
    paretoCount: gpus.filter((g) => g.isParetoOptimal).length,
    candidates: gpus.map((g) => ({
      rank: g.rank,
      id: g.id,
      name: g.name,
      isParetoOptimal: g.isParetoOptimal,
      isDominated: g.isDominated,
      topsisScore: g.topsisScore,
      topsisScorePct: g.topsisScorePct,
      distanceToBest: g.distanceToBest,
      distanceToWorst: g.distanceToWorst,
      price: g.price,
      specs: {
        rasterFps1440p: g.rasterFps1440p,
        rtFps1440p: g.rtFps1440p,
        vramGb: g.vramGb,
        tdpWatts: g.tdpWatts,
      },
      valuation: g.valuation
        ? {
            fairPrice: g.valuation.fairPrice,
            residualUsd: g.valuation.residualUsd,
            valueTier: g.valuation.valueTier,
          }
        : undefined,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Browser file download helper.
 */
export function downloadDataFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
