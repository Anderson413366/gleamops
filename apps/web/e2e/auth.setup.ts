import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = 'e2e/.auth/user.json';

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim();
    }
  }
}

async function ensureE2EUser(email: string, password: string) {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return;

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return;
  }

  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
}

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? 'owner@gleamops.dev';
  const password = process.env.E2E_PASSWORD ?? 'password123';
  await ensureE2EUser(email, password);

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (login redirects to /pipeline)
  await expect(page).toHaveURL(/\/(pipeline|home)/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
