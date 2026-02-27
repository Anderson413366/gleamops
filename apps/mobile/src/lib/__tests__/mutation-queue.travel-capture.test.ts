import assert from 'node:assert/strict';
import test from 'node:test';
import { captureTravelSegmentSchema } from '@gleamops/shared';
import {
  buildTravelCaptureBody,
  TRAVEL_CAPTURE_API_PATH,
} from '../travel-capture-contract';

// ---------------------------------------------------------------------------
// Tests: verify the mobile → web contract for travel capture
// ---------------------------------------------------------------------------

test('TRAVEL_CAPTURE_API_PATH matches the web API route', () => {
  assert.equal(
    TRAVEL_CAPTURE_API_PATH,
    '/api/operations/shifts-time/travel/capture',
  );
});

test('buildTravelCaptureBody maps camelCase mutation to snake_case API payload', () => {
  const body = buildTravelCaptureBody({
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  assert.equal(body.route_id, '00000000-0000-0000-0000-000000000001');
  assert.equal(body.from_stop_id, '00000000-0000-0000-0000-000000000002');
  assert.equal(body.to_stop_id, '00000000-0000-0000-0000-000000000003');
});

test('buildTravelCaptureBody output has exactly 3 keys', () => {
  const body = buildTravelCaptureBody({
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });
  assert.equal(Object.keys(body).length, 3);
});

test('buildTravelCaptureBody output passes captureTravelSegmentSchema validation', () => {
  const body = buildTravelCaptureBody({
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  const result = captureTravelSegmentSchema.safeParse(body);
  assert.equal(result.success, true, 'mobile payload must match web schema');
});

test('buildTravelCaptureBody with invalid UUIDs fails schema validation', () => {
  const body = buildTravelCaptureBody({
    routeId: 'not-a-uuid',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  const result = captureTravelSegmentSchema.safeParse(body);
  assert.equal(result.success, false, 'invalid UUID must be rejected');
});
