import assert from 'node:assert/strict';
import test from 'node:test';
import { _resetFlagCache } from '@gleamops/shared';
import { getTonightBoard } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/tonight-board';

function setShiftsTimeFlags() {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_CALLOUT_AUTOMATION = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1 = '1';
  _resetFlagCache();
}

function resetShiftsTimeFlags() {
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_CALLOUT_AUTOMATION;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1;
  _resetFlagCache();
}

function queryResult<T>(data: T) {
  return {
    data,
    error: null,
    select() { return this; },
    eq() { return this; },
    is() { return this; },
    order() { return this; },
    limit() { return this; },
    in() { return this; },
    not() { return this; },
    maybeSingle: async () => ({ data, error: null }),
  };
}

test('tonight board includes route, coverage, and payroll enrichment for manager roles', async () => {
  setShiftsTimeFlags();
  const today = new Date().toISOString().slice(0, 10);
  let staffLookupCalls = 0;

  const db = {
    from(table: string) {
      if (table === 'staff') {
        // First read links auth user -> staff id. Subsequent read returns coverage candidates.
        if (staffLookupCalls === 0) {
          staffLookupCalls += 1;
          const base = queryResult<{ id: string } | null>({ id: 'staff-manager' });
          return {
            ...base,
            maybeSingle: async () => ({ data: { id: 'staff-manager' }, error: null }),
          };
        }

        return queryResult([
          { id: 'staff-1', staff_code: 'STF-1', full_name: 'Maria Rivera' },
          { id: 'staff-2', staff_code: 'STF-2', full_name: 'Joao Silva' },
        ]);
      }

      if (table === 'routes') {
        return queryResult([
          {
            id: 'route-1',
            route_date: today,
            status: 'PUBLISHED',
            route_owner_staff_id: 'staff-manager',
            route_owner: {
              id: 'staff-manager',
              staff_code: 'MGR-1',
              full_name: 'Ops Manager',
            },
          },
        ]);
      }

      if (table === 'route_stops') {
        return queryResult([
          {
            id: 'stop-1',
            route_id: 'route-1',
            stop_order: 1,
            stop_status: 'PENDING',
            status: 'PENDING',
            planned_start_at: `${today}T22:00:00.000Z`,
            planned_end_at: `${today}T23:00:00.000Z`,
            arrived_at: null,
            departed_at: null,
            site: { id: 'site-1', site_code: '1006', name: 'Agawam Crossing' },
            site_job: { id: 'job-1', job_code: 'JOB-1006', site: { id: 'site-1', site_code: '1006', name: 'Agawam Crossing' } },
          },
        ]);
      }

      if (table === 'work_tickets') {
        return queryResult([]);
      }

      if (table === 'callout_events') {
        return queryResult([
          {
            id: 'callout-1',
            reason: 'SICK',
            status: 'REPORTED',
            reported_at: `${today}T20:00:00.000Z`,
            escalation_level: 1,
            route_id: 'route-1',
            route_stop_id: 'stop-1',
            affected_staff: [{ id: 'staff-9', staff_code: 'STF-9', full_name: 'Gloria Lopez' }],
            reported_by_staff: [{ id: 'staff-manager', staff_code: 'MGR-1', full_name: 'Ops Manager' }],
            covered_by_staff: [],
            site: [{ id: 'site-1', site_code: '1006', name: 'Agawam Crossing' }],
          },
        ]);
      }

      if (table === 'payroll_export_mappings') {
        return queryResult([
          {
            id: 'map-1',
            template_name: 'Checkwriters Flex',
            provider_code: 'CHECKWRITERS',
            is_default: true,
          },
        ]);
      }

      if (table === 'payroll_export_runs') {
        return queryResult([
          {
            id: 'run-1',
            period_start: '2026-02-09',
            period_end: '2026-02-22',
            status: 'PREVIEW_READY',
            created_at: `${today}T19:00:00.000Z`,
            exported_at: null,
            mapping: { id: 'map-1', template_name: 'Checkwriters Flex' },
          },
        ]);
      }

      throw new Error(`unexpected table query: ${table}`);
    },
  };

  try {
    const result = await getTonightBoard(
      db as never,
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['MANAGER'],
      },
      API_PATH,
    );

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    const payload = result.data as {
      pilot_enabled: boolean;
      features: {
        route_execution: boolean;
        callout_automation: boolean;
        payroll_export: boolean;
      };
      my_next_stop: { stop_id: string } | null;
      route_summaries: unknown[];
      recent_callouts: unknown[];
      coverage_candidates: unknown[];
      payroll_mappings: unknown[];
      payroll_runs: unknown[];
    };

    assert.equal(payload.pilot_enabled, true);
    assert.equal(payload.features.route_execution, true);
    assert.equal(payload.features.callout_automation, true);
    assert.equal(payload.features.payroll_export, true);
    assert.equal(payload.my_next_stop?.stop_id, 'stop-1');
    assert.equal(payload.route_summaries.length, 1);
    assert.equal(payload.recent_callouts.length, 1);
    assert.equal(payload.coverage_candidates.length, 2);
    assert.equal(payload.payroll_mappings.length, 1);
    assert.equal(payload.payroll_runs.length, 1);
  } finally {
    resetShiftsTimeFlags();
  }
});
