#!/usr/bin/env npx tsx
/**
 * UI field usage auditor.
 *
 * Scans frontend/forms/validation/types for required schema fields and
 * emits coverage CSV reports.
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type RequirementTable = { name: string; fields: string[] };
type RequirementCatalog = { version: string; tables: RequirementTable[] };

const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, 'reports', 'schema-parity');
const REQUIRED_SCHEMA = resolve(ROOT, 'docs', 'schema', 'required-schema-gleamops.json');

const SCAN_DIRS = [
  resolve(ROOT, 'apps', 'web', 'src', 'components', 'forms'),
  resolve(ROOT, 'apps', 'web', 'src', 'app'),
  resolve(ROOT, 'apps', 'web', 'src', 'lib'),
  resolve(ROOT, 'packages', 'shared', 'src', 'validation'),
  resolve(ROOT, 'packages', 'shared', 'src', 'types'),
];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx']);

function loadCatalog(path: string): RequirementCatalog {
  return JSON.parse(readFileSync(path, 'utf-8')) as RequirementCatalog;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (SCAN_EXTENSIONS.has(ext)) {
      out.push(fullPath);
    }
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function csvEscape(input: string): string {
  if (input.includes(',') || input.includes('"') || input.includes('\n')) {
    return `"${input.replace(/"/g, '""')}"`;
  }
  return input;
}

function writeCsv(path: string, rows: string[][]): void {
  const body = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  writeFileSync(path, `${body}\n`, 'utf-8');
}

function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  const catalogs = [loadCatalog(REQUIRED_SCHEMA)];
  const required = catalogs.flatMap((c) =>
    c.tables.flatMap((table) =>
      table.fields.map((field) => ({
        source: c.version,
        table: table.name,
        field,
      })),
    ),
  );

  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    walk(dir, files);
  }

  const contents = new Map<string, string>();
  for (const file of files) {
    contents.set(file, readFileSync(file, 'utf-8'));
  }

  const usageRows: string[][] = [['source', 'table', 'field', 'hit_count', 'files']];
  const missingRows: string[][] = [['source', 'table', 'field']];
  let referenced = 0;

  for (const req of required) {
    const pattern = new RegExp(`\\b${escapeRegExp(req.field)}\\b`, 'g');
    let hitCount = 0;
    const hitFiles: string[] = [];

    for (const [file, text] of contents.entries()) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        hitCount += matches.length;
        hitFiles.push(file.replace(`${ROOT}/`, ''));
      }
    }

    if (hitCount > 0) {
      referenced += 1;
      usageRows.push([req.source, req.table, req.field, String(hitCount), hitFiles.join('|')]);
    } else {
      missingRows.push([req.source, req.table, req.field]);
    }
  }

  writeCsv(resolve(REPORT_DIR, 'ui-field-usage.csv'), usageRows);
  writeCsv(resolve(REPORT_DIR, 'ui-fields-missing.csv'), missingRows);

  const summary = {
    required_field_count: required.length,
    ui_referenced_field_count: referenced,
    ui_missing_field_count: required.length - referenced,
    scanned_file_count: files.length,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(resolve(REPORT_DIR, 'ui-field-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

  console.log('UI field parity reports written to reports/schema-parity/');
  console.log(JSON.stringify(summary, null, 2));
}

main();

