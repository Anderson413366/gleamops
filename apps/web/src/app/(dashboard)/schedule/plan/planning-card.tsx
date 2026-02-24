'use client';

import { ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { PlanningStatus } from '@gleamops/shared';

interface AssignmentInfo {
  id: string;
  assignment_status?: string | null;
  staff_id?: string | null;
  staff?: { full_name?: string | null } | null;
}

export interface PlanningTicket {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  planning_status: PlanningStatus;
  required_staff_count: number | null;
  position_code: string | null;
  site?: {
    id?: string | null;
    name?: string | null;
    site_code?: string | null;
  } | null;
  assignments?: AssignmentInfo[] | null;
  notes?: string | null;
}

interface PlanningCardProps {
  ticket: PlanningTicket;
  onMarkReady: (ticketId: string) => void;
  onAssign: (ticketId: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, ticketId: string) => void;
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = minuteRaw ?? '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

export function PlanningCard({
  ticket,
  onMarkReady,
  onAssign,
  draggable = false,
  onDragStart,
}: PlanningCardProps) {
  const activeAssignments = (ticket.assignments ?? []).filter(
    (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
  );
  const required = ticket.required_staff_count ?? 1;
  const assigned = activeAssignments.length;
  const hasGap = assigned < required;
  const isReady = ticket.planning_status === 'READY';

  const timeWindow = [formatTime(ticket.start_time), formatTime(ticket.end_time)]
    .filter(Boolean)
    .join(' – ');

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, ticket.id)}
      className={`rounded-lg border p-3 bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isReady ? 'border-success/40 bg-success/5' : hasGap ? 'border-destructive/40' : 'border-border'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {ticket.site?.name ?? 'Unknown Site'}
          </p>
          <p className="text-xs text-muted-foreground">
            {ticket.site?.site_code ?? ticket.ticket_code}
          </p>
        </div>
        {isReady && (
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-label="Ready" />
        )}
      </div>

      {/* Time */}
      {timeWindow && (
        <p className="text-xs text-muted-foreground mb-2">{timeWindow}</p>
      )}

      {/* Staff */}
      <div className="space-y-1 mb-2">
        {activeAssignments.map((a) => (
          <div key={a.id} className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden />
            <span className="text-foreground truncate">
              {a.staff?.full_name ?? 'Assigned'}
            </span>
          </div>
        ))}
        {hasGap && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            <span>{required - assigned} more needed</span>
          </div>
        )}
      </div>

      {/* Notes / supplies indicator */}
      {ticket.notes && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <ClipboardList className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{ticket.notes}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        {hasGap && (
          <button
            type="button"
            onClick={() => onAssign(ticket.id)}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px] min-w-[44px] flex items-center justify-center px-2 py-1 -my-1"
          >
            Assign
          </button>
        )}
        {!isReady && (
          <button
            type="button"
            onClick={() => onMarkReady(ticket.id)}
            className="text-xs font-medium text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px] min-w-[44px] flex items-center justify-center px-2 py-1 -my-1 ml-auto"
          >
            Ready ✓
          </button>
        )}
        {isReady && (
          <Badge color="green" className="ml-auto text-[10px]">Ready</Badge>
        )}
      </div>
    </div>
  );
}
