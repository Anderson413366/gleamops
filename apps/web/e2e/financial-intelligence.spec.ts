import { test, expect } from '@playwright/test';

test.describe('Financial Intelligence redirect', () => {
  test('legacy route redirects to Reports > Financial', async ({ page }) => {
    await page.goto('/financial-intelligence', { waitUntil: 'domcontentloaded' });

    const url = new URL(page.url());
    expect(url.pathname).toBe('/reports');
    expect(url.searchParams.get('tab')).toBe('financial');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 10_000 });
  });
});
