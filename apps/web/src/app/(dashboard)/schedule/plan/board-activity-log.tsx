'use client';

import { useMemo } from 'react';
import { Activity, CalendarPlus, UserPlus, ArrowRight } from 'lucide-react';
import { CollapsibleCard, Badge } from '@gleamops/ui';
import type { PlanningTicket } from './planning-card';
import { formatScheduleTime } from './format-schedule-time';

interface BoardActivityLogProps {
  tickets: PlanningTicket[];
}

interface ActivityEntry {
  id: string;
  icon: 'create' | 'assign' | 'move';
  label: string;
  detail: string;
  status: string;
}

export function BoardActivityLog({ tickets }: BoardActivityLogProps) {
  const entries = useMemo(() => {
    const items: ActivityEntry[] = [];

    for (const ticket of tickets) {
      const siteName = ticket.site?.name ?? ticket.ticket_code;
      const timeRange = [formatScheduleTime(ticket.start_time), formatScheduleTime(ticket.end_time)]
        .filter(Boolean)
        .join(' – ');

      items.push({
        id: `${ticket.id}-status`,
        icon: 'move',
        label: `${siteName} → ${ticket.planning_status.replace('_', ' ')}`,
        detail: timeRange || ticket.ticket_code,
        status: ticket.planning_status,
      });

      const activeAssignments = (ticket.assignments ?? []).filter(
        (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
      );

      for (const assignment of activeAssignments) {
        items.push({
          id: `${ticket.id}-${assignment.id}`,
          icon: 'assign',
          label: `${assignment.staff?.full_name ?? 'Staff'} assigned to ${siteName}`,
          detail: ticket.ticket_code,
          status: ticket.planning_status,
        });
      }
    }

    return items;
  }, [tickets]);

  if (entries.length === 0) return null;

  const iconMap = {
    create: <CalendarPlus className="h-3.5 w-3.5 text-primary shrink-0" />,
    assign: <UserPlus className="h-3.5 w-3.5 text-success shrink-0" />,
    move: <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
  };

  const statusColor: Record<string, 'yellow' | 'blue' | 'green' | 'gray'> = {
    NOT_STARTED: 'yellow',
    IN_PROGRESS: 'blue',
    READY: 'green',
  };

  return (
    <CollapsibleCard
      id="board-activity"
      title={
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden />
          Board Activity
          <Badge color="blue">{entries.length}</Badge>
        </span>
      }
    >
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {entries.slice(0, 30).map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40">
            {iconMap[entry.icon]}
            <span className="text-foreground truncate flex-1">{entry.label}</span>
            <Badge color={statusColor[entry.status] ?? 'gray'} className="text-[9px] shrink-0">
              {entry.status.replace('_', ' ')}
            </Badge>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
