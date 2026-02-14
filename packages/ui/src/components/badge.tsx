'use client';
import { cn } from '../utils';
import { BADGE_COLOR_CLASSES } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';

/** @deprecated Use StatusColor from @gleamops/shared instead */
export type BadgeColor = StatusColor;

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  color?: StatusColor | null;
  dot?: boolean;
}

export function Badge({ color, children, className, dot = true, ...props }: BadgeProps) {
  const c = BADGE_COLOR_CLASSES[color ?? 'gray'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        c.bg, c.text, c.border,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {children}
    </span>
  );
}
