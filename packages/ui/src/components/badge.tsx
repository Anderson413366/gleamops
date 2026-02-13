import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      color: {
        green:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/25',
        red:    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/25',
        yellow: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25',
        blue:   'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/25',
        gray:   'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20',
        orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/25',
        purple: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/25',
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
