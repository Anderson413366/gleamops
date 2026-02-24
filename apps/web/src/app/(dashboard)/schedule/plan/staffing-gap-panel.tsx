'use client';

import { AlertCircle, UserPlus } from 'lucide-react';
import { CollapsibleCard, Button } from '@gleamops/ui';
import type { PlanningTicket } from './planning-card';

interface StaffOption {
  id: string;
  staff_code: string;
  full_name: string | null;
}

interface StaffingGapPanelProps {
  tickets: PlanningTicket[];
  availableStaff: StaffOption[];
  onQuickAssign: (ticketId: string, staffId: string) => void;
  busy?: boolean;
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

export function StaffingGapPanel({
  tickets,
  availableStaff,
  onQuickAssign,
  busy = false,
}: StaffingGapPanelProps) {
  const gapTickets = tickets.filter((t) => {
    const active = (t.assignments ?? []).filter(
      (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
    );
    return active.length < (t.required_staff_count ?? 1);
  });

  if (gapTickets.length === 0) return null;

  // Collect staff IDs already assigned across all tickets for this date
  const assignedStaffIds = new Set(
    tickets.flatMap((t) =>
      (t.assignments ?? [])
        .filter((a) => !a.assignment_status || a.assignment_status === 'ASSIGNED')
        .map((a) => a.staff_id)
        .filter(Boolean)
    )
  );

  return (
    <CollapsibleCard
      id="staffing-gaps"
      title={
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
          Staffing Gaps ({gapTickets.length} {gapTickets.length === 1 ? 'ticket needs' : 'tickets need'} staff)
        </span>
      }
      defaultOpen
    >
      <div className="space-y-3">
        {gapTickets.map((ticket) => {
          const active = (ticket.assignments ?? []).filter(
            (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
          );
          const needed = (ticket.required_staff_count ?? 1) - active.length;
          const timeWindow = [formatTime(ticket.start_time), formatTime(ticket.end_time)]
            .filter(Boolean)
            .join(' – ');

          // Filter available staff to exclude those already assigned to any ticket on this date
          const eligible = availableStaff.filter((s) => !assignedStaffIds.has(s.id));

          return (
            <div key={ticket.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">
                  {ticket.site?.name ?? ticket.ticket_code}
                </span>
                <span className="text-xs text-muted-foreground">{timeWindow}</span>
              </div>
              <p className="text-xs text-destructive mb-2">
                Needs {needed} {ticket.position_code ?? 'Cleaner'}
              </p>
              {eligible.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {eligible.slice(0, 5).map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onQuickAssign(ticket.id, s.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <UserPlus className="h-3 w-3" aria-hidden />
                      {s.full_name ?? s.staff_code}
                    </Button>
                  ))}
                  {eligible.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center ml-1">
                      +{eligible.length - 5} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No available staff found</p>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}
