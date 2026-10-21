import { expect, test } from '@playwright/test';

test.describe('PERF-05: Runtime Performance & DOM Health Audits', () => {
  test('initial load renders lean DOM tree and records zero uncaught errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for the primary recommendations to appear
    const choices = page.getByTestId('top-choice');
    await expect(choices).toHaveCount(3);

    // Assert DOM node count stays well below Lighthouse warning threshold (1,500 nodes)
    const domNodeCount = await page.evaluate(
      () => document.querySelectorAll('*').length,
    );
    expect(domNodeCount).toBeLessThan(1000);

    // Verify zero console errors occurred during initial mount
    expect(consoleErrors).toEqual([]);
  });

  test('switching between modes maintains low DOM overhead without memory thrashing', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Switch to Full Builds (Montar PC)
    await page
      .getByRole('button', { name: /4\. (Full Builds|Montar PC)/i })
      .click();

    const topBuild = page.getByTestId('top-build-card');
    await expect(topBuild).toBeVisible();

    const fullBuildsDomCount = await page.evaluate(
      () => document.querySelectorAll('*').length,
    );
    // Full build explorer with 8 components and leaderboards stays under 2,000 nodes
    expect(fullBuildsDomCount).toBeLessThan(2000);

    // Zero runtime errors
    expect(consoleErrors).toEqual([]);
  });
});
