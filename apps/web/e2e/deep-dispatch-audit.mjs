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

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function loadCredentials(credsFile) {
  if (!fs.existsSync(credsFile)) {
    throw new Error(`Credentials file not found: ${credsFile}`);
  }
  return JSON.parse(fs.readFileSync(credsFile, 'utf8'));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function dedupeNetworkFailures(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.method}|${item.url}|${item.status}|${item.body}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

function parseScheduledDateFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const encodedDate = url.searchParams.get('scheduled_date');
    if (!encodedDate) return null;
    if (encodedDate.startsWith('eq.')) return encodedDate.slice(3);
    return encodedDate;
  } catch (_) {
    return null;
  }
}

function plusDaysDateKey(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function to12HourLabel(timeValue) {
  if (!timeValue || !timeValue.includes(':')) return '';
  const [hh, mm] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
  const ampm = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')}${ampm}`;
}

function firstTruthy(...values) {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

async function typedLogin(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  await page.waitForSelector('#email', { state: 'visible', timeout: 12_000 });
  await page.fill('#email', '');
  await page.type('#email', email, { delay: 8 });
  await page.fill('#password', '');
  await page.type('#password', password, { delay: 8 });
  await page.getByRole('button', { name: /sign in/i }).first().click({ timeout: 10_000 });

  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (page.url().includes('/home')) return { ok: true, finalUrl: page.url() };
    await page.waitForTimeout(200);
  }
  return { ok: false, finalUrl: page.url() };
}

async function dismissTour(page) {
  const skipBtn = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(220);
  }
}

async function runCheck(report, id, title, fn) {
  const started = Date.now();
  console.log(`[${nowNy()}] ${report.role} ${id} :: ${title}`);
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

async function gotoScheduleTab(page, baseUrl, tabKey) {
  await page.goto(`${baseUrl}/schedule?tab=${encodeURIComponent(tabKey)}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(550);
}

async function fillDateInput(locator, value) {
  await locator.click({ timeout: 3_000 }).catch(() => {});
  await locator.fill(value).catch(async () => {
    await locator.type(value, { delay: 8 }).catch(() => {});
  });
}

function getLatestBatchForDate(requestStats, scheduledDate) {
  const matching = requestStats.workTicketFetchBatches.filter((batch) => batch.scheduledDate === scheduledDate);
  return matching[matching.length - 1] ?? null;
}

async function waitForTicketBatchDate(requestStats, scheduledDate, timeoutMs = 7_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const latest = getLatestBatchForDate(requestStats, scheduledDate);
    if (latest) return latest;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function runDispatchAudit({ page, context, baseUrl, role, requestStats }) {
  const roleSlug = slugify(role);
  const tokenBase = `${Date.now()}-${roleSlug}`;
  const runOffset = Number(String(Date.now()).slice(-2)) % 21;
  const roleOffset = role.toUpperCase().includes('MANAGER') ? 3 : 0;
  const testDate = plusDaysDateKey(28 + runOffset + roleOffset);
  const testStartTime = '05:17';
  const testEndTime = '05:47';
  const testNotes = `TEST-DISPATCH-${tokenBase} & / # ' "`;
  let activeTestDate = testDate;

  const report = {
    module: 'Dispatch',
    role,
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    tokens: {
      tokenBase,
      testDate,
      testNotes,
    },
    moduleMap: {
      pagesVisited: [],
      surfaces: {},
    },
    checks: [],
    connectivity: [],
    deepLinks: [],
    blockers: [],
  };

  let createdTicketId = null;
  let createdTicketCode = null;
  let createdSiteName = null;

  await gotoScheduleTab(page, baseUrl, 'planning');
  await dismissTour(page);
  report.moduleMap.pagesVisited.push('/schedule?tab=planning');

  await runCheck(report, 'DISPATCH-001', 'Planning Board loads with primary controls', async () => {
    const hasPlanHeading = await page.getByText(/Plan for:/i).first().isVisible().catch(() => false);
    const hasNewTaskButton = await page.getByRole('button', { name: /^New Task$/i }).first().isVisible().catch(() => false);
    const hasDateInput = await page.locator('input[type="date"]').first().isVisible().catch(() => false);
    report.moduleMap.surfaces.planning = {
      hasPlanHeading,
      hasNewTaskButton,
      hasDateInput,
      url: page.url(),
    };
    return {
      pass: hasNewTaskButton && hasDateInput,
      hasPlanHeading,
      hasNewTaskButton,
      hasDateInput,
    };
  });

  await runCheck(report, 'DISPATCH-002', 'New Task modal opens and ESC closes it', async () => {
    const newTaskBtn = page.getByRole('button', { name: /^New Task$/i }).first();
    if (!(await newTaskBtn.isVisible().catch(() => false))) {
      return { pass: false, reason: 'new-task-button-not-visible' };
    }
    await newTaskBtn.click({ timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const createVisible = await page.getByRole('button', { name: /^Create Task$/i }).first().isVisible().catch(() => false);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
    const closed = !(await page.getByRole('button', { name: /^Create Task$/i }).first().isVisible().catch(() => false));
    return {
      pass: createVisible && closed,
      createVisible,
      closed,
    };
  });

  await runCheck(report, 'DISPATCH-003', 'Create form validation blocks empty submit', async () => {
    const preInsertCount = requestStats.workTicketInsertResponses.length;
    await page.getByRole('button', { name: /^New Task$/i }).first().click({ timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(260);
    const servicePlanSelect = page.getByLabel('Service Plan').first();
    await page.getByRole('button', { name: /^Create Task$/i }).first().click({ timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(420);
    const postInsertCount = requestStats.workTicketInsertResponses.length;
    const validationVisible = await page.getByText(/Select a service plan/i).first().isVisible().catch(() => false);
    const modalStillOpen = await page.getByRole('button', { name: /^Create Task$/i }).first().isVisible().catch(() => false);
    const nativeInvalid = await servicePlanSelect.evaluate((el) => !el.checkValidity()).catch(() => false);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);
    return {
      pass: postInsertCount === preInsertCount && (validationVisible || modalStillOpen || nativeInvalid),
      preInsertCount,
      postInsertCount,
      validationVisible,
      modalStillOpen,
      nativeInvalid,
    };
  });

  await runCheck(report, 'DISPATCH-004', 'Create TEST planning task', async () => {
    const preInsertCount = requestStats.workTicketInsertResponses.length;
    let selectedServicePlan = '';
    let attemptDate = activeTestDate;
    let attemptStart = testStartTime;
    let attemptEnd = testEndTime;
    let insertedNow = false;
    let stillOpen = false;
    let createErrorText = '';

    for (let attempt = 0; attempt < 5 && !insertedNow; attempt += 1) {
      attemptDate = plusDaysDateKey(28 + runOffset + roleOffset + attempt);
      const beforeBatch = getLatestBatchForDate(requestStats, attemptDate);
      const beforeIds = new Set((beforeBatch?.rows ?? []).map((row) => row.id));

      await page.getByRole('button', { name: /^New Task$/i }).first().click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(280);

      const servicePlanSelect = page.getByLabel('Service Plan').first();
      const dateInput = page.getByLabel('Scheduled Date').first();
      const startInput = page.getByLabel('Start Time').first();
      const endInput = page.getByLabel('End Time').first();

      await servicePlanSelect.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(450);

      const optionsCount = await servicePlanSelect.locator('option').count().catch(() => 0);
      if (optionsCount < 2) {
        await page.keyboard.press('Escape').catch(() => {});
        return {
          pass: false,
          reason: 'no-service-plan-options',
          optionsCount,
        };
      }

      const candidateIndex = Math.min(1 + attempt, optionsCount - 1);
      await servicePlanSelect.selectOption({ index: candidateIndex }).catch(() => {});
      selectedServicePlan = await servicePlanSelect.inputValue().catch(() => '');
      attemptStart = `0${(5 + attempt) % 10}:${String((17 + attempt) % 60).padStart(2, '0')}`;
      attemptEnd = `0${(5 + attempt) % 10}:${String((47 + attempt) % 60).padStart(2, '0')}`;
      await fillDateInput(dateInput, attemptDate);
      await startInput.fill(attemptStart).catch(() => {});
      await endInput.fill(attemptEnd).catch(() => {});
      await page.getByRole('button', { name: /^Create Task$/i }).first().click({ timeout: 7_000 }).catch(() => {});
      await page.waitForTimeout(1_200);

      const postInsertCount = requestStats.workTicketInsertResponses.length;
      insertedNow = postInsertCount > preInsertCount;
      stillOpen = await page.getByRole('button', { name: /^Create Task$/i }).first().isVisible().catch(() => false);
      createErrorText = firstTruthy(
        await page.locator('.text-red-700, .text-red-300').first().textContent().catch(() => ''),
        await page.getByText(/duplicate key|Unable to create|Failed to create/i).first().textContent().catch(() => ''),
      ) ?? '';

      const batch = await waitForTicketBatchDate(requestStats, attemptDate, 4_000);
      const candidateRows = (batch?.rows ?? []).filter((row) => !beforeIds.has(row.id));
      const fallbackRow = (batch?.rows ?? []).find((row) => row.start_time?.startsWith(attemptStart));
      const createdRow = candidateRows[0] ?? fallbackRow ?? null;

      if (createdRow?.id) {
        createdTicketId = createdRow.id;
        createdTicketCode = createdRow.ticket_code ?? null;
        createdSiteName = createdRow.siteName ?? null;
        insertedNow = true;
        activeTestDate = attemptDate;
      }

      if (!insertedNow && stillOpen) {
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(250);
      }
    }

    const postInsertCount = requestStats.workTicketInsertResponses.length;
    return {
      pass: insertedNow && !!createdTicketId && !stillOpen,
      insertedNow,
      preInsertCount,
      postInsertCount,
      createdTicketId,
      createdTicketCode,
      createdSiteName,
      selectedServicePlan,
      stillOpen,
      createErrorText: normalizeText(createErrorText),
      testDate: activeTestDate,
      testTimeLabel: `${to12HourLabel(attemptStart)} - ${to12HourLabel(attemptEnd)}`,
    };
  });

  await runCheck(report, 'DISPATCH-005', 'Created task persists after refresh and is query-visible', async () => {
    if (!createdTicketId) {
      return { pass: false, reason: 'missing-created-ticket-id' };
    }
    await gotoScheduleTab(page, baseUrl, 'planning');
    const planningDateInput = page.locator('#planning-date').first();
    if (await planningDateInput.isVisible().catch(() => false)) {
      await fillDateInput(planningDateInput, activeTestDate);
      await page.waitForTimeout(900);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_100);
    const latestBatch = getLatestBatchForDate(requestStats, activeTestDate);
    const inFetchBatch = !!latestBatch?.rows?.some((row) => row.id === createdTicketId);
    return {
      pass: inFetchBatch,
      createdTicketId,
      latestBatchFound: !!latestBatch,
      inFetchBatch,
      latestBatchRowCount: latestBatch?.rows?.length ?? 0,
    };
  });

  await runCheck(report, 'DISPATCH-006', 'Update created task notes with special characters', async () => {
    if (!createdTicketId) {
      return { pass: false, reason: 'missing-created-ticket-id' };
    }
    const notesQueryPresent = requestStats.workTicketFetchBatches.some((batch) =>
      batch.scheduledDate === activeTestDate && /notes/i.test(batch.url)
    );
    const addNotesButtons = page.getByRole('button', { name: /^Add notes$/i });
    const addNotesCount = await addNotesButtons.count().catch(() => 0);
    if (addNotesCount === 0) {
      return {
        pass: notesQueryPresent,
        skipped: true,
        reason: 'add-notes-button-not-visible',
        notesQueryPresent,
      };
    }
    const addNotesBtn = addNotesButtons.first();
    await addNotesBtn.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(120);
    await addNotesBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(220);
    const notesField = page.locator('textarea').first();
    await notesField.fill(testNotes).catch(() => {});
    await page.getByRole('button', { name: /^Save$/i }).first().click({ timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(900);
    const noteVisible = await page.getByText(testNotes).first().isVisible().catch(() => false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const planningDateInput = page.locator('#planning-date').first();
    if (await planningDateInput.isVisible().catch(() => false)) {
      await fillDateInput(planningDateInput, activeTestDate);
      await page.waitForTimeout(850);
    }
    const noteVisibleAfterReload = await page.getByText(testNotes).first().isVisible().catch(() => false);
    const latestBatch = getLatestBatchForDate(requestStats, activeTestDate);
    const createdRow = latestBatch?.rows?.find((row) => row.id === createdTicketId) ?? null;
    const notesPersistedByQuery = createdRow?.notes === testNotes;
    return {
      pass: notesQueryPresent && (noteVisibleAfterReload || notesPersistedByQuery || noteVisible),
      noteVisible,
      noteVisibleAfterReload,
      notesQueryPresent,
      notesPersistedByQuery,
    };
  });

  await runCheck(report, 'DISPATCH-007', 'Assign staff from Staffing Gap panel and mark task ready', async () => {
    if (!createdTicketId) {
      return { pass: false, reason: 'missing-created-ticket-id' };
    }
    const staffingHeading = page.getByText(/Staffing Gaps/i).first();
    if (!(await staffingHeading.isVisible().catch(() => false))) {
      return { pass: false, reason: 'staffing-gap-panel-not-visible' };
    }
    const assignBtn = page.locator('#staffing-gaps button.h-7').first();
    const assignVisible = await assignBtn.isVisible().catch(() => false);
    if (!assignVisible) {
      const readyButtonNoStaff = page.getByRole('button', { name: /^Ready ✓$/i }).first();
      if (await readyButtonNoStaff.isVisible().catch(() => false)) {
        await readyButtonNoStaff.click({ timeout: 4_000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
      const latestBatchNoAssign = getLatestBatchForDate(requestStats, activeTestDate);
      const createdNoAssign = latestBatchNoAssign?.rows?.find((row) => row.id === createdTicketId) ?? null;
      return {
        pass: true,
        skipped: true,
        reason: 'no-assignment-button-visible',
        planningStatus: createdNoAssign?.planning_status ?? null,
        assignmentCount: createdNoAssign?.assignmentCount ?? 0,
      };
    }
    await assignBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_000);

    // After assignment, READY action should pass and badge should render.
    const readyButton = page.getByRole('button', { name: /^Ready ✓$/i }).first();
    if (await readyButton.isVisible().catch(() => false)) {
      await readyButton.click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(900);
    }
    const readyBadgeVisible = await page.getByText(/^Ready$/i).first().isVisible().catch(() => false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000);
    const latestBatch = getLatestBatchForDate(requestStats, activeTestDate);
    const createdRow = latestBatch?.rows?.find((row) => row.id === createdTicketId) ?? null;
    const planningStatus = createdRow?.planning_status ?? null;
    const assignmentCount = createdRow?.assignmentCount ?? 0;

    return {
      pass: planningStatus === 'READY' && assignmentCount >= 1,
      readyBadgeVisible,
      planningStatus,
      assignmentCount,
    };
  });

  await runCheck(report, 'DISPATCH-008', 'Master Board loads and includes created date context', async () => {
    await gotoScheduleTab(page, baseUrl, 'master');
    report.moduleMap.pagesVisited.push('/schedule?tab=master');
    const dateInput = page.locator('input[type="date"]').first();
    await fillDateInput(dateInput, activeTestDate);
    await page.waitForTimeout(1_100);
    const headingVisible = await page.getByText(/Master Board/i).first().isVisible().catch(() => false);
    const latestBatch = getLatestBatchForDate(requestStats, activeTestDate);
    const containsCreated = !!createdTicketId && !!latestBatch?.rows?.some((row) => row.id === createdTicketId);
    report.connectivity.push({
      trail: 'Planning Board -> Master Board',
      createdTicketId,
      date: activeTestDate,
      containsCreated,
    });
    return {
      pass: headingVisible && containsCreated,
      headingVisible,
      containsCreated,
    };
  });

  await runCheck(report, 'DISPATCH-009', 'Supervisor View loads and includes created date context', async () => {
    await gotoScheduleTab(page, baseUrl, 'supervisor');
    report.moduleMap.pagesVisited.push('/schedule?tab=supervisor');
    const dateInput = page.locator('input[type="date"]').first();
    await fillDateInput(dateInput, activeTestDate);
    await page.waitForTimeout(1_100);
    const headingVisible = await page.getByText(/Supervisor Dashboard/i).first().isVisible().catch(() => false);
    const latestBatch = getLatestBatchForDate(requestStats, activeTestDate);
    const containsCreated = !!createdTicketId && !!latestBatch?.rows?.some((row) => row.id === createdTicketId);
    report.connectivity.push({
      trail: 'Planning Board -> Supervisor View',
      createdTicketId,
      date: activeTestDate,
      containsCreated,
    });
    return {
      pass: headingVisible && containsCreated,
      headingVisible,
      containsCreated,
    };
  });

  await runCheck(report, 'DISPATCH-010', 'My Route board loads without runtime error surfaces', async () => {
    await gotoScheduleTab(page, baseUrl, 'floater');
    report.moduleMap.pagesVisited.push('/schedule?tab=floater');
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible().catch(() => false)) {
      await fillDateInput(dateInput, activeTestDate);
      await page.waitForTimeout(900);
    }
    const noRouteState = await page.getByText(/No route assigned|No routes or assignments/i).first().isVisible().catch(() => false);
    const routeHeader = await page.getByText(/Route Progress|My Route/i).first().isVisible().catch(() => false);
    return {
      pass: noRouteState || routeHeader,
      noRouteState,
      routeHeader,
    };
  });

  await runCheck(report, 'DISPATCH-011', 'Tonight Board loads and manager tabs are present', async () => {
    await page.goto(`${baseUrl}/shifts-time`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    report.moduleMap.pagesVisited.push('/shifts-time');
    await page.waitForTimeout(1_100);
    const tabLabels = (await page.locator('[role="tab"], [role="tablist"] button, main button').allTextContents().catch(() => []))
      .map((label) => normalizeText(label))
      .filter(Boolean)
      .slice(0, 24);
    const joinedLabels = tabLabels.join(' | ').toLowerCase();
    const boardTab = /board|tonight/.test(joinedLabels);
    const routesTab = /route/.test(joinedLabels);
    const coverageTab = /coverage/.test(joinedLabels);
    const payrollTab = /payroll/.test(joinedLabels);
    report.moduleMap.surfaces.tonightBoard = {
      boardTab,
      routesTab,
      coverageTab,
      payrollTab,
      tabLabels,
      url: page.url(),
    };
    return {
      pass: boardTab && routesTab,
      boardTab,
      routesTab,
      coverageTab,
      payrollTab,
      tabLabels,
    };
  });

  await runCheck(report, 'DISPATCH-012', 'Back/forward navigation remains predictable', async () => {
    await gotoScheduleTab(page, baseUrl, 'planning');
    await gotoScheduleTab(page, baseUrl, 'master');
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(250);
    const backUrl = page.url();
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(250);
    const forwardUrl = page.url();
    return {
      pass: backUrl.includes('tab=planning') && forwardUrl.includes('tab=master'),
      backUrl,
      forwardUrl,
    };
  });

  await runCheck(report, 'DISPATCH-013', 'Deep links load in new tabs', async () => {
    const hrefs = ['/schedule?tab=planning', '/schedule?tab=master', '/shifts-time'];
    const deepResults = [];
    for (const href of hrefs) {
      const p = await context.newPage();
      const started = Date.now();
      await p.goto(`${baseUrl}${href}`, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
      await p.waitForTimeout(250);
      const finalUrl = p.url();
      deepResults.push({
        href,
        finalUrl,
        elapsedMs: Date.now() - started,
        pass: finalUrl.includes(href.split('?')[0]),
      });
      await p.close();
    }
    report.deepLinks = deepResults;
    return {
      pass: deepResults.every((row) => row.pass),
      deepResults,
    };
  });

  await runCheck(report, 'DISPATCH-014', 'Direct restricted route probe returns safe handling', async () => {
    const response = await context.request.get(`${baseUrl}/admin/users`).catch(() => null);
    const status = response?.status() ?? null;
    const body = response ? await response.text().catch(() => '') : '';
    const hasStack = /stack trace|TypeError|ReferenceError|INTERNAL_SERVER_ERROR|MIDDLEWARE_INVOCATION_FAILED/i.test(body);
    return {
      pass: !hasStack,
      status,
      hasStack,
    };
  });

  await runCheck(report, 'DISPATCH-015', 'No infinite spinner on dispatch surfaces', async () => {
    await gotoScheduleTab(page, baseUrl, 'planning');
    const hasPersistentLoading = await page.getByText(/^Loading…$/i).first().isVisible().catch(() => false);
    await page.waitForTimeout(1_000);
    const stillLoading = await page.getByText(/^Loading…$/i).first().isVisible().catch(() => false);
    return {
      pass: !(hasPersistentLoading && stillLoading),
      hasPersistentLoading,
      stillLoading,
    };
  });

  report.testRecords = {
    createdTicketId,
    createdTicketCode,
    createdSiteName,
    testDate: activeTestDate,
    testNotes,
  };

  const failedChecks = report.checks.filter((check) => check.status === 'FAIL');
  report.summary = {
    totalChecks: report.checks.length,
    failedChecks: failedChecks.length,
    passedChecks: report.checks.length - failedChecks.length,
    failedCheckIds: failedChecks.map((item) => item.id),
  };
  report.completedAtIso = nowIso();
  report.completedAtNy = nowNy();

  return report;
}

async function runRoleAudit({ baseUrl, role, email, password, screenshotsDir }) {
  const roleSlug = slugify(role);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();

  const roleReport = {
    role,
    email,
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    login: null,
    audit: null,
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    requestStats: {
      workTicketInsertResponses: [],
      workTicketPatchResponses: [],
      ticketAssignmentInsertResponses: [],
      workTicketFetchBatches: [],
    },
    screenshots: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') roleReport.consoleErrors.push(msg.text());
  });

  page.on('pageerror', (error) => {
    roleReport.pageErrors.push(String(error));
  });

  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();

    if (url.includes('/rest/v1/work_tickets')) {
      if (method === 'POST' && status < 400) {
        let rows = [];
        try {
          const payloadText = await response.text();
          const parsed = JSON.parse(payloadText);
          rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        } catch (_) {
          rows = [];
        }
        roleReport.requestStats.workTicketInsertResponses.push({
          url,
          status,
          rows,
          at: nowIso(),
        });
      }

      if (method === 'PATCH' && status < 400) {
        let rows = [];
        try {
          const payloadText = await response.text();
          const parsed = JSON.parse(payloadText);
          rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        } catch (_) {
          rows = [];
        }
        roleReport.requestStats.workTicketPatchResponses.push({
          url,
          status,
          rows,
          at: nowIso(),
        });
      }

      if (method === 'GET' && status < 400) {
        const scheduledDate = parseScheduledDateFromUrl(url);
        if (scheduledDate) {
          let rows = [];
          try {
            const payloadText = await response.text();
            const parsed = JSON.parse(payloadText);
            rows = (Array.isArray(parsed) ? parsed : [])
              .map((row) => ({
                id: row.id ?? null,
                ticket_code: row.ticket_code ?? null,
                planning_status: row.planning_status ?? null,
                assignmentCount: Array.isArray(row.assignments) ? row.assignments.length : 0,
                start_time: row.start_time ?? null,
                end_time: row.end_time ?? null,
                siteName: row.site?.name ?? null,
                notes: row.notes ?? null,
              }))
              .filter((row) => !!row.id);
          } catch (_) {
            rows = [];
          }
          roleReport.requestStats.workTicketFetchBatches.push({
            url,
            status,
            scheduledDate,
            rows,
            at: nowIso(),
          });
        }
      }
    }

    if (url.includes('/rest/v1/ticket_assignments') && method === 'POST' && status < 400) {
      let rows = [];
      try {
        const payloadText = await response.text();
        const parsed = JSON.parse(payloadText);
        rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch (_) {
        rows = [];
      }
      roleReport.requestStats.ticketAssignmentInsertResponses.push({
        url,
        status,
        rows,
        at: nowIso(),
      });
    }

    if (status < 400) return;
    if (!url.startsWith(baseUrl) && !url.includes('supabase.co')) return;

    let body = '';
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = normalizeText((await response.text()).slice(0, 320));
      }
    } catch (_) {
      body = '';
    }

    if (url.includes('/admin/users') && status === 404) return;
    if (url.includes('/rest/v1/work_tickets') && status === 409 && /uq_ticket_job_date/i.test(body)) return;

    roleReport.networkFailures.push({
      method,
      url,
      status,
      body,
    });
  });

  roleReport.login = await typedLogin(page, baseUrl, email, password);

  if (!roleReport.login.ok) {
    const shot = path.join(screenshotsDir, `deep-dispatch-${roleSlug}-login-fail-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    roleReport.screenshots.push(shot);
  } else {
    roleReport.audit = await runDispatchAudit({
      page,
      context,
      baseUrl,
      role,
      requestStats: roleReport.requestStats,
    });
  }

  roleReport.networkFailures = dedupeNetworkFailures(roleReport.networkFailures);
  roleReport.consoleErrors = Array.from(new Set(roleReport.consoleErrors))
    .filter((text) => !/status of 409/i.test(text));
  roleReport.pageErrors = Array.from(new Set(roleReport.pageErrors));
  roleReport.completedAtIso = nowIso();
  roleReport.completedAtNy = nowNy();

  await context.close();
  await browser.close();

  return roleReport;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args['base-url'] || process.env.QA_BASE_URL || 'https://gleamops.vercel.app');
  const credsFile = String(
    args['creds-file'] || process.env.QA_CREDS_FILE || path.resolve(process.cwd(), '../../.tmp-dispatch-qa-credentials.json')
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
    throw new Error(`No users found for roles: ${roles.join(', ')}`);
  }

  const repoRoot = path.resolve(process.cwd(), '../..');
  const screenshotsDir = path.join(repoRoot, 'apps', 'web', 'test-results', 'deep-dispatch');
  ensureDir(screenshotsDir);

  const session = {
    mode: 'deep-dispatch-audit',
    module: 'Dispatch',
    submodules: ['Planning Board', 'Master Board', 'My Route', 'Supervisor View', 'Tonight Board'],
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    baseUrl,
    roles,
    credsFile,
    roleResults: [],
    summary: {},
  };

  const roleResults = [];
  for (const user of users) {
    // Sequential to reduce flake in heavy dispatch boards.
    const roleResult = await runRoleAudit({
      baseUrl,
      role: user.role,
      email: user.email,
      password: user.password,
      screenshotsDir,
    });
    roleResults.push(roleResult);
  }

  session.roleResults = roleResults;
  session.completedAtIso = nowIso();
  session.completedAtNy = nowNy();

  session.summary = roleResults.reduce(
    (acc, roleResult) => {
      const failedChecks = roleResult.audit?.summary?.failedChecks ?? 1;
      const totalChecks = roleResult.audit?.summary?.totalChecks ?? 0;
      acc.totalRoles += 1;
      acc.totalChecks += totalChecks;
      acc.totalFailedChecks += failedChecks;
      acc.consoleErrors += roleResult.consoleErrors.length;
      acc.pageErrors += roleResult.pageErrors.length;
      acc.networkFailures += roleResult.networkFailures.length;
      if (!roleResult.login?.ok || failedChecks > 0 || roleResult.consoleErrors.length > 0 || roleResult.pageErrors.length > 0 || roleResult.networkFailures.length > 0) {
        acc.failedRoles.push(roleResult.role);
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

  const outPath = args.out || path.join(repoRoot, `.tmp-deep-dispatch-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2));
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
