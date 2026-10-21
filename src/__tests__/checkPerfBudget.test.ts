import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { describe, expect, it } from 'vitest';

describe('PERF-05: Performance Budget & Bundle Size Guardrails', () => {
  const distDir = path.resolve(__dirname, '../../dist');
  const assetsDir = path.join(distDir, 'assets');

  it('guarantees production build exists with assets', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);
  });

  it('guarantees critical initial path (HTML + CSS + JS) is under 160 KB gzipped', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const htmlFile = path.join(distDir, 'index.html');
    const indexJsFile = assetFiles.find((f) => /^index-.*\.js$/.test(f));
    const indexCssFile = assetFiles.find((f) => /^index-.*\.css$/.test(f));

    expect(indexJsFile).toBeDefined();
    expect(indexCssFile).toBeDefined();

    const htmlGzip = zlib.gzipSync(fs.readFileSync(htmlFile)).length / 1024;
    const cssGzip =
      zlib.gzipSync(fs.readFileSync(path.join(assetsDir, indexCssFile!)))
        .length / 1024;
    const jsGzip =
      zlib.gzipSync(fs.readFileSync(path.join(assetsDir, indexJsFile!)))
        .length / 1024;

    const totalCriticalGzip = htmlGzip + cssGzip + jsGzip;

    // Floor assertion: must be under 160 KB gzipped for instant mobile 4G first paint
    expect(totalCriticalGzip).toBeLessThanOrEqual(160.0);
    // JS alone must stay under 140 KB gzipped
    expect(jsGzip).toBeLessThanOrEqual(140.0);
    // CSS alone must stay under 20 KB gzipped
    expect(cssGzip).toBeLessThanOrEqual(20.0);
  });

  it('guarantees dedicated builder Web Worker chunk stays under 10 KB gzipped', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const workerFile = assetFiles.find((f) => /^builderWorker-.*\.js$/.test(f));

    expect(workerFile).toBeDefined();
    const workerGzip =
      zlib.gzipSync(fs.readFileSync(path.join(assetsDir, workerFile!))).length /
      1024;

    expect(workerGzip).toBeLessThanOrEqual(10.0);
  });

  it('guarantees tree-shaken ECharts vendor chunk stays under 250 KB gzipped', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const echartsFile = assetFiles.find((f) =>
      /^EChartsRenderer-.*\.js$/.test(f),
    );

    expect(echartsFile).toBeDefined();
    const echartsGzip =
      zlib.gzipSync(fs.readFileSync(path.join(assetsDir, echartsFile!)))
        .length / 1024;

    expect(echartsGzip).toBeLessThanOrEqual(250.0);
  });

  it('guarantees no single lazy feature chunk exceeds 30 KB gzipped', () => {
    const assetFiles = fs.readdirSync(assetsDir);
    const lazyFiles = assetFiles.filter(
      (f) =>
        f.endsWith('.js') &&
        !/^index-.*\.js$/.test(f) &&
        !/^builderWorker-.*\.js$/.test(f) &&
        !/^EChartsRenderer-.*\.js$/.test(f),
    );

    for (const file of lazyFiles) {
      const gzipKb =
        zlib.gzipSync(fs.readFileSync(path.join(assetsDir, file))).length /
        1024;
      expect(
        gzipKb,
        `Lazy chunk ${file} exceeded 30 KB gzipped (${gzipKb.toFixed(1)} KB)`,
      ).toBeLessThanOrEqual(30.0);
    }
  });
});
