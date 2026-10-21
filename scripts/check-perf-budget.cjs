#!/usr/bin/env node
/**
 * scripts/check-perf-budget.cjs
 * Performance Budget Enforcement Engine (PERF-05)
 *
 * Validates bundle sizes, critical download payloads, and lazy chunk boundaries
 * against strict performance budgets to guarantee instant loads on mobile and slow 4G.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const DIST_DIR = path.resolve(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// Performance budget definitions in kilobytes (KB)
const BUDGETS = {
  criticalTotalGzipKb: 160.0,
  criticalTotalRawKb: 600.0,
  indexHtmlGzipKb: 2.0,
  indexCssGzipKb: 20.0,
  indexJsGzipKb: 140.0,
  workerRawKb: 30.0,
  workerGzipKb: 10.0,
  echartsRawKb: 750.0,
  echartsGzipKb: 250.0,
  maxLazyChunkGzipKb: 30.0,
  maxLazyChunkRawKb: 100.0,
};

function ensureBuild() {
  if (!fs.existsSync(DIST_DIR) || !fs.existsSync(ASSETS_DIR)) {
    console.log(
      '[check:perf] dist/assets missing. Running production build...',
    );
    execSync('npm run build', { stdio: 'inherit' });
  }
}

function getFileSize(filePath) {
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;
  return {
    rawKb: rawBytes / 1024,
    gzipKb: gzipBytes / 1024,
  };
}

function runPerfBudgetCheck() {
  ensureBuild();

  const assetFiles = fs.readdirSync(ASSETS_DIR);
  const htmlFile = path.join(DIST_DIR, 'index.html');

  if (!fs.existsSync(htmlFile)) {
    console.error('[check:perf] FAIL: dist/index.html not found.');
    process.exit(1);
  }

  const htmlSize = getFileSize(htmlFile);

  const indexJsFile = assetFiles.find((f) => /^index-.*\.js$/.test(f));
  const indexCssFile = assetFiles.find((f) => /^index-.*\.css$/.test(f));
  const workerFile = assetFiles.find((f) => /^builderWorker-.*\.js$/.test(f));
  const echartsFile = assetFiles.find((f) =>
    /^EChartsRenderer-.*\.js$/.test(f),
  );

  if (!indexJsFile || !indexCssFile) {
    console.error(
      '[check:perf] FAIL: Critical index JS or CSS not found in dist/assets.',
    );
    process.exit(1);
  }

  const indexJsSize = getFileSize(path.join(ASSETS_DIR, indexJsFile));
  const indexCssSize = getFileSize(path.join(ASSETS_DIR, indexCssFile));
  const workerSize = workerFile
    ? getFileSize(path.join(ASSETS_DIR, workerFile))
    : { rawKb: 0, gzipKb: 0 };
  const echartsSize = echartsFile
    ? getFileSize(path.join(ASSETS_DIR, echartsFile))
    : { rawKb: 0, gzipKb: 0 };

  const criticalRawKb = htmlSize.rawKb + indexCssSize.rawKb + indexJsSize.rawKb;
  const criticalGzipKb =
    htmlSize.gzipKb + indexCssSize.gzipKb + indexJsSize.gzipKb;

  const checks = [];
  let allPassed = true;

  function registerCheck(name, actualRaw, actualGzip, maxGzip, maxRaw) {
    const gzipOk = actualGzip <= maxGzip;
    const rawOk = maxRaw === undefined || actualRaw <= maxRaw;
    const passed = gzipOk && rawOk;
    if (!passed) allPassed = false;

    checks.push({
      name,
      rawKb: actualRaw.toFixed(1) + ' KB',
      gzipKb: actualGzip.toFixed(1) + ' KB',
      limit: '<= ' + maxGzip.toFixed(1) + ' KB (gz)',
      status: passed ? 'PASS' : 'FAIL',
    });
  }

  // 1. Critical initial bundle check
  registerCheck(
    'Critical Initial Total (HTML+CSS+JS)',
    criticalRawKb,
    criticalGzipKb,
    BUDGETS.criticalTotalGzipKb,
    BUDGETS.criticalTotalRawKb,
  );
  registerCheck(
    '  - index.html',
    htmlSize.rawKb,
    htmlSize.gzipKb,
    BUDGETS.indexHtmlGzipKb,
  );
  registerCheck(
    `  - ${indexCssFile}`,
    indexCssSize.rawKb,
    indexCssSize.gzipKb,
    BUDGETS.indexCssGzipKb,
  );
  registerCheck(
    `  - ${indexJsFile}`,
    indexJsSize.rawKb,
    indexJsSize.gzipKb,
    BUDGETS.indexJsGzipKb,
  );

  // 2. Web Worker chunk
  if (workerFile) {
    registerCheck(
      `Worker (${workerFile})`,
      workerSize.rawKb,
      workerSize.gzipKb,
      BUDGETS.workerGzipKb,
      BUDGETS.workerRawKb,
    );
  }

  // 3. ECharts vendor chunk
  if (echartsFile) {
    registerCheck(
      `ECharts (${echartsFile})`,
      echartsSize.rawKb,
      echartsSize.gzipKb,
      BUDGETS.echartsGzipKb,
      BUDGETS.echartsRawKb,
    );
  }

  // 4. Feature lazy chunks
  const lazyFeatureFiles = assetFiles.filter(
    (f) =>
      f.endsWith('.js') &&
      f !== indexJsFile &&
      f !== workerFile &&
      f !== echartsFile,
  );

  for (const lazyFile of lazyFeatureFiles) {
    const size = getFileSize(path.join(ASSETS_DIR, lazyFile));
    registerCheck(
      `Lazy: ${lazyFile}`,
      size.rawKb,
      size.gzipKb,
      BUDGETS.maxLazyChunkGzipKb,
      BUDGETS.maxLazyChunkRawKb,
    );
  }

  // Print results table
  console.log(
    '\n================ ParetoPC Performance Budgets (PERF-05) ================',
  );
  console.log(
    'Asset / Target'.padEnd(46) +
      'Raw'.padStart(10) +
      'Gzip'.padStart(12) +
      'Budget'.padStart(20) +
      'Status'.padStart(9),
  );
  console.log('-'.repeat(97));

  for (const c of checks) {
    const isSub = c.name.startsWith('  -');
    const label = isSub ? c.name : c.name.startsWith('Lazy') ? c.name : c.name;
    console.log(
      label.padEnd(46) +
        c.rawKb.padStart(10) +
        c.gzipKb.padStart(12) +
        c.limit.padStart(20) +
        (' ' + c.status).padStart(9),
    );
  }
  console.log('='.repeat(97));

  if (!allPassed) {
    console.error(
      '\n[check:perf] FAILED: One or more assets exceeded their performance budget.',
    );
    process.exit(1);
  }

  console.log(
    '\n[check:perf] OK — All bundle sizes and critical path assets are within budget.\n',
  );
}

runPerfBudgetCheck();
