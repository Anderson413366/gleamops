import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Sidebar navigation — each nav item loads the correct page
// ---------------------------------------------------------------------------

const SIDEBAR_ROUTES = [
  { label: 'Home', href: '/home' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'CRM', href: '/crm' },
  { label: 'Operations', href: '/operations' },
  { label: 'Workforce', href: '/workforce' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'Assets', href: '/assets' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'Safety & Compliance', href: '/safety' },
  { label: 'Reports', href: '/reports' },
  { label: 'Admin', href: '/admin' },
];

test.describe('Sidebar navigation', () => {
  for (const { label, href } of SIDEBAR_ROUTES) {
    test(`navigates to ${label} (${href})`, async ({ page }) => {
      await page.goto('/home', { waitUntil: 'domcontentloaded' });

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
  test('CRM tabs stay on /crm', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        // URL should still be /crm (not navigated away)
        await expect(page).toHaveURL(/\/crm/);
      }
    }
  });

  test('Operations tabs stay on /operations', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/operations/);
      }
    }
  });

  test('Workforce tabs stay on /workforce', async ({ page }) => {
    await page.goto('/workforce');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/workforce/);
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

  test('Assets tabs stay on /assets', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/assets/);
      }
    }
  });

  test('Admin tabs stay on /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tablist"] button, [data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await expect(page).toHaveURL(/\/admin/);
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
    { url: '/assets?tab=vehicles', expectedSearchPlaceholder: 'Search vehicles...', canonicalTab: 'vehicles' },
    { url: '/assets?tab=keys', expectedSearchPlaceholder: 'Search keys...', canonicalTab: 'keys' },
    { url: '/assets?tab=maintenance', expectedSearchPlaceholder: 'Search maintenance...', canonicalTab: 'maintenance' },
    { url: '/crm?tab=sites', expectedSearchPlaceholder: 'Search sites...', canonicalTab: 'sites' },
    { url: '/crm?tab=contacts', expectedSearchPlaceholder: 'Search contacts...', canonicalTab: 'contacts' },
    { url: '/workforce?tab=positions', expectedSearchPlaceholder: 'Search positions...', canonicalTab: 'positions' },
    { url: '/workforce?tab=timekeeping', expectedSearchPlaceholder: 'Search timekeeping...', canonicalTab: 'timekeeping' },
    { url: '/operations?tab=inspections', expectedSearchPlaceholder: 'Search inspections...', canonicalTab: 'inspections' },
    { url: '/operations?tab=templates', expectedSearchPlaceholder: 'Search templates...', canonicalTab: 'templates' },
    { url: '/vendors?tab=job-details', expectedSearchPlaceholder: 'Search jobs...', canonicalTab: 'jobs' },
    { url: '/vendors?tab=supply-vendors', expectedSearchPlaceholder: 'Search vendors...', canonicalTab: 'vendors' },
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
  test('Home → CRM → Operations → back to Home', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);

    await page.locator('nav a[href="/crm"]').first().click();
    await expect(page).toHaveURL(/\/crm/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('nav a[href="/operations"]').first().click();
    await expect(page).toHaveURL(/\/operations/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('nav a[href="/home"]').first().click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('Pipeline → Vendors → Settings', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveURL(/\/pipeline/);

    await page.locator('nav a[href="/vendors"]').first().click();
    await expect(page).toHaveURL(/\/vendors/);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Settings is accessed differently (may be in profile dropdown)
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('browser back button preserves state', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);

    await page.locator('nav a[href="/crm"]').first().click();
    await expect(page).toHaveURL(/\/crm/);

    await page.goBack();
    await expect(page).toHaveURL(/\/home/);
  });
});
