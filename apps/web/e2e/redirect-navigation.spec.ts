import { test, expect } from '@playwright/test';

const REDIRECT_CASES = [
  { from: '/customers', to: '/crm' },
  { from: '/team', to: '/workforce' },
  { from: '/schedule', to: '/operations' },
  { from: '/admin/services', to: '/services' },
];

test.describe('Redirect navigation hygiene', () => {
  for (const { from, to } of REDIRECT_CASES) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}`));
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});
