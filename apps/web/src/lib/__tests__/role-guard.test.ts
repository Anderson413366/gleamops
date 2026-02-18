import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageSchedule, canPublishSchedule, hasAnyRole } from '@/lib/api/role-guard';

test('hasAnyRole normalizes and matches roles', () => {
  assert.equal(hasAnyRole([' manager ', 'viewer'], ['MANAGER']), true);
  assert.equal(hasAnyRole(['employee'], ['OWNER_ADMIN', 'MANAGER']), false);
});

test('canManageSchedule allows manager set including supervisor', () => {
  assert.equal(canManageSchedule(['SUPERVISOR']), true);
  assert.equal(canManageSchedule(['manager']), true);
  assert.equal(canManageSchedule(['owner_admin']), true);
  assert.equal(canManageSchedule(['ADMIN']), true);
  assert.equal(canManageSchedule(['operations']), true);
  assert.equal(canManageSchedule(['employee']), false);
});

test('canPublishSchedule allows only owner admin and manager', () => {
  assert.equal(canPublishSchedule(['MANAGER']), true);
  assert.equal(canPublishSchedule(['OWNER_ADMIN']), true);
  assert.equal(canPublishSchedule(['ADMIN']), true);
  assert.equal(canPublishSchedule(['operations']), true);
  assert.equal(canPublishSchedule(['SUPERVISOR']), false);
});
