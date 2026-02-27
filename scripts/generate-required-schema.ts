#!/usr/bin/env npx tsx
/**
 * Generates required-schema-gleamops.json from migration files.
 *
 * Reads all SQL migrations in supabase/migrations/, extracts CREATE TABLE
 * and ALTER TABLE ADD COLUMN statements, and outputs a RequirementCatalog
 * JSON that the schema-parity auditor consumes.
 *
 * Usage:
 *   npx tsx scripts/generate-required-schema.ts
 */

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

type LiveSchema = Map<string, Set<string>>;

const ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase', 'migrations');
const OUTPUT_DIR = resolve(ROOT, 'docs', 'schema');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'required-schema-gleamops.json');

function applySqlToSchema(schema: LiveSchema, content: string): void {
  const createTableRe =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)\s*\(([\s\S]*?)\);/gi;
  let createMatch: RegExpExecArray | null;
  while ((createMatch = createTableRe.exec(content)) !== null) {
    const table = createMatch[1].replace(/"/g, '');
    const body = createMatch[2];
    if (!schema.has(table)) schema.set(table, new Set());

    const columnRe = /^\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/gm;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = columnRe.exec(body)) !== null) {
      const col = colMatch[1];
      const upper = col.toUpperCase();
      if (['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK'].includes(upper)) continue;
      schema.get(table)!.add(col);
    }
  }

  const alterRe =
    /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[a-zA-Z0-9_]+"?)/gi;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterRe.exec(content)) !== null) {
    const table = alterMatch[1].replace(/"/g, '');
    const col = alterMatch[2].replace(/"/g, '');
    if (!schema.has(table)) schema.set(table, new Set());
    schema.get(table)!.add(col);
  }

  const viewRe =
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|"public")\.)?("?[a-zA-Z0-9_]+"?)(?:\s*\(([\s\S]*?)\))?\s+AS\s+SELECT\s+([\s\S]*?);/gi;
  let viewMatch: RegExpExecArray | null;
  while ((viewMatch = viewRe.exec(content)) !== null) {
    const view = viewMatch[1].replace(/"/g, '');
    if (!schema.has(view)) schema.set(view, new Set());

    const explicitColumns = viewMatch[2];
    if (explicitColumns != null && explicitColumns.trim().length > 0) {
      for (const colRaw of explicitColumns.split(',')) {
        const col = colRaw.trim().replace(/"/g, '');
        if (col) schema.get(view)!.add(col);
      }
    }

    const selectSql = viewMatch[3] ?? '';
    const selectList = extractTopLevelSelectList(selectSql);
    const selectItems = splitTopLevelCsv(selectList);

    for (const rawItem of selectItems) {
      const item = rawItem.trim().replace(/\s+/g, ' ');
      if (!item) continue;

      const asMatch = item.match(/\s+AS\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?$/i);
      if (asMatch) {
        schema.get(view)!.add(asMatch[1]);
        continue;
      }

      const quotedTail = item.match(/"([a-zA-Z_][a-zA-Z0-9_]*)"$/);
      if (quotedTail) {
        schema.get(view)!.add(quotedTail[1]);
        continue;
      }

      const bareMatch = item.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (bareMatch) {
        schema.get(view)!.add(bareMatch[1]);
      }
    }
  }
}

function extractTopLevelSelectList(selectSql: string): string {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < selectSql.length; i += 1) {
    const ch = selectSql[i];
    const next = selectSql[i + 1];

    if (!inDouble && ch === '\'') {
      if (inSingle && next === '\'') {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i += 1;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) continue;

    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')' && depth > 0) {
      depth -= 1;
      continue;
    }

    if (depth === 0 && i + 4 <= selectSql.length) {
      const maybeFrom = selectSql.slice(i, i + 4);
      if (/^from$/i.test(maybeFrom)) {
        const prev = i === 0 ? ' ' : selectSql[i - 1];
        const after = i + 4 >= selectSql.length ? ' ' : selectSql[i + 4];
        if (/\s|\)/.test(prev) && /\s|\(/.test(after)) {
          return selectSql.slice(0, i);
        }
      }
    }
  }

  return selectSql;
}

function splitTopLevelCsv(sqlList: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let start = 0;

  for (let i = 0; i < sqlList.length; i += 1) {
    const ch = sqlList[i];
    const next = sqlList[i + 1];

    if (!inDouble && ch === '\'') {
      if (inSingle && next === '\'') {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i += 1;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) continue;

    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')' && depth > 0) {
      depth -= 1;
      continue;
    }

    if (depth === 0 && ch === ',') {
      out.push(sqlList.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = sqlList.slice(start).trim();
  if (last) out.push(last);
  return out;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const schema: LiveSchema = new Map();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
    applySqlToSchema(schema, content);
  }

  const tables: RequirementTable[] = [];
  const sortedNames = Array.from(schema.keys()).sort();

  for (const name of sortedNames) {
    const fields = Array.from(schema.get(name)!).sort();
    tables.push({ name, fields });
  }

  const catalog: RequirementCatalog = {
    version: 'gleamops-migrations',
    description:
      'Auto-generated from supabase/migrations/. Source of truth for schema parity audits.',
    tables,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');

  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  Tables: ${tables.length}`);
  console.log(`  Total fields: ${tables.reduce((sum, t) => sum + t.fields.length, 0)}`);
}

main();
