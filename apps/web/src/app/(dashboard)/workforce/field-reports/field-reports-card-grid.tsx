'use client';

import { Inbox } from 'lucide-react';
import { Badge } from '@gleamops/ui';

export interface FieldReportCardItem {
  id: string;
  report_code: string;
  report_type: 'SUPPLY_REQUEST' | 'MAINTENANCE' | 'DAY_OFF' | 'INCIDENT' | 'GENERAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  created_at: string;
  site?: { name?: string | null; site_code?: string | null } | null;
  reporter?: { full_name?: string | null; staff_code?: string | null } | null;
}

interface FieldReportsCardGridProps {
  rows: FieldReportCardItem[];
  onSelect: (row: FieldReportCardItem) => void;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'RESOLVED':
      return 'green';
    case 'DISMISSED':
      return 'gray';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ACKNOWLEDGED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'URGENT':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'LOW':
      return 'green';
    default:
      return 'yellow';
  }
}

export function FieldReportsCardGrid({ rows, onSelect }: FieldReportsCardGridProps) {
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
              <Inbox className="h-5 w-5" />
            </span>
            <Badge color={statusColor(row.status)}>{row.status}</Badge>
          </div>

          <p className="mt-3 text-sm font-semibold text-foreground">{row.report_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.site?.name ?? row.site?.site_code ?? 'No site'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge color="blue">{row.report_type}</Badge>
            <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            By: {row.reporter?.full_name ?? row.reporter?.staff_code ?? 'Unknown'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </p>
        </button>
      ))}
    </div>
  );
}

