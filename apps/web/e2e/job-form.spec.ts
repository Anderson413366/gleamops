import { test, expect } from '@playwright/test';

test.describe('Job form wizard', () => {
  test('Operations > Service Plans > New Job opens 3-step wizard', async ({ page }) => {
    await page.goto('/operations');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const jobsTab = page.locator('button, [role="tab"]').filter({ hasText: /Service Plans/i });
    if (await jobsTab.count()) {
      await jobsTab.first().click();
    }

    await page.getByRole('button', { name: /New (Job|Service Plan)/i }).first().click();

    await expect(page.getByRole('heading', { name: /^New (Job|Service Plan)$/i, level: 2 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Step 1: Assignment/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 2: Schedule & Billing/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 3: Tasks & Details/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Step 1 — Assignment/i })).toBeVisible();

    await expect(page.getByLabel('Client*')).toBeVisible();
    await expect(page.getByLabel('Site*')).toBeVisible();
    await expect(page.getByLabel('Job Name*')).toBeVisible();
    await expect(page.getByLabel('Job Type')).toBeVisible();
    await expect(page.getByLabel('Priority')).toBeVisible();
    await expect(page.getByLabel('Assigned Team / Supervisor')).toBeVisible();
  });
});
