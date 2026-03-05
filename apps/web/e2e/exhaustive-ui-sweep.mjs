#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

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
  { module: 'Sales Admin', href: '/pipeline/admin', submodules: [] },
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
  { module: 'Reports', href: '/reports', submodules: [] },
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
  { module: 'Settings', href: '/settings', submodules: [] },
];

const SAFE_INTERACTIVE_SELECTOR =
  'main a[href], main button, main [role="button"], main [role="tab"], header button, header a[href]';
const COMMIT_ACTION_PATTERN =
  /\b(save|create|submit|update|delete|archive|remove|approve|reject|publish|send|import|upload|reset|clock in|clock out|check in|check out|apply|generate|sync now|run now)\b/i;
const SIGNOUT_PATTERN = /\b(log out|logout|sign out)\b/i;
const ERROR_SURFACE_PATTERN = /INTERNAL_SERVER_ERROR|MIDDLEWARE_INVOCATION_FAILED|Application error|This page could not be found|^404$/i;

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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function loadCredentials(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Credentials file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function dedupeNetworkFailures(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.method}|${item.url}|${item.status}|${item.body}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

function normalizeText(value, fallback = '') {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function routeCatalog() {
  const routes = [];
  for (const module of MODULE_BACKLOG) {
    routes.push({ module: module.module, page: module.module, href: module.href });
    for (const submodule of module.submodules) {
      routes.push({
        module: module.module,
        page: submodule.name,
        href: submodule.href,
      });
    }
  }
  return routes;
}

function normalizeModuleName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parseModuleFilter(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterRoutesByModules(routes, moduleFilter) {
  if (!moduleFilter.length) return routes;
  const allowed = new Set(moduleFilter.map((item) => normalizeModuleName(item)));
  return routes.filter((route) => allowed.has(normalizeModuleName(route.module)));
}

async function typedLogin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForSelector('#email', { state: 'visible', timeout: 12_000 });
  await page.fill('#email', '');
  await page.type('#email', email, { delay: 8 });
  await page.fill('#password', '');
  await page.type('#password', password, { delay: 8 });
  await page.getByRole('button', { name: /sign in/i }).first().click({ timeout: 8_000 });

  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (page.url().includes('/home')) return { ok: true, finalUrl: page.url() };
    await page.waitForTimeout(180);
  }
  return { ok: false, finalUrl: page.url() };
}

async function dismissTour(page) {
  const skip = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(220);
    return true;
  }
  return false;
}

async function hasErrorSurface(page) {
  const badHeading = await page.getByRole('heading', { name: /^404$/i }).first().isVisible().catch(() => false);
  const badCopy = await page.getByText(/This page could not be found/i).first().isVisible().catch(() => false);
  const runtimeError = await page
    .getByText(/INTERNAL_SERVER_ERROR|MIDDLEWARE_INVOCATION_FAILED|Application error/i)
    .first()
    .isVisible()
    .catch(() => false);
  return (badHeading && badCopy) || runtimeError;
}

async function collectInteractiveCandidates(page) {
  return page.evaluate(
    ({ selector, commitActionPattern, signoutPattern }) => {
      const commitActionRegex = new RegExp(commitActionPattern, 'i');
      const signoutRegex = new RegExp(signoutPattern, 'i');
      const nodes = Array.from(document.querySelectorAll(selector));
      let counter = 0;
      const results = [];
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const style = window.getComputedStyle(node);
        if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') continue;
        const rect = node.getBoundingClientRect();
        if (rect.width < 6 || rect.height < 6) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

        const tag = node.tagName.toLowerCase();
        const role = node.getAttribute('role') || '';
        const disabled =
          node.hasAttribute('disabled') ||
          node.getAttribute('aria-disabled') === 'true' ||
          node.getAttribute('data-disabled') === 'true';
        if (disabled) continue;
        if (tag === 'input') continue;

        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const ariaLabel = (node.getAttribute('aria-label') || '').trim();
        const title = (node.getAttribute('title') || '').trim();
        const label = text || ariaLabel || title || '(icon)';
        const href = (node.getAttribute('href') || '').trim();
        const type = (node.getAttribute('type') || '').trim();
        const candidateRole = role || (tag === 'a' ? 'link' : tag === 'button' ? 'button' : '');
        const signature = `${tag}|${candidateRole}|${label}|${href}`;

        let skipReason = '';
        if (type.toLowerCase() === 'submit') skipReason = 'submit-control';
        if (!skipReason && commitActionRegex.test(label)) skipReason = 'commit-action';
        if (!skipReason && signoutRegex.test(label)) skipReason = 'session-destructive';
        if (!skipReason && /^javascript:/i.test(href)) skipReason = 'javascript-href';
        if (!skipReason && href.startsWith('mailto:')) skipReason = 'mailto';

        const qid = `qa-sweep-${Date.now()}-${counter++}`;
        node.setAttribute('data-qa-sweep-id', qid);

        results.push({
          qid,
          tag,
          role: candidateRole,
          label: label.slice(0, 140),
          href,
          type,
          signature,
          skipReason,
          box: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
      }
      return results;
    },
    {
      selector: SAFE_INTERACTIVE_SELECTOR,
      commitActionPattern: COMMIT_ACTION_PATTERN.source,
      signoutPattern: SIGNOUT_PATTERN.source,
    }
  );
}

async function closeOpenOverlay(page) {
  const overlaySelector = '[role="dialog"], dialog[open], [aria-modal="true"], [data-state="open"]';
  for (let i = 0; i < 6; i += 1) {
    const overlay = page.locator(overlaySelector).last();
    if (!(await overlay.isVisible().catch(() => false))) break;

    const closeBtn = overlay
      .locator('button')
      .filter({ hasText: /close|cancel|done|back/i })
      .first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(180);
      continue;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.click(12, 12).catch(() => {});
    await page.waitForTimeout(180);
  }
}

async function normalizeUiState(page) {
  for (let i = 0; i < 7; i += 1) {
    const modalLikeVisible =
      (await page.locator('[role="dialog"], dialog[open], [aria-modal="true"], [data-state="open"]').first().isVisible().catch(() => false)) ||
      (await page.locator('div.fixed.inset-0.z-50').first().isVisible().catch(() => false)) ||
      (await page.locator('input[placeholder*="Search records"]').first().isVisible().catch(() => false));

    if (!modalLikeVisible) return;

    await closeOpenOverlay(page);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(180);
  }
}

async function exerciseCandidate(page, baseUrl, routeHref, candidate, beforeCounts) {
  await normalizeUiState(page);
  const selector = `[data-qa-sweep-id="${candidate.qid}"]`;
  const beforeUrl = page.url();
  const beforeDialogCount = await page.locator('[role="dialog"], dialog[open], [aria-modal="true"], [data-state="open"]').count().catch(() => 0);
  let clickError = '';

  const target = page.locator(selector).first();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await target.scrollIntoViewIfNeeded().catch(() => {});
      await target.click({ timeout: 4_500 });
      await page.waitForTimeout(650);
      clickError = '';
      break;
    } catch (error) {
      clickError = String(error?.message || error);
      const intercepted = /intercepts pointer events/i.test(clickError);
      if (!intercepted || attempt === 1) break;
      await closeOpenOverlay(page);
      await normalizeUiState(page);
    }
  }

  const afterUrl = page.url();
  const afterDialogCount = await page.locator('[role="dialog"], dialog[open], [aria-modal="true"], [data-state="open"]').count().catch(() => 0);
  const openedDialog = afterDialogCount > beforeDialogCount;
  const navigated = afterUrl !== beforeUrl;
  const errorSurface = await hasErrorSurface(page);

  const result = {
    candidate: {
      tag: candidate.tag,
      role: candidate.role,
      label: candidate.label,
      href: candidate.href,
      signature: candidate.signature,
      skipReason: candidate.skipReason,
    },
    beforeUrl,
    afterUrl,
    navigated,
    openedDialog,
    clickError,
    errorSurface,
    pass: !clickError && !errorSurface,
    networkFailuresAdded: 0,
    consoleErrorsAdded: 0,
    pageErrorsAdded: 0,
  };

  if (openedDialog) {
    await closeOpenOverlay(page);
  }
  await normalizeUiState(page);

  if (navigated) {
    const current = new URL(afterUrl);
    const sameOrigin = current.origin === baseUrl;
    if (!sameOrigin) {
      result.pass = false;
      result.errorSurface = true;
    } else if (!afterUrl.includes(routeHref.split('?')[0])) {
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(async () => {
        await page.goto(`${baseUrl}${routeHref}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      });
      await page.waitForTimeout(280);
    }
  }

  result.networkFailuresAdded = Math.max(0, beforeCounts.networkFailuresAfter - beforeCounts.networkFailuresBefore);
  result.consoleErrorsAdded = Math.max(0, beforeCounts.consoleAfter - beforeCounts.consoleBefore);
  result.pageErrorsAdded = Math.max(0, beforeCounts.pageAfter - beforeCounts.pageBefore);

  return result;
}

async function exerciseRoute(page, baseUrl, routeEntry, roleReport, maxInteractions) {
  const startedAtIso = nowIso();
  const routeUrl = `${baseUrl}${routeEntry.href}`;
  const result = {
    module: routeEntry.module,
    page: routeEntry.page,
    href: routeEntry.href,
    startedAtIso,
    url: routeUrl,
    load: { pass: false, finalUrl: '', errorSurface: false, heading: '' },
    interactions: {
      attempted: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      maxPerRoute: maxInteractions,
      details: [],
    },
    signals: {
      dataRowsVisible: 0,
      emptyStatesVisible: 0,
    },
    completedAtIso: '',
  };

  try {
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  } catch (_) {
    // Continue so error surface can be measured.
  }
  await page.waitForTimeout(600);
  await dismissTour(page);

  result.load.finalUrl = page.url();
  result.load.errorSurface = await hasErrorSurface(page);
  result.load.heading =
    normalizeText(await page.locator('h1, h2').first().textContent().catch(() => ''), '(none)');
  result.load.pass = !result.load.errorSurface;

  result.signals.dataRowsVisible = await page.locator('main tbody tr, main [data-row-id], main .entity-card').count().catch(() => 0);
  result.signals.emptyStatesVisible = await page
    .locator('main')
    .getByText(/No .* found|No records|No data|Empty/i)
    .count()
    .catch(() => 0);

  const testedSignatures = new Set();
  const viewportSplits = [0, 0.5, 1];
  const baseBudget = Math.floor(result.interactions.maxPerRoute / viewportSplits.length);
  let remainder = result.interactions.maxPerRoute - baseBudget * viewportSplits.length;

  for (const split of viewportSplits) {
    const localBudget = baseBudget + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    await page.evaluate((ratio) => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.round(maxY * ratio), behavior: 'auto' });
    }, split);
    await page.waitForTimeout(240);

    for (let i = 0; i < localBudget; i += 1) {
      await normalizeUiState(page);
      const candidates = await collectInteractiveCandidates(page);
      let candidate = null;
      for (const item of candidates) {
        if (testedSignatures.has(item.signature)) continue;
        candidate = item;
        break;
      }
      if (!candidate) break;
      testedSignatures.add(candidate.signature);

      if (candidate.skipReason) {
        result.interactions.skipped += 1;
        result.interactions.details.push({
          candidate: {
            tag: candidate.tag,
            role: candidate.role,
            label: candidate.label,
            href: candidate.href,
            signature: candidate.signature,
            skipReason: candidate.skipReason,
          },
          skipped: true,
        });
        continue;
      }

      const countsBefore = {
        networkFailuresBefore: roleReport.networkFailures.length,
        consoleBefore: roleReport.consoleErrors.length,
        pageBefore: roleReport.pageErrors.length,
        networkFailuresAfter: 0,
        consoleAfter: 0,
        pageAfter: 0,
      };
      const clickResult = await exerciseCandidate(page, baseUrl, routeEntry.href, candidate, countsBefore);
      countsBefore.networkFailuresAfter = roleReport.networkFailures.length;
      countsBefore.consoleAfter = roleReport.consoleErrors.length;
      countsBefore.pageAfter = roleReport.pageErrors.length;
      clickResult.networkFailuresAdded = Math.max(0, countsBefore.networkFailuresAfter - countsBefore.networkFailuresBefore);
      clickResult.consoleErrorsAdded = Math.max(0, countsBefore.consoleAfter - countsBefore.consoleBefore);
      clickResult.pageErrorsAdded = Math.max(0, countsBefore.pageAfter - countsBefore.pageBefore);

      result.interactions.attempted += 1;
      if (clickResult.pass) result.interactions.passed += 1;
      else result.interactions.failed += 1;
      result.interactions.details.push(clickResult);

      if (!(await page.url().includes(routeEntry.href.split('?')[0]))) {
        await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(280);
      }
    }
  }

  result.completedAtIso = nowIso();
  return result;
}

async function runRoleSweep({ baseUrl, role, email, password, screenshotsDir, routesCatalog, maxRoutes, maxInteractions }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();
  const roleReport = {
    role,
    email,
    startedAtNy: nowNy(),
    startedAtIso: nowIso(),
    login: null,
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    routes: [],
    screenshots: [],
    summary: {},
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      roleReport.consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    roleReport.pageErrors.push(String(error));
  });
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!url.startsWith(baseUrl) && !url.includes('supabase.co')) return;
    let body = '';
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = (await response.text()).slice(0, 260).replace(/\s+/g, ' ');
      }
    } catch (_) {
      body = '';
    }
    roleReport.networkFailures.push({
      method: response.request().method(),
      url,
      status: response.status(),
      body,
      atIso: nowIso(),
    });
  });

  roleReport.login = await typedLogin(page, baseUrl, email, password);
  if (!roleReport.login.ok) {
    const failShot = path.join(screenshotsDir, `exhaustive-${role.toLowerCase()}-login-failed-${Date.now()}.png`);
    await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
    roleReport.screenshots.push(failShot);
    await context.close();
    await browser.close();
    return roleReport;
  }

  const routes = Array.isArray(routesCatalog) && routesCatalog.length > 0
    ? routesCatalog
    : routeCatalog();
  const runRoutes = maxRoutes > 0 ? routes.slice(0, maxRoutes) : routes;
  for (const routeEntry of runRoutes) {
    console.log(`[${nowNy()}] ${role} route ${routeEntry.module} :: ${routeEntry.page} -> ${routeEntry.href}`);
    const routeResult = await exerciseRoute(page, baseUrl, routeEntry, roleReport, maxInteractions);
    roleReport.routes.push(routeResult);
  }

  const endShot = path.join(screenshotsDir, `exhaustive-${role.toLowerCase()}-end-${Date.now()}.png`);
  await page.screenshot({ path: endShot, fullPage: true }).catch(() => {});
  roleReport.screenshots.push(endShot);

  roleReport.consoleErrors = [...new Set(roleReport.consoleErrors)];
  roleReport.pageErrors = [...new Set(roleReport.pageErrors)];
  roleReport.networkFailures = dedupeNetworkFailures(roleReport.networkFailures);

  const allInteractions = roleReport.routes.reduce(
    (acc, route) => {
      acc.attempted += route.interactions.attempted;
      acc.passed += route.interactions.passed;
      acc.failed += route.interactions.failed;
      acc.skipped += route.interactions.skipped;
      if (!route.load.pass || route.interactions.failed > 0) {
        acc.routeFailures.push({
          module: route.module,
          page: route.page,
          href: route.href,
          loadPass: route.load.pass,
          failedInteractions: route.interactions.failed,
        });
      }
      return acc;
    },
    { attempted: 0, passed: 0, failed: 0, skipped: 0, routeFailures: [] }
  );

  roleReport.summary = {
    routesTotal: roleReport.routes.length,
    routesFailed: allInteractions.routeFailures.length,
    interactionsAttempted: allInteractions.attempted,
    interactionsPassed: allInteractions.passed,
    interactionsFailed: allInteractions.failed,
    interactionsSkipped: allInteractions.skipped,
    networkFailureCount: roleReport.networkFailures.length,
    consoleErrorCount: roleReport.consoleErrors.length,
    pageErrorCount: roleReport.pageErrors.length,
    routeFailures: allInteractions.routeFailures,
  };
  roleReport.completedAtNy = nowNy();
  roleReport.completedAtIso = nowIso();

  await context.close();
  await browser.close();
  return roleReport;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args['base-url'] || process.env.QA_BASE_URL || 'https://gleamops.vercel.app');
  const credsFile = String(
    args['creds-file'] || process.env.QA_CREDS_FILE || path.resolve(process.cwd(), '../../.tmp-full-qa-credentials.json')
  );
  const maxRoutes = Number(args['max-routes'] || 0);
  const maxInteractions = Number(args['max-interactions'] || 35);
  const moduleFilter = parseModuleFilter(args.module || args.modules || '');
  const roles = String(args.roles || 'OWNER_ADMIN,MANAGER')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const credentials = loadCredentials(credsFile);

  const users = roles
    .map((role) => credentials.users?.find((user) => user.role === role))
    .filter(Boolean);
  if (users.length === 0) {
    throw new Error(`No users found for roles: ${roles.join(', ')}`);
  }

  const repoRoot = path.resolve(process.cwd(), '../..');
  const reportsDir = path.join(repoRoot, 'reports');
  ensureDir(reportsDir);
  const allRoutes = routeCatalog();
  const selectedRoutes = filterRoutesByModules(allRoutes, moduleFilter);
  if (selectedRoutes.length === 0) {
    throw new Error(`No routes matched module filter: ${moduleFilter.join(', ')}`);
  }

  const session = {
    mode: 'exhaustive-ui-sweep',
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    baseUrl,
    credsFile,
    roles,
    moduleFilter: moduleFilter.length ? moduleFilter : null,
    routeCount: selectedRoutes.length,
    maxRoutes: maxRoutes || null,
    maxInteractions,
    roleResults: [],
    summary: {},
  };

  const runStartedMs = Date.now();
  const roleResults = await Promise.all(
    users.map((user) =>
      runRoleSweep({
        baseUrl,
        role: user.role,
        email: user.email,
        password: user.password,
        screenshotsDir: reportsDir,
        routesCatalog: selectedRoutes,
        maxRoutes,
        maxInteractions,
      })
    )
  );
  session.roleResults = roleResults;

  session.completedAtIso = nowIso();
  session.completedAtNy = nowNy();
  session.durationMs = Date.now() - runStartedMs;

  session.summary = session.roleResults.reduce(
    (acc, roleResult) => {
      acc.roles += 1;
      acc.routesTotal += roleResult.summary.routesTotal || 0;
      acc.routesFailed += roleResult.summary.routesFailed || 0;
      acc.interactionsAttempted += roleResult.summary.interactionsAttempted || 0;
      acc.interactionsFailed += roleResult.summary.interactionsFailed || 0;
      acc.networkFailures += roleResult.summary.networkFailureCount || 0;
      acc.consoleErrors += roleResult.summary.consoleErrorCount || 0;
      acc.pageErrors += roleResult.summary.pageErrorCount || 0;
      if ((roleResult.summary.routesFailed || 0) > 0 || (roleResult.summary.interactionsFailed || 0) > 0) {
        acc.failedRoles.push(roleResult.role);
      }
      return acc;
    },
    {
      roles: 0,
      routesTotal: 0,
      routesFailed: 0,
      interactionsAttempted: 0,
      interactionsFailed: 0,
      networkFailures: 0,
      consoleErrors: 0,
      pageErrors: 0,
      failedRoles: [],
    }
  );

  const outPath =
    args.out || path.join(repoRoot, `.tmp-exhaustive-ui-sweep-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2));
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
