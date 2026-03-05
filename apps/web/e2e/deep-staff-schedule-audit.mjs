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

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function nextMondayDateKey() {
  const now = new Date();
  const copy = new Date(now);
  const day = copy.getDay(); // 0=Sun, 1=Mon
  const delta = day === 1 ? 7 : ((8 - day) % 7);
  copy.setDate(copy.getDate() + delta);
  copy.setHours(0, 0, 0, 0);
  return toDateInputValue(copy);
}

function nextWeekdayDateKey(targetDay, weekOffset = 0) {
  const now = new Date();
  const copy = new Date(now);
  const day = copy.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const normalizedTarget = Math.min(6, Math.max(0, Number(targetDay) || 1));
  let delta = (normalizedTarget - day + 7) % 7;
  if (delta === 0) delta = 7;
  copy.setDate(copy.getDate() + delta + (Math.max(0, Number(weekOffset) || 0) * 7));
  copy.setHours(0, 0, 0, 0);
  return toDateInputValue(copy);
}

function positionCodeToLabel(code) {
  return String(code)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeNetworkFailures(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.method}|${item.url}|${item.status}|${item.body}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

async function dismissTour(page) {
  const skipBtn = page.getByRole('button', { name: /^Skip$/i }).first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(240);
  }
}

async function dismissBlockingDialogs(page) {
  const dialogRoot = page.locator('div[role="dialog"], [data-state="open"]').first();
  if (!(await dialogRoot.isVisible().catch(() => false))) return;

  const cancelBtn = dialogRoot.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancelBtn.isVisible().catch(() => false)) {
    await cancelBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(220);
    return;
  }

  const closeBtn = dialogRoot.getByRole('button', { name: /Close/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 2_500 }).catch(() => {});
    await page.waitForTimeout(220);
    return;
  }

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(180);
}

async function setSingleWeekdaySelection(page, targetLabel) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (const day of weekdays) {
    const btn = page.getByRole('button', { name: new RegExp(`^${day}$`, 'i') }).first();
    const ariaPressed = await btn.getAttribute('aria-pressed').catch(() => null);
    const dataState = await btn.getAttribute('data-state').catch(() => null);
    const isSelected = ariaPressed === 'true' || dataState === 'on';
    const shouldSelect = day.toLowerCase() === targetLabel.toLowerCase();
    if (isSelected !== shouldSelect) {
      await btn.click({ timeout: 2_500 }).catch(() => {});
      await page.waitForTimeout(120);
    }
  }
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

async function runCheck(report, id, title, fn) {
  const started = Date.now();
  // Keep lightweight progress output so long runs are observable in CI/terminal.
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

async function openScheduleTab(page, baseUrl, tabKey) {
  await page.goto(`${baseUrl}/schedule?tab=${tabKey}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(500);
}

async function runStaffScheduleAudit({ page, baseUrl, role, requestStats }) {
  const roleSlug = slugify(role);
  const tokenBase = `${Date.now()}-${roleSlug}`;
  const recurringCode = `TEST_POS_${tokenBase.replace(/-/g, '_').toUpperCase()}`;
  const leaveReasonToken = `TEST-LEAVE-${tokenBase}`;
  const recurringLabel = positionCodeToLabel(recurringCode);

  const report = {
    module: 'Staff Schedule',
    role,
    startedAtIso: nowIso(),
    startedAtNy: nowNy(),
    tokens: {
      recurringCode,
      leaveReasonToken,
    },
    moduleMap: {
      pagesVisited: [],
      tabsSeen: [],
    },
    checks: [],
    connectivity: [],
    blockers: [],
    notes: [],
  };

  await openScheduleTab(page, baseUrl, 'recurring');
  await dismissTour(page);
  await dismissBlockingDialogs(page);

  report.moduleMap.pagesVisited.push('/schedule?tab=recurring');

  await runCheck(report, 'STAFF-001', 'Schedule page loads and tablist is visible', async () => {
    const searchVisible =
      (await page.getByRole('textbox', { name: /Search schedule/i }).first().isVisible().catch(() => false))
      || (await page.locator('main input[placeholder*="Search schedule"]').first().isVisible().catch(() => false));
    const newShiftVisible =
      (await page.getByRole('button', { name: /New Shift/i }).first().isVisible().catch(() => false))
      || (await page.locator('button:has-text("New Shift")').first().isVisible().catch(() => false));
    const addCellVisible =
      (await page.getByRole('button', { name: /OFF\+\s*Add|\+\s*Add/i }).first().isVisible().catch(() => false))
      || (await page.locator('button:has-text("OFF+ Add"), button:has-text("+ Add")').first().isVisible().catch(() => false));
    const tabTexts = await page
      .locator('main button')
      .allTextContents()
      .catch(() => []);
    report.moduleMap.tabsSeen = tabTexts.map((text) => normalizeText(text)).filter(Boolean);
    return {
      pass: searchVisible && (newShiftVisible || addCellVisible),
      searchVisible,
      newShiftVisible,
      addCellVisible,
      tabsSeen: report.moduleMap.tabsSeen,
    };
  });

  await runCheck(report, 'STAFF-002', 'Employee Grid: Add Shift opens create form', async () => {
    await dismissBlockingDialogs(page);
    const addShiftButtonByRole = page.getByRole('button', { name: /New Shift/i }).first();
    let addShiftButton = addShiftButtonByRole;
    let buttonVisible = await addShiftButtonByRole.isVisible().catch(() => false);
    if (!buttonVisible) {
      const addShiftButtonByText = page.locator('button:has-text("New Shift")').first();
      buttonVisible = await addShiftButtonByText.isVisible().catch(() => false);
      addShiftButton = addShiftButtonByText;
    }
    if (!buttonVisible) {
      const addCellButton = page.getByRole('button', { name: /OFF\+\s*Add|\+\s*Add/i }).first();
      buttonVisible = await addCellButton.isVisible().catch(() => false);
      if (buttonVisible) {
        addShiftButton = addCellButton;
      }
    }
    if (!buttonVisible) {
      return { pass: false, reason: 'add-shift-button-missing' };
    }
    await addShiftButton.click({ timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(300);
    const createVisible = await page.getByText(/Create Recurring Shift/i).first().isVisible().catch(() => false);
    return { pass: createVisible, createVisible };
  });

  await runCheck(report, 'STAFF-003', 'Employee Grid: Form validation blocks empty time submit', async () => {
    const preInsertCount = requestStats.workTicketInsertResponses.length;
    await page.getByLabel('Start Time').first().fill('').catch(() => {});
    await page.getByLabel('End Time').first().fill('').catch(() => {});
    await page.getByRole('button', { name: /^Create Recurring Shift$/i }).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(700);
    const postInsertCount = requestStats.workTicketInsertResponses.length;
    const noInsertTriggered = postInsertCount === preInsertCount;
    return {
      pass: noInsertTriggered,
      preInsertCount,
      postInsertCount,
    };
  });

  await runCheck(report, 'STAFF-004', 'Employee Grid: Create TEST recurring shift', async () => {
    const preInsertCount = requestStats.workTicketInsertResponses.length;
    const monday = nextMondayDateKey();

    const siteSelect = page.getByLabel('Site').first();
    const servicePlanSelect = page.getByLabel('Service Plan').first();
    await siteSelect.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await servicePlanSelect.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(900);

    const siteOptions = await siteSelect.locator('option').count().catch(() => 0);
    let selectedSiteIndex = -1;
    let selectedPlanValue = '';
    let selectedSiteValue = '';

    // Pick the first site that actually has service plans.
    for (let idx = 0; idx < Math.min(siteOptions, 40); idx += 1) {
      await siteSelect.selectOption({ index: idx }).catch(() => {});
      await page.waitForTimeout(900);
      const currentSite = await siteSelect.inputValue().catch(() => '');
      const optionCount = await servicePlanSelect.locator('option').count().catch(() => 0);
      if (optionCount <= 0) continue;

      const currentPlan = await servicePlanSelect.inputValue().catch(() => '');
      if (currentPlan) {
        selectedSiteIndex = idx;
        selectedSiteValue = currentSite;
        selectedPlanValue = currentPlan;
        break;
      }

      await servicePlanSelect.selectOption({ index: 0 }).catch(() => {});
      await page.waitForTimeout(220);
      const planAfterSelect = await servicePlanSelect.inputValue().catch(() => '');
      if (planAfterSelect) {
        selectedSiteIndex = idx;
        selectedSiteValue = currentSite;
        selectedPlanValue = planAfterSelect;
        break;
      }
    }

    if (selectedSiteIndex < 0 || !selectedSiteValue || !selectedPlanValue) {
      return {
        pass: false,
        reason: 'site-or-service-plan-not-ready',
        siteValue: selectedSiteValue,
        planValue: selectedPlanValue,
        siteOptions,
      };
    }

    await page.getByLabel('Position Code').first().fill(recurringCode).catch(() => {});
    await page.getByLabel('Start Time').first().fill('09:00').catch(() => {});
    await page.getByLabel('End Time').first().fill('10:00').catch(() => {});
    await page.getByLabel('Weeks Ahead').first().fill('1').catch(() => {});
    await page.getByLabel('Note (optional)').first().fill(`TEST note ${tokenBase} & / # ' \"`).catch(() => {});

    const attemptDates = [];
    const candidateStarts = [];
    const dayMap = [
      { jsDay: 1, label: 'Mon' },
      { jsDay: 2, label: 'Tue' },
      { jsDay: 3, label: 'Wed' },
      { jsDay: 4, label: 'Thu' },
      { jsDay: 5, label: 'Fri' },
    ];
    for (const target of dayMap) {
      for (let weekOffset = 0; weekOffset < 3; weekOffset += 1) {
        candidateStarts.push({
          dayLabel: target.label,
          startDate: nextWeekdayDateKey(target.jsDay, weekOffset),
        });
      }
    }

    let created = false;
    let postInsertCount = preInsertCount;
    let successfulStartDate = '';
    for (const candidate of candidateStarts) {
      await setSingleWeekdaySelection(page, candidate.dayLabel);
      await page.getByLabel('Start Date').first().fill(candidate.startDate).catch(() => {});
      await page.getByRole('button', { name: /^Create Recurring Shift$/i }).first().click({ timeout: 7_000 }).catch(() => {});
      await page.waitForTimeout(1_100);
      postInsertCount = requestStats.workTicketInsertResponses.length;
      const createdNow = postInsertCount > preInsertCount;
      attemptDates.push({ dayLabel: candidate.dayLabel, startDate: candidate.startDate, createdNow, postInsertCount });
      if (createdNow) {
        created = true;
        successfulStartDate = candidate.startDate;
        break;
      }
    }

    return {
      pass: created,
      created,
      preInsertCount,
      postInsertCount,
      monday,
      recurringCode,
      selectedSiteIndex,
      selectedSiteValue,
      selectedPlanValue,
      successfulStartDate,
      attemptDates,
    };
  });

  await runCheck(report, 'STAFF-005', 'Employee Grid: Open created shift in edit mode', async () => {
    await openScheduleTab(page, baseUrl, 'recurring');
    await page.getByRole('button', { name: /^Month$/i }).first().click({ timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const searchInput = page.locator('main input[placeholder*="Search schedule"]').first();
    await searchInput.fill(recurringLabel).catch(() => {});
    await page.waitForTimeout(500);
    const block = page.locator('main [role="group"]').filter({ hasText: recurringLabel }).first();
    const visible = await block.isVisible().catch(() => false);
    if (!visible) {
      return { pass: false, reason: 'created-shift-not-visible-in-grid', recurringLabel, recurringCode };
    }
    await block.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(350);
    const editVisible = await page.getByText(/Edit Recurring Shift/i).first().isVisible().catch(() => false);
    return { pass: editVisible, editVisible, recurringLabel };
  });

  await runCheck(report, 'STAFF-006', 'Employee Grid: Update created shift note', async () => {
    const updatedNote = `TEST note UPDATED ${tokenBase} & / # ' \"`;
    await page.getByLabel('Note (optional)').first().fill(updatedNote).catch(() => {});
    await page.getByRole('button', { name: /^Update Shift$/i }).first().click({ timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(900);

    // Re-open and verify persisted note.
    await openScheduleTab(page, baseUrl, 'recurring');
    await page.getByRole('button', { name: /^Month$/i }).first().click({ timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const searchInput = page.locator('main input[placeholder*="Search schedule"]').first();
    await searchInput.fill(recurringLabel).catch(() => {});
    await page.waitForTimeout(450);
    const block = page.locator('main [role="group"]').filter({ hasText: recurringLabel }).first();
    const visible = await block.isVisible().catch(() => false);
    if (!visible) return { pass: false, reason: 'unable-to-reopen-shift', recurringLabel };
    await block.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);
    const noteValue = await page.getByLabel('Note (optional)').first().inputValue().catch(() => '');
    return {
      pass: noteValue.includes('UPDATED'),
      noteValue,
    };
  });

  await runCheck(report, 'STAFF-007', 'Employee Grid: Delete TEST shift and confirm cleanup', async () => {
    await page.getByRole('button', { name: /^Delete Shift$/i }).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const confirm = page.locator('div[role="dialog"], [data-state="open"]').getByRole('button', { name: /^Delete Shift$/i }).last();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click({ timeout: 5_000 }).catch(() => {});
    } else {
      // Fallback if dialog scoping changes
      await page.getByRole('button', { name: /^Delete Shift$/i }).last().click({ timeout: 5_000 }).catch(() => {});
    }
    await page.waitForTimeout(1_000);

    await openScheduleTab(page, baseUrl, 'recurring');
    await page.getByRole('button', { name: /^Month$/i }).first().click({ timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(250);
    const searchInput = page.locator('main input[placeholder*="Search schedule"]').first();
    await searchInput.fill(recurringLabel).catch(() => {});
    await page.waitForTimeout(450);
    let stillVisible = await page.locator('main [role="group"]').filter({ hasText: recurringLabel }).first().isVisible().catch(() => false);
    if (stillVisible) {
      await page.waitForTimeout(1_000);
      stillVisible = await page.locator('main [role="group"]').filter({ hasText: recurringLabel }).first().isVisible().catch(() => false);
    }
    return {
      pass: !stillVisible,
      stillVisible,
      recurringLabel,
    };
  });

  await runCheck(report, 'STAFF-008', 'Leave: submit TEST leave request', async () => {
    await openScheduleTab(page, baseUrl, 'leave');
    report.moduleMap.pagesVisited.push('/schedule?tab=leave');
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: /Request Leave/i }).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);

    const staffSelect = page.getByLabel('Staff Member').first();
    await staffSelect.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const staffOptions = await staffSelect.locator('option').count().catch(() => 0);
    if (staffOptions > 0) {
      const currentStaff = await staffSelect.inputValue().catch(() => '');
      if (!currentStaff) {
        await staffSelect.selectOption({ index: 0 }).catch(() => {});
      }
    }

    const selectedStaffValue = await staffSelect.inputValue().catch(() => '');
    if (!selectedStaffValue) {
      return {
        pass: false,
        reason: 'staff-member-not-selected',
      };
    }

    const today = toDateInputValue(new Date());

    await page.getByLabel('Leave Type').first().selectOption('Other').catch(() => {});
    await page.getByLabel('Start Date').first().fill(today).catch(() => {});
    await page.getByLabel('End Date').first().fill(today).catch(() => {});
    await page.getByLabel('Reason (optional)').first().fill(leaveReasonToken).catch(() => {});
    await page.getByRole('button', { name: /Submit Leave Request/i }).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_100);

    const formStillOpen = await page.getByRole('button', { name: /Submit Leave Request/i }).first().isVisible().catch(() => false);
    const toastText = await page
      .locator('[data-sonner-toast], [role="alert"], [role="status"]')
      .allTextContents()
      .then((items) => items.map((item) => normalizeText(item)).filter(Boolean))
      .catch(() => []);
    const reasonVisible = await page
      .locator('main')
      .getByText(leaveReasonToken)
      .first()
      .isVisible()
      .catch(() => false);

    return {
      pass: !formStillOpen && reasonVisible,
      formStillOpen,
      reasonVisible,
      toastText: toastText.slice(0, 4),
    };
  });

  await runCheck(report, 'STAFF-009', 'Availability: request appears and approve action works', async () => {
    await openScheduleTab(page, baseUrl, 'availability');
    report.moduleMap.pagesVisited.push('/schedule?tab=availability');

    const requestsButton = page.getByRole('button', { name: /Availability Requests/i }).first();
    await requestsButton.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);

    const row = page.locator('div').filter({ hasText: leaveReasonToken }).first();
    const rowVisible = await row.isVisible().catch(() => false);
    if (!rowVisible) {
      return { pass: false, reason: 'leave-request-not-visible-in-availability', leaveReasonToken };
    }

    const checkbox = row.locator('input[type="checkbox"]').first();
    await checkbox.check({ force: true }).catch(async () => {
      await checkbox.click({ force: true }).catch(() => {});
    });

    await page.getByRole('button', { name: /Approve/i }).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    const rowAfterApprove = await page.locator('div').filter({ hasText: leaveReasonToken }).first().isVisible().catch(() => false);

    report.connectivity.push({
      trail: 'Leave Request -> Availability Requests -> Approve',
      token: leaveReasonToken,
      approved: !rowAfterApprove,
    });

    return {
      pass: !rowAfterApprove,
      rowVisible,
      rowAfterApprove,
    };
  });

  await runCheck(report, 'STAFF-010', 'Leave: approved request no longer pending', async () => {
    await openScheduleTab(page, baseUrl, 'leave');
    const pendingVisible = await page.getByText(leaveReasonToken).first().isVisible().catch(() => false);
    return {
      pass: !pendingVisible,
      pendingVisible,
    };
  });

  await runCheck(report, 'STAFF-011', 'My Schedule loads without runtime errors', async () => {
    await openScheduleTab(page, baseUrl, 'my-schedule');
    report.moduleMap.pagesVisited.push('/schedule?tab=my-schedule');
    await page.waitForTimeout(1_200);
    const headingVisible = await page.getByText(/^My Schedule$/i).first().isVisible().catch(() => false);
    const emptyOrShiftsVisible =
      (await page.getByText(/No Upcoming Shifts|No upcoming shifts/i).first().isVisible().catch(() => false))
      || (await page.locator('main article').first().isVisible().catch(() => false))
      || (await page.getByRole('button', { name: /1W|2W|4W|Month/i }).first().isVisible().catch(() => false));
    return {
      pass: headingVisible && emptyOrShiftsVisible,
      headingVisible,
      emptyOrShiftsVisible,
    };
  });

  await runCheck(report, 'STAFF-012', 'Back/forward navigation stays consistent in schedule tabs', async () => {
    await page.goto(`${baseUrl}/schedule?tab=recurring`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    await page.goto(`${baseUrl}/schedule?tab=leave`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(250);
    const backUrl = page.url();
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(250);
    const forwardUrl = page.url();
    return {
      pass: backUrl.includes('tab=recurring') && forwardUrl.includes('tab=leave'),
      backUrl,
      forwardUrl,
    };
  });

  await runCheck(report, 'STAFF-013', 'Neuroinclusive: ESC closes slide-over forms', async () => {
    await openScheduleTab(page, baseUrl, 'leave');
    const requestLeaveBtn = page.getByRole('button', { name: /Request Leave/i }).first();
    await requestLeaveBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(320);
    const submitBtn = page.getByRole('button', { name: /Submit Leave Request/i }).first();
    let opened = await submitBtn.isVisible().catch(() => false);
    if (!opened) {
      await requestLeaveBtn.click({ timeout: 5_000 }).catch(() => {});
      await submitBtn.waitFor({ state: 'visible', timeout: 1_600 }).catch(() => {});
      await page.waitForTimeout(220);
      opened = await submitBtn.isVisible().catch(() => false);
    }
    await page.keyboard.press('Escape').catch(() => {});
    await submitBtn.waitFor({ state: 'hidden', timeout: 1_600 }).catch(() => {});
    await page.waitForTimeout(220);
    const stillOpen = await submitBtn.isVisible().catch(() => false);
    return {
      pass: opened && !stillOpen,
      opened,
      stillOpen,
    };
  });

  const failedChecks = report.checks.filter((check) => check.status === 'FAIL');
  report.summary = {
    totalChecks: report.checks.length,
    failedChecks: failedChecks.length,
    passedChecks: report.checks.length - failedChecks.length,
    failedCheckIds: failedChecks.map((check) => check.id),
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
      availabilityRuleInsertResponses: [],
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

    if (method === 'POST' && url.includes('/rest/v1/work_tickets') && status < 400) {
      roleReport.requestStats.workTicketInsertResponses.push({
        url,
        status,
        at: nowIso(),
      });
    }

    if (method === 'POST' && url.includes('/rest/v1/staff_availability_rules') && status < 400) {
      roleReport.requestStats.availabilityRuleInsertResponses.push({
        url,
        status,
        at: nowIso(),
      });
    }

    if (status < 400) return;
    if (!url.startsWith(baseUrl) && !url.includes('supabase.co')) return;

    let body = '';
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = normalizeText((await response.text()).slice(0, 280));
      }
    } catch (_) {
      body = '';
    }

    roleReport.networkFailures.push({
      method,
      url,
      status,
      body,
    });
  });

  roleReport.login = await typedLogin(page, baseUrl, email, password);

  if (!roleReport.login.ok) {
    const shot = path.join(screenshotsDir, `deep-staff-${roleSlug}-login-fail-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    roleReport.screenshots.push(shot);
  } else {
    roleReport.audit = await runStaffScheduleAudit({
      page,
      baseUrl,
      role,
      requestStats: roleReport.requestStats,
    });
  }

  roleReport.networkFailures = dedupeNetworkFailures(roleReport.networkFailures);
  roleReport.consoleErrors = Array.from(new Set(roleReport.consoleErrors));
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
    args['creds-file'] || process.env.QA_CREDS_FILE || path.resolve(process.cwd(), '../../.tmp-staff-schedule-creds.json')
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
  const screenshotsDir = path.join(repoRoot, 'apps', 'web', 'test-results', 'deep-staff-schedule');
  ensureDir(screenshotsDir);

  const session = {
    mode: 'deep-staff-schedule-audit',
    module: 'Staff Schedule',
    submodules: ['Employee Grid', 'Leave', 'Availability', 'My Schedule'],
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
    // Sequential execution reduces flaky hangs when long module checks run in parallel.
    // eslint-disable-next-line no-await-in-loop
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

  const outPath =
    args.out ||
    path.join(repoRoot, `.tmp-deep-staff-schedule-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2));
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
