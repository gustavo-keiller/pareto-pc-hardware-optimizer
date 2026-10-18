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
