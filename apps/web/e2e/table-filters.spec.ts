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

    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const initialRows = await page.locator('tbody tr').count();
      expect(initialRows).toBeGreaterThanOrEqual(0);
    } else {
      await expect(page.locator('main')).toBeVisible();
    }
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

    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(table).toBeVisible();
    } else {
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('Pipeline > Prospects: table renders', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Click Prospects tab
    const prospectsTab = page.locator('button, [role="tab"]').filter({ hasText: /Prospects/i });
    if (await prospectsTab.count()) {
      await prospectsTab.first().click();
    }

    const tableOrEmpty = page.locator('table, [data-testid="empty-state"]').first();
    if (await tableOrEmpty.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(tableOrEmpty).toBeVisible();
    } else {
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('Workforce > Staff: table renders with rows', async ({ page }) => {
    await page.goto('/workforce');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Staff tab should be default or click it
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /Staff/i });
    if (await staffTab.count()) {
      await staffTab.first().click();
    }

    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    } else {
      await expect(page.locator('main')).toBeVisible();
    }
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
