// Pulls a product's price and stock out of a store's product page HTML.
// Pure functions (no network, no files) so they are tested in
// scripts/__tests__/store-page-parser.test.mjs.
//
// Order of evidence:
//   1. schema.org Product data in <script type="application/ld+json">
//      (KaBuM!, Pichau, TerabyteShop, Mercado Livre and Amazon all ship it)
//   2. <meta property="product:price:amount"> / itemprop="price" tags

/** Parses "1.299,90", "1299.90", "R$ 1.299" or 1299.9 into a number. */
export function parsePriceValue(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized;
  if (lastComma > lastDot) {
    // pt-BR: dots group thousands, comma is the decimal mark
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma >= 0) {
    normalized = s.replace(/,/g, '');
  } else if (lastDot >= 0 && /\.\d{3}$/.test(s) && !/\.\d{1,2}$/.test(s)) {
    // "1.299" with no decimals is a thousands separator in pt-BR
    normalized = s.replace(/\./g, '');
  } else {
    normalized = s;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isProduct(node) {
  const type = node && node['@type'];
  return Array.isArray(type) ? type.includes('Product') : type === 'Product';
}

function findProducts(node, out) {
  if (Array.isArray(node)) {
    for (const child of node) findProducts(child, out);
  } else if (node && typeof node === 'object') {
    if (isProduct(node)) out.push(node);
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') findProducts(value, out);
    }
  }
  return out;
}

function stockFrom(availability) {
  if (typeof availability !== 'string') return true;
  return !/OutOfStock|SoldOut|Discontinued/i.test(availability);
}

function offersFrom(product) {
  const raw = product.offers;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const offers = [];
  for (const offer of list) {
    if (!offer || typeof offer !== 'object') continue;
    const price =
      parsePriceValue(offer.price) ??
      parsePriceValue(offer.lowPrice) ??
      parsePriceValue(offer.priceSpecification?.price);
    if (price === null) continue;
    offers.push({
      price,
      inStock: stockFrom(offer.availability),
      currency:
        typeof offer.priceCurrency === 'string' ? offer.priceCurrency : null,
    });
  }
  return offers;
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // Stores sometimes ship broken JSON-LD next to a good block; skip it.
    }
  }
  return blocks;
}

function metaPrice(html) {
  const patterns = [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i,
    /itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    const value = m ? parsePriceValue(m[1]) : null;
    if (value !== null) return value;
  }
  return null;
}

/**
 * Returns `{ price, inStock, name, method }` for the cheapest offer on the
 * page, or `null` when no price can be found (blocked page, layout change).
 */
export function extractOfferFromHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return null;
  const products = jsonLdBlocks(html).flatMap((b) => findProducts(b, []));
  let best = null;
  for (const product of products) {
    for (const offer of offersFrom(product)) {
      const better =
        !best ||
        (offer.inStock && !best.inStock) ||
        (offer.inStock === best.inStock && offer.price < best.price);
      if (better) {
        best = {
          price: offer.price,
          inStock: offer.inStock,
          name: typeof product.name === 'string' ? product.name : null,
          method: 'json-ld',
        };
      }
    }
  }
  if (best) return best;
  const price = metaPrice(html);
  return price === null
    ? null
    : { price, inStock: true, name: null, method: 'meta' };
}

const STORE_NAMES = [
  [/kabum\.com\.br$/, 'KaBuM!'],
  [/pichau\.com\.br$/, 'Pichau'],
  [/terabyteshop\.com\.br$/, 'TerabyteShop'],
  [/mercadolivre\.com\.br$/, 'Mercado Livre'],
  [/amazon\.com\.br$/, 'Amazon BR'],
  [/amazon\.com$/, 'Amazon US'],
  [/newegg\.com$/, 'Newegg'],
  [/bestbuy\.com$/, 'Best Buy'],
  [/bhphotovideo\.com$/, 'B&H'],
];

/** Store display name from a product URL ("https://www.kabum.com.br/..." -> "KaBuM!"). */
export function storeNameFromUrl(url) {
  let host;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [re, name] of STORE_NAMES) {
    if (re.test(host)) return name;
  }
  return host;
}

/**
 * True when a new price is so far from the last one that the page was
 * probably misread (an installment total, a bundle, a different product).
 */
export function isSuspiciousJump(previous, next) {
  if (!(previous > 0) || !(next > 0)) return false;
  const ratio = next / previous;
  return ratio < 0.4 || ratio > 2.5;
}

const UNIT_SUFFIX = /(mhz|ghz|gb|tb|mm|w)$/;
const VARIANT_WORDS = new Set(['super', 'ti', 'xt', 'xtx']);
const GENERIC_WORDS = new Set([
  'rgb',
  'argb',
  'atx',
  'matx',
  'itx',
  'mid',
  'tower',
  'micro',
  'mini',
  'wifi',
  'stock',
]);

function tokens(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * The words that identify a catalog part's model: tokens with digits
 * ("5700x3d", "b550", "a650bn", "3200") and variant words ("super", "ti",
 * "xt"). Sizes and speeds ("16gb", "2x8gb", "cl16", "650w") are left out
 * because store titles write them in too many ways.
 */
export function modelTokens(partName) {
  const words = tokens(partName.replace(/\[[^\]]*\]/g, ' '));
  const model = words.filter((t) => {
    if (VARIANT_WORDS.has(t)) return true;
    if (!/\d/.test(t)) return false;
    if (/^\d+(x\d+)?(mhz|ghz|gb|tb|mm|w)$/.test(t)) return false;
    if (/^cl\d+$/.test(t)) return false;
    return /[a-z]/.test(t) || t.length >= 3;
  });
  if (model.length > 0) return model;
  // Names without model numbers ("Fractal Design Pop Air RGB ATX"): use the
  // brand and product words instead.
  return words.filter((t) => t.length >= 3 && !GENERIC_WORDS.has(t));
}

/**
 * True when a store page's product title names the same model as the
 * catalog part: every model token appears as a whole word. Guards against
 * a store reusing a product id for something else (a monitor, a door lock).
 */
export function nameMatchesPart(pageName, partName) {
  if (typeof pageName !== 'string' || pageName.trim() === '') return false;
  const required = modelTokens(partName);
  if (required.length === 0) return false;
  const page = new Set(
    tokens(pageName).flatMap((t) => [t, t.replace(UNIT_SUFFIX, '')]),
  );
  return required.every((t) => page.has(t));
}
