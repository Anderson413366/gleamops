import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      color: {
        green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
        red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
        yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
        gray: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
        orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
        purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
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
