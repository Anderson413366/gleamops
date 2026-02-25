'use client';

import { BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge, Card, CardContent } from '@gleamops/ui';
import type { WorkOrderTableRow } from './work-order-table';
import { formatDate } from '@/lib/utils/date';

interface WorkOrderCardGridProps {
  rows: WorkOrderTableRow[];
  onSelect: (row: WorkOrderTableRow) => void;
}

const STATUS_BADGE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray' | 'red'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELED: 'red',
};

function crewSummary(row: WorkOrderTableRow) {
  if (!row.assigned_crew.trim()) return 'Unassigned';
  const names = row.assigned_crew.split(',').map((name) => name.trim()).filter(Boolean);
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export function WorkOrderCardGrid({ rows, onSelect }: WorkOrderCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card
          key={row.id}
          role="button"
          tabIndex={0}
          className="cursor-pointer border-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => onSelect(row)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(row);
            }
          }}
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted-foreground">{row.ticket_code}</p>
              <Badge color={STATUS_BADGE_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {row.job?.job_name?.trim() || row.job?.job_code || 'Project Work Order'}
              </p>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {row.site_name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
                <p className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Date
                </p>
                <p className="mt-1 font-medium text-foreground">{formatDate(row.scheduled_date)}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
                <p className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  Crew
                </p>
                <p className="mt-1 font-medium text-foreground">{crewSummary(row)}</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
              Open details
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
