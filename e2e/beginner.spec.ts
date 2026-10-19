import { expect, test } from '@playwright/test';

test('a beginner gets a recommendation', async ({ page }) => {
  await page.goto('/');

  const choices = page.getByTestId('top-choice');
  await expect(choices).toHaveCount(3);
  const topPick = choices.first();
  await expect(topPick).toContainText('#1 Top Pick');
  const before = await topPick.getByRole('heading', { level: 4 }).textContent();

  await page.getByRole('button', { name: '≤ $350' }).click();

  await expect(topPick.getByRole('heading', { level: 4 })).not.toHaveText(
    before ?? '',
  );
  await expect(topPick).toContainText('$');
});

test('a user explores complete PC builds in Mario Kart mode', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: /4\. Full Builds/ }).click();
  const topBuild = page.getByTestId('top-build-card');
  await expect(topBuild).toBeVisible();
  await expect(topBuild).toContainText('Total Hardware Cost');

  const initialText = await topBuild.textContent();

  await page.getByRole('button', { name: '$2,200 Enthusiast' }).click();
  await expect(topBuild).not.toHaveText(initialText ?? '');
  await expect(topBuild).toContainText('Total Hardware Cost');
});
