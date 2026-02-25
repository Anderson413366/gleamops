import { cn } from '../utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  href?: string;
}

export function StatCard({ label, value, icon, trend, trendUp, className, href }: StatCardProps) {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'block rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out sm:p-5',
        href && 'cursor-pointer hover:shadow-md hover:border-primary/40',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1.5 text-[clamp(1rem,3vw,1.5rem)] font-bold leading-tight text-foreground tabular-nums [overflow-wrap:anywhere]">
            {value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trendUp ? 'text-success' : 'text-destructive'
                )}
                aria-label={trendUp ? 'Trending up' : 'Trending down'}
              >
                {trendUp ? '\u2191' : '\u2193'}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  trendUp ? 'text-success' : 'text-destructive'
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-3 shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary sm:ml-4 sm:p-3">
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
