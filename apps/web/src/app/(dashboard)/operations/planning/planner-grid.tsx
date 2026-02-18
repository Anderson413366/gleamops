'use client';

import type { ReactNode } from 'react';

interface AssignmentRow {
  id: string;
  assignment_status?: string | null;
  staff?: { full_name?: string | null } | null;
}

export interface PlannerTicketRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  required_staff_count: number | null;
  position_code: string | null;
  site?: { id?: string | null; name?: string | null; site_code?: string | null } | null;
  assignments?: AssignmentRow[] | null;
}

interface PlannerGridProps {
  tickets: PlannerTicketRow[];
  emptyState?: ReactNode;
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = minuteRaw ?? '00';
  const suffix = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute}${suffix}`;
}

export function PlannerGrid({ tickets, emptyState }: PlannerGridProps) {
  if (tickets.length === 0) {
    return <>{emptyState ?? <p className="text-sm text-muted-foreground">No tickets in this period.</p>}</>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Ticket</th>
            <th className="px-3 py-2 text-left">Site</th>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-left">Coverage</th>
            <th className="px-3 py-2 text-left">Role</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const activeAssignments = (ticket.assignments ?? []).filter(
              (assignment) => !assignment.assignment_status || assignment.assignment_status === 'ASSIGNED'
            );
            const assignedCount = activeAssignments.length;
            const requiredCount = ticket.required_staff_count ?? 1;
            const coverageClass = assignedCount >= requiredCount
              ? 'text-success'
              : 'text-destructive';

            return (
              <tr key={ticket.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{ticket.ticket_code}</td>
                <td className="px-3 py-2">
                  {ticket.site?.name ?? '—'}
                  {ticket.site?.site_code ? (
                    <span className="ml-1 text-xs text-muted-foreground">({ticket.site.site_code})</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{new Date(ticket.scheduled_date).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {formatTime(ticket.start_time)}
                  {ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}
                </td>
                <td className={`px-3 py-2 font-semibold ${coverageClass}`}>
                  {assignedCount}/{requiredCount}
                </td>
                <td className="px-3 py-2">{ticket.position_code ?? '—'}</td>
                <td className="px-3 py-2">{ticket.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
