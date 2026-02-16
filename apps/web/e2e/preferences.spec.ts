import { test, expect } from '@playwright/test';

test.describe('UI preferences', () => {
  test('toggling preferences applies html classes and persists on reload', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    const html = page.locator('html');

    const dyslexiaBtn = page.getByRole('button', { name: /Dyslexia Font Assist/i });
    await expect(dyslexiaBtn).toBeVisible({ timeout: 10_000 });
    await dyslexiaBtn.click();
    await expect(html).toHaveClass(/dyslexia-font/);

    const reduceMotionBtn = page.getByRole('button', { name: /Reduce Motion/i });
    await expect(reduceMotionBtn).toBeVisible({ timeout: 10_000 });
    await reduceMotionBtn.click();
    await expect(html).toHaveClass(/reduce-motion/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(html).toHaveClass(/dyslexia-font/);
    await expect(html).toHaveClass(/reduce-motion/);
  });
});

