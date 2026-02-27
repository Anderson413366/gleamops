import assert from 'node:assert/strict';
import test from 'node:test';
import { _resetFlagCache, captureTravelSegmentSchema } from '@gleamops/shared';
import { captureTravelSegmentRpc } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/travel/capture';

function setTravelFlags() {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = '1';
  _resetFlagCache();
}

function resetTravelFlags() {
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  _resetFlagCache();
}

function createTravelDb(mode: 'ok' | 'rpc_error') {
  const calls = { rpcCount: 0, rpcName: '' };
  const db = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rpc(name: string, _params: Record<string, unknown>) {
      calls.rpcCount += 1;
      calls.rpcName = name;
      if (mode === 'rpc_error') {
        return Promise.resolve({ data: null, error: { message: 'rpc failed' } });
      }
      return Promise.resolve({
        data: '00000000-0000-0000-0000-000000000099',
        error: null,
      });
    },
  };
  return { db, calls };
}

test('captureTravelSegmentRpc succeeds for operator role with flags enabled', async () => {
  setTravelFlags();
  try {
    const { db, calls } = createTravelDb('ok');
    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['CLEANER'] },
      {
        route_id: '00000000-0000-0000-0000-000000000001',
        from_stop_id: '00000000-0000-0000-0000-000000000002',
        to_stop_id: '00000000-0000-0000-0000-000000000003',
      },
      API_PATH,
    );

    assert.equal(result.success, true);
    assert.equal(calls.rpcCount, 1);
    assert.equal(calls.rpcName, 'fn_auto_capture_travel_segment');
  } finally {
    resetTravelFlags();
  }
});

test('captureTravelSegmentRpc rejects when route execution flag is disabled', async () => {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  _resetFlagCache();
  try {
    const { db, calls } = createTravelDb('ok');
    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['CLEANER'] },
      {
        route_id: '00000000-0000-0000-0000-000000000001',
        from_stop_id: '00000000-0000-0000-0000-000000000002',
        to_stop_id: '00000000-0000-0000-0000-000000000003',
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    assert.equal(calls.rpcCount, 0);
  } finally {
    resetTravelFlags();
  }
});

test('captureTravelSegmentRpc rejects unauthorized role', async () => {
  setTravelFlags();
  try {
    const { db, calls } = createTravelDb('ok');
    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['SALES'] },
      {
        route_id: '00000000-0000-0000-0000-000000000001',
        from_stop_id: '00000000-0000-0000-0000-000000000002',
        to_stop_id: '00000000-0000-0000-0000-000000000003',
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 403);
    }
    assert.equal(calls.rpcCount, 0);
  } finally {
    resetTravelFlags();
  }
});

test('captureTravelSegmentRpc surfaces RPC error', async () => {
  setTravelFlags();
  try {
    const { db, calls } = createTravelDb('rpc_error');
    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['CLEANER'] },
      {
        route_id: '00000000-0000-0000-0000-000000000001',
        from_stop_id: '00000000-0000-0000-0000-000000000002',
        to_stop_id: '00000000-0000-0000-0000-000000000003',
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    assert.equal(calls.rpcCount, 1);
    if (!result.success) {
      assert.ok(result.error.detail?.includes('rpc failed'));
    }
  } finally {
    resetTravelFlags();
  }
});

test('captureTravelSegmentRpc passes travel_end_at when provided', async () => {
  setTravelFlags();
  try {
    let capturedParams: Record<string, unknown> = {};
    const db = {
      rpc(name: string, params: Record<string, unknown>) {
        capturedParams = params;
        return Promise.resolve({ data: 'segment-id', error: null });
      },
    };

    await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      {
        route_id: '00000000-0000-0000-0000-000000000001',
        from_stop_id: '00000000-0000-0000-0000-000000000002',
        to_stop_id: '00000000-0000-0000-0000-000000000003',
        travel_end_at: '2026-03-01T22:30:00Z',
      },
      API_PATH,
    );

    assert.equal(capturedParams.p_travel_end_at, '2026-03-01T22:30:00Z');
    assert.equal(capturedParams.p_route_id, '00000000-0000-0000-0000-000000000001');
    assert.equal(capturedParams.p_from_stop_id, '00000000-0000-0000-0000-000000000002');
    assert.equal(capturedParams.p_to_stop_id, '00000000-0000-0000-0000-000000000003');
  } finally {
    resetTravelFlags();
  }
});

// -- Validation schema tests (mirrors the payload shape the UI sends) --

test('captureTravelSegmentSchema accepts valid UI payload (route_id + from_stop_id + to_stop_id)', () => {
  const payload = {
    route_id: '00000000-0000-0000-0000-000000000001',
    from_stop_id: '00000000-0000-0000-0000-000000000002',
    to_stop_id: '00000000-0000-0000-0000-000000000003',
  };
  const result = captureTravelSegmentSchema.safeParse(payload);
  assert.equal(result.success, true);
});

test('captureTravelSegmentSchema rejects non-UUID route_id', () => {
  const payload = {
    route_id: 'not-a-uuid',
    from_stop_id: '00000000-0000-0000-0000-000000000002',
    to_stop_id: '00000000-0000-0000-0000-000000000003',
  };
  const result = captureTravelSegmentSchema.safeParse(payload);
  assert.equal(result.success, false);
});

test('captureTravelSegmentSchema rejects missing from_stop_id', () => {
  const payload = {
    route_id: '00000000-0000-0000-0000-000000000001',
    to_stop_id: '00000000-0000-0000-0000-000000000003',
  };
  const result = captureTravelSegmentSchema.safeParse(payload);
  assert.equal(result.success, false);
});
