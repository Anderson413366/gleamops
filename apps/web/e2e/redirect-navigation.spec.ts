import { test, expect } from '@playwright/test';

const REDIRECT_CASES = [
  { from: '/', to: '/command' },
  { from: '/home', to: '/command' },
  { from: '/crm', to: '/customers' },
  { from: '/pipeline', to: '/sales' },
  { from: '/operations', to: '/work' },
  { from: '/workforce', to: '/people' },
  { from: '/inventory', to: '/supplies' },
  { from: '/assets', to: '/supplies' },
  { from: '/vendors', to: '/supplies' },
  { from: '/reports', to: '/insights' },
  { from: '/admin', to: '/platform' },
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
    await page.goto('/?src=test');
    const root = new URL(page.url());
    expect(root.pathname).toBe('/command');
    expect(root.searchParams.get('src')).toBe('test');

    await page.goto('/crm?tab=clients');
    const u1 = new URL(page.url());
    expect(u1.pathname).toBe('/customers');
    expect(u1.searchParams.get('tab')).toBe('clients');

    await page.goto('/workforce?tab=staff');
    const u2 = new URL(page.url());
    expect(u2.pathname).toBe('/people');
    expect(u2.searchParams.get('tab')).toBe('staff');
  });
});
