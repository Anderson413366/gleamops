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
          className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.job_name ?? item.job_code}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.job_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color={JOB_STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            <Badge color="blue">{item.frequency}</Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.site?.name && <p className="truncate">{item.site.name}</p>}
            {item.site?.client?.name && <p className="truncate">{item.site.client.name}</p>}
            {item.billing_amount != null && (
              <p className="font-medium text-foreground">{formatCurrency(item.billing_amount)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
