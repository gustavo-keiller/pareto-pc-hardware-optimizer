import { REAL_WORLD_GPUS } from '../../data/realGpus';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../../data/seedComponents';
import { RegionalPriceOffer } from '../math/pricingEngine';
import {
  ParsedGpuDeal,
  extractListingPriceAndStore,
  parseSingleGpuListing,
  splitMultiListings,
} from './gpuListingParser';

export type HardwareCategoryKey =
  'gpu' | 'cpu' | 'motherboard' | 'ram' | 'storage' | 'cooler' | 'case' | 'psu';

export interface ParsedHardwareDeal {
  readonly id: string;
  readonly category: HardwareCategoryKey;
  readonly matchedComponentId?: string;
  readonly name: string;
  readonly rawTitle: string;
  readonly store: string;
  readonly url?: string;
  readonly currency: 'BRL' | 'USD';
  readonly price: number;
  readonly priceCash?: number;
  readonly priceInstallment?: number;
  readonly originalPrice?: number;
  readonly baselinePrice?: number;
  readonly isCatalogMatch: boolean;
  readonly gpuDeal?: ParsedGpuDeal;
  readonly validationWarnings: readonly string[];
}

interface CatalogSearchEntry {
  readonly id: string;
  readonly name: string;
  readonly category: HardwareCategoryKey;
  readonly baselinePrice: number;
  readonly tokens: readonly string[];
}

const STOP_WORDS = new Set([
  'with',
  'para',
  'placa',
  'video',
  'gaming',
  'edition',
  'black',
  'white',
  'plus',
  'series',
  'modular',
  'gold',
  'bronze',
]);

function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(\d+)\s*(gb|tb|w|mhz|mm)\b/gi, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length >= 2 && !STOP_WORDS.has(tok));
}

function normalizeCompact(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const CATALOG_INDEX: readonly CatalogSearchEntry[] = [
  ...REAL_WORLD_GPUS.map((g) => ({
    id: g.id,
    name: g.name,
    category: 'gpu' as const,
    baselinePrice: g.price,
    tokens: tokenizeForMatch(`${g.name} ${g.chip ?? ''}`),
  })),
  ...SEED_CPUS.map((c) => ({
    id: c.id,
    name: c.name,
    category: 'cpu' as const,
    baselinePrice: c.price,
    tokens: tokenizeForMatch(c.name),
  })),
  ...SEED_MOTHERBOARDS.map((m) => ({
    id: m.id,
    name: m.name,
    category: 'motherboard' as const,
    baselinePrice: m.price,
    tokens: tokenizeForMatch(m.name),
  })),
  ...SEED_RAM_KITS.map((r) => ({
    id: r.id,
    name: r.name,
    category: 'ram' as const,
    baselinePrice: r.price,
    tokens: tokenizeForMatch(`${r.name} ${r.generation}`),
  })),
  ...SEED_STORAGES.map((s) => ({
    id: s.id,
    name: s.name,
    category: 'storage' as const,
    baselinePrice: s.price,
    tokens: tokenizeForMatch(s.name),
  })),
  ...SEED_COOLERS.map((c) => ({
    id: c.id,
    name: c.name,
    category: 'cooler' as const,
    baselinePrice: c.price,
    tokens: tokenizeForMatch(c.name),
  })),
  ...SEED_CASES.map((c) => ({
    id: c.id,
    name: c.name,
    category: 'case' as const,
    baselinePrice: c.price,
    tokens: tokenizeForMatch(c.name),
  })),
  ...SEED_PSUS.map((p) => ({
    id: p.id,
    name: p.name,
    category: 'psu' as const,
    baselinePrice: p.price,
    tokens: tokenizeForMatch(p.name),
  })),
];

const CATEGORY_CUE_PATTERNS: ReadonlyArray<{
  readonly category: HardwareCategoryKey;
  readonly strong: RegExp;
  readonly secondary: RegExp;
}> = [
  {
    category: 'gpu',
    strong:
      /\b(?:placa\s+de\s+v[íi]deo|graphics\s+card|geforce|radeon|rtx\s*\d{4}|gtx\s*\d{4}|rx\s*\d{4}|arc\s*[ab]\d{3})\b/i,
    secondary: /\b(?:gddr[567]|cuda|ray\s*tracing|12gb\s*gddr)\b/i,
  },
  {
    category: 'cpu',
    strong:
      /\b(?:processador|processor|ryzen\s*[3579]\s*\d{4}|core\s*i[3579][-\s]\d{4,5}|core\s*ultra\s*[579])\b/i,
    secondary: /\b(?:x3d|lga\s*1[78]51|socket\s*am[45]|threads|nucleos)\b/i,
  },
  {
    category: 'motherboard',
    strong:
      /\b(?:placa[- ]?m[ãa]e|motherboard|b650m?|b550m?|a620m?|b760m?|z890m?|x670e?|aorus\s*elite|tuf\s*gaming\s*[abxz]\d{3})\b/i,
    secondary:
      /\b(?:chipset|micro[- ]?atx|mini[- ]?itx\s*am[45]|lga\s*1[78]51\s*ddr)\b/i,
  },
  {
    category: 'ram',
    strong:
      /\b(?:mem[óo]ria\s*(?:ram|gamer)?|vengeance\s*ddr|fury\s*beast|trident\s*z|ddr[45][-\s]\d{4})\b/i,
    secondary: /\b(?:2x\d+gb|cl\d{2}|udimm|dimm\s*ddr[45])\b/i,
  },
  {
    category: 'storage',
    strong:
      /\b(?:ssd\s*(?:nvme|m\.2|sata)?|kingston\s*nv[23]|sn850x|990\s*pro|mp44l|kc3000|p3\s*plus)\b/i,
    secondary: /\b(?:nvme|pcie\s*4\.0\s*m\.2|leitura\s*\d{4}\s*mb\/s|tbw)\b/i,
  },
  {
    category: 'cooler',
    strong:
      /\b(?:water\s*cooler|air\s*cooler|cooler\s*(?:para\s*)?processador|peerless\s*assassin|ak[46]20|ak400|liquid\s*freezer|frozen\s*prism|nh[- ]?d15)\b/i,
    secondary: /\b(?:240mm|360mm|heatpipes|radiador|dissipador)\b/i,
  },
  {
    category: 'case',
    strong:
      /\b(?:gabinete(?:\s*gamer)?|pc\s*case|mid[- ]?tower|nr200p|4000d|h5\s*flow|lancool|air\s*903|h6\s*flow)\b/i,
    secondary:
      /\b(?:vidro\s*temperado|tempered\s*glass|mesh\s*frontal|suporte\s*atx)\b/i,
  },
  {
    category: 'psu',
    strong:
      /\b(?:fonte(?:\s*de\s*alimenta[çc][ãa]o|\s*atx)?|power\s*supply|mag\s*a\d{3}bn|rm\d{3}e?|core\s*reactor|cx\d{3}|mwe\s*\d{3})\b/i,
    secondary: /\b(?:80\s*plus|atx\s*3\.[01]|pfc\s*ativo|\d{3,4}w\s*80)\b/i,
  },
];

/**
 * Detects which of the 8 PC hardware categories a store listing belongs to (`[DATA-07]`).
 */
export function detectHardwareCategory(rawText: string): HardwareCategoryKey {
  let bestCategory: HardwareCategoryKey = 'gpu';
  let bestScore = -1;

  for (const cue of CATEGORY_CUE_PATTERNS) {
    let score = 0;
    if (cue.strong.test(rawText)) score += 10;
    if (cue.secondary.test(rawText)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cue.category;
    }
  }

  return bestScore > 0 ? bestCategory : 'gpu';
}

/**
 * Matches a store product title/snippet against ParetoPC's 124-part catalog (`[DATA-07]`).
 */
export function matchCatalogComponent(
  rawText: string,
  categoryHint?: HardwareCategoryKey,
): {
  readonly componentId: string;
  readonly name: string;
  readonly category: HardwareCategoryKey;
  readonly baselinePrice: number;
} | null {
  const candidates = categoryHint
    ? CATALOG_INDEX.filter((item) => item.category === categoryHint)
    : CATALOG_INDEX;

  const listingTokens = new Set(tokenizeForMatch(rawText));
  const compactListing = normalizeCompact(rawText);

  let best: CatalogSearchEntry | null = null;
  let bestScore = 0;

  for (const entry of candidates) {
    const matchedTokens = entry.tokens.filter((tok) =>
      listingTokens.has(tok),
    ).length;
    if (matchedTokens === 0) continue;

    const coverage = matchedTokens / entry.tokens.length;
    const compactName = normalizeCompact(entry.name);
    const exactBonus = compactListing.includes(compactName) ? 1.5 : 0;
    const score = coverage + matchedTokens * 0.12 + exactBonus;

    if (coverage >= 0.45 && score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best) return null;
  return {
    componentId: best.id,
    name: best.name,
    category: best.category,
    baselinePrice: best.baselinePrice,
  };
}

/**
 * Splits pasted store text containing one or multiple hardware items across any category.
 */
export function splitHardwareListings(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  const mdRegex = /\[([\s\S]*?)\]\((https?:\/\/[^\s)]+)\)/g;
  const mdMatches = Array.from(rawText.matchAll(mdRegex));
  if (mdMatches.length > 1) {
    return mdMatches.map((m) => `${m[1].trim()}\n${m[2].trim()}`);
  }

  const blockRegex =
    /(?:^|\n\s*\n+)(?=(?:\[)?(?:(?:\d+%\s*OFF|\d+\s*UNID|Frete\s*Gr[áa]tis[^\n]*?)\s*)*(?:Placa\s+de\s+V[íi]deo|Processador|Placa[- ]?M[ãa]e|Mem[óo]ria|SSD|Water\s+Cooler|Air\s+Cooler|Cooler|Gabinete|Fonte|Processor|Motherboard|Power\s+Supply|PowerColor|Gamer\s+Ninja|Palit|PCYes|GeForce|Radeon|Arc|AMD|Intel|NVIDIA|ASUS|Gigabyte|MSI|Galax|Zotac|Sapphire|XFX|Leadertech|Mancer|Kingston|Corsair|Samsung|Crucial|ASRock|Cooler\s+Master|DeepCool|Thermalright|XPG|Montech|NZXT)\b)/i;

  const blocks = rawText
    .split(blockRegex)
    .map((c) => c.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (
    lines.length > 1 &&
    lines.every(
      (l) =>
        /(?:R\$|\$)\s*[\d.]+/i.test(l) &&
        /(?:RTX|GTX|RX|Arc|Ryzen|Core|SSD|NVMe|DDR[45]|Fonte|PSU|Gabinete|Cooler|Placa|Motherboard|CPU)/i.test(
          l,
        ),
    )
  ) {
    return lines;
  }

  return splitMultiListings(rawText);
}

/**
 * Parses store listings across all 8 PC categories (`[DATA-07]`).
 */
export function parseHardwareListings(rawText: string): ParsedHardwareDeal[] {
  const chunks = splitHardwareListings(rawText);

  return chunks.map((chunk, index) => {
    const category = detectHardwareCategory(chunk);
    const catalogMatch = matchCatalogComponent(chunk, category);

    if (category === 'gpu') {
      const gpuDeal = parseSingleGpuListing(chunk, index);
      const gpuMatch = catalogMatch ?? matchCatalogComponent(chunk, 'gpu');
      return {
        id: gpuDeal.id,
        category: 'gpu',
        matchedComponentId: gpuMatch?.componentId,
        name: gpuDeal.name,
        rawTitle: gpuDeal.rawTitle,
        store: gpuDeal.store,
        url: gpuDeal.url,
        currency: gpuDeal.currency,
        price: gpuDeal.price,
        priceCash: gpuDeal.priceCash,
        priceInstallment: gpuDeal.priceInstallment,
        originalPrice: gpuDeal.originalPrice,
        baselinePrice: gpuMatch?.baselinePrice,
        isCatalogMatch: Boolean(gpuMatch),
        gpuDeal,
        validationWarnings: gpuDeal.validationWarnings,
      };
    }

    const extracted = extractListingPriceAndStore(chunk, 15);
    const warnings: string[] = [];
    if (!catalogMatch) {
      warnings.push(
        `No exact catalog match in ${category.toUpperCase()} library. Check component ID before saving offer.`,
      );
    }
    if (extracted.activePrice <= 0) {
      warnings.push(
        'Could not detect a valid price. Please enter price manually.',
      );
    }

    const cleanId = `${extracted.store.toLowerCase().replace(/[^a-z0-9]/g, '')}-${catalogMatch ? catalogMatch.componentId : category}-${Date.now().toString(36)}-${index}`;

    return {
      id: cleanId,
      category,
      matchedComponentId: catalogMatch?.componentId,
      name: catalogMatch?.name ?? extracted.rawTitle.slice(0, 60),
      rawTitle: extracted.rawTitle,
      store: extracted.store,
      url: extracted.url,
      currency: extracted.currency,
      price: extracted.activePrice,
      priceCash: extracted.priceCash,
      priceInstallment: extracted.priceInstallment,
      originalPrice: extracted.originalPrice,
      baselinePrice: catalogMatch?.baselinePrice,
      isCatalogMatch: Boolean(catalogMatch),
      validationWarnings: warnings,
    };
  });
}

/**
 * Converts matched multi-category deals into schema-ready `RegionalPriceOffer` records.
 */
export function convertDealsToRegionalOffers(
  deals: readonly ParsedHardwareDeal[],
  checkedAt = new Date().toISOString().slice(0, 10),
): RegionalPriceOffer[] {
  const bestByComponent = new Map<string, RegionalPriceOffer>();

  for (const deal of deals) {
    if (!deal.matchedComponentId || deal.price <= 0) continue;
    const offer: RegionalPriceOffer = {
      componentId: deal.matchedComponentId,
      store: deal.store,
      price: deal.priceInstallment ?? deal.price,
      cashPrice: deal.priceCash ?? deal.price,
      installmentPrice: deal.priceInstallment,
      url:
        deal.url ??
        `https://paretopc.com/search?q=${encodeURIComponent(deal.matchedComponentId)}`,
      inStock: true,
      checkedAt,
    };

    const prev = bestByComponent.get(deal.matchedComponentId);
    const prevEffective = prev ? (prev.cashPrice ?? prev.price) : Infinity;
    const nextEffective = offer.cashPrice ?? offer.price;
    if (!prev || nextEffective < prevEffective) {
      bestByComponent.set(deal.matchedComponentId, offer);
    }
  }

  return Array.from(bestByComponent.values());
}
