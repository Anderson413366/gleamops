import { test, expect } from '@playwright/test';

test.describe('A11y navigation hardening', () => {
  test('keyboard users can skip to main content', async ({ page }) => {
    await page.goto('/home');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
