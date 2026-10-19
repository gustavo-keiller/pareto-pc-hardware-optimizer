/**
 * snap.mjs — screenshots every UI mode at desktop and phone size, so agents look at
 * UI changes instead of assuming them. Output: snapshots/<mode>-<device>.png (gitignored).
 *
 * Usage: npm run snap            (starts its own Vite server)
 *        npm run snap -- simple  (only the listed modes)
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'snapshots');
const ALL_MODES = ['simple', 'explorer', 'pro'];
const VIEWPORTS = {
  desktop: { viewport: { width: 1400, height: 900 } },
  phone: devices['Pixel 7'],
};

const requested = process.argv.slice(2);
const modes =
  requested.length > 0
    ? ALL_MODES.filter((m) => requested.includes(m))
    : ALL_MODES;
if (modes.length === 0) {
  console.error(
    `[snap] No known modes in: ${requested.join(', ')}. Use: ${ALL_MODES.join(', ')}`,
  );
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
const server = await createServer({
  root: ROOT,
  server: { port: 0 },
  logLevel: 'error',
});
await server.listen();
const url = server.resolvedUrls?.local[0];
const browser = await chromium.launch();

try {
  for (const [device, options] of Object.entries(VIEWPORTS)) {
    for (const mode of modes) {
      const context = await browser.newContext(options);
      // The app restores its mode from localStorage (useOptimizerState).
      await context.addInitScript(
        (m) => localStorage.setItem('paretopc_ui_mode', m),
        mode,
      );
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800); // let ECharts finish its entry animation
      const file = path.join(OUT_DIR, `${mode}-${device}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(
        `[snap] ${path.relative(ROOT, file)}${errors.length ? `  (page errors: ${errors.join(' | ')})` : ''}`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
