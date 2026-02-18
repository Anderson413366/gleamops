'use client';

import { Badge } from '@gleamops/ui';

export function ConflictBadge({ severity, label }: { severity: 'blocking' | 'warning'; label: string }) {
  return <Badge color={severity === 'blocking' ? 'red' : 'yellow'}>{label}</Badge>;
}
