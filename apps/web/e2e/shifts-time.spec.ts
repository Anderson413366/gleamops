import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shifts & Time — E2E scenario test matrix
//
// The /shifts-time standalone page requires feature flags + role resolution.
// In E2E (auth.setup.ts user), the Shifts & Time content surfaces via the
// Jobs module tabs (Service Plans, Job Log, Inspections, Time, Routes).
// Tests verify that each Jobs tab renders correctly.
// ---------------------------------------------------------------------------

async function dismissTour(page: import('@playwright/test').Page) {
  // The navigation tour has a visible "Skip" button inside a tooltip popover.
  // Avoid the sr-only "Skip to main content" link by targeting only visible buttons/links.
  const skipBtn = page.locator('button, a').filter({ hasText: /^Skip$/ }).and(page.locator(':visible'));
  if (await skipBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBtn.first().click();
    // Wait for tour to dismiss
    await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
  }
}

test.describe('Shifts & Time surfaces (Jobs module)', () => {
  test('Jobs page renders heading and tab navigation', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await dismissTour(page);
    await expect(page.getByText('Jobs').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Service Plans' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Time' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Routes' }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Time tab renders alerts and exceptions surface', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await dismissTour(page);

    const timeTab = page.locator('[role="tab"]').filter({ hasText: 'Time' });
    await expect(timeTab.first()).toBeVisible({ timeout: 10_000 });
    await timeTab.first().click();

    await expect(
      page.locator('table').first().or(page.getByText(/no alerts|no time|empty/i).first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Routes tab renders route execution surface', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await dismissTour(page);

    const routesTab = page.locator('[role="tab"]').filter({ hasText: 'Routes' });
    await expect(routesTab.first()).toBeVisible({ timeout: 10_000 });
    await routesTab.first().click();

    await expect(
      page.getByText('Fleet Snapshot').first()
        .or(page.locator('table').first())
        .or(page.getByText(/no routes|empty/i).first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Inspections tab renders inspection surface', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await dismissTour(page);

    const inspTab = page.locator('[role="tab"]').filter({ hasText: 'Inspections' });
    await expect(inspTab.first()).toBeVisible({ timeout: 10_000 });
    await inspTab.first().click();

    await expect(
      page.locator('table').first().or(page.getByText(/no inspection|empty/i).first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Tab switching across all Jobs tabs does not crash', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    await dismissTour(page);

    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
