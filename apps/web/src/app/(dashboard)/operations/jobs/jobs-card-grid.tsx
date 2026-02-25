'use client';

/* eslint-disable @next/next/no-img-element */

import { Briefcase } from 'lucide-react';
import type { SiteJob } from '@gleamops/shared';

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; photo_url?: string | null; client?: { name: string } | null } | null;
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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-module-accent/40 hover:shadow-md flex flex-col items-center p-6 text-center"
        >
          {item.site?.photo_url ? (
            <img
              src={item.site.photo_url}
              alt={item.job_name ?? item.job_code}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-2xl font-bold text-module-accent">
              <Briefcase className="h-8 w-8" />
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.job_name ?? item.job_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.job_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-module-accent/12 px-2.5 py-1 text-[11px] font-medium text-module-accent">
              {item.frequency}
            </span>
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
