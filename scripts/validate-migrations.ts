#!/usr/bin/env npx tsx
/**
 * Migration validation script.
 *
 * Scans all SQL files in supabase/migrations/ and reports tables that are
 * missing required infrastructure: RLS, triggers, indexes, hard-delete prevention.
 *
 * Usage:  npx tsx scripts/validate-migrations.ts
 * Exit:   0 = clean, 1 = critical gaps found
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(__dirname, '..', 'supabase', 'migrations');

interface TableReport {
  name: string;
  file: string;
  hasRLS: boolean;
  hasPolicy: boolean;
  hasUpdatedAtTrigger: boolean;
  hasVersionEtagTrigger: boolean;
  hasIndex: boolean;
  hasHardDeletePrevention: boolean;
}

// Tables that legitimately skip infrastructure (system/extension tables)
const SKIP_TABLES = new Set([
  'schema_migrations',
  'spatial_ref_sys',
  'extensions',
]);

function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  console.log(`Scanning ${files.length} migration files...\n`);

  // Aggregate all SQL into one corpus for analysis
  const allSQL: { file: string; content: string }[] = [];
  for (const file of files) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    allSQL.push({ file, content });
  }

  const fullCorpus = allSQL.map((s) => s.content).join('\n');

  // Find all CREATE TABLE statements
  const createTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
  const tables: Map<string, TableReport> = new Map();

  for (const { file, content } of allSQL) {
    let match: RegExpExecArray | null;
    const re = new RegExp(createTableRe.source, 'gi');
    while ((match = re.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      if (SKIP_TABLES.has(tableName)) continue;
      if (tables.has(tableName)) continue; // first definition wins

      tables.set(tableName, {
        name: tableName,
        file,
        hasRLS: false,
        hasPolicy: false,
        hasUpdatedAtTrigger: false,
        hasVersionEtagTrigger: false,
        hasIndex: false,
        hasHardDeletePrevention: false,
      });
    }
  }

  // Check each table against full corpus
  for (const [tableName, report] of tables) {
    const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // RLS enabled
    report.hasRLS = new RegExp(
      `ALTER\\s+TABLE\\s+(?:public\\.)?${escaped}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i'
    ).test(fullCorpus);

    // At least one policy
    report.hasPolicy = new RegExp(
      `CREATE\\s+POLICY\\s+\\w+\\s+ON\\s+(?:public\\.)?${escaped}`,
      'i'
    ).test(fullCorpus);

    // set_updated_at trigger
    report.hasUpdatedAtTrigger = new RegExp(
      `CREATE\\s+TRIGGER\\s+\\w*updated_at\\w*\\s+.*?(?:ON\\s+(?:public\\.)?${escaped})`,
      'is'
    ).test(fullCorpus) || new RegExp(
      `ON\\s+(?:public\\.)?${escaped}.*set_updated_at`,
      'is'
    ).test(fullCorpus);

    // set_version_etag trigger
    report.hasVersionEtagTrigger = new RegExp(
      `CREATE\\s+TRIGGER\\s+\\w*version_etag\\w*\\s+.*?(?:ON\\s+(?:public\\.)?${escaped})`,
      'is'
    ).test(fullCorpus) || new RegExp(
      `ON\\s+(?:public\\.)?${escaped}.*set_version_etag`,
      'is'
    ).test(fullCorpus);

    // At least one index (besides PK)
    report.hasIndex = new RegExp(
      `CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+.*?ON\\s+(?:public\\.)?${escaped}`,
      'i'
    ).test(fullCorpus);

    // Hard-delete prevention (BEFORE DELETE trigger or rule)
    report.hasHardDeletePrevention = new RegExp(
      `BEFORE\\s+DELETE\\s+ON\\s+(?:public\\.)?${escaped}`,
      'i'
    ).test(fullCorpus) || new RegExp(
      `CREATE\\s+(?:OR\\s+REPLACE\\s+)?RULE\\s+\\w+\\s+AS\\s+ON\\s+DELETE\\s+TO\\s+(?:public\\.)?${escaped}`,
      'i'
    ).test(fullCorpus);
  }

  // Report
  const allTables = Array.from(tables.values());
  const missingRLS = allTables.filter((t) => !t.hasRLS);
  const missingPolicy = allTables.filter((t) => !t.hasPolicy);
  const missingUpdatedAt = allTables.filter((t) => !t.hasUpdatedAtTrigger);
  const missingEtag = allTables.filter((t) => !t.hasVersionEtagTrigger);
  const missingIndex = allTables.filter((t) => !t.hasIndex);
  const missingHardDelete = allTables.filter((t) => !t.hasHardDeletePrevention);

  console.log(`Total tables found: ${allTables.length}\n`);

  let critical = false;

  function printSection(title: string, items: TableReport[], isCritical: boolean) {
    if (items.length === 0) {
      console.log(`  ${title}: ALL CLEAR`);
      return;
    }
    const prefix = isCritical ? 'CRITICAL' : 'WARNING';
    console.log(`  ${prefix} — ${title} (${items.length} tables):`);
    for (const t of items.slice(0, 20)) {
      console.log(`    - ${t.name} (defined in ${t.file})`);
    }
    if (items.length > 20) {
      console.log(`    ... and ${items.length - 20} more`);
    }
    if (isCritical) critical = true;
  }

  printSection('Missing RLS', missingRLS, true);
  printSection('Missing RLS Policy', missingPolicy, true);
  printSection('Missing updated_at trigger', missingUpdatedAt, false);
  printSection('Missing version_etag trigger', missingEtag, false);
  printSection('Missing indexes', missingIndex, false);
  printSection('Missing hard-delete prevention', missingHardDelete, false);

  console.log('');
  if (critical) {
    console.log('RESULT: CRITICAL gaps found. Fix before deploying.');
    process.exit(1);
  } else {
    console.log('RESULT: No critical gaps. Review warnings if any.');
    process.exit(0);
  }
}

main();
