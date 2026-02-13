import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      color: {
        green:
          'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/25 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/30',
        red:
          'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/25 dark:bg-red-950 dark:text-red-400 dark:ring-red-500/30',
        yellow:
          'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-500/30',
        blue:
          'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/25 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-500/30',
        gray:
          'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
        orange:
          'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/25 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-500/30',
        purple:
          'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/25 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-500/30',
      },
    },
    defaultVariants: {
      color: 'gray',
    },
  }
);

export type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange' | 'purple';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  color?: BadgeColor | null;
}

export function Badge({ className, color, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ color }), className)} {...props} />;
}
