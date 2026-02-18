import type { Assignable } from '@gleamops/shared';

export function toAssignableLabel(assignable: Assignable): string {
  const prefix = assignable.assignable_type === 'staff' ? 'Employee' : 'Subcontractor';
  return `${prefix}: ${assignable.display_name}`;
}

export function isSubcontractor(assignable: Assignable): boolean {
  return assignable.assignable_type === 'subcontractor';
}
