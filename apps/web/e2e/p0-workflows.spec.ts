import { expect, test } from '@playwright/test';

test.describe('P0 workflow surfaces', () => {
  test('Workforce HR Lite tab renders PTO, goals, and docs sections', async ({ page }) => {
    await page.goto('/workforce?tab=hr-lite');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PTO Requests').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Employee Documents Vault').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Print PDF' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Inventory Warehouse tab renders approval and low-stock surfaces', async ({ page }) => {
    await page.goto('/inventory?tab=warehouse');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Low Stock Watch').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pending Approvals').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Print PDF' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Routes and Fleet tab renders fleet execution surfaces', async ({ page }) => {
    await page.goto('/operations?tab=routes');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fleet Snapshot').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('DVIR Needs Review').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Print PDF' }).first()).toBeVisible({ timeout: 10000 });
  });
});
