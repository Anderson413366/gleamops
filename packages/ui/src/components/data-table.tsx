import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../utils';

// ---------------------------------------------------------------------------
// Table container
// ---------------------------------------------------------------------------
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className={cn('min-w-full divide-y divide-border', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-muted/50', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TableRow({ className, onClick, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
      onClick={onClick}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 text-sm text-foreground', className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Sortable table head
// ---------------------------------------------------------------------------
type SortDirection = 'asc' | 'desc' | false;

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: SortDirection;
  onSort?: () => void;
}

export function TableHead({
  children,
  sortable,
  sorted,
  onSort,
  className,
  ...props
}: TableHeadProps) {
  const SortIcon = sorted === 'asc'
    ? ChevronUp
    : sorted === 'desc'
      ? ChevronDown
      : ChevronsUpDown;

  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          <SortIcon className={cn(
            'h-3.5 w-3.5 transition-colors',
            sorted ? 'text-primary' : 'text-muted-foreground'
          )} />
        )}
      </span>
    </th>
  );
}
