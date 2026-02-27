import assert from 'node:assert/strict';
import test from 'node:test';
import { _resetFlagCache, captureTravelSegmentSchema } from '@gleamops/shared';
import { captureTravelSegmentRpc } from '@/modules/shifts-time';

/**
 * Contract tests: verify the mobile app's travel capture payload shape
 * is accepted by the web API's validation and service layer.
 *
 * These tests simulate what the mobile mutation queue sends after
 * buildTravelCaptureBody() maps camelCase → snake_case.
 */

const API_PATH = '/api/operations/shifts-time/travel/capture';

function setFlags() {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = '1';
  _resetFlagCache();
}

function resetFlags() {
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  _resetFlagCache();
}

test('mobile travel capture payload passes web schema validation', () => {
  // This is the exact shape buildTravelCaptureBody() produces
  const mobilePayload = {
    route_id: '00000000-0000-0000-0000-000000000001',
    from_stop_id: '00000000-0000-0000-0000-000000000002',
    to_stop_id: '00000000-0000-0000-0000-000000000003',
  };

  const result = captureTravelSegmentSchema.safeParse(mobilePayload);
  assert.equal(result.success, true, 'mobile payload must be accepted by web schema');
});

test('mobile travel capture payload is processed by service layer', async () => {
  setFlags();
  try {
    let capturedRpcName = '';
    let capturedParams: Record<string, unknown> = {};
    const db = {
      rpc(name: string, params: Record<string, unknown>) {
        capturedRpcName = name;
        capturedParams = params;
        return Promise.resolve({ data: 'segment-id', error: null });
      },
    };

    // Simulate the exact payload mobile sends
    const mobilePayload = {
      route_id: '00000000-0000-0000-0000-000000000001',
      from_stop_id: '00000000-0000-0000-0000-000000000002',
      to_stop_id: '00000000-0000-0000-0000-000000000003',
    };

    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['CLEANER'] },
      mobilePayload,
      API_PATH,
    );

    assert.equal(result.success, true);
    assert.equal(capturedRpcName, 'fn_auto_capture_travel_segment');
    assert.equal(capturedParams.p_route_id, mobilePayload.route_id);
    assert.equal(capturedParams.p_from_stop_id, mobilePayload.from_stop_id);
    assert.equal(capturedParams.p_to_stop_id, mobilePayload.to_stop_id);
  } finally {
    resetFlags();
  }
});

test('mobile travel capture payload rejected for unauthorized role', async () => {
  setFlags();
  try {
    const db = {
      rpc() {
        return Promise.resolve({ data: null, error: null });
      },
    };

    const mobilePayload = {
      route_id: '00000000-0000-0000-0000-000000000001',
      from_stop_id: '00000000-0000-0000-0000-000000000002',
      to_stop_id: '00000000-0000-0000-0000-000000000003',
    };

    const result = await captureTravelSegmentRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['SALES'] },
      mobilePayload,
      API_PATH,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 403);
    }
  } finally {
    resetFlags();
  }
});
