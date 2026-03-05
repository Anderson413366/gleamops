#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

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

function loadReport(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Report not found: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function printSummary(report) {
  const lines = [];
  lines.push(`mode=${report.mode}`);
  lines.push(`baseUrl=${report.baseUrl}`);
  lines.push(`startedAtNy=${report.startedAtNy || 'n/a'}`);
  lines.push('');

  for (const role of report.roleResults ?? []) {
    const summary = report.summaries?.[role.role] || {};
    lines.push(
      `${role.role}: pages ${summary.passedPages || 0}/${summary.totalPages || 0}, failures=${summary.failedPages || 0}, console=${summary.consoleErrorCount || 0}, page=${summary.pageErrorCount || 0}, network=${summary.networkFailureCount || 0}`
    );
  }
  return lines.join('\n');
}

function computeFailures(report) {
  const failures = [];

  for (const role of report.roleResults ?? []) {
    const summary = report.summaries?.[role.role];
    if (!summary) {
      failures.push({ role: role.role, reason: 'missing-summary' });
      continue;
    }

    if ((summary.failedPages || 0) > 0) {
      failures.push({ role: role.role, reason: `failed-pages:${summary.failedPages}` });
    }
    if ((summary.consoleErrorCount || 0) > 0) {
      failures.push({ role: role.role, reason: `console-errors:${summary.consoleErrorCount}` });
    }
    if ((summary.pageErrorCount || 0) > 0) {
      failures.push({ role: role.role, reason: `page-errors:${summary.pageErrorCount}` });
    }
    if ((summary.networkFailureCount || 0) > 0) {
      failures.push({ role: role.role, reason: `network-failures:${summary.networkFailureCount}` });
    }
  }

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = args.report;
  if (!reportPath) {
    throw new Error('Missing --report <path>');
  }

  const report = loadReport(reportPath);
  const failures = computeFailures(report);

  console.log(printSummary(report));

  if (failures.length > 0) {
    console.error('\nRegression assertion failed:');
    for (const failure of failures) {
      console.error(`- ${failure.role}: ${failure.reason}`);
    }
    process.exit(1);
  }

  console.log('\nRegression assertion passed.');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
