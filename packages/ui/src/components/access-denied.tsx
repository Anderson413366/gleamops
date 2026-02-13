import { ShieldAlert, Home } from 'lucide-react';
import { cn } from '../utils';

interface AccessDeniedProps {
  message?: string;
  dashboardHref?: string;
  className?: string;
}

export function AccessDenied({
  message = 'You do not have permission to view this page.',
  dashboardHref = '/pipeline',
  className,
}: AccessDeniedProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-6 text-center',
        className
      )}
    >
      <div className="rounded-2xl border-2 border-dashed border-border p-10 max-w-md w-full">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{message}</p>
        <a
          href={dashboardHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
