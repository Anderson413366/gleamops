#!/usr/bin/env npx tsx
/**
 * Schema parity auditor.
 *
 * Compares required schema catalogs with live database metadata
 * (information_schema.columns via psql) and emits CSV/JSON reports.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/audit-schema-parity.ts
 *   SUPABASE_DB_URL=... npx tsx scripts/audit-schema-parity.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RequirementTable = {
  name: string;
  fields: string[];
};

type RequirementCatalog = {
  version: string;
  description: string;
  tables: RequirementTable[];
};

const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, 'reports', 'schema-parity');
const REQUIRED_V1 = resolve(ROOT, 'docs', 'schema', 'required-schema-v1.json');
const REQUIRED_V2 = resolve(ROOT, 'docs', 'schema', 'required-schema-v2-enterprise.json');

const TABLE_ALIASES: Record<string, string[]> = {
  job_sites: ['sites', 'locations'],
  work_orders: ['work_tickets', 'jobs'],
  job_assignments: ['job_staff_assignments'],
  location_areas: ['site_areas'],
  inventory_items: ['items', 'supply_catalog'],
  inventory_transactions: ['stock_movements'],
  equipment_maintenance_logs: ['asset_maintenance_logs', 'vehicle_maintenance'],
  training_modules: ['training_courses'],
  training_records: ['training_completions'],
  quality_control_inspections: ['inspections'],
  contracts: ['contracts'],
  quotes: ['sales_proposals', 'quotes'],
  opportunities: ['sales_opportunities', 'opportunities'],
  leads: ['sales_prospects', 'leads'],
  real_estate_properties: ['real_estate_properties'],
  schedules: ['routes', 'job_visits'],
  customers: ['clients', 'customers'],
  customer_contacts: ['contacts', 'customer_contacts'],
  locations: ['sites', 'locations'],
  assets: ['equipment', 'assets'],
};

const COLUMN_ALIASES: Record<string, string[]> = {
  id: ['id', 'module_id', 'record_id', 'item_id', 'asset_id', 'employee_id'],
  org_id: ['org_id', 'tenant_id'],
  customer_id: ['customer_id', 'client_id'],
  location_id: ['location_id', 'site_id'],
  user_id: ['user_id', 'staff_id', 'employee_id'],
  status: ['status', 'is_active'],
  long: ['lng', 'center_long', 'center_lng'],
  area_name: ['name'],
  area_code: ['code'],
  area_sqft: ['square_footage'],
  is_serviceable: ['is_active'],
  map_ref: ['display_order'],
  assignment_role: ['role'],
  assignment_status: ['status'],
  sort_order: ['sequence_order', 'display_order'],
  assigned_at: ['created_at'],
};

type LiveSchema = Map<string, Set<string>>;
type AuditMode = 'information_schema' | 'supabase_linked_dump' | 'migration_fallback';

function loadCatalog(path: string): RequirementCatalog {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as RequirementCatalog;
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

function resolveTableCandidates(table: string): string[] {
  const aliases = TABLE_ALIASES[table] ?? [];
  return [table, ...aliases];
}

function resolveFieldCandidates(field: string): string[] {
  const candidates = new Set<string>([field, ...(COLUMN_ALIASES[field] ?? [])]);

  if (field.endsWith('_id')) {
    candidates.add('id');
  }

  const tokenReplacements: Array<[string, string]> = [
    ['org_', 'tenant_'],
    ['customer_', 'client_'],
    ['location_', 'site_'],
    ['employee_', 'staff_'],
    ['job_', 'site_job_'],
    ['asset_', 'equipment_'],
    ['quote_', 'proposal_'],
  ];

  for (const [from, to] of tokenReplacements) {
    if (field.includes(from)) {
      candidates.add(field.replace(from, to));
    }
  }

  const explicit: Record<string, string[]> = {
    customer_number: ['client_code'],
    customer_name: ['name'],
    location_number: ['site_code'],
    location_name: ['name'],
    quote_number: ['proposal_code'],
    contract_number: ['job_code'],
    issue_id: ['id'],
    conversation_id: ['id'],
  };
  for (const item of explicit[field] ?? []) {
    candidates.add(item);
  }

  return Array.from(candidates);
}

function applySqlToSchema(schema: LiveSchema, content: string): void {
  const createTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)\s*\(([\s\S]*?)\);/gi;
  let createMatch: RegExpExecArray | null;
  while ((createMatch = createTableRe.exec(content)) !== null) {
    const table = createMatch[1].replace(/"/g, '');
    const body = createMatch[2];
    if (!schema.has(table)) schema.set(table, new Set());

    const columnRe = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+/gm;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = columnRe.exec(body)) !== null) {
      const col = colMatch[1];
      const upper = col.toUpperCase();
      if (['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK'].includes(upper)) continue;
      schema.get(table)!.add(col);
    }
  }

  const alterRe = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+("?[a-zA-Z0-9_]+"?)/gi;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterRe.exec(content)) !== null) {
    const table = alterMatch[1].replace(/"/g, '');
    const col = alterMatch[2].replace(/"/g, '');
    if (!schema.has(table)) schema.set(table, new Set());
    schema.get(table)!.add(col);
  }

  const viewRe = /CREATE\s+OR\s+REPLACE\s+VIEW\s+(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)\s+AS\s+SELECT\s+([\s\S]*?);/gi;
  let viewMatch: RegExpExecArray | null;
  while ((viewMatch = viewRe.exec(content)) !== null) {
    const view = viewMatch[1].replace(/"/g, '');
    const selectBlock = viewMatch[2].split(/\bFROM\b/i)[0] ?? viewMatch[2];
    if (!schema.has(view)) schema.set(view, new Set());

    for (const rawItem of selectBlock.split(',')) {
      const item = rawItem.trim().replace(/\s+/g, ' ');
      if (!item) continue;

      const asMatch = item.match(/\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
      if (asMatch) {
        schema.get(view)!.add(asMatch[1]);
        continue;
      }

      const bareMatch = item.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (bareMatch) {
        schema.get(view)!.add(bareMatch[1]);
      }
    }
  }
}

function loadSchemaFromLinkedDump(): LiveSchema {
  const schema: LiveSchema = new Map();
  const dumpPath = resolve(ROOT, 'reports', 'schema-parity', '.linked-public-schema.sql');

  execSync(`supabase db dump --linked --schema public --file "${dumpPath}" --yes`, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });

  const content = readFileSync(dumpPath, 'utf-8');
  applySqlToSchema(schema, content);
  return schema;
}

function loadLiveSchema(): { schema: LiveSchema; mode: AuditMode } {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const linkedRequested =
    process.env.SUPABASE_LINKED === '1'
    || (dbUrl != null && /^(linked|supabase-linked)$/i.test(dbUrl.trim()));

  if (!dbUrl && !linkedRequested) {
    return { schema: loadSchemaFromMigrations(), mode: 'migration_fallback' };
  }

  if (linkedRequested) {
    return { schema: loadSchemaFromLinkedDump(), mode: 'supabase_linked_dump' };
  }

  const sql = `
DO \\$\\$
BEGIN
  BEGIN
    EXECUTE 'SET SESSION ROLE postgres';
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
END
\\$\\$;
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, column_name;
`;
  const output = execSync(`psql "${dbUrl}" -At -F ',' -c "${sql}"`, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });

  const schema: LiveSchema = new Map();
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const [tableName, columnName] = line.split(',');
    if (!tableName || !columnName) continue;
    if (!schema.has(tableName)) {
      schema.set(tableName, new Set());
    }
    schema.get(tableName)!.add(columnName);
  }
  return { schema, mode: 'information_schema' };
}

function loadSchemaFromMigrations(): LiveSchema {
  const schema: LiveSchema = new Map();
  const migrationsDir = resolve(ROOT, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = readFileSync(resolve(migrationsDir, file), 'utf-8');
    applySqlToSchema(schema, content);
  }

  return schema;
}

function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  const catalogs = [loadCatalog(REQUIRED_V1), loadCatalog(REQUIRED_V2)];
  const requiredTables = catalogs.flatMap((c) => c.tables);

  const { schema: liveSchema, mode } = loadLiveSchema();
  const liveTableNames = new Set(liveSchema.keys());

  const missingTables: Array<{
    required_table: string;
    checked_candidates: string;
    source_version: string;
  }> = [];

  const missingFields: Array<{
    required_table: string;
    required_field: string;
    matched_table: string;
    checked_field_aliases: string;
    source_version: string;
  }> = [];

  const coverageRows: string[][] = [['table', 'required_fields', 'matched_fields', 'coverage_pct']];

  for (const catalog of catalogs) {
    for (const table of catalog.tables) {
      const candidates = resolveTableCandidates(table.name);
      const matchedTable = candidates.find((t) => liveSchema.has(t)) ?? null;

      if (!matchedTable) {
        missingTables.push({
          required_table: table.name,
          checked_candidates: candidates.join('|'),
          source_version: catalog.version,
        });
        coverageRows.push([table.name, String(table.fields.length), '0', '0']);
        continue;
      }

      const liveFields = liveSchema.get(matchedTable)!;
      let matchedCount = 0;

      for (const field of table.fields) {
        const fieldCandidates = resolveFieldCandidates(field);
        const found = fieldCandidates.some((f) => liveFields.has(f));
        if (found) {
          matchedCount += 1;
        } else {
          missingFields.push({
            required_table: table.name,
            required_field: field,
            matched_table: matchedTable,
            checked_field_aliases: fieldCandidates.join('|'),
            source_version: catalog.version,
          });
        }
      }

      const pct = table.fields.length === 0 ? 100 : (matchedCount / table.fields.length) * 100;
      coverageRows.push([
        table.name,
        String(table.fields.length),
        String(matchedCount),
        pct.toFixed(2),
      ]);
    }
  }

  const unknownTables = Array.from(liveTableNames)
    .filter((name) => !requiredTables.some((t) => resolveTableCandidates(t.name).includes(name)))
    .sort();

  writeCsv(
    resolve(REPORT_DIR, 'schema-missing-tables.csv'),
    [
      ['required_table', 'checked_candidates', 'source_version'],
      ...missingTables.map((row) => [row.required_table, row.checked_candidates, row.source_version]),
    ],
  );
  writeCsv(
    resolve(REPORT_DIR, 'schema-missing-fields.csv'),
    [
      ['required_table', 'required_field', 'matched_table', 'checked_field_aliases', 'source_version'],
      ...missingFields.map((row) => [
        row.required_table,
        row.required_field,
        row.matched_table,
        row.checked_field_aliases,
        row.source_version,
      ]),
    ],
  );
  writeCsv(resolve(REPORT_DIR, 'schema-coverage.csv'), coverageRows);
  writeCsv(
    resolve(REPORT_DIR, 'schema-unknown-live-tables.csv'),
    [['live_table'], ...unknownTables.map((name) => [name])],
  );

  const summary = {
    mode,
    required_table_count: requiredTables.length,
    missing_table_count: missingTables.length,
    missing_field_count: missingFields.length,
    unknown_live_table_count: unknownTables.length,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(resolve(REPORT_DIR, 'schema-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

  console.log('Schema parity reports written to reports/schema-parity/');
  console.log(JSON.stringify(summary, null, 2));

  // Gate: 0 unknown required fields/tables for live DB mode only.
  if (mode === 'information_schema' && (missingTables.length > 0 || missingFields.length > 0)) {
    process.exit(1);
  }
}

main();
