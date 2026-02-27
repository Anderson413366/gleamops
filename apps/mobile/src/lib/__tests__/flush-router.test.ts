import assert from 'node:assert/strict';
import test from 'node:test';
import { captureTravelSegmentSchema } from '@gleamops/shared';
import { resolveFlushRoute } from '../flush-router';

// ---------------------------------------------------------------------------
// route_travel_capture — the new mutation type
// ---------------------------------------------------------------------------

test('resolveFlushRoute routes route_travel_capture to correct API path', () => {
  const route = resolveFlushRoute({
    type: 'route_travel_capture',
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  assert.ok(route, 'should resolve to a flush route');
  assert.equal(route.apiPath, '/api/operations/shifts-time/travel/capture');
});

test('resolveFlushRoute builds correct travel capture body with snake_case keys', () => {
  const route = resolveFlushRoute({
    type: 'route_travel_capture',
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  assert.ok(route);
  const body = route.body as Record<string, string>;
  assert.equal(body.route_id, '00000000-0000-0000-0000-000000000001');
  assert.equal(body.from_stop_id, '00000000-0000-0000-0000-000000000002');
  assert.equal(body.to_stop_id, '00000000-0000-0000-0000-000000000003');
  assert.equal(Object.keys(body).length, 3);
});

test('resolveFlushRoute travel capture body passes web schema validation', () => {
  const route = resolveFlushRoute({
    type: 'route_travel_capture',
    routeId: '00000000-0000-0000-0000-000000000001',
    fromStopId: '00000000-0000-0000-0000-000000000002',
    toStopId: '00000000-0000-0000-0000-000000000003',
  });

  assert.ok(route);
  const result = captureTravelSegmentSchema.safeParse(route.body);
  assert.equal(result.success, true, 'body must pass web schema');
});

// ---------------------------------------------------------------------------
// Other route mutation types — verify routing table coverage
// ---------------------------------------------------------------------------

test('resolveFlushRoute routes route_start_shift correctly', () => {
  const route = resolveFlushRoute({
    type: 'route_start_shift',
    routeId: 'route-1',
    mileageStart: 12345,
    vehicleId: 'v-1',
    keyBoxNumber: 'KB-42',
  });

  assert.ok(route);
  assert.equal(route.apiPath, '/api/operations/routes/route-1/start-shift');
  assert.equal(route.body.mileage_start, 12345);
  assert.equal(route.body.vehicle_id, 'v-1');
});

test('resolveFlushRoute routes route_end_shift correctly', () => {
  const route = resolveFlushRoute({
    type: 'route_end_shift',
    routeId: 'route-1',
    mileageEnd: 12400,
    vehicleCleaned: true,
    personalItemsRemoved: true,
    floaterNotes: 'All good',
  });

  assert.ok(route);
  assert.equal(route.apiPath, '/api/operations/routes/route-1/end-shift');
  assert.equal(route.body.mileage_end, 12400);
  assert.equal(route.body.floater_notes, 'All good');
});

test('resolveFlushRoute routes route_arrive_stop correctly', () => {
  const route = resolveFlushRoute({ type: 'route_arrive_stop', stopId: 'stop-1' });
  assert.ok(route);
  assert.equal(route.apiPath, '/api/operations/routes/stops/stop-1/arrive');
});

test('resolveFlushRoute routes route_complete_stop correctly', () => {
  const route = resolveFlushRoute({ type: 'route_complete_stop', stopId: 'stop-1' });
  assert.ok(route);
  assert.equal(route.apiPath, '/api/operations/routes/stops/stop-1/complete');
});

test('resolveFlushRoute routes route_skip_stop correctly', () => {
  const route = resolveFlushRoute({
    type: 'route_skip_stop',
    stopId: 'stop-1',
    skipReason: 'SITE_CLOSED',
    skipNotes: null,
  });
  assert.ok(route);
  assert.equal(route.apiPath, '/api/operations/routes/stops/stop-1/skip');
  assert.equal(route.body.skip_reason, 'SITE_CLOSED');
});

test('resolveFlushRoute returns null for direct Supabase mutation types', () => {
  assert.equal(resolveFlushRoute({ type: 'checklist_toggle' }), null);
  assert.equal(resolveFlushRoute({ type: 'time_event' }), null);
  assert.equal(resolveFlushRoute({ type: 'photo_metadata' }), null);
  assert.equal(resolveFlushRoute({ type: 'inspection_score' }), null);
  assert.equal(resolveFlushRoute({ type: 'inspection_status' }), null);
});
