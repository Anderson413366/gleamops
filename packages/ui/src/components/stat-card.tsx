import { cn } from '../utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trendUp ? 'text-emerald-600' : 'text-red-600'
                )}
                aria-label={trendUp ? 'Trending up' : 'Trending down'}
              >
                {trendUp ? '\u2191' : '\u2193'}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  trendUp ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 shrink-0 rounded-xl bg-gleam-50 p-3 text-gleam-600 dark:bg-gleam-950 dark:text-gleam-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
