/**
 * RBAC permission rules (pure functions).
 * Decides WHAT a role can do. Site scoping decides WHERE.
 */
import type { UserRole } from '@gleamops/shared';

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
  | 'bid:convert';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER_ADMIN: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'schedule:read', 'schedule:write',
    'team:read', 'team:write', 'team:approve',
    'reports:read',
    'settings:read', 'settings:write',
    'service_dna:write',
    'bid:calculate', 'proposal:send', 'bid:convert',
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
  ],
  SUPERVISOR: [
    'pipeline:read',
    'customers:read',
    'schedule:read', 'schedule:write',
    'team:read',
    'reports:read',
  ],
  CLEANER: [
    'schedule:read',
    'team:read',
  ],
  INSPECTOR: [
    'customers:read',
    'schedule:read',
    'team:read',
    'reports:read',
  ],
  SALES: [
    'pipeline:read', 'pipeline:write',
    'customers:read', 'customers:write',
    'reports:read',
    'bid:calculate', 'proposal:send',
  ],
};

export const rolePermissions = ROLE_PERMISSIONS;

export function canAccess(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
