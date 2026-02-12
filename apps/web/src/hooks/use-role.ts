'use client';

import { useAuth } from './use-auth';
import { canAccess } from '@gleamops/domain';
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
    if (!role) return false;
    const hierarchy: UserRole[] = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES', 'INSPECTOR', 'CLEANER'];
    const current = hierarchy.indexOf(role);
    const target = hierarchy.indexOf(minRole);
    return current >= 0 && current <= target;
  }

  return {
    role,
    loading,
    can,
    isAtLeast,
    isAdmin: role === 'OWNER_ADMIN',
    isManager: role === 'OWNER_ADMIN' || role === 'MANAGER',
  };
}
