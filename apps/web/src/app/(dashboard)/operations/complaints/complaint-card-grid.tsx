'use client';

import { MessageSquareWarning } from 'lucide-react';
import { Badge } from '@gleamops/ui';

export interface ComplaintCardItem {
  id: string;
  complaint_code: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  site?: { name?: string | null; site_code?: string | null } | null;
  assigned_staff?: { full_name?: string | null; staff_code?: string | null } | null;
}

interface ComplaintCardGridProps {
  rows: ComplaintCardItem[];
  onSelect: (row: ComplaintCardItem) => void;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'green';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ESCALATED':
      return 'red';
    case 'ASSIGNED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'URGENT_SAME_NIGHT':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'NORMAL':
      return 'yellow';
    case 'LOW':
      return 'green';
    default:
      return 'gray';
  }
}

export function ComplaintCardGrid({ rows, onSelect }: ComplaintCardGridProps) {
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
              <MessageSquareWarning className="h-5 w-5" />
            </span>
            <Badge color={statusColor(row.status)}>{row.status}</Badge>
          </div>

          <p className="mt-3 text-sm font-semibold text-foreground">{row.complaint_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.site?.name ?? row.site?.site_code ?? 'Unknown site'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
            <Badge color="gray">{row.category}</Badge>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Assigned: {row.assigned_staff?.full_name ?? row.assigned_staff?.staff_code ?? 'Unassigned'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </p>
        </button>
      ))}
    </div>
  );
}
