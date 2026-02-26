import { hasAnyRole } from '@/lib/api/role-guard';

const SHIFT_TIME_ROUTE_OPERATOR_ROLES = [
  'OWNER_ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'CLEANER',
  'INSPECTOR',
] as const;

const SHIFT_TIME_COVERAGE_MANAGER_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;

const SHIFT_TIME_PAYROLL_MANAGER_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;

export function canOperateShiftsTimeRouteExecution(roles: string[]): boolean {
  return hasAnyRole(roles, SHIFT_TIME_ROUTE_OPERATOR_ROLES);
}

export function canManageShiftsTimeCoverage(roles: string[]): boolean {
  return hasAnyRole(roles, SHIFT_TIME_COVERAGE_MANAGER_ROLES);
}

export function canReportShiftsTimeCallout(roles: string[]): boolean {
  return canOperateShiftsTimeRouteExecution(roles) || canManageShiftsTimeCoverage(roles);
}

export function canRespondShiftsTimeCoverage(roles: string[]): boolean {
  return canOperateShiftsTimeRouteExecution(roles) || canManageShiftsTimeCoverage(roles);
}

export function canManageShiftsTimePayroll(roles: string[]): boolean {
  return hasAnyRole(roles, SHIFT_TIME_PAYROLL_MANAGER_ROLES);
}
