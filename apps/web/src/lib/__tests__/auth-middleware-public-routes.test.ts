import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicRoutePath } from '@/lib/supabase/middleware';

test('proposal public routes bypass auth redirect', () => {
  assert.equal(isPublicRoutePath('/proposal/invalid-token'), true);
  assert.equal(isPublicRoutePath('/api/public/proposals/invalid-token'), true);
});

test('portal public routes bypass auth redirect', () => {
  assert.equal(isPublicRoutePath('/public/portal'), true);
  assert.equal(isPublicRoutePath('/public/portal/abc123'), true);
  assert.equal(isPublicRoutePath('/api/public/portal/auth'), true);
  assert.equal(isPublicRoutePath('/api/public/portal/abc123/dashboard'), true);
});

test('pwa assets bypass auth redirect', () => {
  assert.equal(isPublicRoutePath('/manifest.webmanifest'), true);
  assert.equal(isPublicRoutePath('/sw.js'), true);
});

test('protected dashboard routes still require auth', () => {
  assert.equal(isPublicRoutePath('/schedule'), false);
  assert.equal(isPublicRoutePath('/home'), false);
});

test('protected schedule and timekeeping APIs still require auth', () => {
  assert.equal(isPublicRoutePath('/api/operations/schedule/periods'), false);
  assert.equal(isPublicRoutePath('/api/operations/schedule/trades'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/stops/123/start'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/tickets/123/start'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/tickets/123/complete'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/callouts/report'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/payroll/preview'), false);
  assert.equal(isPublicRoutePath('/api/operations/shifts-time/tonight-board'), false);
  assert.equal(isPublicRoutePath('/api/timekeeping/pin-checkin'), false);
});
