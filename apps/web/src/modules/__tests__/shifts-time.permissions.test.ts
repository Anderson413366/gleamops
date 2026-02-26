import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManageShiftsTimeCoverage,
  canManageShiftsTimePayroll,
  canOperateShiftsTimeRouteExecution,
  canReportShiftsTimeCallout,
  canRespondShiftsTimeCoverage,
} from '@/modules/shifts-time';

test('route execution roles include cleaner and supervisor but exclude sales', () => {
  assert.equal(canOperateShiftsTimeRouteExecution(['CLEANER']), true);
  assert.equal(canOperateShiftsTimeRouteExecution(['supervisor']), true);
  assert.equal(canOperateShiftsTimeRouteExecution(['technician']), true);
  assert.equal(canOperateShiftsTimeRouteExecution(['sales']), false);
});

test('coverage manager roles exclude cleaner for offer management', () => {
  assert.equal(canManageShiftsTimeCoverage(['OWNER_ADMIN']), true);
  assert.equal(canManageShiftsTimeCoverage(['manager']), true);
  assert.equal(canManageShiftsTimeCoverage(['operations']), true);
  assert.equal(canManageShiftsTimeCoverage(['cleaner']), false);
});

test('callout reporting and response can be done by route operators', () => {
  assert.equal(canReportShiftsTimeCallout(['cleaner']), true);
  assert.equal(canRespondShiftsTimeCoverage(['cleaner']), true);
  assert.equal(canReportShiftsTimeCallout(['sales']), false);
});

test('payroll export roles are manager tier only', () => {
  assert.equal(canManageShiftsTimePayroll(['OWNER_ADMIN']), true);
  assert.equal(canManageShiftsTimePayroll(['MANAGER']), true);
  assert.equal(canManageShiftsTimePayroll(['admin']), true);
  assert.equal(canManageShiftsTimePayroll(['SUPERVISOR']), false);
  assert.equal(canManageShiftsTimePayroll(['CLEANER']), false);
});
