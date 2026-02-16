'use client';

import type { StatusColor } from '@gleamops/shared';
import { BADGE_COLOR_CLASSES } from '@gleamops/shared';
import { cn } from '../utils';

const ROW_ACCENT_CLASSES: Record<StatusColor, string> = {
  green: 'border-l-4 border-l-green-500/80',
  yellow: 'border-l-4 border-l-yellow-500/80',
  red: 'border-l-4 border-l-red-500/80',
  blue: 'border-l-4 border-l-blue-500/80',
  gray: 'border-l-4 border-l-slate-400/70',
  orange: 'border-l-4 border-l-orange-500/80',
  purple: 'border-l-4 border-l-purple-500/80',
};

export function resolveStatusColor(status: string | null | undefined): StatusColor {
  if (!status) return 'gray';
  const normalized = status.trim().toUpperCase();

  if (
    normalized.includes('ACTIVE') ||
    normalized.includes('COMPLETE') ||
    normalized.includes('COMPLETED') ||
    normalized.includes('GOOD') ||
    normalized.includes('RECEIVED') ||
    normalized.includes('APPROVED')
  ) return 'green';

  if (
    normalized.includes('ON_HOLD') ||
    normalized.includes('PENDING') ||
    normalized.includes('REVIEW') ||
    normalized.includes('IN_PROGRESS') ||
    normalized.includes('ON_LEAVE') ||
    normalized.includes('SHIPPED') ||
    normalized.includes('ORDERED')
  ) return 'yellow';

  if (
    normalized.includes('CANCELED') ||
    normalized.includes('CANCELLED') ||
    normalized.includes('TERMINATED') ||
    normalized.includes('LOST') ||
    normalized.includes('EXPIRED') ||
    normalized.includes('REVOKED') ||
    normalized.includes('CRITICAL')
  ) return 'red';

  if (
    normalized.includes('DRAFT') ||
    normalized.includes('INACTIVE') ||
    normalized.includes('RETIRED') ||
    normalized.includes('SUPERSEDED')
  ) return 'gray';

  if (
    normalized.includes('SCHEDULED') ||
    normalized.includes('PROSPECT') ||
    normalized.includes('SUBMITTED')
  ) return 'blue';

  return 'gray';
}

export function resolvePriorityColor(priority: string | null | undefined): StatusColor {
  if (!priority) return 'gray';
  const normalized = priority.trim().toUpperCase();
  if (normalized === 'CRITICAL') return 'red';
  if (normalized === 'HIGH') return 'orange';
  if (normalized === 'MEDIUM' || normalized === 'STANDARD') return 'blue';
  if (normalized === 'LOW') return 'gray';
  return 'gray';
}

export function statusRowAccentClass(status: string | null | undefined): string {
  return ROW_ACCENT_CLASSES[resolveStatusColor(status)];
}

export function statusRowAccentClassByColor(color: StatusColor | null | undefined): string {
  return ROW_ACCENT_CLASSES[color ?? 'gray'];
}

export function priorityRowAccentClass(priority: string | null | undefined): string {
  return ROW_ACCENT_CLASSES[resolvePriorityColor(priority)];
}

interface StatusDotProps {
  status?: string | null;
  color?: StatusColor | null;
  className?: string;
}

export function StatusDot({ status, color, className }: StatusDotProps) {
  const c = BADGE_COLOR_CLASSES[color ?? resolveStatusColor(status)];
  return <span aria-hidden className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', c.dot, className)} />;
}
