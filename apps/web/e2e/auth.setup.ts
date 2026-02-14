import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? 'owner@gleamops.dev';
  const password = process.env.E2E_PASSWORD ?? 'password123';

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (login redirects to /pipeline)
  await expect(page).toHaveURL(/\/(pipeline|home)/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
