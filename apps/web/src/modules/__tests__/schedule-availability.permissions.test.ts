import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canEditAvailabilityGrid,
  canManageAvailabilityActions,
} from '@/modules/schedule/schedule.permissions';

test('availability actions follow schedule manager-tier roles', () => {
  assert.equal(canManageAvailabilityActions('OWNER_ADMIN'), true);
  assert.equal(canManageAvailabilityActions('manager'), true);
  assert.equal(canManageAvailabilityActions('SUPERVISOR'), true);
  assert.equal(canManageAvailabilityActions('admin'), true);
  assert.equal(canManageAvailabilityActions(' operations '), true);
});

test('availability actions stay read-only for field and non-schedule roles', () => {
  assert.equal(canManageAvailabilityActions('CLEANER'), false);
  assert.equal(canManageAvailabilityActions('INSPECTOR'), false);
  assert.equal(canManageAvailabilityActions('SALES'), false);
  assert.equal(canManageAvailabilityActions(null), false);
});

test('editing the weekly availability grid requires exactly one selected staff member', () => {
  assert.equal(canEditAvailabilityGrid('MANAGER', 1), true);
  assert.equal(canEditAvailabilityGrid('MANAGER', 0), false);
  assert.equal(canEditAvailabilityGrid('MANAGER', 2), false);
  assert.equal(canEditAvailabilityGrid('CLEANER', 1), false);
});
