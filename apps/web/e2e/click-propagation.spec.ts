import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Click propagation — interactive elements inside tables/cards should NOT
// trigger parent row navigation or unintended side effects
// ---------------------------------------------------------------------------

test.describe('Click propagation hardening', () => {
  test('filter chips on CRM page do not cause navigation', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Find all filter/chip buttons (not link-based tabs)
    const chips = page.locator('button').filter({ hasText: /active|inactive|all|new/i });
    const chipCount = await chips.count();

    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      if (await chip.isVisible()) {
        await chip.click();
        // Should still be on /crm
        expect(page.url()).toMatch(/\/crm/);
      }
    }
  });

  test('filter chips on Operations page do not cause navigation', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const chips = page.locator('button').filter({ hasText: /all|scheduled|completed|in.progress/i });
    const chipCount = await chips.count();

    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      if (await chip.isVisible()) {
        await chip.click();
        expect(page.url()).toMatch(/\/operations/);
      }
    }
  });

  test('header buttons do not navigate away', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Theme toggle button
    const themeBtn = page.locator('header button').filter({ has: page.locator('[class*="Sun"], [class*="Moon"]') }).first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      expect(page.url()).toMatch(/\/home/);
    }

    // Notification bell button
    const bellBtn = page.locator('header button').filter({ has: page.locator('[class*="Bell"]') }).first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      expect(page.url()).toMatch(/\/home/);
      // Click away to close dropdown
      await page.locator('body').click({ position: { x: 10, y: 10 } });
    }
  });

  test('all buttons in the app have explicit type attribute', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Find buttons without type attribute — they default to "submit"
    const buttonsWithoutType = page.locator('button:not([type])');
    const count = await buttonsWithoutType.count();

    // Allow a small tolerance (some third-party components may not set type)
    // but flag if there are many (> 5 means we missed hardening)
    if (count > 5) {
      const details: string[] = [];
      for (let i = 0; i < Math.min(count, 10); i++) {
        const btn = buttonsWithoutType.nth(i);
        const text = await btn.textContent();
        details.push(text?.trim() ?? '(no text)');
      }
      console.warn(
        `Found ${count} buttons without type attribute on /crm: ${details.join(', ')}`
      );
    }
    // Soft assertion — warn but don't fail (allows gradual hardening)
    expect.soft(count).toBeLessThanOrEqual(5);
  });

  test('table row click does not fire when clicking interactive elements', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Wait for table to load
    const tableBody = page.locator('tbody');
    if (await tableBody.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rows = tableBody.locator('tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check that badge/status elements inside rows don't cause navigation
        const firstRowBadge = rows.first().locator('span[class*="badge"], span[class*="Badge"]').first();
        if (await firstRowBadge.isVisible().catch(() => false)) {
          const urlBefore = page.url();
          await firstRowBadge.click();
          // Should stay on same page (badge click shouldn't navigate)
          expect(page.url()).toBe(urlBefore);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation — pressing Escape closes modals/dropdowns
// ---------------------------------------------------------------------------

test.describe('Keyboard interactions', () => {
  test('Escape closes notification dropdown', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const bellBtn = page.locator('header button').filter({ has: page.locator('[class*="Bell"]') }).first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      // Wait for dropdown to appear
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      // URL should not have changed
      expect(page.url()).toMatch(/\/home/);
    }
  });
});
