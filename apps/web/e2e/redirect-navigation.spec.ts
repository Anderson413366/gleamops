import { test, expect } from '@playwright/test';

const REDIRECT_CASES = [
  { from: '/customers', to: '/crm' },
  { from: '/team', to: '/workforce' },
  { from: '/people', to: '/workforce' },
  { from: '/schedule', to: '/operations' },
  { from: '/subcontractors', to: '/vendors' },
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

  test('redirects preserve query strings', async ({ page }) => {
    await page.goto('/schedule?tab=tickets');
    const u1 = new URL(page.url());
    expect(u1.pathname).toBe('/operations');
    expect(u1.searchParams.get('tab')).toBe('tickets');

    await page.goto('/people?tab=staff');
    const u2 = new URL(page.url());
    expect(u2.pathname).toBe('/workforce');
    expect(u2.searchParams.get('tab')).toBe('staff');
  });
});
