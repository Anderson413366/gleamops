import { test, expect } from '@playwright/test';

test.describe('Financial Intelligence (feature-flagged)', () => {
  test('page renders in disabled state when flag is off', async ({ page }) => {
    await page.goto('/financial-intelligence', { waitUntil: 'domcontentloaded' });

    // If the feature flag is disabled in the test env (default), we should
    // still render a clear explanation and not crash.
    await expect(page.getByRole('heading', { name: 'Financial Intelligence' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('feature-flagged', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1', { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});

