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
  'Leadertech',
  'PNY',
  'Gainward',
  'Inno3D',
  'Colorful',
  'ASRock',
  'EVGA',
  'Mancer',
  'Duex',
  'Biostar',
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
 * Strips promotional badges (e.g. "22%OFF", "30 UNID", "Frete Grátis: Sul e Sudeste").
 */
function cleanPromotionalPrefixes(text: string): string {
  let cleaned = text.replace(/^\[\s*/, '');
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(
        /^(?:\d+%\s*OFF|\d+\s*UNID(?:ADES)?|FRETE\s*GR[ÁA]TIS(?::\s*[^P\n]+)?|MAIS\s*VENDIDO[^\n]*?)\s*/i,
        '',
      )
      .trim();
  }
  return cleaned;
}

/**
 * Normalizes squished text copied from e-commerce product grids without spaces.
 */
function normalizeSquishedListing(text: string): string {
  return text
    .replace(/([a-zA-Z0-9])(de\s*R?\$)/gi, '$1 $2')
    .replace(/\b(por)(R?\$)/gi, '$1 $2')
    .replace(/(,\d{2})([A-Za-zÀ-ÿ])/g, '$1 $2')
    .replace(/(PIX)(R?\$)/gi, '$1 $2')
    .replace(/(,\d{2})(Em\s*até)/gi, '$1 $2')
    .replace(/(\d+x)(de)/gi, '$1 $2');
}

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

  // 1. Markdown Links Detection: If text contains multiple markdown links [title](url)
  const mdRegex = /\[([\s\S]*?)\]\((https?:\/\/[^\s)]+)\)/g;
  const mdMatches = Array.from(rawText.matchAll(mdRegex));
  if (mdMatches.length > 1) {
    return mdMatches.map((m) => `${m[1].trim()}\n${m[2].trim()}`);
  }

  // If exactly one markdown link wrapping the whole input, unpack it
  if (
    mdMatches.length === 1 &&
    rawText.trim().startsWith('[') &&
    rawText.trim().endsWith(')')
  ) {
    return [`${mdMatches[0][1].trim()}\n${mdMatches[0][2].trim()}`];
  }

  // 2. Multi-Listing blocks separated by blank lines (2+ newlines) with a product title
  const boundaryRegex =
    /(?:^|\n\s*\n+)(?=(?:\[)?(?:(?:\d+%\s*OFF|\d+\s*UNID|Frete\s*Gr[áa]tis[^\n]*?)\s*)*(?:Placa\s+de\s+V[íi]deo|NVIDIA|AMD|Intel|PowerColor|Gamer\s+Ninja|Palit|PCYes|ASUS|Gigabyte|MSI|Galax|Zotac|Sapphire|XFX|Leadertech|Mancer|GeForce|Radeon|Arc)\b)/i;

  const chunks = rawText
    .split(boundaryRegex)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length > 1) {
    return chunks;
  }

  // 3. Single-line-per-product paste: where each line has a price AND a GPU keyword
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    lines.length > 1 &&
    lines.every(
      (l) =>
        /(?:R\$|\$)\s*[\d.]+/i.test(l) &&
        /(?:RTX|GTX|RX|Arc|Radeon|GeForce|Placa)/i.test(l),
    )
  ) {
    return lines;
  }

  // Fallback: split by 3 or more newlines
  const blankSplit = rawText
    .split(/\n{3,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (blankSplit.length > 1) {
    return blankSplit;
  }

  return [rawText.trim()];
}

/**
 * Parses a single GPU listing block into a typed ParsedGpuDeal.
 */
export function parseSingleGpuListing(
  rawListing: string,
  index = 0,
): ParsedGpuDeal {
  const warnings: string[] = [];
  const cleanedListing = cleanPromotionalPrefixes(rawListing);
  const normalizedListing = normalizeSquishedListing(cleanedListing);
  const lines = normalizedListing
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Raw Title & Clean Name
  let rawTitle = lines[0] || 'Unknown GPU Listing';
  rawTitle = rawTitle
    .replace(/\s*(?:de|de:)?\s*R?\$?\s*[\d.]+(?:,\d{2})?\s*por.*$/i, '')
    .trim();

  // 2. Chip & Benchmark Match
  const benchmarkMatch = matchKnownGpuChip(normalizedListing);
  const chip = benchmarkMatch ? benchmarkMatch.chip : 'Unknown Chip';
  const vendor = benchmarkMatch ? benchmarkMatch.vendor : 'Other';

  if (!benchmarkMatch) {
    warnings.push(
      'Could not identify a known GPU chip. Benchmark specs are estimated.',
    );
  }

  // 3. VRAM extraction
  let vramGb = benchmarkMatch ? benchmarkMatch.vramGb : 8;
  const vramRegex = /\b(\d{1,2})\s*(?:GB|G)\b/i;
  const vramMatch = normalizedListing.match(vramRegex);
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
    if (brandRegex.test(normalizedListing)) {
      brand = b;
      break;
    }
  }

  // 5. Store & URL extraction
  let store = 'Online Store';
  let url: string | undefined;

  // Markdown link or direct URL
  const mdUrlMatch = rawListing.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
  const rawUrlMatch = rawListing.match(/https?:\/\/[^\s)]+/i);
  if (mdUrlMatch && mdUrlMatch[1]) {
    url = mdUrlMatch[1];
  } else if (rawUrlMatch && rawUrlMatch[0]) {
    url = rawUrlMatch[0];
  }

  // Check explicit seller label "Vendido por: TerabyteShop"
  const soldByMatch = normalizedListing.match(
    /Vendido\s*(?:e\s*entregue)?\s*por:\s*([^\n\r,]+)/i,
  );
  if (soldByMatch && soldByMatch[1]) {
    store = soldByMatch[1].trim();
  } else {
    for (const s of KNOWN_STORES) {
      if (s.pattern.test(normalizedListing) || (url && s.pattern.test(url))) {
        store = s.name;
        break;
      }
    }
  }

  // 6. Currency Detection
  const hasBrl = /R\$|PIX|reais|sem\s*juros/i.test(normalizedListing);
  const currency: 'BRL' | 'USD' = hasBrl ? 'BRL' : 'USD';

  // 7. Price Extraction (Cash/PIX vs. Card/Installment vs. Original)
  let originalPrice: number | undefined;
  let priceCash: number | undefined;
  let priceInstallment: number | undefined;

  // Original price: e.g. "de R$ 5.176,46 por:" or "De: R$ 1.449,99 por:"
  const origMatch = normalizedListing.match(
    /(?:de|de:)\s*R?\$?\s*([\d.]+(?:,\d{2})?)\s*(?:por|\/)/i,
  );
  if (origMatch && origMatch[1]) {
    originalPrice = parsePriceString(origMatch[1]);
  }

  // Extract all valid currency tokens with explicit currency sign or decimal cents
  interface FoundPrice {
    value: number;
    lineIndex: number;
    rawText: string;
  }
  const foundPrices: FoundPrice[] = [];

  const pricePattern =
    /(?:R\$\s*|(?<!\w))(\d{1,3}(?:\.\d{3})+,\d{2}|\d{3,6},\d{2}|\d{3,6}\.\d{2})\b/g;

  lines.forEach((line, lineIdx) => {
    if (
      lineIdx === 0 &&
      !line.includes('R$') &&
      !/\b\d{3,6},\d{2}\b/.test(line)
    )
      return;
    const matches = Array.from(line.matchAll(pricePattern));
    for (const m of matches) {
      const matchIndex = m.index ?? 0;
      // Preceding text up to match - check if it's an installment monthly installment
      const preText = line.slice(Math.max(0, matchIndex - 30), matchIndex);
      if (/\b\d{1,2}\s*x\s*(?:de\s*)?$/i.test(preText.trim())) {
        continue;
      }

      const val = parsePriceString(m[1]);
      if (val >= 100) {
        if (originalPrice && Math.abs(val - originalPrice) < 0.01) continue;

        // Context window around this specific price occurrence (±50 characters)
        const windowStart = Math.max(0, matchIndex - 50);
        const windowEnd = Math.min(line.length, matchIndex + m[0].length + 50);
        const localContext = line.slice(windowStart, windowEnd);

        foundPrices.push({
          value: val,
          lineIndex: lineIdx,
          rawText: localContext,
        });
      }
    }
  });

  // Classify each found price using its surrounding context
  for (const fp of foundPrices) {
    const isInstallmentContext =
      /em\s*até|\d+\s*x|cartão|sem\s*juros|ou\s*R\$/i.test(fp.rawText);
    const isCashContext =
      /à\s*vista|a\s*vista|pix|no\s*pix|desconto|por\s*R\$/i.test(fp.rawText);

    if (isCashContext && !isInstallmentContext && !priceCash) {
      priceCash = fp.value;
    } else if (isInstallmentContext && !isCashContext && !priceInstallment) {
      priceInstallment = fp.value;
    }
  }

  // If we found prices but couldn't strictly differentiate:
  if (foundPrices.length > 0) {
    if (!priceCash && !priceInstallment) {
      if (foundPrices.length >= 2) {
        const sorted = [...foundPrices].sort((a, b) => a.value - b.value);
        priceCash = sorted[0].value;
        priceInstallment = sorted[sorted.length - 1].value;
      } else {
        priceCash = foundPrices[0].value;
      }
    } else if (!priceCash && priceInstallment) {
      const remaining = foundPrices.filter((p) => p.value !== priceInstallment);
      if (remaining.length > 0) {
        priceCash = Math.min(...remaining.map((p) => p.value));
      }
    } else if (priceCash !== undefined && !priceInstallment) {
      const cash = priceCash;
      const remaining = foundPrices.filter((p) => p.value > cash);
      if (remaining.length > 0) {
        priceInstallment = Math.max(...remaining.map((p) => p.value));
      }
    }
  }

  // Default active optimization price
  const activePrice = priceCash || priceInstallment || 0;
  if (activePrice <= 0) {
    warnings.push(
      'Could not detect a valid price. Please enter price manually.',
    );
  }

  // 8. Performance specs (from benchmark database or estimated defaults)
  const rasterFps1440p = benchmarkMatch ? benchmarkMatch.rasterFps1440p : 60;
  const rtFps1440p = benchmarkMatch ? benchmarkMatch.rtFps1440p : 30;
  const tdpWatts = benchmarkMatch ? benchmarkMatch.tdpWatts : 180;

  // 9. Generate Clean Display Name
  const name = cleanGpuName(rawTitle, brand, chip, vramGb);

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
function cleanGpuName(
  rawTitle: string,
  brand?: string,
  chip?: string,
  vramGb?: number,
): string {
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
  currency: 'BRL' | 'USD' = 'BRL',
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
