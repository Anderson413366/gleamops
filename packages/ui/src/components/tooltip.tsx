import { cn } from '../utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<string, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground border-y-transparent border-l-transparent',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  className,
}: TooltipProps) {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md',
          'opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100',
          positionClasses[position]
        )}
      >
        {content}
        {/* Arrow */}
        <span
          className={cn(
            'absolute h-0 w-0 border-[4px]',
            arrowClasses[position]
          )}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}
