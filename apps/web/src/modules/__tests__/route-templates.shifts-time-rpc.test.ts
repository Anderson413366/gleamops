import assert from 'node:assert/strict';
import test from 'node:test';
import { _resetFlagCache } from '@gleamops/shared';
import { arriveAtStop, completeStop } from '@/modules/route-templates';

type SingleResult = { data: Record<string, unknown> | null; error: { message: string } | null };

type DbStubConfig = {
  selectSingles: SingleResult[];
  updateSingles?: SingleResult[];
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function createDbStub(config: DbStubConfig) {
  const selectSingles = [...config.selectSingles];
  const updateSingles = [...(config.updateSingles ?? [])];
  const calls = {
    rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  };

  const db = {
    from(table: string) {
      let updateMode = false;
      return {
        select() {
          return this;
        },
        update(payload: Record<string, unknown>) {
          updateMode = true;
          calls.updates.push({ table, payload });
          return this;
        },
        eq() {
          return this;
        },
        is() {
          return this;
        },
        async single() {
          if (updateMode) {
            updateMode = false;
            return updateSingles.shift() ?? { data: null, error: { message: 'missing update stub' } };
          }
          return selectSingles.shift() ?? { data: null, error: { message: 'missing select stub' } };
        },
      };
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.rpc.push({ fn, args });
      if (config.rpc) return config.rpc(fn, args);
      return { data: null, error: null };
    },
  };

  return { db, calls };
}

const auth = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['SUPERVISOR'],
} as const;

const apiPath = '/api/operations/routes/stops/[id]/arrive';

function resetShiftsTimeFlags() {
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  _resetFlagCache();
}

test('arriveAtStop uses legacy update when shifts-time flags are disabled', async () => {
  resetShiftsTimeFlags();
  const { db, calls } = createDbStub({
    selectSingles: [{ data: { id: 'stop-1' }, error: null }],
    updateSingles: [{ data: { id: 'stop-1', stop_status: 'ARRIVED' }, error: null }],
  });

  const result = await arriveAtStop(db as never, auth as never, 'stop-1', apiPath);

  assert.equal(result.success, true);
  assert.equal(calls.rpc.length, 0);
  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0]?.payload.stop_status, 'ARRIVED');
});

test('arriveAtStop uses RPC when shifts-time route execution flags are enabled', async () => {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = 'true';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = 'true';
  _resetFlagCache();
  const { db, calls } = createDbStub({
    selectSingles: [{ data: { id: 'stop-1' }, error: null }],
    rpc: async () => ({ data: { id: 'stop-1', stop_status: 'ARRIVED' }, error: null }),
  });

  const result = await arriveAtStop(db as never, auth as never, 'stop-1', apiPath);

  assert.equal(result.success, true);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0]?.fn, 'fn_route_start_stop');
});

test('completeStop uses RPC and refreshes stop row when flags are enabled', async () => {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = 'true';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = 'true';
  _resetFlagCache();
  const { db, calls } = createDbStub({
    selectSingles: [
      { data: { id: 'stop-1', stop_status: 'ARRIVED' }, error: null },
      { data: { id: 'stop-1', stop_status: 'COMPLETED' }, error: null },
    ],
    rpc: async () => ({ data: { completed_stop_id: 'stop-1' }, error: null }),
  });

  const result = await completeStop(db as never, auth as never, 'stop-1', apiPath);

  assert.equal(result.success, true);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0]?.fn, 'fn_route_complete_stop');
  if (result.success) {
    const row = result.data as Record<string, unknown>;
    assert.equal(row.stop_status, 'COMPLETED');
  }
});

test('completeStop returns SYS_002 when RPC fails in enabled mode', async () => {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = 'true';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = 'true';
  _resetFlagCache();
  const { db } = createDbStub({
    selectSingles: [{ data: { id: 'stop-1' }, error: null }],
    rpc: async () => ({ data: null, error: { message: 'rpc boom' } }),
  });

  const result = await completeStop(db as never, auth as never, 'stop-1', apiPath);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, 'SYS_002');
    assert.equal(result.error.status, 500);
  }
});
