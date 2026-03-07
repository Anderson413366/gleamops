#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function nowNy() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

function nowIso() {
  return new Date().toISOString();
}

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function dedupeFailures(items) {
  const seen = new Map();
  for (const item of items) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

function loadCredentials(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Credentials file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const MODULE_BACKLOG = [
  { module: 'Home', href: '/home', submodules: [] },
  {
    module: 'Staff Schedule',
    href: '/schedule',
    submodules: [
      { name: 'Employee Grid', href: '/schedule?tab=recurring' },
      { name: 'Leave & Availability', href: '/schedule?tab=leave' },
      { name: 'My Schedule', href: '/schedule?tab=my-schedule' },
    ],
  },
  {
    module: 'Dispatch',
    href: '/schedule?tab=planning',
    submodules: [
      { name: 'Planning Board', href: '/schedule?tab=planning' },
      { name: 'Master Board', href: '/schedule?tab=master' },
      { name: 'My Route', href: '/schedule?tab=floater' },
      { name: 'Supervisor View', href: '/schedule?tab=supervisor' },
      { name: 'Tonight Board', href: '/shifts-time' },
    ],
  },
  {
    module: 'Work Orders',
    href: '/schedule?tab=work-orders',
    submodules: [
      { name: 'Open Orders', href: '/schedule?tab=work-orders' },
      { name: 'Calendar', href: '/schedule?tab=calendar' },
      { name: 'Job Log', href: '/jobs?tab=tickets' },
      { name: 'Service Plans', href: '/jobs?tab=service-plans' },
      { name: 'Inspections', href: '/jobs?tab=inspections' },
      { name: 'Routes', href: '/jobs?tab=routes' },
    ],
  },
  {
    module: 'Field Tools',
    href: '/schedule?tab=checklists',
    submodules: [
      { name: 'Shift Checklists', href: '/schedule?tab=checklists' },
      { name: 'Field Requests', href: '/schedule?tab=forms' },
      { name: 'Time Alerts', href: '/jobs?tab=time' },
    ],
  },
  {
    module: 'Client Hub',
    href: '/clients?tab=clients',
    submodules: [
      { name: 'Directory', href: '/clients?tab=clients' },
      { name: 'Sites', href: '/clients?tab=sites' },
      { name: 'Contacts', href: '/clients?tab=contacts' },
      { name: 'Requests', href: '/clients?tab=requests' },
    ],
  },
  {
    module: 'Sales Pipeline',
    href: '/pipeline?tab=prospects',
    submodules: [
      { name: 'Prospects', href: '/pipeline?tab=prospects' },
      { name: 'Opportunities', href: '/pipeline?tab=opportunities' },
      { name: 'Bids', href: '/pipeline?tab=bids' },
      { name: 'Proposals', href: '/pipeline?tab=proposals' },
      { name: 'Funnel Analytics', href: '/pipeline?tab=analytics' },
    ],
  },
  {
    module: 'Estimating',
    href: '/pipeline/calculator',
    submodules: [
      { name: 'Bid Calculator', href: '/pipeline/calculator' },
      { name: 'Supply Calculator', href: '/pipeline/supply-calculator' },
    ],
  },
  {
    module: 'Sales Admin',
    href: '/pipeline/admin',
    submodules: [],
  },
  {
    module: 'Workforce',
    href: '/team?tab=staff',
    submodules: [
      { name: 'Staff Directory', href: '/team?tab=staff' },
      { name: 'Roles & Positions', href: '/team?tab=positions' },
      { name: 'Partners', href: '/team?tab=subcontractors' },
      { name: 'HR & Reviews', href: '/team?tab=hr' },
      { name: 'Team Messages', href: '/team?tab=messages' },
    ],
  },
  {
    module: 'Time & Pay',
    href: '/team?tab=attendance',
    submodules: [
      { name: 'Attendance', href: '/team?tab=attendance' },
      { name: 'Timesheets', href: '/team?tab=timesheets' },
      { name: 'Payroll', href: '/team?tab=payroll' },
      { name: 'Microfiber Payouts', href: '/team?tab=microfiber' },
    ],
  },
  {
    module: 'Shift Config',
    href: '/team?tab=break-rules',
    submodules: [
      { name: 'Break Rules', href: '/team?tab=break-rules' },
      { name: 'Shift Tags', href: '/team?tab=shift-tags' },
    ],
  },
  {
    module: 'Inventory',
    href: '/inventory?tab=supplies',
    submodules: [
      { name: 'Supply Catalog', href: '/inventory?tab=supplies' },
      { name: 'Kits', href: '/inventory?tab=kits' },
      { name: 'Site Assignments', href: '/inventory?tab=site-assignments' },
      { name: 'Stock Counts', href: '/inventory?tab=counts' },
      { name: 'Warehouse', href: '/inventory?tab=warehouse' },
    ],
  },
  {
    module: 'Procurement',
    href: '/inventory?tab=orders',
    submodules: [
      { name: 'Purchase Orders', href: '/inventory?tab=orders' },
      { name: 'Forecasting', href: '/inventory?tab=forecasting' },
      { name: 'Vendor Directory', href: '/inventory?tab=vendors' },
    ],
  },
  {
    module: 'Assets',
    href: '/equipment?tab=equipment',
    submodules: [
      { name: 'Asset List', href: '/equipment?tab=equipment' },
      { name: 'Assigned Gear', href: '/equipment?tab=assignments' },
      { name: 'Keys', href: '/equipment?tab=keys' },
      { name: 'Fleet', href: '/equipment?tab=vehicles' },
      { name: 'Maintenance', href: '/equipment?tab=maintenance' },
    ],
  },
  {
    module: 'Compliance',
    href: '/safety?tab=certifications',
    submodules: [
      { name: 'Certifications', href: '/safety?tab=certifications' },
      { name: 'Training', href: '/safety?tab=training' },
      { name: 'Incidents', href: '/safety?tab=incidents' },
      { name: 'Expiration Tracker', href: '/safety?tab=calendar' },
    ],
  },
  {
    module: 'Reports',
    href: '/reports',
    submodules: [],
  },
  {
    module: 'Service Catalog',
    href: '/catalog?tab=tasks',
    submodules: [
      { name: 'Task Library', href: '/catalog?tab=tasks' },
      { name: 'Service Definitions', href: '/catalog?tab=services' },
      { name: 'Task Mapping', href: '/catalog?tab=mapping' },
      { name: 'Scope Library', href: '/catalog?tab=scope-library' },
    ],
  },
  {
    module: 'Settings',
    href: '/settings',
    submodules: [],
  },
];

async function typedLogin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { state: 'visible', timeout: 10_000 });
  await page.fill('#email', '');
  await page.type('#email', email, { delay: 10 });
  await page.fill('#password', '');
  await page.type('#password', password, { delay: 10 });
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /sign in/i }).click({ timeout: 5_000 });

  const start = Date.now();
  while (Date.now() - start < 25_000) {
    if (page.url().includes('/home')) {
      const persistence = await waitForSessionPersistence(page, baseUrl);
      if (!persistence.ok) {
        return { ok: false, finalUrl: page.url(), reason: 'session-not-persisted', persistence };
      }
      return { ok: true, finalUrl: page.url(), persistence };
    }
    await page.waitForTimeout(200);
  }
  return { ok: false, finalUrl: page.url(), reason: 'home-timeout' };
}

async function waitForSessionPersistence(page, baseUrl) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const hasSupabaseStorageKey = await page
      .evaluate(() =>
        Object.keys(window.localStorage || {}).some(
          (key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase')
        )
      )
      .catch(() => false);
    const cookies = await page.context().cookies(baseUrl).catch(() => []);
    const hasSupabaseCookie = cookies.some(
      (cookie) => cookie.name.startsWith('sb-') || cookie.name.toLowerCase().includes('supabase')
    );
    if (hasSupabaseStorageKey || hasSupabaseCookie) {
      return { ok: true, hasSupabaseStorageKey, hasSupabaseCookie };
    }
    await page.waitForTimeout(200);
  }

  return { ok: false, hasSupabaseStorageKey: false, hasSupabaseCookie: false };
}

async function dismissTourIfVisible(page) {
  const skip = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

function parseExpectedTarget(targetHref) {
  const fakeBase = new URL(targetHref, 'https://example.test');
  return {
    pathname: fakeBase.pathname,
    expectedTab: fakeBase.searchParams.get('tab'),
  };
}

async function verifyRoute(page, baseUrl, label, targetHref, settleMs) {
  const target = `${baseUrl}${targetHref}`;
  const expected = parseExpectedTarget(targetHref);
  const started = Date.now();
  let navigationError = '';
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 12_000 });
  } catch (error) {
    navigationError = String(error?.message || error);
  }
  await page.waitForTimeout(settleMs);
  const elapsedMs = Date.now() - started;
  const current = new URL(page.url(), baseUrl);
  const heading = (await page.locator('h1, h2').first().textContent().catch(() => ''))?.trim() || '';
  const notFoundHeadingVisible = await page
    .getByRole('heading', { name: /^404$/i })
    .first()
    .isVisible({ timeout: 120 })
    .catch(() => false);
  const notFoundCopyVisible = await page
    .getByText(/This page could not be found/i)
    .first()
    .isVisible({ timeout: 120 })
    .catch(() => false);
  const internalErrorVisible = await page
    .getByText(/INTERNAL_SERVER_ERROR|MIDDLEWARE_INVOCATION_FAILED|Application error/i)
    .first()
    .isVisible({ timeout: 120 })
    .catch(() => false);
  const isErrorSurface = (notFoundHeadingVisible && notFoundCopyVisible) || internalErrorVisible;
  const samePath = current.pathname === expected.pathname;
  const tabPresent = !expected.expectedTab || current.searchParams.has('tab');
  const pass = samePath && tabPresent && !isErrorSurface && !navigationError;

  return {
    label,
    targetHref,
    finalUrl: page.url(),
    heading,
    elapsedMs,
    pass,
    checks: {
      samePath,
      tabPresent,
      isErrorSurface,
      navigationError,
    },
  };
}

async function openCommandPalette(page) {
  const input = page.locator('input[placeholder*="Search records"]').first();
  await page.keyboard.press('Meta+KeyK').catch(() => {});
  await page.waitForTimeout(180);
  if (!(await input.isVisible().catch(() => false))) {
    await page.keyboard.press('Control+KeyK').catch(() => {});
  }
  await input.waitFor({ state: 'visible', timeout: 4_000 });
  return input;
}

async function runGlobalActions(page, baseUrl) {
  const checks = {};
  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  checks.tourDismissed = await dismissTourIfVisible(page);

  const input = await openCommandPalette(page).catch(() => null);
  checks.searchPaletteOpen = !!input;
  if (input) {
    await input.fill('go to schedule');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(800);
    checks.searchGoToScheduleUrl = page.url();
    checks.searchGoToScheduleOk = page.url().includes('/schedule');
  }

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(450);
  const quickBtn = page.getByRole('button', { name: /^Quick Action$/i }).first();
  checks.quickActionVisible = await quickBtn.isVisible().catch(() => false);
  if (checks.quickActionVisible) {
    await quickBtn.click().catch(() => {});
    await page.waitForTimeout(250);
    const newProspectBtn = page.getByRole('button', { name: /New Prospect/i }).first();
    checks.quickActionNewProspectVisible = await newProspectBtn.isVisible().catch(() => false);
    if (checks.quickActionNewProspectVisible) {
      await newProspectBtn.click().catch(() => {});
      await page.waitForTimeout(900);
      checks.quickActionNewProspectUrl = page.url();
      checks.quickActionNewProspectOk = page.url().includes('/pipeline');
    }
  }

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Shift+/').catch(() => {});
  await page.waitForTimeout(280);
  checks.shortcutsModalVisible = await page
    .getByText(/Keyboard shortcuts|Shortcuts/i)
    .first()
    .isVisible()
    .catch(() => false);
  await page.keyboard.press('Escape').catch(() => {});

  // Browser back/forward behavior using command palette trail.
  const cpInput = await openCommandPalette(page).catch(() => null);
  if (cpInput) {
    await cpInput.fill('go to schedule');
    await page.waitForTimeout(250);
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(700);
    const scheduleUrl = page.url();
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(450);
    const backUrl = page.url();
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(450);
    const forwardUrl = page.url();
    checks.backForward = {
      scheduleUrl,
      backUrl,
      forwardUrl,
      backOk: backUrl.includes('/home'),
      forwardOk: forwardUrl.includes('/schedule'),
    };
  }

  return checks;
}

async function runModuleBacklog(page, baseUrl, routeSettleMs) {
  const modules = [];
  for (const item of MODULE_BACKLOG) {
    console.log(`[${nowNy()}] route ${item.module} -> ${item.href}`);
    const moduleResult = {
      module: item.module,
      entry: await verifyRoute(page, baseUrl, item.module, item.href, routeSettleMs),
      submodules: [],
    };
    for (const sub of item.submodules) {
      console.log(`[${nowNy()}] route ${item.module} :: ${sub.name} -> ${sub.href}`);
      const subResult = await verifyRoute(page, baseUrl, `${item.module} :: ${sub.name}`, sub.href, routeSettleMs);
      moduleResult.submodules.push({ name: sub.name, ...subResult });
    }
    modules.push(moduleResult);
  }
  return modules;
}

async function runRoleAudit({ baseUrl, role, email, password, screenshotsDir, routeSettleMs }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();

  const report = {
    role,
    email,
    startedAtNy: nowNy(),
    login: null,
    globalChecks: {},
    modules: [],
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    screenshots: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!url.startsWith(baseUrl) && !url.includes('supabase.co')) return;
    let body = '';
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = (await response.text()).slice(0, 220).replace(/\s+/g, ' ');
      }
    } catch (_) {
      body = '';
    }
    report.networkFailures.push({
      method: response.request().method(),
      url,
      status: response.status(),
      body,
    });
  });

  report.login = await typedLogin(page, baseUrl, email, password);
  if (!report.login.ok) {
    const shot = path.join(screenshotsDir, `backlog-${role.toLowerCase()}-login-fail-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    report.screenshots.push(shot);
    report.completedAtNy = nowNy();
    await context.close();
    await browser.close();
    report.consoleErrors = [...new Set(report.consoleErrors)];
    report.pageErrors = [...new Set(report.pageErrors)];
    report.networkFailures = dedupeFailures(report.networkFailures);
    return report;
  }

  report.globalChecks = await runGlobalActions(page, baseUrl);
  report.modules = await runModuleBacklog(page, baseUrl, routeSettleMs);

  const endShot = path.join(screenshotsDir, `backlog-${role.toLowerCase()}-end-${Date.now()}.png`);
  await page.screenshot({ path: endShot, fullPage: true }).catch(() => {});
  report.screenshots.push(endShot);

  report.completedAtNy = nowNy();
  report.consoleErrors = [...new Set(report.consoleErrors)];
  report.pageErrors = [...new Set(report.pageErrors)];
  report.networkFailures = dedupeFailures(report.networkFailures);

  await context.close();
  await browser.close();
  return report;
}

function summarizeRoleResult(roleResult) {
  let totalPages = 0;
  let passedPages = 0;
  const failures = [];
  const slowPages = [];

  for (const moduleResult of roleResult.modules) {
    totalPages += 1;
    if (moduleResult.entry.pass) passedPages += 1;
    else failures.push({ module: moduleResult.module, target: moduleResult.entry.targetHref, finalUrl: moduleResult.entry.finalUrl });
    if (moduleResult.entry.elapsedMs > 2_000) {
      slowPages.push({ label: moduleResult.module, elapsedMs: moduleResult.entry.elapsedMs, target: moduleResult.entry.targetHref });
    }

    for (const sub of moduleResult.submodules) {
      totalPages += 1;
      if (sub.pass) passedPages += 1;
      else failures.push({ module: moduleResult.module, submodule: sub.name, target: sub.targetHref, finalUrl: sub.finalUrl });
      if (sub.elapsedMs > 2_000) {
        slowPages.push({ label: `${moduleResult.module} :: ${sub.name}`, elapsedMs: sub.elapsedMs, target: sub.targetHref });
      }
    }
  }

  return {
    totalPages,
    passedPages,
    failedPages: totalPages - passedPages,
    failures,
    slowPages,
    consoleErrorCount: roleResult.consoleErrors.length,
    pageErrorCount: roleResult.pageErrors.length,
    networkFailureCount: roleResult.networkFailures.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args['base-url'] || process.env.QA_BASE_URL || 'https://gleamops.vercel.app');
  const credsFile = String(
    args['creds-file'] ||
      process.env.QA_CREDS_FILE ||
      path.resolve(process.cwd(), '../../.tmp-home-search-qa-credentials.json')
  );
  const roles = String(args.roles || 'OWNER_ADMIN,MANAGER')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const routeSettleMs = parsePositiveInt(args['route-settle-ms'] || process.env.QA_ROUTE_SETTLE_MS, 900);

  const credentials = loadCredentials(credsFile);
  const repoRoot = path.resolve(process.cwd(), '../..');
  const screenshotsDir = path.join(repoRoot, 'reports');
  ensureDir(screenshotsDir);

  const users = roles
    .map((role) => credentials.users?.find((user) => user.role === role))
    .filter(Boolean);
  if (users.length === 0) {
    throw new Error(`No users found for roles: ${roles.join(', ')}`);
  }

  const session = {
    mode: 'accelerated-backlog-qa',
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    baseUrl,
    credsFile,
    roles,
    moduleCount: MODULE_BACKLOG.length,
    moduleCatalog: MODULE_BACKLOG,
    roleResults: [],
    summaries: {},
  };

  const startMs = Date.now();
  const roleResults = await Promise.all(
    users.map((user) =>
      runRoleAudit({
        baseUrl,
        role: user.role,
        email: user.email,
        password: user.password,
        screenshotsDir,
        routeSettleMs,
      })
    )
  );
  session.roleResults = roleResults;
  for (const roleResult of roleResults) {
    session.summaries[roleResult.role] = summarizeRoleResult(roleResult);
  }
  session.durationMs = Date.now() - startMs;
  session.completedAtIso = nowIso();
  session.completedAtNy = nowNy();

  const outPath =
    args.out ||
    path.join(repoRoot, `.tmp-accelerated-backlog-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2));
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
