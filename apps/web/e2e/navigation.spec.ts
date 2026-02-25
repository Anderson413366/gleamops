import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Sidebar navigation — each nav item loads the correct page
// ---------------------------------------------------------------------------

const SIDEBAR_ROUTES = [
  { label: 'Home', href: '/home' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Clients', href: '/clients' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Team', href: '/team' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'Equipment', href: '/equipment' },
  { label: 'Safety', href: '/safety' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];

test.describe('Sidebar navigation', () => {
  for (const { label, href } of SIDEBAR_ROUTES) {
    test(`navigates to ${label} (${href})`, async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });

      // Click sidebar link (desktop nav). Use role-based lookup within the visible
      // sidebar to avoid stale element handles during hydration/layout transitions.
      const sidebar = page.locator('aside:visible');
      await expect(sidebar).toBeVisible({ timeout: 10_000 });

      const link = sidebar.locator(`a[href="${href}"]`).first();
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
  test('Clients tab selection remains stable after click (no flicker bounce)', async ({ page }) => {
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

    await page.goto('/clients?tab=clients');
    await expect(page.getByPlaceholder('Search clients...')).toBeVisible({ timeout: 10_000 });

    await clickTabUntilUrl('Sites', /\/clients\?tab=sites/);
    await expect(page.getByPlaceholder('Search sites...')).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/\/clients\?tab=sites/);
    await expect(page.getByPlaceholder('Search sites...')).toBeVisible({ timeout: 10_000 });

    await clickTabUntilUrl('Clients', /\/clients\?tab=clients/);
    await expect(page.getByPlaceholder('Search clients...')).toBeVisible({ timeout: 10_000 });
  });

  test('Clients tabs stay on /clients', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/clients/);
      }
    }
  });

  test('Schedule tabs stay on /schedule', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/schedule/);
      }
    }
  });

  test('Jobs tabs stay on /jobs', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/jobs/);
      }
    }
  });

  test('Team tabs stay on /team', async ({ page }) => {
    await page.goto('/team');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/team/);
      }
    }
  });

  test('Inventory tabs stay on /inventory', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/inventory/);
      }
    }
  });

  test('Equipment tabs stay on /equipment', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/equipment/);
      }
    }
  });

  test('Settings tabs stay on /settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/settings/);
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
    { url: '/equipment?tab=vehicles', expectedSearchPlaceholder: 'Search vehicles...', canonicalTab: 'vehicles' },
    { url: '/equipment?tab=keys', expectedSearchPlaceholder: 'Search keys...', canonicalTab: 'keys' },
    { url: '/equipment?tab=maintenance', expectedSearchPlaceholder: 'Search maintenance...', canonicalTab: 'maintenance' },
    { url: '/clients?tab=sites', expectedSearchPlaceholder: 'Search sites...', canonicalTab: 'sites' },
    { url: '/clients?tab=contacts', expectedSearchPlaceholder: 'Search contacts...', canonicalTab: 'contacts' },
    { url: '/team?tab=positions', expectedSearchPlaceholder: 'Search positions...', canonicalTab: 'positions' },
    { url: '/team?tab=timesheets', expectedSearchPlaceholder: 'Search timesheets...', canonicalTab: 'timesheets' },
    { url: '/jobs?tab=inspections', expectedSearchPlaceholder: 'Search inspections...', canonicalTab: 'inspections' },
    { url: '/schedule?tab=plan', expectedSearchPlaceholder: 'Search planning tickets, roles, and sites...', canonicalTab: 'plan' },
    { url: '/clients?tab=partners', expectedSearchPlaceholder: 'Search partners...', canonicalTab: 'partners' },
    { url: '/safety?tab=training-courses', expectedSearchPlaceholder: 'Search training...', canonicalTab: 'training' },
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

  test('Home → Schedule → Jobs → back to Home', async ({ page }) => {
    await gotoWithRetry(page, '/home');
    await expect(page).toHaveURL(/\/home/);

    await gotoWithRetry(page, '/schedule');
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await gotoWithRetry(page, '/jobs');
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await gotoWithRetry(page, '/home');
    await expect(page).toHaveURL(/\/home/);
  });

  test('Pipeline → Clients → Settings', async ({ page }) => {
    await gotoWithRetry(page, '/pipeline');
    await expect(page).toHaveURL(/\/pipeline/);

    await gotoWithRetry(page, '/clients');
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await gotoWithRetry(page, '/settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('browser back button preserves state', async ({ page }) => {
    await gotoWithRetry(page, '/home');
    await expect(page).toHaveURL(/\/home/);

    await gotoWithRetry(page, '/clients');
    await expect(page).toHaveURL(/\/clients/);

    await page.goBack();
    await expect(page).toHaveURL(/\/home/);
  });
});
