/**
 * Schedule-specific permission checks.
 * Re-exported from lib/api/role-guard.ts for module colocation.
 */
import { canManageSchedule, canPublishSchedule } from '@/lib/api/role-guard';

function toRoles(role: string | null | undefined): string[] {
  return typeof role === 'string' && role.trim().length > 0 ? [role] : [];
}

export { canManageSchedule, canPublishSchedule };

export function canManageAvailabilityActions(role: string | null | undefined): boolean {
  return canManageSchedule(toRoles(role));
}

export function canEditAvailabilityGrid(role: string | null | undefined, selectedStaffCount: number): boolean {
  return selectedStaffCount === 1 && canManageAvailabilityActions(role);
}
