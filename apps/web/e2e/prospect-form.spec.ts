import { test, expect } from '@playwright/test';

test.describe('Prospect form', () => {
  test('Pipeline > Prospects > New Prospect shows expanded intake fields', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const prospectsTab = page.locator('button, [role="tab"]').filter({ hasText: /^Prospects$/i });
    if (await prospectsTab.count()) {
      await prospectsTab.first().click();
    }

    await page.getByRole('button', { name: /New Prospect/i }).first().click();

    await expect(page.getByLabel('Company Name')).toBeVisible();
    await expect(page.getByLabel('Industry')).toBeVisible();
    await expect(page.getByLabel('Type of Facility')).toBeVisible();
    await expect(page.getByLabel('Estimated Square Footage')).toBeVisible();
    await expect(page.getByLabel('Contact Name')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Role / Title')).toBeVisible();
    await expect(page.getByLabel('Best Time to Call')).toBeVisible();
    await expect(page.getByLabel('Preferred Contact Method')).toBeVisible();
    await expect(page.getByLabel('Estimated Monthly Value')).toBeVisible();
    await expect(page.getByLabel('Target Follow-up Date')).toBeVisible();
    await expect(page.getByLabel('Priority')).toBeVisible();
    await expect(page.getByLabel('Notes')).toBeVisible();
  });
});
