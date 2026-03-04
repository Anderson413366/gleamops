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

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadCredentials(credsFile) {
  if (!credsFile || !fs.existsSync(credsFile)) {
    throw new Error(`Credentials file not found: ${credsFile}`);
  }
  return JSON.parse(fs.readFileSync(credsFile, 'utf8'));
}

function dedupeNetworkFailures(failures) {
  const unique = new Map();
  for (const failure of failures) {
    const key = `${failure.method}|${failure.url}|${failure.status}|${failure.body}`;
    if (!unique.has(key)) unique.set(key, failure);
  }
  return Array.from(unique.values());
}

async function dismissTour(page) {
  const skipBtn = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function typedLogin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { state: 'visible', timeout: 10_000 });
  await page.fill('#email', '');
  await page.type('#email', email, { delay: 10 });
  await page.fill('#password', '');
  await page.type('#password', password, { delay: 10 });
  await page.waitForTimeout(250);

  const fieldSnapshot = await page.evaluate(() => ({
    email: document.querySelector('#email')?.value || '',
    passwordLength: document.querySelector('#password')?.value?.length || 0,
  }));

  await page.getByRole('button', { name: /^Sign in$/i }).click({ timeout: 5_000 });

  const start = Date.now();
  while (Date.now() - start < 25_000) {
    if (page.url().includes('/home')) {
      return { ok: true, reason: 'redirected-to-home', fieldSnapshot };
    }
    await page.waitForTimeout(200);
  }

  return {
    ok: false,
    reason: `login-timeout-url:${page.url()}`,
    fieldSnapshot,
  };
}

async function openCommandPalette(page) {
  const input = page.locator('input[placeholder*="Search records"]').first();
  await page.keyboard.press('Meta+KeyK').catch(() => {});
  await page.waitForTimeout(200);
  if (!(await input.isVisible().catch(() => false))) {
    await page.keyboard.press('Control+KeyK').catch(() => {});
  }
  await input.waitFor({ state: 'visible', timeout: 4_000 });
  return input;
}

async function runCommonGlobalChecks(page, baseUrl) {
  const checks = {};
  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  checks.tourDismissed = await dismissTour(page);

  const paletteInput = await openCommandPalette(page).catch(() => null);
  checks.paletteOpen = !!paletteInput;
  if (paletteInput) {
    await paletteInput.fill('go to schedule');
    await page.waitForTimeout(350);
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1_100);
    checks.paletteGoToScheduleUrl = page.url();
    checks.paletteGoToScheduleOk = page.url().includes('/schedule');
  }

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const quickBtn = page.getByRole('button', { name: /^Quick Action$/i }).first();
  checks.quickActionVisible = await quickBtn.isVisible().catch(() => false);
  if (checks.quickActionVisible) {
    await quickBtn.click().catch(() => {});
    await page.waitForTimeout(250);
    const newProspectBtn = page.getByRole('button', { name: /New Prospect/i }).first();
    checks.quickActionNewProspectVisible = await newProspectBtn.isVisible().catch(() => false);
    if (checks.quickActionNewProspectVisible) {
      await newProspectBtn.click().catch(() => {});
      await page.waitForTimeout(1_100);
      checks.quickActionNewProspectUrl = page.url();
      checks.quickActionNewProspectOk = page.url().includes('/pipeline');
    }
  }

  await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);
  await page.keyboard.press('Shift+/').catch(() => {});
  await page.waitForTimeout(300);
  checks.shortcutsModalVisible = await page
    .getByText(/Keyboard shortcuts|Shortcuts/i)
    .first()
    .isVisible()
    .catch(() => false);
  await page.keyboard.press('Escape').catch(() => {});

  return checks;
}

async function clickSettingsTab(page, tabName) {
  const tablist = page.locator('main [role="tablist"]').first();
  await tablist.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  const patterns =
    tabName === 'Time Clock'
      ? [/^Time Clock$/i, /Time Clock Settings/i]
      : tabName === 'Schedule'
        ? [/^Schedule$/i, /Schedule Settings/i]
        : [new RegExp(`^${tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')];

  const findDirectCandidates = () => {
    const candidates = [];
    for (const pattern of patterns) {
      candidates.push(tablist.getByRole('tab', { name: pattern }).first());
      candidates.push(tablist.getByRole('button', { name: pattern }).first());
      candidates.push(
        tablist
          .locator('button,[role="tab"]')
          .filter({ hasText: pattern })
          .first()
      );
    }
    return candidates;
  };

  const directCandidates = [
    ...findDirectCandidates(),
  ];

  for (const candidate of directCandidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
      return true;
    }
  }

  const moreButton = tablist.getByRole('button', { name: /More/i }).first();
  if (await moreButton.isVisible().catch(() => false)) {
    await moreButton.click({ timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(250);

    const overflowCandidates = [];
    for (const pattern of patterns) {
      overflowCandidates.push(page.getByRole('menuitem', { name: pattern }).first());
      overflowCandidates.push(page.getByRole('button', { name: pattern }).first());
      overflowCandidates.push(page.getByRole('tab', { name: pattern }).first());
      overflowCandidates.push(page.getByText(pattern).first());
    }

    for (const candidate of overflowCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(500);
        return true;
      }
    }
  }

  return false;
}

async function runSettingsChecks(page, baseUrl, role, mutationAllowed) {
  const checks = {};
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_000);
  checks.settingsUrl = page.url();
  checks.settingsHeading = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';

  const expectedTabs = [
    'General',
    'Lookups',
    'Geofences',
    'Rules',
    'Data Hub',
    'Sequences',
    'Import',
    'Schedule',
    'Time Clock',
  ];
  checks.settingsTabs = {};
  for (const tabName of expectedTabs) {
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    checks.settingsTabs[tabName] = await clickSettingsTab(page, tabName);
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  checks.tabLoad = {};

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Lookups')) {
    checks.tabLoad.lookups = {
      url: page.url(),
      newLookupVisible: await page.getByRole('button', { name: /New Lookup/i }).first().isVisible().catch(() => false),
      searchVisible: await page.getByPlaceholder('Search lookups...').first().isVisible().catch(() => false),
    };

    if (mutationAllowed) {
      const token = Date.now();
      const testCategory = `TEST-CAT-${token}`;
      const testCode = `TEST-CODE-${token}`;
      const testLabel = `TEST Lookup ${token}`;
      const updatedLabel = `TEST Lookup ${token} Updated & / # '"`;

      await page.getByRole('button', { name: /New Lookup/i }).first().click({ timeout: 6_000 }).catch(() => {});
      await page.waitForTimeout(350);
      await page.fill('#category', testCategory).catch(() => {});
      await page.fill('#code', testCode).catch(() => {});
      await page.fill('#label', testLabel).catch(() => {});
      await page.fill('#sort-order', '1').catch(() => {});
      await page.getByRole('button', { name: /Create Lookup/i }).first().click({ timeout: 6_000 }).catch(() => {});
      await page.waitForTimeout(850);

      await page.getByPlaceholder('Search lookups...').first().fill(testCode).catch(() => {});
      await page.waitForTimeout(700);

      const row = page.locator('tr', { hasText: testCode }).first();
      const rowVisible = await row.isVisible().catch(() => false);
      if (rowVisible) {
        await row.click().catch(() => {});
      }
      await page.waitForTimeout(700);

      const hydratedValues = await page.evaluate(() => ({
        category: document.querySelector('#category')?.value || '',
        code: document.querySelector('#code')?.value || '',
        label: document.querySelector('#label')?.value || '',
      }));

      await page.fill('#label', ` ${updatedLabel} `).catch(() => {});
      await page.getByRole('button', { name: /Save Changes|Update Lookup/i }).first().click({ timeout: 6_000 }).catch(() => {});
      await page.waitForTimeout(900);

      const formStillOpen = await page.locator('#category').isVisible().catch(() => false);
      await page.getByPlaceholder('Search lookups...').first().fill(testCode).catch(() => {});
      await page.waitForTimeout(700);
      const updatedRowContainsText = await page
        .locator('tr', { hasText: testCode })
        .first()
        .textContent()
        .then((value) => value?.includes('Updated') ?? false)
        .catch(() => false);

      checks.lookupMutation = {
        role,
        testCategory,
        testCode,
        testLabel,
        hydratedValues,
        saveClosedForm: !formStillOpen,
        updatedRowContainsText,
      };
    } else {
      checks.lookupMutation = {
        role,
        skipped: true,
        reason: 'Mutation disabled for this role in accelerated pass.',
      };
    }
  } else {
    checks.tabLoad.lookups = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Geofences')) {
    checks.tabLoad.geofences = {
      url: page.url(),
      addButtonVisible: await page.getByRole('button', { name: /New Geofence|Add Geofence/i }).first().isVisible().catch(() => false),
      searchVisible: await page.getByPlaceholder(/Search geofences/i).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.geofences = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Rules')) {
    checks.tabLoad.rules = {
      url: page.url(),
      hasRulesHeading: await page.getByText(/Rules|Status/i).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.rules = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Data Hub')) {
    checks.tabLoad.dataHub = {
      url: page.url(),
      webhooksVisible: await page.getByRole('heading', { name: /Webhooks/i }).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.dataHub = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Sequences')) {
    checks.tabLoad.sequences = {
      url: page.url(),
      newSequenceVisible: await page.getByRole('button', { name: /New Sequence/i }).first().isVisible().catch(() => false),
      emptyOrTableVisible:
        (await page.getByText(/No sequences|No records/i).first().isVisible().catch(() => false)) ||
        (await page.getByRole('columnheader', { name: /Prefix|Entity/i }).first().isVisible().catch(() => false)),
    };
  } else {
    checks.tabLoad.sequences = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Import')) {
    checks.tabLoad.import = {
      url: page.url(),
      importVisible: await page.getByText(/Import|CSV|Upload/i).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.import = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Schedule')) {
    checks.tabLoad.schedule = {
      url: page.url(),
      scheduleVisible: await page.getByText(/Schedule|Shifts|Coverage/i).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.schedule = { missing: true };
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (await clickSettingsTab(page, 'Time Clock')) {
    checks.tabLoad.timeClock = {
      url: page.url(),
      timeClockVisible: await page.getByText(/Time Clock|PIN|Geofence/i).first().isVisible().catch(() => false),
    };
  } else {
    checks.tabLoad.timeClock = { missing: true };
  }

  return checks;
}

async function runRole({
  role,
  email,
  password,
  moduleName,
  baseUrl,
  repoRoot,
  screenshotsDir,
  mutationRoles,
}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();

  const roleSlug = slugify(role);
  const report = {
    role,
    email,
    startedAtNy: nowNy(),
    module: moduleName,
    checks: {},
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    screenshots: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });

  page.on('pageerror', (error) => {
    report.pageErrors.push(String(error));
  });

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

  const login = await typedLogin(page, baseUrl, email, password);
  report.checks.login = login;
  if (!login.ok) {
    const failedShot = path.join(screenshotsDir, `accelerated-${slugify(moduleName)}-${roleSlug}-login-fail-${Date.now()}.png`);
    await page.screenshot({ path: failedShot, fullPage: true }).catch(() => {});
    report.screenshots.push(failedShot);
    report.completedAtNy = nowNy();
    await context.close();
    await browser.close();
    report.consoleErrors = [...new Set(report.consoleErrors)];
    report.pageErrors = [...new Set(report.pageErrors)];
    report.networkFailures = dedupeNetworkFailures(report.networkFailures);
    return report;
  }

  await page.waitForTimeout(500);
  report.checks.homeHeading = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';
  report.checks.commonGlobal = await runCommonGlobalChecks(page, baseUrl);

  if (moduleName === 'settings') {
    report.checks.module = await runSettingsChecks(
      page,
      baseUrl,
      role,
      mutationRoles.includes(role)
    );
  } else if (moduleName === 'home-search') {
    report.checks.module = { note: 'home-search checks are covered in commonGlobal for accelerated pass.' };
  } else {
    report.checks.module = { unsupported: true, moduleName };
  }

  const endShot = path.join(screenshotsDir, `accelerated-${slugify(moduleName)}-${roleSlug}-end-${Date.now()}.png`);
  await page.screenshot({ path: endShot, fullPage: true }).catch(() => {});
  report.screenshots.push(endShot);

  report.completedAtNy = nowNy();
  report.consoleErrors = [...new Set(report.consoleErrors)];
  report.pageErrors = [...new Set(report.pageErrors)];
  report.networkFailures = dedupeNetworkFailures(report.networkFailures);

  await context.close();
  await browser.close();

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const moduleName = String(args.module || 'settings').toLowerCase();
  const baseUrl = String(args['base-url'] || process.env.QA_BASE_URL || 'https://gleamops.vercel.app');
  const credsFile = String(
    args['creds-file'] ||
      process.env.QA_CREDS_FILE ||
      path.resolve(process.cwd(), '../../.tmp-home-search-qa-credentials.json')
  );
  const rolesArg = String(args.roles || 'OWNER_ADMIN,MANAGER');
  const roles = rolesArg
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const mutationRolesArg = String(args['mutation-roles'] || 'OWNER_ADMIN');
  const mutationRoles = mutationRolesArg
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const credentials = loadCredentials(credsFile);
  const repoRoot = path.resolve(process.cwd(), '../..');
  const screenshotsDir = path.join(repoRoot, 'reports');
  ensureDir(screenshotsDir);

  const session = {
    mode: 'accelerated-module-qa',
    module: moduleName,
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    baseUrl,
    credsFile,
    roles,
    mutationRoles,
    results: [],
  };

  const users = roles
    .map((role) => credentials.users?.find((user) => user.role === role))
    .filter(Boolean);

  if (users.length === 0) {
    throw new Error(`No matching users found for requested roles: ${roles.join(', ')}`);
  }

  const runStart = Date.now();
  const results = await Promise.all(
    users.map((user) =>
      runRole({
        role: user.role,
        email: user.email,
        password: user.password,
        moduleName,
        baseUrl,
        repoRoot,
        screenshotsDir,
        mutationRoles,
      })
    )
  );

  session.results = results;
  session.completedAtIso = nowIso();
  session.completedAtNy = nowNy();
  session.durationMs = Date.now() - runStart;

  const outFile =
    args.out ||
    path.join(
      repoRoot,
      `.tmp-accelerated-${slugify(moduleName)}-${Date.now()}.json`
    );
  fs.writeFileSync(outFile, JSON.stringify(session, null, 2));
  console.log(outFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
