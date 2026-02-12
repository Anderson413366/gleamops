/**
 * StatusPill — renders a Badge with the correct color for any entity status.
 * "Humans should be able to understand state in a half-second."
 */
import { Badge } from './badge';
import type { StatusColor } from '@gleamops/shared';

interface StatusPillProps {
  status: string;
  colorMap: Record<string, StatusColor>;
  className?: string;
}

export function StatusPill({ status, colorMap, className }: StatusPillProps) {
  const color = colorMap[status] ?? 'gray';
  const label = status.replace(/_/g, ' ');

  return (
    <Badge color={color} className={className}>
      {label}
    </Badge>
  );
}
