'use client';
import { cn } from '../utils';

export type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange' | 'purple';

const colorMap: Record<BadgeColor, { bg: string; text: string; border: string; dot: string; darkBg: string; darkText: string; darkBorder: string }> = {
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  darkBg: 'dark:bg-green-950',  darkText: 'dark:text-green-400',  darkBorder: 'dark:border-green-800' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    darkBg: 'dark:bg-red-950',    darkText: 'dark:text-red-400',    darkBorder: 'dark:border-red-800' },
  yellow: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  darkBg: 'dark:bg-amber-950',  darkText: 'dark:text-amber-400',  darkBorder: 'dark:border-amber-800' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   darkBg: 'dark:bg-blue-950',   darkText: 'dark:text-blue-400',   darkBorder: 'dark:border-blue-800' },
  gray:   { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200',   dot: 'bg-gray-500',   darkBg: 'dark:bg-gray-800',   darkText: 'dark:text-gray-400',   darkBorder: 'dark:border-gray-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', darkBg: 'dark:bg-orange-950', darkText: 'dark:text-orange-400', darkBorder: 'dark:border-orange-800' },
  purple: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', darkBg: 'dark:bg-violet-950', darkText: 'dark:text-violet-400', darkBorder: 'dark:border-violet-800' },
};

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  color?: BadgeColor | null;
  dot?: boolean;
}

export function Badge({ color, children, className, dot = true, ...props }: BadgeProps) {
  const c = colorMap[color ?? 'gray'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        c.bg, c.text, c.border, c.darkBg, c.darkText, c.darkBorder,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {children}
    </span>
  );
}
