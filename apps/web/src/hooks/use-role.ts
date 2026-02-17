'use client';

import { useAuth } from './use-auth';
import { canAccess } from '@gleamops/domain';
import { normalizeRoleCode } from '@gleamops/shared';
import type { UserRole } from '@gleamops/shared';

/**
 * Role-aware permission hook.
 * Uses the role from JWT claims (injected by custom_access_token_hook).
 */
export function useRole() {
  const { role, loading } = useAuth();

  function can(permission: Parameters<typeof canAccess>[1]): boolean {
    if (!role) return false;
    return canAccess(role, permission);
  }

  function isAtLeast(minRole: UserRole): boolean {
    const normalizedRole = normalizeRoleCode(role);
    const normalizedMinRole = normalizeRoleCode(minRole);
    if (!normalizedRole || !normalizedMinRole) return false;
    const hierarchy: string[] = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES', 'INSPECTOR', 'CLEANER'];
    const current = hierarchy.indexOf(normalizedRole);
    const target = hierarchy.indexOf(normalizedMinRole);
    return current >= 0 && current <= target;
  }

  return {
    role,
    loading,
    can,
    isAtLeast,
    isAdmin: normalizeRoleCode(role) === 'OWNER_ADMIN',
    isManager: ['OWNER_ADMIN', 'MANAGER'].includes(normalizeRoleCode(role) ?? ''),
  };
}
