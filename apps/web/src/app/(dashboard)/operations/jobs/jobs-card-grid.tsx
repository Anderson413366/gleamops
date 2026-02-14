'use client';

import { Briefcase } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
  COMPLETED: 'green',
};

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface JobsCardGridProps {
  rows: JobWithRelations[];
  onSelect: (item: JobWithRelations) => void;
}

function formatCurrency(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function JobsCardGrid({ rows, onSelect }: JobsCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Briefcase className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.job_name ?? item.job_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.job_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge color={JOB_STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            <Badge color="blue">{item.frequency}</Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.site?.name && <p className="truncate max-w-full">{item.site.name}</p>}
            {item.site?.client?.name && <p className="truncate max-w-full">{item.site.client.name}</p>}
            {item.billing_amount != null && (
              <p className="font-medium text-foreground">{formatCurrency(item.billing_amount)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
