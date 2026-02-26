'use client';

import { RefreshCw } from 'lucide-react';
import { Badge } from '@gleamops/ui';

export interface PeriodicTaskCardItem {
  id: string;
  periodic_code: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
  next_due_date: string;
  last_completed_at: string | null;
  is_overdue?: boolean;
  is_due_soon?: boolean;
  site_job?: {
    job_code?: string | null;
    site?: { name?: string | null; site_code?: string | null } | null;
  } | null;
  preferred_staff?: { full_name?: string | null; staff_code?: string | null } | null;
}

interface PeriodicTaskCardGridProps {
  rows: PeriodicTaskCardItem[];
  onSelect: (row: PeriodicTaskCardItem) => void;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'PAUSED':
      return 'yellow';
    case 'ARCHIVED':
      return 'gray';
    default:
      return 'gray';
  }
}

export function PeriodicTaskCardGrid({ rows, onSelect }: PeriodicTaskCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onSelect(row)}
          className="rounded-lg border border-border bg-card p-4 shadow-sm text-left transition-all duration-200 ease-in-out hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5" />
            </span>
            <Badge color={statusColor(row.status)}>{row.status}</Badge>
          </div>

          <p className="mt-3 text-sm font-semibold text-foreground">{row.periodic_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.site_job?.site?.name ?? row.site_job?.site?.site_code ?? row.site_job?.job_code ?? 'Unknown site'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge color="blue">{row.frequency}</Badge>
            {row.is_overdue ? <Badge color="red">OVERDUE</Badge> : null}
            {!row.is_overdue && row.is_due_soon ? <Badge color="yellow">DUE SOON</Badge> : null}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Next due: {new Date(`${row.next_due_date}T00:00:00.000Z`).toLocaleDateString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last done: {row.last_completed_at ? new Date(row.last_completed_at).toLocaleDateString() : 'Never'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assigned: {row.preferred_staff?.full_name ?? row.preferred_staff?.staff_code ?? 'Unassigned'}
          </p>
        </button>
      ))}
    </div>
  );
}

