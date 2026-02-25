import { test, expect } from '@playwright/test';

test.describe('Job form wizard', () => {
  test('Jobs quick-create opens 3-step service plan wizard', async ({ page }) => {
    await page.goto('/jobs?tab=tickets&action=create-job');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

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
