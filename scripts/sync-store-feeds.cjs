#!/usr/bin/env node
/**
 * scripts/sync-store-feeds.cjs
 * `[DATA-09]` Automated Official Affiliate Feed Sync & Fair-Value Sanity Guard
 *
 * Usage:
 *   node scripts/sync-store-feeds.cjs --dry-run
 *   node scripts/sync-store-feeds.cjs --region BR --input path/to/feed.json --dry-run
 *   node scripts/sync-store-feeds.cjs --region BR --input path/to/feed.json --write
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BR_PATH = path.join(ROOT, 'src/data/prices/br.json');
const US_PATH = path.join(ROOT, 'src/data/prices/us.json');

function parseCliArgs(argv) {
  const args = {
    region: 'ALL',
    input: null,
    maxDeviation: 0.4,
    write: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--region' && argv[i + 1]) {
      args.region = String(argv[++i]).toUpperCase();
    } else if (arg === '--input' && argv[i + 1]) {
      args.input = path.resolve(argv[++i]);
    } else if (arg === '--max-deviation' && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxDeviation = parsed;
      }
    } else if (arg === '--write') {
      args.write = true;
    } else if (arg === '--dry-run') {
      args.write = false;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evaluateOfferSanity(offer, referencePrice, maxDeviation) {
  const candidate =
    typeof offer.cashPrice === 'number' && offer.cashPrice > 0
      ? offer.cashPrice
      : offer.price;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return { accepted: false, reason: 'non_positive_price', deviation: 1 };
  }
  if (!offer.url || !/^https?:\/\/[^\s]+$/i.test(String(offer.url))) {
    return { accepted: false, reason: 'invalid_store_url', deviation: 1 };
  }
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    return { accepted: false, reason: 'missing_reference_price', deviation: 1 };
  }

  const deviation = Math.abs(candidate - referencePrice) / referencePrice;
  if (deviation > maxDeviation + 1e-9) {
    return {
      accepted: false,
      reason:
        candidate > referencePrice
          ? 'outlier_above_fair_value'
          : 'outlier_below_fair_value',
      deviation,
    };
  }
  return { accepted: true, deviation };
}

function validateRegionOffers(
  regionLabel,
  filePath,
  incomingOffers,
  maxDeviation,
  writeMode,
) {
  const existing = readJson(filePath);
  const referenceMap = new Map();
  for (const item of existing) {
    const baseline =
      typeof item.cashPrice === 'number' && item.cashPrice > 0
        ? item.cashPrice
        : item.price;
    referenceMap.set(item.componentId, baseline);
  }

  const offersToEvaluate = incomingOffers ?? existing;
  const accepted = [];
  const rejected = [];

  for (const offer of offersToEvaluate) {
    const ref = referenceMap.get(offer.componentId) ?? 0;
    const check = evaluateOfferSanity(offer, ref, maxDeviation);
    if (check.accepted) {
      accepted.push(offer);
    } else {
      rejected.push({
        componentId: offer.componentId,
        store: offer.store,
        reason: check.reason,
        deviationPct: Number((check.deviation * 100).toFixed(1)),
      });
    }
  }

  console.log(
    `[sync-store-feeds] ${regionLabel}: evaluated=${offersToEvaluate.length} accepted=${accepted.length} rejected=${rejected.length} (maxDeviation=±${Math.round(maxDeviation * 100)}%)`,
  );

  if (rejected.length > 0) {
    console.warn(
      `[sync-store-feeds] ${regionLabel} rejected anomalies:`,
      JSON.stringify(rejected),
    );
  }

  if (writeMode && incomingOffers && accepted.length > 0) {
    const acceptedMap = new Map(accepted.map((o) => [o.componentId, o]));
    const updated = existing.map((o) => acceptedMap.get(o.componentId) ?? o);
    fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(
      `[sync-store-feeds] ${regionLabel}: wrote ${accepted.length} validated updates to ${path.relative(ROOT, filePath)}`,
    );
  }

  return rejected.length === 0 || Boolean(incomingOffers);
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const incoming = args.input ? readJson(args.input) : null;

  let ok = true;
  if (args.region === 'ALL' || args.region === 'BR') {
    ok =
      validateRegionOffers(
        'BR',
        BR_PATH,
        incoming,
        args.maxDeviation,
        args.write,
      ) && ok;
  }
  if (args.region === 'ALL' || args.region === 'US') {
    ok =
      validateRegionOffers(
        'US',
        US_PATH,
        incoming,
        args.maxDeviation,
        args.write,
      ) && ok;
  }

  if (!ok) {
    console.error(
      '[sync-store-feeds] FAILED: Baseline store offers contain anomalies.',
    );
    process.exit(1);
  }

  execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts/validate-catalogs.cjs')],
    {
      stdio: 'inherit',
    },
  );
}

main();
