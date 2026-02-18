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

// ---------------------------------------------------------------------------
// Deep legacy routes must NOT redirect (exact-match protection)
// ---------------------------------------------------------------------------

test.describe('Deep legacy routes do NOT redirect', () => {
  const DEEP_LEGACY_CASES = [
    { path: '/crm/clients/CLI-1001', expectPrefix: '/crm/clients/' },
    { path: '/crm/sites/SIT-2050', expectPrefix: '/crm/sites/' },
    { path: '/operations/jobs/JOB-2026-A', expectPrefix: '/operations/jobs/' },
    { path: '/pipeline/prospects/PRO-0001', expectPrefix: '/pipeline/prospects/' },
    { path: '/workforce/staff/STF-1001', expectPrefix: '/workforce/staff/' },
  ];

  for (const { path, expectPrefix } of DEEP_LEGACY_CASES) {
    test(`${path} stays on legacy deep route`, async ({ page }) => {
      await page.goto(path);
      const url = new URL(page.url());
      expect(url.pathname).toContain(expectPrefix);
    });
  }
});

// ---------------------------------------------------------------------------
// Canonical deep-route bridges load (not 404)
// ---------------------------------------------------------------------------

test.describe('Canonical deep-route bridges resolve', () => {
  const BRIDGE_CASES = [
    { path: '/customers/clients', expectRedirectTo: '/customers' },
    { path: '/customers/sites', expectRedirectTo: '/customers' },
    { path: '/customers/contacts', expectRedirectTo: '/customers' },
    { path: '/people/staff', expectRedirectTo: '/people' },
    { path: '/people/timekeeping', expectRedirectTo: '/people' },
    { path: '/supplies/orders', expectRedirectTo: '/supplies' },
    { path: '/supplies/kits', expectRedirectTo: '/supplies' },
    { path: '/sales/prospects', expectRedirectTo: '/sales' },
    { path: '/sales/opportunities', expectRedirectTo: '/sales' },
    { path: '/work/tickets', expectRedirectTo: '/work' },
    { path: '/work/jobs', expectRedirectTo: '/work' },
  ];

  for (const { path, expectRedirectTo } of BRIDGE_CASES) {
    test(`${path} bridges to ${expectRedirectTo}`, async ({ page }) => {
      await page.goto(path);
      const url = new URL(page.url());
      expect(url.pathname).toBe(expectRedirectTo);
    });
  }
});

// ---------------------------------------------------------------------------
// Schedule vs Planning are distinct views
// ---------------------------------------------------------------------------

test.describe('Schedule and Planning are distinct', () => {
  test('/schedule and /planning show different default tabs', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page).toHaveURL(/\/schedule/);
    const scheduleUrl = new URL(page.url());

    await page.goto('/planning');
    await expect(page).toHaveURL(/\/planning/);
    const planningUrl = new URL(page.url());

    // They should be on different paths (not the same)
    expect(scheduleUrl.pathname).not.toBe(planningUrl.pathname);
  });
});
