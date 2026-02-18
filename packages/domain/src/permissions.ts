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
  | 'schedule:publish'
  | 'schedule:lock'
  | 'schedule:override_locked'
  | 'team:read'
  | 'team:write'
  | 'team:approve'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'service_dna:write'
  | 'bid:calculate'
  | 'bid:approve'
  | 'proposal:send'
  | 'bid:convert'
  | 'inspections:read'
  | 'inspections:write'
  | 'messaging:read'
  | 'messaging:write'
  | 'timekeeping:read'
  | 'timekeeping:write'
  | 'timekeeping:approve'
  | 'planning:read'
  | 'planning:write'
  | 'planning:apply'
  | 'planning:publish'
  | 'sync:batch:ingest';

const LEGACY_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER_ADMIN: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'schedule:read', 'schedule:write', 'schedule:publish', 'schedule:lock', 'schedule:override_locked',
    'team:read', 'team:write', 'team:approve',
    'reports:read',
    'settings:read', 'settings:write',
    'service_dna:write',
    'bid:calculate', 'bid:approve', 'proposal:send', 'bid:convert',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:write', 'timekeeping:approve',
    'planning:read', 'planning:write', 'planning:apply', 'planning:publish',
    'sync:batch:ingest',
  ],
  MANAGER: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'schedule:read', 'schedule:write', 'schedule:publish', 'schedule:lock', 'schedule:override_locked',
    'team:read', 'team:write', 'team:approve',
    'reports:read',
    'settings:read',
    'service_dna:write',
    'bid:calculate', 'bid:approve', 'proposal:send', 'bid:convert',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:write', 'timekeeping:approve',
    'planning:read', 'planning:write', 'planning:apply', 'planning:publish',
    'sync:batch:ingest',
  ],
  SUPERVISOR: [
    'pipeline:read',
    'customers:read',
    'schedule:read', 'schedule:write', 'schedule:publish',
    'team:read',
    'reports:read',
    'inspections:read', 'inspections:write',
    'messaging:read', 'messaging:write',
    'timekeeping:read', 'timekeeping:approve',
    'planning:read', 'planning:write', 'planning:apply',
    'sync:batch:ingest',
  ],
  CLEANER: [
    'schedule:read',
    'team:read',
    'inspections:read',
    'messaging:read',
    'timekeeping:read', 'timekeeping:write',
    'planning:read',
    'sync:batch:ingest',
  ],
  INSPECTOR: [
    'customers:read',
    'schedule:read',
    'team:read',
    'reports:read',
    'inspections:read', 'inspections:write',
    'messaging:read',
    'timekeeping:read',
    'planning:read',
    'sync:batch:ingest',
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
