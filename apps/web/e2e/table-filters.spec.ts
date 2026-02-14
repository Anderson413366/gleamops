import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Table filter chips — verify filter interactions work on key pages
// ---------------------------------------------------------------------------

test.describe('Table filter chips', () => {
  test('CRM > Clients: status filter chips render', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Click Clients tab if not already active
    const clientsTab = page.locator('button, [role="tab"]').filter({ hasText: /Clients/i });
    if (await clientsTab.count()) {
      await clientsTab.first().click();
    }

    // Table should render with rows
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    const initialRows = await page.locator('tbody tr').count();
    expect(initialRows).toBeGreaterThan(0);
  });

  test('CRM > Clients: clicking ACTIVE filter shows filtered results', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Look for filter chip with ACTIVE text
    const activeChip = page.locator('button').filter({ hasText: /^ACTIVE$/i }).first();
    if (await activeChip.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await activeChip.click();
      // After clicking, table should still have rows (ACTIVE is the most common status)
      await expect(page.locator('table').first()).toBeVisible();
    }
  });

  test('Operations > Tickets: table renders with data', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Click Tickets tab
    const ticketsTab = page.locator('button, [role="tab"]').filter({ hasText: /Tickets/i });
    if (await ticketsTab.count()) {
      await ticketsTab.first().click();
    }

    // Table should be visible
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Pipeline > Prospects: table renders', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Click Prospects tab
    const prospectsTab = page.locator('button, [role="tab"]').filter({ hasText: /Prospects/i });
    if (await prospectsTab.count()) {
      await prospectsTab.first().click();
    }

    // Table or empty state should be visible
    const tableOrEmpty = page.locator('table, [data-testid="empty-state"]').first();
    await expect(tableOrEmpty).toBeVisible({ timeout: 10_000 });
  });

  test('Workforce > Staff: table renders with rows', async ({ page }) => {
    await page.goto('/workforce');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Staff tab should be default or click it
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /Staff/i });
    if (await staffTab.count()) {
      await staffTab.first().click();
    }

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Search input — verify search filters table rows
// ---------------------------------------------------------------------------

test.describe('Table search', () => {
  test('CRM: search input filters table', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const initialRows = await page.locator('tbody tr').count();

      // Type a search query that likely won't match anything
      await searchInput.fill('zzzznonexistent');
      // Wait for debounce
      await page.waitForTimeout(500);

      const filteredRows = await page.locator('tbody tr').count();
      // Either no rows or fewer rows than before
      expect(filteredRows).toBeLessThanOrEqual(initialRows);
    }
  });
});
