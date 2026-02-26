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

test('tonight board projects assigned work tickets when no route records exist', async () => {
  setShiftsTimeFlags();

  const today = new Date().toISOString().slice(0, 10);
  let staffLookupCalls = 0;

  const db = {
    from(table: string) {
      if (table === 'staff') {
        if (staffLookupCalls === 0) {
          staffLookupCalls += 1;
          return {
            ...queryResult<{ id: string } | null>({ id: 'staff-1' }),
            maybeSingle: async () => ({ data: { id: 'staff-1' }, error: null }),
          };
        }

        return queryResult([{ id: 'staff-1', staff_code: 'STF-1', full_name: 'Maria Rivera' }]);
      }

      if (table === 'routes') {
        return queryResult([]);
      }

      if (table === 'work_tickets') {
        return queryResult([
          {
            id: 'ticket-1',
            ticket_code: 'WT-1001',
            scheduled_date: today,
            start_time: '18:00:00',
            end_time: '20:00:00',
            status: 'SCHEDULED',
            site: { id: 'site-1', site_code: '1006', name: 'Agawam Crossing' },
            assignments: [
              {
                id: 'asg-1',
                staff_id: 'staff-1',
                assignment_status: 'ASSIGNED',
                staff: { id: 'staff-1', staff_code: 'STF-1', full_name: 'Maria Rivera' },
              },
            ],
          },
        ]);
      }

      if (table === 'callout_events' || table === 'payroll_export_mappings' || table === 'payroll_export_runs') {
        return queryResult([]);
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
      route_summaries: Array<{
        route_id: string;
        stops: Array<{
          stop_id: string;
          execution_source: string;
          work_ticket_id: string | null;
        }>;
      }>;
      my_next_stop: {
        execution_source: string;
        work_ticket_id: string | null;
      } | null;
      totals: { stops: number };
    };

    assert.equal(payload.totals.stops, 1);
    assert.equal(payload.route_summaries.length, 1);
    assert.equal(payload.route_summaries[0]?.stops[0]?.execution_source, 'work_ticket');
    assert.equal(payload.route_summaries[0]?.stops[0]?.work_ticket_id, 'ticket-1');
    assert.equal(payload.my_next_stop?.execution_source, 'work_ticket');
    assert.equal(payload.my_next_stop?.work_ticket_id, 'ticket-1');
  } finally {
    resetShiftsTimeFlags();
  }
});
