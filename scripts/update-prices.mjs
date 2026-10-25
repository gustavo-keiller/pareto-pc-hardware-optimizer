#!/usr/bin/env node
// Weekly store price refresh. Run it on your own machine, review the diff,
// and open a PR with the updated price files.
//
//   npm run prices:update                      # refresh every Brazilian link
//   npm run prices:update -- --region us       # refresh the US links
//   npm run prices:update -- --only rx-7600    # refresh one part
//   npm run prices:update -- --add rx-7600 https://www.kabum.com.br/produto/...
//   npm run prices:update -- --missing         # parts with no store link yet
//   npm run prices:update -- --dry-run         # fetch and report, write nothing
//
// Reads product links from src/data/prices/sources/<region>.json, opens each
// page in a real Chromium (Playwright, already a dev dependency; run
// `npx playwright install chromium` once), reads the price from the page's
// schema.org data, and writes src/data/prices/<region>.json plus a point in
// src/data/prices/history.json. A link that fails keeps its last price and
// date, so the app shows it as possibly out of date instead of dropping it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractOfferFromHtml,
  isSuspiciousJump,
  storeNameFromUrl,
} from './lib/store-page-parser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRICES_DIR = path.join(ROOT, 'src/data/prices');
const CATALOG_DIR = path.join(ROOT, 'src/data/catalogs');

function parseArgs(argv) {
  const args = {
    region: 'br',
    only: null,
    add: null,
    missing: false,
    dryRun: false,
    acceptJumps: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--region') args.region = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--add') args.add = { id: argv[++i], url: argv[++i] };
    else if (a === '--missing') args.missing = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--accept-jumps') args.acceptJumps = true;
    else {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    }
  }
  if (!['br', 'us'].includes(args.region)) {
    console.error(`--region must be br or us (got ${args.region})`);
    process.exit(2);
  }
  return args;
}

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const writeJson = (file, data) =>
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

function loadCatalogParts() {
  const parts = new Map();
  for (const file of fs.readdirSync(CATALOG_DIR)) {
    if (!file.endsWith('.json')) continue;
    for (const p of readJson(path.join(CATALOG_DIR, file), [])) {
      parts.set(p.id, { name: p.name, category: file.replace('.json', '') });
    }
  }
  return parts;
}

function searchLinks(name, region) {
  const q = encodeURIComponent(name);
  const dashed = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return region === 'br'
    ? [
        `https://www.kabum.com.br/busca/${dashed}`,
        `https://www.pichau.com.br/search?q=${q}`,
        `https://www.terabyteshop.com.br/busca?str=${q}`,
      ]
    : [`https://www.newegg.com/p/pl?d=${q}`, `https://www.amazon.com/s?k=${q}`];
}

async function fetchPage(browser, url) {
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    // Let client-rendered stores finish writing their product data.
    await page.waitForTimeout(2_500);
    return { status: response?.status() ?? 0, html: await page.content() };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const parts = loadCatalogParts();
  const sourcesFile = path.join(PRICES_DIR, 'sources', `${args.region}.json`);
  const pricesFile = path.join(PRICES_DIR, `${args.region}.json`);
  const historyFile = path.join(PRICES_DIR, 'history.json');
  const currency = args.region === 'br' ? 'BRL' : 'USD';
  const sources = readJson(sourcesFile, []);

  if (args.add) {
    const { id, url } = args.add;
    if (!parts.has(id)) throw new Error(`Unknown part id: ${id}`);
    if (!/^https?:\/\//.test(url ?? '')) throw new Error(`Bad URL: ${url}`);
    if (!sources.some((s) => s.componentId === id && s.url === url)) {
      sources.push({ componentId: id, url });
      sources.sort((a, b) => a.componentId.localeCompare(b.componentId));
      writeJson(sourcesFile, sources);
    }
    console.log(`Added ${id} -> ${url}. Run again without --add to fetch it.`);
    return;
  }

  if (args.missing) {
    const linked = new Set(sources.map((s) => s.componentId));
    const missing = [...parts].filter(([id]) => !linked.has(id));
    console.log(`${missing.length} parts have no ${args.region} store link:\n`);
    for (const [id, p] of missing) {
      console.log(`${id}  (${p.category}) ${p.name}`);
      for (const link of searchLinks(p.name, args.region)) {
        console.log(`    ${link}`);
      }
    }
    console.log(
      '\nAdd one with: npm run prices:update -- --add <id> <product-url>',
    );
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    throw new Error('Playwright is missing. Run `npm install` first.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const previous = readJson(pricesFile, []);
  const previousByUrl = new Map(previous.map((o) => [o.url, o]));
  const todo = sources.filter((s) => !args.only || s.componentId === args.only);
  const results = [];
  const browser = await chromium.launch();

  try {
    for (const source of todo) {
      const store = source.store ?? storeNameFromUrl(source.url);
      const old = previousByUrl.get(source.url);
      let outcome;
      try {
        const { status, html } = await fetchPage(browser, source.url);
        const offer = status < 400 ? extractOfferFromHtml(html) : null;
        if (!offer) {
          outcome = { kind: 'failed', why: `HTTP ${status}, no price on page` };
        } else if (
          old &&
          !args.acceptJumps &&
          isSuspiciousJump(old.price, offer.price)
        ) {
          outcome = {
            kind: 'failed',
            why: `price jumped ${old.price} -> ${offer.price}; check the page, then rerun with --accept-jumps`,
          };
        } else {
          outcome = { kind: 'ok', offer };
        }
      } catch (err) {
        outcome = {
          kind: 'failed',
          why: err instanceof Error ? err.message.split('\n')[0] : String(err),
        };
      }

      if (outcome.kind === 'ok') {
        const { price, inStock } = outcome.offer;
        results.push({
          entry: {
            componentId: source.componentId,
            store,
            price,
            url: source.url,
            inStock,
            checkedAt: today,
          },
          line: `ok      ${source.componentId} @ ${store}: ${price}${inStock ? '' : ' (sold out)'}${old ? ` (was ${old.price})` : ''}`,
        });
      } else {
        results.push({
          entry: old ?? null,
          line: `FAILED  ${source.componentId} @ ${store}: ${outcome.why}${old ? ` (keeping ${old.price} from ${old.checkedAt})` : ''}`,
        });
      }
      console.log(results[results.length - 1].line);
    }
  } finally {
    await browser.close();
  }

  const refreshedUrls = new Set(todo.map((s) => s.url));
  const sourceUrls = new Set(sources.map((s) => s.url));
  const next = [
    // Entries not refreshed this run (--only) stay as they were, while a
    // link removed from the sources file drops out.
    ...previous.filter(
      (o) => !refreshedUrls.has(o.url) && sourceUrls.has(o.url),
    ),
    ...results.map((r) => r.entry).filter(Boolean),
  ].sort(
    (a, b) =>
      a.componentId.localeCompare(b.componentId) ||
      a.store.localeCompare(b.store),
  );

  const ok = results.filter((r) => r.line.startsWith('ok')).length;
  console.log(`\n${ok} of ${results.length} links refreshed.`);
  if (args.dryRun) {
    console.log('Dry run: nothing written.');
    return;
  }
  writeJson(pricesFile, next);

  // One history point per part per day: the cheapest in-stock price.
  const history = readJson(historyFile, []);
  const cheapest = new Map();
  for (const o of next) {
    if (o.checkedAt !== today || !o.inStock) continue;
    const best = cheapest.get(o.componentId);
    if (!best || o.price < best.price) cheapest.set(o.componentId, o);
  }
  for (const [componentId, o] of cheapest) {
    let series = history.find(
      (h) => h.componentId === componentId && h.currency === currency,
    );
    if (!series) {
      series = { componentId, currency, history: [] };
      history.push(series);
    }
    series.history = series.history.filter((p) => p.date !== today);
    series.history.push({ date: today, price: o.price, store: o.store });
  }
  writeJson(historyFile, history);
  console.log(
    `Wrote ${path.relative(ROOT, pricesFile)} and ${path.relative(ROOT, historyFile)}. Review with git diff, then open a PR.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
