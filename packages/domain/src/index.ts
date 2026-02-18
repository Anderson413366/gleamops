/**
 * @gleamops/domain — Pure business rules (no framework imports).
 *
 * This package contains domain logic that is shared between web, mobile, and worker.
 * No database calls, no React, no Next.js — just rules and validators.
 */

export { canTransitionStatus } from './status-machine';
export { rolePermissions, canAccess } from './permissions';
export { canTransitionSchedulePeriod } from './schedule-state-machine';
export { canTransitionPlanningSyncState } from './planning-state-machine';
