/**
 * RBAC permission rules (pure functions).
 * Decides WHAT a role can do. Site scoping decides WHERE.
 */
import type { UserRole } from '@gleamops/shared';
import { normalizeRoleCode } from '@gleamops/shared';

type Permission =
  | 'pipeline:read'
  | 'pipeline:write'
  | 'customers:read'
  | 'customers:write'
  | 'schedule:read'
  | 'schedule:write'
  | 'team:read'
  | 'team:write'
  | 'team:approve'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'service_dna:write'
  | 'bid:calculate'
  | 'proposal:send'
  | 'bid:convert'
  | 'inspections:read'
  | 'inspections:write'
  | 'messaging:read'
  | 'messaging:write'
  | 'timekeeping:read'
  | 'timekeeping:write'
  | 'timekeeping:approve';

const LEGACY_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER_ADMIN: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'schedule:read', 'schedule:write',
    'team:read', 'team:write', 'team:approve',
    'reports:read',
    'settings:read', 'settings:write',
    'service_dna:write',
    'bid:calculate', 'proposal:send', 'bid:convert',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:write', 'timekeeping:approve',
  ],
  MANAGER: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'schedule:read', 'schedule:write',
    'team:read', 'team:write', 'team:approve',
    'reports:read',
    'settings:read',
    'service_dna:write',
    'bid:calculate', 'proposal:send', 'bid:convert',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:write', 'timekeeping:approve',
  ],
  SUPERVISOR: [
    'pipeline:read',
    'customers:read',
    'schedule:read', 'schedule:write',
    'team:read',
    'reports:read',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:approve',
  ],
  CLEANER: [
    'schedule:read',
    'team:read',
    'inspections:read',
    'messaging:read',
    'timekeeping:read', 'timekeeping:write',
  ],
  INSPECTOR: [
    'customers:read',
    'schedule:read',
    'team:read',
    'reports:read',
    'inspections:read', 'inspections:write',
    'messaging:read',
    'timekeeping:read',
  ],
  SALES: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'reports:read',
    'bid:calculate', 'proposal:send',
  ],
};

const ALIAS_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: LEGACY_ROLE_PERMISSIONS.OWNER_ADMIN,
  OPERATIONS: LEGACY_ROLE_PERMISSIONS.MANAGER,
  TECHNICIAN: LEGACY_ROLE_PERMISSIONS.CLEANER,
  WAREHOUSE: LEGACY_ROLE_PERMISSIONS.SUPERVISOR,
  FINANCE: LEGACY_ROLE_PERMISSIONS.MANAGER,
};

export const rolePermissions: Record<string, Permission[]> = {
  ...LEGACY_ROLE_PERMISSIONS,
  ...ALIAS_ROLE_PERMISSIONS,
};

export function canAccess(role: UserRole, permission: Permission): boolean {
  const normalized = normalizeRoleCode(role);
  if (!normalized) return false;
  return LEGACY_ROLE_PERMISSIONS[normalized]?.includes(permission) ?? false;
}
