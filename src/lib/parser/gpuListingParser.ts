import { matchKnownGpuChip } from '../../data/knownGpuBenchmarks';
import { GpuCandidate } from '../math/types';

export interface ParsedGpuDeal extends GpuCandidate {
  rawTitle: string;
  chip: string;
  store: string;
  brand?: string;
  currency: 'BRL' | 'USD';
  validationWarnings: string[];
}

const KNOWN_BRANDS = [
  'PowerColor',
  'Gamer Ninja',
  'Palit',
  'PCYes',
  'ASUS',
  'MSI',
  'Gigabyte',
  'Galax',
  'Zotac',
  'Sapphire',
  'XFX',
  'PNY',
  'Gainward',
  'Inno3D',
  'Colorful',
  'ASRock',
  'EVGA',
];

const KNOWN_STORES = [
  { name: 'Pichau', pattern: /pichau/i },
  { name: 'TerabyteShop', pattern: /terabyte(?:shop)?/i },
  { name: 'KaBuM!', pattern: /kabum/i },
  { name: 'PCYes', pattern: /pcyes/i },
  { name: 'Amazon', pattern: /amazon/i },
  { name: 'Mercado Livre', pattern: /mercado\s*livre|mercadolivre/i },
  { name: 'PatoLoco', pattern: /patoloco/i },
  { name: 'AliExpress', pattern: /aliexpress/i },
  { name: 'Magalu', pattern: /magalu|magazine\s*luiza/i },
  { name: 'BestBuy', pattern: /best\s*buy|bestbuy/i },
  { name: 'Newegg', pattern: /newegg/i },
  { name: 'Micro Center', pattern: /micro\s*center|microcenter/i },
];

/**
 * Parses numeric price string supporting BRL ("3.899,99", "1389,99") and US ("1,299.99", "299.99").
 */
export function parsePriceString(rawStr: string): number {
  if (!rawStr) return 0;
  const cleaned = rawStr.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return 0;

  let val = 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // BRL/EU format: 3.899,99
      val = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // US format: 3,899.99
      val = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    // "1389,99"
    val = parseFloat(cleaned.replace(',', '.'));
  } else {
    val = parseFloat(cleaned);
  }

  return isNaN(val) ? 0 : val;
}

/**
 * Splits a text containing potentially multiple listings into individual listing strings.
 */
export function splitMultiListings(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Match boundaries where a new listing starts (e.g. "Placa de Video", "Placa de Vídeo", or 3+ newlines)
  const productHeaderRegex = /(?:^|\n\s*\n+)(?=(?:Placa\s+de\s+V[íi]deo|NVIDIA|AMD|Intel|PowerColor|Gamer\s+Ninja|Palit|PCYes|ASUS|Gigabyte|MSI|Galax|Zotac|Sapphire|XFX|GeForce|Radeon|Arc)\b)/i;

  const chunks = rawText.split(productHeaderRegex).map((c) => c.trim()).filter(Boolean);

  if (chunks.length > 1) {
    return chunks;
  }

  // Fallback: split by 3 or more newlines
  const blankSplit = rawText.split(/\n{3,}/).map((c) => c.trim()).filter(Boolean);
  if (blankSplit.length > 1) {
    return blankSplit;
  }

  return [rawText.trim()];
}

/**
 * Parses a single GPU listing block into a typed ParsedGpuDeal.
 */
export function parseSingleGpuListing(rawListing: string, index = 0): ParsedGpuDeal {
  const warnings: string[] = [];
  const lines = rawListing.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Raw Title & Clean Name
  const rawTitle = lines[0] || 'Unknown GPU Listing';

  // 2. Chip & Benchmark Match
  const benchmarkMatch = matchKnownGpuChip(rawListing);
  const chip = benchmarkMatch ? benchmarkMatch.chip : 'Unknown Chip';
  const vendor = benchmarkMatch ? benchmarkMatch.vendor : 'Other';

  if (!benchmarkMatch) {
    warnings.push('Could not identify a known GPU chip. Benchmark specs are estimated.');
  }

  // 3. VRAM extraction
  let vramGb = benchmarkMatch ? benchmarkMatch.vramGb : 8;
  const vramRegex = /\b(\d{1,2})\s*(?:GB|G)\b/i;
  const vramMatch = rawListing.match(vramRegex);
  if (vramMatch && vramMatch[1]) {
    const parsedVram = parseInt(vramMatch[1], 10);
    if (!isNaN(parsedVram) && parsedVram >= 2 && parsedVram <= 48) {
      vramGb = parsedVram;
    }
  }

  // 4. Brand / AIB extraction
  let brand: string | undefined;
  for (const b of KNOWN_BRANDS) {
    const brandRegex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (brandRegex.test(rawListing)) {
      brand = b;
      break;
    }
  }

  // 5. Store & URL extraction
  let store = 'Online Store';
  let url: string | undefined;

  // Check explicit seller label "Vendido por: TerabyteShop"
  const soldByMatch = rawListing.match(/Vendido\s*(?:e\s*entregue)?\s*por:\s*([^\n\r,]+)/i);
  if (soldByMatch && soldByMatch[1]) {
    store = soldByMatch[1].trim();
  } else {
    for (const s of KNOWN_STORES) {
      if (s.pattern.test(rawListing)) {
        store = s.name;
        break;
      }
    }
  }

  // Markdown link or direct URL
  const mdUrlMatch = rawListing.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
  const rawUrlMatch = rawListing.match(/https?:\/\/[^\s\)]+/i);
  if (mdUrlMatch && mdUrlMatch[1]) {
    url = mdUrlMatch[1];
  } else if (rawUrlMatch && rawUrlMatch[0]) {
    url = rawUrlMatch[0];
  }

  // 6. Currency Detection
  const hasBrl = /R\$|PIX|reais|sem\s*juros/i.test(rawListing);
  const currency: 'BRL' | 'USD' = hasBrl ? 'BRL' : 'USD';

  // 7. Price Extraction (Cash/PIX vs. Card/Installment vs. Original)
  let originalPrice: number | undefined;
  let priceCash: number | undefined;
  let priceInstallment: number | undefined;

  // Original price: e.g. "de R$ 5.176,46 por:" or "De: R$ 1.449,99 por:"
  const origMatch = rawListing.match(/(?:de|de:)\s*R?\$?\s*([\d\.]+(?:,\d{2})?)\s*por/i);
  if (origMatch && origMatch[1]) {
    originalPrice = parsePriceString(origMatch[1]);
  }

  // Extract all valid currency tokens with explicit currency sign or decimal cents
  // Example tokens: "R$ 3.899,99", "R$ 4.588,22", "3099,00", "2.944,05"
  interface FoundPrice {
    value: number;
    lineIndex: number;
    rawText: string;
  }
  const foundPrices: FoundPrice[] = [];

  const pricePattern = /(?:R\$\s*|(?<!\w))(\d{1,3}(?:\.\d{3})+,\d{2}|\d{3,6},\d{2}|\d{3,6}\.\d{2})\b/g;

  lines.forEach((line, lineIdx) => {
    // Skip product title and bus width / pc points lines
    if (lineIdx === 0 && !line.includes('R$')) return;
    const matches = Array.from(line.matchAll(pricePattern));
    for (const m of matches) {
      const val = parsePriceString(m[1]);
      if (val >= 100) {
        // Exclude originalPrice from being tagged as cash or installment
        if (originalPrice && Math.abs(val - originalPrice) < 0.01) continue;
        foundPrices.push({ value: val, lineIndex: lineIdx, rawText: line });
      }
    }
  });

  // Classify each found price
  for (const fp of foundPrices) {
    const surrounding = [
      lines[fp.lineIndex - 1] || '',
      lines[fp.lineIndex] || '',
      lines[fp.lineIndex + 1] || '',
    ].join(' ');

    const isInstallmentContext = /em\s*até|\d+x|cartão|sem\s*juros|ou\s*R\$/i.test(surrounding);
    const isCashContext = /à\s*vista|a\s*vista|pix|no\s*pix|desconto/i.test(surrounding);

    if (isCashContext && !priceCash) {
      priceCash = fp.value;
    } else if (isInstallmentContext && !priceInstallment) {
      priceInstallment = fp.value;
    }
  }

  // If we found prices but couldn't strictly differentiate:
  if (foundPrices.length > 0) {
    if (!priceCash && !priceInstallment) {
      // If two prices found, the smaller is cash/PIX and the larger is installment
      if (foundPrices.length >= 2) {
        const sorted = [...foundPrices].sort((a, b) => a.value - b.value);
        priceCash = sorted[0].value;
        priceInstallment = sorted[sorted.length - 1].value;
      } else {
        priceCash = foundPrices[0].value;
      }
    } else if (!priceCash && priceInstallment) {
      // Look for a smaller price in foundPrices
      const remaining = foundPrices.filter((p) => p.value !== priceInstallment);
      if (remaining.length > 0) {
        priceCash = remaining[0].value;
      }
    }
  }

  // Default active optimization price
  const activePrice = priceCash || priceInstallment || 0;
  if (activePrice <= 0) {
    warnings.push('Could not detect a valid price. Please enter price manually.');
  }

  // 8. Performance specs (from benchmark database or estimated defaults)
  let rasterFps1440p = benchmarkMatch ? benchmarkMatch.rasterFps1440p : 60;
  let rtFps1440p = benchmarkMatch ? benchmarkMatch.rtFps1440p : 30;
  let tdpWatts = benchmarkMatch ? benchmarkMatch.tdpWatts : 180;

  // 9. Generate Clean Display Name
  let name = cleanGpuName(rawTitle, brand, chip, vramGb);

  // 10. Generate Unique ID
  const cleanId = `${store.toLowerCase().replace(/[^a-z0-9]/g, '')}-${chip.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}-${index}`;

  return {
    id: cleanId,
    name,
    rawTitle,
    chip,
    vendor,
    brand,
    store,
    url,
    currency,
    price: activePrice,
    priceCash,
    priceInstallment,
    originalPrice,
    vramGb,
    rasterFps1440p,
    rtFps1440p,
    tdpWatts,
    isCustom: true,
    isBenchmarkEstimated: benchmarkMatch ? !!benchmarkMatch.isEstimated : true,
    notes: buildDealNotes(store, priceCash, priceInstallment, currency),
    validationWarnings: warnings,
  };
}

/**
 * Builds clean human-readable name from listing title.
 */
function cleanGpuName(rawTitle: string, brand?: string, chip?: string, vramGb?: number): string {
  // If chip is identified, e.g. "PowerColor Radeon RX 9060 XT 16GB"
  if (chip && chip !== 'Unknown Chip') {
    const brandPrefix = brand ? `${brand} ` : '';
    return `${brandPrefix}${chip} ${vramGb}GB`.trim();
  }

  // Fallback: clean the raw title
  return rawTitle
    .replace(/^Placa\s+de\s+V[íi]deo\s*/i, '')
    .replace(/,\s*\d+GB.*$/i, '')
    .trim()
    .slice(0, 45);
}

/**
 * Summarizes deal terms (e.g. "Pichau · PIX: R$ 3.899,99 | 12x: R$ 4.588,22").
 */
function buildDealNotes(
  store: string,
  priceCash?: number,
  priceInstallment?: number,
  currency: 'BRL' | 'USD' = 'BRL'
): string {
  const parts: string[] = [store];
  const symbol = currency === 'BRL' ? 'R$' : '$';

  if (priceCash) {
    parts.push(`PIX: ${symbol} ${priceCash.toFixed(2)}`);
  }
  if (priceInstallment) {
    parts.push(`Cartão: ${symbol} ${priceInstallment.toFixed(2)}`);
  }

  return parts.join(' · ');
}

/**
 * Batch parses raw text containing one or multiple GPU listings.
 */
export function parseGpuListings(rawText: string): ParsedGpuDeal[] {
  const chunks = splitMultiListings(rawText);
  return chunks.map((chunk, idx) => parseSingleGpuListing(chunk, idx));
}
