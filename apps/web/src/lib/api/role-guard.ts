const SCHEDULE_MANAGER_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS'] as const;
const SCHEDULE_PUBLISH_ROLES = ['OWNER_ADMIN', 'MANAGER', 'ADMIN', 'OPERATIONS'] as const;

function normalizeRoles(roles: string[]): string[] {
  return roles.map((role) => role.trim().toUpperCase()).filter(Boolean);
}

export function hasAnyRole(roles: string[], allowedRoles: readonly string[]): boolean {
  const normalized = normalizeRoles(roles);
  return allowedRoles.some((role) => normalized.includes(role));
}

export function canManageSchedule(roles: string[]): boolean {
  return hasAnyRole(roles, SCHEDULE_MANAGER_ROLES);
}

export function canPublishSchedule(roles: string[]): boolean {
  return hasAnyRole(roles, SCHEDULE_PUBLISH_ROLES);
}
