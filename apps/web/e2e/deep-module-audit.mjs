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
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
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

function loadCredentials(credsFile) {
  if (!fs.existsSync(credsFile)) {
    throw new Error(`Credentials file not found: ${credsFile}`);
  }
  return JSON.parse(fs.readFileSync(credsFile, 'utf8'));
}

function dedupe(items) {
  const seen = new Map();
  for (const item of items) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

async function typedLogin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForSelector('#email', { state: 'visible', timeout: 12_000 });
  await page.fill('#email', '');
  await page.type('#email', email, { delay: 8 });
  await page.fill('#password', '');
  await page.type('#password', password, { delay: 8 });
  await page.getByRole('button', { name: /sign in/i }).first().click({ timeout: 8_000 });

  const start = Date.now();
  while (Date.now() - start < 25_000) {
    if (page.url().includes('/home')) {
      return { ok: true, finalUrl: page.url() };
    }
    await page.waitForTimeout(180);
  }
  return { ok: false, finalUrl: page.url() };
}

async function dismissTour(page) {
  const skipBtn = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(220);
    return true;
  }
  return false;
}

async function isPaletteOpen(page) {
  return page.locator('input[placeholder*="Search records"]').first().isVisible().catch(() => false);
}

async function closePalette(page) {
  for (let i = 0; i < 3; i += 1) {
    if (!(await isPaletteOpen(page))) return true;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(160);
  }
  return !(await isPaletteOpen(page));
}

async function openPalette(page, method = 'keyboard') {
  if (method === 'header') {
    const searchBtn = page
      .getByRole('button', { name: /Search|Command Palette|⌘K|Ctrl\+K/i })
      .first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(180);
    }
  }

  if (method === 'sidebar') {
    const sidebarTrigger = page
      .locator('nav')
      .getByText(/Search|Command Palette|⌘K|Ctrl\+K/i)
      .first();
    if (await sidebarTrigger.isVisible().catch(() => false)) {
      await sidebarTrigger.click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(180);
    }
  }

  if (!(await isPaletteOpen(page))) {
    await page.keyboard.press('Meta+KeyK').catch(() => {});
    await page.waitForTimeout(150);
  }
  if (!(await isPaletteOpen(page))) {
    await page.keyboard.press('Control+KeyK').catch(() => {});
    await page.waitForTimeout(150);
  }

  const input = page.locator('input[placeholder*="Search records"]').first();
  await input.waitFor({ state: 'visible', timeout: 4_500 });
  return input;
}

async function capturePaletteResults(page, query) {
  const input = await openPalette(page, 'keyboard');
  await input.fill(query);
  await page.waitForTimeout(350);
  const resultLocator = page
    .locator('[role="option"], [role="menuitem"], [data-command-item], li, button')
    .filter({ hasText: /[A-Za-z]/ })
    .first()
    .locator('xpath=ancestor-or-self::*');

  const texts = await page
    .locator('[role="option"], [role="menuitem"], [data-command-item], li, button')
    .filter({ hasText: /[A-Za-z]/ })
    .allTextContents()
    .catch(() => []);

  const trimmed = texts
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    query,
    topResults: trimmed,
    hasResults: trimmed.length > 0,
    firstResultVisible: await resultLocator.isVisible().catch(() => false),
  };
}

async function clickByTextAndVerify(page, { baseUrl, label, textPattern, expectedPath, expectedTab }) {
  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(280);

  const candidates = [
    page.getByRole('link', { name: textPattern }).first(),
    page.getByRole('button', { name: textPattern }).first(),
    page.getByText(textPattern).first(),
  ];

  let target = null;
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      target = candidate;
      break;
    }
  }

  if (!target) {
    return {
      label,
      pass: false,
      found: false,
      expectedPath,
      expectedTab: expectedTab || null,
      finalUrl: page.url(),
    };
  }

  await target.click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(900);

  const current = new URL(page.url());
  const passPath = current.pathname === expectedPath;
  const passTab = !expectedTab || current.searchParams.get('tab') === expectedTab;

  return {
    label,
    pass: passPath && passTab,
    found: true,
    expectedPath,
    expectedTab: expectedTab || null,
    finalUrl: page.url(),
    checks: {
      passPath,
      passTab,
    },
  };
}

async function verifyDeepLink(context, baseUrl, href) {
  const page = await context.newPage();
  const start = Date.now();
  await page.goto(`${baseUrl}${href}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForTimeout(220);
  const elapsedMs = Date.now() - start;
  const result = {
    href,
    finalUrl: page.url(),
    elapsedMs,
    pass: page.url().includes(href.split('?')[0]),
  };
  await page.close();
  return result;
}

async function runCheck(report, id, title, fn) {
  const started = Date.now();
  try {
    const details = await fn();
    const pass = details?.pass !== false;
    report.checks.push({
      id,
      title,
      status: pass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - started,
      details,
    });
  } catch (error) {
    report.checks.push({
      id,
      title,
      status: 'FAIL',
      durationMs: Date.now() - started,
      error: String(error?.message || error),
    });
  }
}

async function runHomeSearchDeepAudit({ page, context, baseUrl, role }) {
  const report = {
    module: 'Home + Search/⌘K',
    role,
    moduleMap: {},
    checks: [],
    performance: {
      slowInteractions: [],
    },
    connectivityTrails: [],
    deepLinks: [],
  };

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await dismissTour(page);

  report.moduleMap.home = {
    url: page.url(),
    heading: (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '',
    leftNavVisible: await page.locator('nav').first().isVisible().catch(() => false),
    quickActionVisible: await page.getByRole('button', { name: /^Quick Action$/i }).first().isVisible().catch(() => false),
    searchInputVisible: await page.locator('input[placeholder*="Search records"]').first().isVisible().catch(() => false),
  };

  await runCheck(report, 'HOME-001', 'Home baseline loads', async () => ({
    pass: report.moduleMap.home.leftNavVisible && !!report.moduleMap.home.heading,
    heading: report.moduleMap.home.heading,
    leftNavVisible: report.moduleMap.home.leftNavVisible,
  }));

  await runCheck(report, 'SEARCH-001', 'Command palette opens from keyboard', async () => {
    const input = await openPalette(page, 'keyboard');
    const pass = await input.isVisible().catch(() => false);
    await closePalette(page);
    return { pass };
  });

  await runCheck(report, 'SEARCH-002', 'Command palette opens from header trigger', async () => {
    const input = await openPalette(page, 'header');
    const pass = await input.isVisible().catch(() => false);
    await closePalette(page);
    return { pass };
  });

  await runCheck(report, 'SEARCH-003', 'Command palette opens from sidebar trigger', async () => {
    const input = await openPalette(page, 'sidebar');
    const pass = await input.isVisible().catch(() => false);
    await closePalette(page);
    return { pass };
  });

  await runCheck(report, 'SEARCH-004', 'Quick-action query returns results', async () => {
    const result = await capturePaletteResults(page, 'new client');
    await closePalette(page);
    return {
      pass: result.hasResults,
      ...result,
    };
  });

  await runCheck(report, 'SEARCH-005', 'Go-to query routes to schedule', async () => {
    const input = await openPalette(page, 'keyboard');
    await input.fill('go to schedule');
    await page.waitForTimeout(260);
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(920);
    const url = page.url();
    const pass = url.includes('/schedule');
    return { pass, url };
  });

  await runCheck(report, 'SEARCH-006', 'Fuzzy phrase behavior', async () => {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const result = await capturePaletteResults(page, 'go schedule');
    await closePalette(page);
    const scheduleMentioned = result.topResults.some((text) => /schedule/i.test(text));
    return {
      pass: result.hasResults && scheduleMentioned,
      scheduleMentioned,
      ...result,
    };
  });

  await runCheck(report, 'SEARCH-007', 'ESC closes palette', async () => {
    await openPalette(page, 'keyboard');
    const closed = await closePalette(page);
    return { pass: closed };
  });

  await runCheck(report, 'QUICK-001', 'Quick Action opens/closes', async () => {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(260);
    const quickBtn = page.getByRole('button', { name: /^Quick Action$/i }).first();
    const visible = await quickBtn.isVisible().catch(() => false);
    if (!visible) return { pass: false, visible: false };
    await quickBtn.click().catch(() => {});
    await page.waitForTimeout(220);
    const prospectButton = page.getByRole('button', { name: /New Prospect/i }).first();
    const menuVisible = await prospectButton.isVisible().catch(() => false);
    await page.mouse.click(20, 20).catch(() => {});
    await page.waitForTimeout(220);
    const closedByOutside = !(await prospectButton.isVisible().catch(() => false));
    return {
      pass: menuVisible && closedByOutside,
      menuVisible,
      closedByOutside,
    };
  });

  await runCheck(report, 'QUICK-002', 'Quick Action New Prospect route', async () => {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(260);
    const quickBtn = page.getByRole('button', { name: /^Quick Action$/i }).first();
    if (!(await quickBtn.isVisible().catch(() => false))) {
      return { pass: false, reason: 'quick-action-not-visible' };
    }
    await quickBtn.click().catch(() => {});
    await page.waitForTimeout(220);
    const newProspectBtn = page.getByRole('button', { name: /New Prospect/i }).first();
    if (!(await newProspectBtn.isVisible().catch(() => false))) {
      return { pass: false, reason: 'new-prospect-action-missing' };
    }
    await newProspectBtn.click().catch(() => {});
    await page.waitForTimeout(900);
    const url = page.url();
    return { pass: url.includes('/pipeline'), url };
  });

  await runCheck(report, 'HOME-010', 'Keyboard shortcuts modal opens with ?', async () => {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(280);
    await page.keyboard.press('Shift+/').catch(() => {});
    await page.waitForTimeout(250);
    const visible = await page.getByText(/Keyboard shortcuts|Shortcuts/i).first().isVisible().catch(() => false);
    await page.keyboard.press('Escape').catch(() => {});
    return { pass: visible, visible };
  });

  await runCheck(report, 'HOME-003', 'KPI trail: Staff Turnover (90d)', async () => {
    const result = await clickByTextAndVerify(page, {
      baseUrl,
      label: 'Staff Turnover (90d)',
      textPattern: /Staff Turnover/i,
      expectedPath: '/team',
      expectedTab: 'staff',
    });
    report.connectivityTrails.push(result);
    return result;
  });

  await runCheck(report, 'HOME-004', 'Daily Snapshot trail: Tonight Routes', async () => {
    const result = await clickByTextAndVerify(page, {
      baseUrl,
      label: 'Tonight Routes',
      textPattern: /Tonight Routes/i,
      expectedPath: '/jobs',
      expectedTab: 'routes',
    });
    report.connectivityTrails.push(result);
    return result;
  });

  await runCheck(report, 'HOME-005', 'Daily Snapshot trail: Overdue Periodic Tasks', async () => {
    const result = await clickByTextAndVerify(page, {
      baseUrl,
      label: 'Overdue Periodic Tasks',
      textPattern: /Overdue Periodic Tasks/i,
      expectedPath: '/schedule',
      expectedTab: 'recurring',
    });
    report.connectivityTrails.push(result);
    return result;
  });

  await runCheck(report, 'DEEP-001', 'Deep links load correctly in new tab', async () => {
    const links = ['/home', '/schedule', '/jobs?tab=routes'];
    const results = [];
    for (const href of links) {
      const deepResult = await verifyDeepLink(context, baseUrl, href);
      results.push(deepResult);
      report.deepLinks.push(deepResult);
      if (deepResult.elapsedMs > 2_000) {
        report.performance.slowInteractions.push({ label: `deep-link ${href}`, elapsedMs: deepResult.elapsedMs });
      }
    }
    return {
      pass: results.every((item) => item.pass),
      results,
    };
  });

  await runCheck(report, 'HOME-011', 'Back/forward behavior remains predictable', async () => {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(220);
    await page.goto(`${baseUrl}/schedule`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(220);
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(220);
    const backUrl = page.url();
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(220);
    const forwardUrl = page.url();
    return {
      pass: backUrl.includes('/home') && forwardUrl.includes('/schedule'),
      backUrl,
      forwardUrl,
    };
  });

  const failedChecks = report.checks.filter((check) => check.status === 'FAIL');
  report.summary = {
    totalChecks: report.checks.length,
    failedChecks: failedChecks.length,
    passedChecks: report.checks.length - failedChecks.length,
    failedCheckIds: failedChecks.map((item) => item.id),
  };

  return report;
}

async function runRoleAudit({ baseUrl, role, email, password, moduleName }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();

  const roleResult = {
    role,
    email,
    module: moduleName,
    startedAtNy: nowNy(),
    startedAtIso: nowIso(),
    login: null,
    audit: null,
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') roleResult.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => {
    roleResult.pageErrors.push(String(error));
  });
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!url.startsWith(baseUrl) && !url.includes('supabase.co')) return;
    let body = '';
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = (await response.text()).slice(0, 240).replace(/\s+/g, ' ');
      }
    } catch (_) {
      body = '';
    }
    roleResult.networkFailures.push({
      method: response.request().method(),
      url,
      status: response.status(),
      body,
    });
  });

  roleResult.login = await typedLogin(page, baseUrl, email, password);
  if (roleResult.login.ok) {
    if (moduleName === 'home-search') {
      roleResult.audit = await runHomeSearchDeepAudit({
        page,
        context,
        baseUrl,
        role,
      });
    } else {
      roleResult.audit = {
        module: moduleName,
        unsupported: true,
        summary: {
          totalChecks: 0,
          failedChecks: 1,
          passedChecks: 0,
          failedCheckIds: ['MODULE-UNSUPPORTED'],
        },
      };
    }
  }

  roleResult.consoleErrors = dedupe(roleResult.consoleErrors.map((text) => ({ text }))).map((item) => item.text);
  roleResult.pageErrors = dedupe(roleResult.pageErrors.map((text) => ({ text }))).map((item) => item.text);
  roleResult.networkFailures = dedupe(roleResult.networkFailures);
  roleResult.completedAtNy = nowNy();
  roleResult.completedAtIso = nowIso();

  await context.close();
  await browser.close();

  return roleResult;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const moduleName = String(args.module || 'home-search').toLowerCase();
  const baseUrl = String(args['base-url'] || process.env.QA_BASE_URL || 'https://gleamops.vercel.app');
  const credsFile = String(
    args['creds-file'] || process.env.QA_CREDS_FILE || path.resolve(process.cwd(), '../../.tmp-phase2-deep-qa-credentials.json')
  );
  const roles = String(args.roles || 'OWNER_ADMIN,MANAGER')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  const credentials = loadCredentials(credsFile);
  const users = roles
    .map((role) => credentials.users?.find((user) => user.role === role))
    .filter(Boolean);

  if (users.length === 0) {
    throw new Error(`No matching users found for roles: ${roles.join(', ')}`);
  }

  const session = {
    mode: 'deep-module-audit',
    module: moduleName,
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    baseUrl,
    roles,
    credsFile,
    roleResults: [],
    summary: {},
  };

  const roleResults = await Promise.all(
    users.map((user) =>
      runRoleAudit({
        baseUrl,
        role: user.role,
        email: user.email,
        password: user.password,
        moduleName,
      })
    )
  );

  session.roleResults = roleResults;
  session.completedAtIso = nowIso();
  session.completedAtNy = nowNy();

  session.summary = roleResults.reduce(
    (acc, result) => {
      const failedChecks = result.audit?.summary?.failedChecks ?? 1;
      const totalChecks = result.audit?.summary?.totalChecks ?? 0;
      acc.totalRoles += 1;
      acc.totalChecks += totalChecks;
      acc.totalFailedChecks += failedChecks;
      acc.consoleErrors += result.consoleErrors.length;
      acc.pageErrors += result.pageErrors.length;
      acc.networkFailures += result.networkFailures.length;
      if (failedChecks > 0 || result.consoleErrors.length || result.pageErrors.length || result.networkFailures.length || !result.login?.ok) {
        acc.failedRoles.push(result.role);
      }
      return acc;
    },
    {
      totalRoles: 0,
      totalChecks: 0,
      totalFailedChecks: 0,
      consoleErrors: 0,
      pageErrors: 0,
      networkFailures: 0,
      failedRoles: [],
    }
  );

  const outPath =
    args.out ||
    path.join(path.resolve(process.cwd(), '../..'), `.tmp-deep-${moduleName}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2));
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
