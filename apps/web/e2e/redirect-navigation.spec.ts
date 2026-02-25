import { test, expect } from '@playwright/test';

const REDIRECT_CASES = [
  { from: '/', to: '/home' },
  { from: '/customers', to: '/clients' },
  { from: '/people', to: '/team' },
  { from: '/workforce', to: '/team' },
  { from: '/operations', to: '/jobs' },
  { from: '/subcontractors', to: '/clients' },
  { from: '/admin/services', to: '/settings' },
  { from: '/services', to: '/settings' },
  { from: '/financial', to: '/reports' },
  { from: '/money', to: '/reports' },
  { from: '/financial-intelligence', to: '/reports' },
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
    expect(root.pathname).toBe('/home');
    expect(root.searchParams.get('src')).toBe('test');

    await page.goto('/operations?tab=tickets');
    const u1 = new URL(page.url());
    expect(u1.pathname).toBe('/jobs');
    expect(u1.searchParams.get('tab')).toBe('tickets');

    await page.goto('/people?tab=staff');
    const u2 = new URL(page.url());
    expect(u2.pathname).toBe('/team');
    expect(u2.searchParams.get('tab')).toBe('staff');

    await page.goto('/subcontractors?src=legacy');
    const u3 = new URL(page.url());
    expect(u3.pathname).toBe('/clients');
    expect(u3.searchParams.get('src')).toBe('legacy');
    expect(u3.searchParams.get('tab')).toBe('partners');
  });
});
