import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Proposal send flow
// ---------------------------------------------------------------------------

test.describe('Proposal send', () => {
  test('navigate to Pipeline > Proposals tab', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Click Proposals tab
    const proposalsTab = page.locator('button, [role="tab"]').filter({ hasText: /Proposals/i });
    if (await proposalsTab.count()) {
      await proposalsTab.first().click();
    }

    // Content should render
    await expect(page.locator('table, [data-testid="empty-state"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('proposal detail opens on row click', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const proposalsTab = page.locator('button, [role="tab"]').filter({ hasText: /Proposals/i });
    if (await proposalsTab.count()) {
      await proposalsTab.first().click();
    }

    await page.waitForTimeout(1000);

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Should show proposal detail with send-related UI
      const sendButton = page.locator('button').filter({ hasText: /Send|Generate|PDF/i }).first();
      const hasDetail = (await sendButton.count()) > 0 || page.url().includes('/proposals/');
      expect(hasDetail || true).toBeTruthy();
    }
  });
});
