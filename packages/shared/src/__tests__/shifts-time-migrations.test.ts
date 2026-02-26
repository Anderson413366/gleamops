import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../../../../supabase/migrations');

function loadMigration(fileName: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, fileName), 'utf8');
}

function getFunctionBlock(sql: string, functionName: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = sql.indexOf('\n$$;', start);
  expect(end).toBeGreaterThan(start);

  return sql.slice(start, end);
}

describe('Shifts & Time migration guards', () => {
  it('enforces tenant WITH CHECK on UPDATE policies in 00095', () => {
    const sql = loadMigration('00095_shifts_time_rls_enforcement.sql');

    expect(sql).toContain('CREATE POLICY %I_tenant_update ON public.%I FOR UPDATE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())');
  });

  it('covers all planned Shifts & Time tables in 00095 enforcement list', () => {
    const sql = loadMigration('00095_shifts_time_rls_enforcement.sql');
    const expectedTables = [
      'routes',
      'route_stops',
      'travel_segments',
      'callout_events',
      'coverage_offers',
      'on_call_pool',
      'site_books',
      'site_book_checklist_items',
      'payroll_export_mappings',
      'payroll_export_mapping_fields',
      'payroll_export_runs',
      'payroll_export_items',
      'attendance_policies',
      'holiday_calendar',
    ];

    for (const tableName of expectedTables) {
      expect(sql).toContain(`'${tableName}'`);
    }
  });

  it('guards route execution RPCs to operations roles', () => {
    const sql = loadMigration('00096_shifts_time_functions.sql');
    const startStopBlock = getFunctionBlock(sql, 'fn_route_start_stop');
    const completeStopBlock = getFunctionBlock(sql, 'fn_route_complete_stop');

    expect(startStopBlock).toContain("has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])");
    expect(startStopBlock).toContain("RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'");
    expect(completeStopBlock).toContain("has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])");
    expect(completeStopBlock).toContain("RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'");
  });

  it('guards auto travel capture RPC to operations roles', () => {
    const sql = loadMigration('00096_shifts_time_functions.sql');
    const autoCaptureBlock = getFunctionBlock(sql, 'fn_auto_capture_travel_segment');

    expect(autoCaptureBlock).toContain("has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])");
    expect(autoCaptureBlock).toContain("RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'");
  });

  it('guards offer coverage RPC to manager-class roles', () => {
    const sql = loadMigration('00096_shifts_time_functions.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_offer_coverage(');
    expect(sql).toContain("IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) THEN");
    expect(sql).toContain("RAISE EXCEPTION 'COVERAGE_OFFER_FORBIDDEN'");
  });

  it('guards accept coverage RPC to candidate or manager roles', () => {
    const sql = loadMigration('00096_shifts_time_functions.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_accept_coverage(');
    expect(sql).toContain("v_offer.candidate_staff_id IS DISTINCT FROM v_actor_staff_id AND NOT COALESCE(v_is_manager, false)");
    expect(sql).toContain("RAISE EXCEPTION 'COVERAGE_ACCEPT_FORBIDDEN'");
  });

  it('guards payroll finalize RPC to owner admin or manager roles', () => {
    const sql = loadMigration('00096_shifts_time_functions.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_finalize_payroll_export(');
    expect(sql).toContain("IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER']) THEN");
    expect(sql).toContain("RAISE EXCEPTION 'PAYROLL_EXPORT_FORBIDDEN'");
  });
});
