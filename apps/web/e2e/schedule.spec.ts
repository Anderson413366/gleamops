import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Schedule — E2E scenario test matrix
//
// Tab labels from schedule-page.tsx: Employee Schedule, Work Schedule,
// Calendar, Planning Board, Forms, Checklists.
// Pattern matches p0-workflows.spec.ts: goto → heading → getByText.
// ---------------------------------------------------------------------------

test.describe('Schedule surfaces', () => {
  test('Schedule page renders heading and Employee Schedule tab', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Schedule').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Employee Schedule').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Work Schedule tab renders via URL param', async ({ page }) => {
    await page.goto('/schedule?tab=work-orders');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Work Schedule').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Calendar tab renders via URL param', async ({ page }) => {
    await page.goto('/schedule?tab=calendar');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Calendar').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Planning Board tab renders via URL param', async ({ page }) => {
    await page.goto('/schedule?tab=planning');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Planning Board').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Forms tab renders via URL param', async ({ page }) => {
    await page.goto('/schedule?tab=forms');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Forms').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Checklists tab renders via URL param', async ({ page }) => {
    await page.goto('/schedule?tab=checklists');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Checklists').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Tab switching does not crash page', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await expect(page.getByText('Schedule').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
