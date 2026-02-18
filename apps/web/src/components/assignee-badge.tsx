'use client';

import { Badge } from '@gleamops/ui';
import type { BadgeColor } from '@gleamops/ui';
import type { AssignableType } from '@gleamops/shared';

interface AssigneeBadgeProps {
  type: AssignableType;
  name: string;
}

const BADGE_MAP: Record<AssignableType, { color: BadgeColor; prefix: string }> = {
  staff: { color: 'blue', prefix: 'Employee' },
  subcontractor: { color: 'purple', prefix: 'Subcontractor' },
};

export function AssigneeBadge({ type, name }: AssigneeBadgeProps) {
  const { color, prefix } = BADGE_MAP[type];
  return (
    <Badge color={color}>
      {prefix}: {name}
    </Badge>
  );
}
