import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Sidebar navigation — each nav item loads the correct page
// ---------------------------------------------------------------------------

const SIDEBAR_ROUTES = [
  { label: 'Command Center', href: '/command' },
  { label: 'Sales', href: '/sales' },
  { label: 'Customers', href: '/customers' },
  { label: 'Work', href: '/work' },
  { label: 'People', href: '/people' },
  { label: 'Supplies', href: '/supplies' },
  { label: 'Safety & Compliance', href: '/safety' },
  { label: 'Insights', href: '/insights' },
  { label: 'Platform', href: '/platform' },
];

test.describe('Sidebar navigation', () => {
  for (const { label, href } of SIDEBAR_ROUTES) {
    test(`navigates to ${label} (${href})`, async ({ page }) => {
      await page.goto('/command', { waitUntil: 'domcontentloaded' });

      // Click sidebar link (desktop nav). Use role-based lookup within the visible
      // sidebar to avoid stale element handles during hydration/layout transitions.
      const sidebar = page.locator('aside:visible');
      await expect(sidebar).toBeVisible({ timeout: 10_000 });

      const link = sidebar.getByRole('link', { name: label, exact: true });
      await expect(link).toBeVisible({ timeout: 10_000 });
      await link.click();

      await expect(page).toHaveURL(new RegExp(`${href}(\\?|$)`));
      // Page should render a heading (all module pages have h1/h2)
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ---------------------------------------------------------------------------
// Tab navigation — clicking tabs within a module stays on the same route
// ---------------------------------------------------------------------------

test.describe('Tab navigation (no route change)', () => {
  test('Customers tab selection remains stable after click (no flicker bounce)', async ({ page }) => {
    const clickTabUntilUrl = async (label: 'Sites' | 'Clients', urlPattern: RegExp) => {
      const tabButton = page.getByRole('tab', { name: label, exact: true }).first();
      await expect(tabButton).toBeVisible({ timeout: 10_000 });
      for (let attempt = 0; attempt < 10; attempt++) {
        await tabButton.click({ force: true });
        await page.waitForTimeout(120);
        if (urlPattern.test(page.url())) return;
      }
      await expect(page).toHaveURL(urlPattern);
    };

    await page.goto('/customers?tab=clients');
    await expect(page.getByPlaceholder('Search clients...')).toBeVisible({ timeout: 10_000 });

    await clickTabUntilUrl('Sites', /\/customers\?tab=sites/);
    await expect(page.getByPlaceholder('Search sites...')).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/\/customers\?tab=sites/);
    await expect(page.getByPlaceholder('Search sites...')).toBeVisible({ timeout: 10_000 });

    await clickTabUntilUrl('Clients', /\/customers\?tab=clients/);
    await expect(page.getByPlaceholder('Search clients...')).toBeVisible({ timeout: 10_000 });
  });

  test('Customers tabs stay on /customers', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        // URL should still be /customers (not navigated away)
        await expect(page).toHaveURL(/\/customers/);
      }
    }
  });

  test('Work tabs stay on /work', async ({ page }) => {
    await page.goto('/work');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/work/);
      }
    }
  });

  test('People tabs stay on /people', async ({ page }) => {
    await page.goto('/people');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/people/);
      }
    }
  });

  test('Supplies tabs stay on /supplies', async ({ page }) => {
    await page.goto('/supplies');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/supplies/);
      }
    }
  });

  test('Platform tabs stay on /platform', async ({ page }) => {
    await page.goto('/platform');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/platform/);
      }
    }
  });

  test('Safety tabs stay on /safety', async ({ page }) => {
    await page.goto('/safety');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/safety/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Direct tab URL sync — opening module routes with ?tab= should render
// matching tab content (including legacy alias values).
// ---------------------------------------------------------------------------

test.describe('Direct tab URL sync', () => {
  const CASES = [
    { url: '/supplies?tab=vehicles', expectedSearchPlaceholder: 'Search vehicles...', canonicalTab: 'vehicles' },
    { url: '/supplies?tab=keys', expectedSearchPlaceholder: 'Search keys...', canonicalTab: 'keys' },
    { url: '/supplies?tab=maintenance', expectedSearchPlaceholder: 'Search maintenance...', canonicalTab: 'maintenance' },
    { url: '/customers?tab=sites', expectedSearchPlaceholder: 'Search sites...', canonicalTab: 'sites' },
    { url: '/customers?tab=contacts', expectedSearchPlaceholder: 'Search contacts...', canonicalTab: 'contacts' },
    { url: '/people?tab=positions', expectedSearchPlaceholder: 'Search positions...', canonicalTab: 'positions' },
    { url: '/people?tab=timekeeping', expectedSearchPlaceholder: 'Search timekeeping...', canonicalTab: 'timekeeping' },
    { url: '/work?tab=inspections', expectedSearchPlaceholder: 'Search inspections...', canonicalTab: 'inspections' },
    { url: '/work?tab=templates', expectedSearchPlaceholder: 'Search templates...', canonicalTab: 'templates' },
    { url: '/supplies?tab=job-details', expectedSearchPlaceholder: 'Search jobs...', canonicalTab: 'jobs' },
    { url: '/supplies?tab=supply-vendors', expectedSearchPlaceholder: 'Search vendors...', canonicalTab: 'vendors' },
    { url: '/safety?tab=training-courses', expectedSearchPlaceholder: 'Search courses...', canonicalTab: 'courses' },
  ] as const;

  for (const c of CASES) {
    test(`loads correct tab for ${c.url}`, async ({ page }) => {
      await page.goto(c.url);

      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByPlaceholder(c.expectedSearchPlaceholder)).toBeVisible({ timeout: 10_000 });

      await expect(page).toHaveURL(new RegExp(`[?&]tab=${c.canonicalTab}(&|$)`));
    });
  }
});

// ---------------------------------------------------------------------------
// Route transitions — navigating between modules works correctly
// ---------------------------------------------------------------------------

test.describe('Route transitions', () => {
  const gotoWithRetry = async (page: import('@playwright/test').Page, url: string) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        return;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(250);
      }
    }
    throw lastError;
  };

  test('Command Center -> Customers -> Work -> back to Command Center', async ({ page }) => {
    await gotoWithRetry(page, '/command');
    await expect(page).toHaveURL(/\/command/);

    await gotoWithRetry(page, '/customers');
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await gotoWithRetry(page, '/work');
    await expect(page).toHaveURL(/\/work/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await gotoWithRetry(page, '/command');
    await expect(page).toHaveURL(/\/command/);
  });

  test('Sales -> Supplies -> Settings', async ({ page }) => {
    await gotoWithRetry(page, '/sales');
    await expect(page).toHaveURL(/\/sales/);

    await gotoWithRetry(page, '/supplies');
    await expect(page).toHaveURL(/\/supplies/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Settings is accessed differently (may be in profile dropdown)
    await gotoWithRetry(page, '/settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('browser back button preserves state', async ({ page }) => {
    await gotoWithRetry(page, '/command');
    await expect(page).toHaveURL(/\/command/);

    await gotoWithRetry(page, '/customers');
    await expect(page).toHaveURL(/\/customers/);

    await page.goBack();
    await expect(page).toHaveURL(/\/command/);
  });
});
