import { expect, test } from '@playwright/test';

test('a beginner gets a recommendation', async ({ page }) => {
  await page.goto('/');

  const choices = page.getByTestId('top-choice');
  await expect(choices).toHaveCount(3);
  const topPick = choices.first();
  await expect(topPick).toContainText(/#1 (Top Pick|Recomendação)/i);
  const initialPick = await topPick
    .getByRole('heading', { level: 4 })
    .textContent();

  // Switch use case to 4K & Ray Tracing Enthusiast (Step 2)
  await page
    .getByRole('button', { name: /(4K & Ray Tracing|4K Enthusiast)/i })
    .click();

  const enthusiastPick = await topPick
    .getByRole('heading', { level: 4 })
    .textContent();

  expect(enthusiastPick).not.toBe(initialPick);
  await expect(topPick).toContainText(/(R\$|\$)/);
});

test('a user explores complete PC builds in Mario Kart mode', async ({
  page,
}) => {
  await page.goto('/');

  await page
    .getByRole('button', { name: /4\. (Full Builds|Montar PC)/i })
    .click();
  const topBuild = page.getByTestId('top-build-card');
  await expect(topBuild).toBeVisible();
  await expect(topBuild).toContainText('Total Hardware Cost');

  const initialText = await topBuild.textContent();

  await page
    .getByRole('button', {
      name: /(R\$\s*12\.000|\$2,200) (Entusiasta|Enthusiast)/i,
    })
    .click();
  await expect(topBuild).not.toHaveText(initialText ?? '');
  await expect(topBuild).toContainText('Total Hardware Cost');
});
