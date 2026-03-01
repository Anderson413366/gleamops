'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock3, MapPin, UserCircle2 } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type TaskKind = 'regular-shifts' | 'projects' | 'requests';

interface TodayTask {
  id: string;
  title: string;
  kind: TaskKind;
  site: string;
  window: string;
  staff: string;
  status: 'assigned' | 'open' | 'urgent';
}

interface TicketRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  required_staff_count: number | null;
  job: {
    job_name: string | null;
    frequency: string | null;
    job_type: string | null;
  } | null;
  site: {
    name: string | null;
  } | null;
  assignments: Array<{
    assignment_status: string | null;
    staff: { full_name: string | null } | null;
  }> | null;
}

interface FieldRequestAlertRow {
  id: string;
  title: string;
  body: string | null;
  severity: string | null;
}

interface TodaysTasksProps {
  date: string;
  filter: CommandCenterFilter;
}

function toStartOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function formatClock(time: string | null): string {
  if (!time) return 'Time TBD';
  const [hourRaw = '0', minuteRaw = '00'] = time.slice(0, 5).split(':');
  const hourNum = Number.parseInt(hourRaw, 10);
  if (Number.isNaN(hourNum)) return time;
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${hour12}:${minuteRaw} ${period}`;
}

function formatWindow(start: string | null, end: string | null): string {
  if (!start && !end) return 'Time TBD';
  return `${formatClock(start)} - ${formatClock(end)}`;
}

function normalizePriority(urgency: unknown, severity: string | null): 'asap' | 'high' | 'normal' {
  const normalized = String(urgency ?? '').toLowerCase();
  if (normalized === 'asap' || normalized === 'high' || normalized === 'normal') {
    return normalized;
  }
  if ((severity ?? '').toUpperCase() === 'CRITICAL') return 'asap';
  if ((severity ?? '').toUpperCase() === 'WARNING') return 'high';
  return 'normal';
}

function safeParseAlertBody(body: string | null): Record<string, unknown> {
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function isRecurringTicket(frequency: string | null | undefined, jobType: string | null | undefined): boolean {
  const normalizedFrequency = (frequency ?? '').trim().toUpperCase();
  const normalizedJobType = (jobType ?? '').trim().toUpperCase();
  const recurringFrequencies = new Set([
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    '2X_WEEK',
    '3X_WEEK',
    '4X_WEEK',
    '5X_WEEK',
    '6X_WEEK',
    '7X_WEEK',
  ]);

  if (recurringFrequencies.has(normalizedFrequency)) return true;
  if (normalizedJobType.includes('RECURRING')) return true;
  if (normalizedJobType.includes('CONTRACT')) return true;
  return false;
}

function formatStaffLabel(assignedNames: string[], requiredStaffCount: number): string {
  if (!assignedNames.length) {
    return requiredStaffCount > 1 ? `Open (${requiredStaffCount} needed)` : 'Open Shift';
  }
  if (assignedNames.length <= 2) {
    return assignedNames.join(', ');
  }
  return `${assignedNames.slice(0, 2).join(', ')} +${assignedNames.length - 2}`;
}

function getStatusTone(status: TodayTask['status']): 'green' | 'yellow' | 'red' {
  if (status === 'urgent') return 'red';
  if (status === 'open') return 'yellow';
  return 'green';
}

function getStatusLabel(status: TodayTask['status']) {
  if (status === 'urgent') return 'Urgent';
  if (status === 'open') return 'Open Shift';
  return 'Assigned';
}

export function TodaysTasks({ date, filter }: TodaysTasksProps) {
  const [allTasks, setAllTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      const [ticketRes, requestsRes] = await Promise.all([
        supabase
          .from('work_tickets')
          .select(`
            id,
            ticket_code,
            scheduled_date,
            start_time,
            end_time,
            status,
            required_staff_count,
            job:site_jobs!work_tickets_job_id_fkey(job_name, frequency, job_type),
            site:sites!work_tickets_site_id_fkey(name),
            assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
          `)
          .eq('scheduled_date', date)
          .is('archived_at', null)
          .order('start_time', { ascending: true }),
        supabase
          .from('alerts')
          .select('id, title, body, severity')
          .eq('alert_type', 'FIELD_REQUEST')
          .is('dismissed_at', null)
          .gte('created_at', toStartOfDayIso(date))
          .lte('created_at', toEndOfDayIso(date))
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const ticketTasks = ((ticketRes.data ?? []) as unknown as TicketRow[]).map((ticket) => {
        const required = Math.max(1, ticket.required_staff_count ?? 1);
        const assigned = (ticket.assignments ?? [])
          .filter((assignment) => assignment.assignment_status === 'ASSIGNED')
          .map((assignment) => assignment.staff?.full_name?.trim())
          .filter((name): name is string => Boolean(name));
        const isOpen = assigned.length < required;
        const isUrgent = !isOpen && (ticket.status ?? '').toUpperCase() === 'IN_PROGRESS';
        const kind: TaskKind = isRecurringTicket(ticket.job?.frequency, ticket.job?.job_type)
          ? 'regular-shifts'
          : 'projects';

        return {
          id: `ticket-${ticket.id}`,
          title: ticket.job?.job_name?.trim() || ticket.ticket_code,
          kind,
          site: ticket.site?.name?.trim() || 'Unassigned Site',
          window: formatWindow(ticket.start_time, ticket.end_time),
          staff: formatStaffLabel(assigned, required),
          status: isOpen ? 'open' : isUrgent ? 'urgent' : 'assigned',
        } satisfies TodayTask;
      });

      const requestTasks = ((requestsRes.data ?? []) as FieldRequestAlertRow[]).map((row) => {
        const body = safeParseAlertBody(row.body);
        const priority = normalizePriority(body.urgency, row.severity);
        return {
          id: `request-${row.id}`,
          title: row.title,
          kind: 'requests',
          site: String(body.site_name ?? 'Unknown Site'),
          window: priority === 'asap' ? 'ASAP' : 'Today',
          staff: String(body.submitted_by ?? 'Field Staff'),
          status: priority === 'asap' ? 'urgent' : priority === 'high' ? 'open' : 'assigned',
        } satisfies TodayTask;
      });

      const merged = [...ticketTasks, ...requestTasks];
      merged.sort((a, b) => {
        const score = (task: TodayTask) => {
          if (task.status === 'urgent') return 0;
          if (task.status === 'open') return 1;
          return 2;
        };
        return score(a) - score(b);
      });

      setAllTasks(merged);
      setLoading(false);
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const tasks = useMemo(() => {
    if (filter === 'all') {
      return allTasks;
    }
    return allTasks.filter((task) => task.kind === filter);
  }, [allTasks, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Today&apos;s Tasks
        </CardTitle>
        <CardDescription>Assignments and priorities for {date}</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        ) : !tasks.length ? (
          <p className="text-sm text-muted-foreground">No tasks in this filter yet. Upcoming tasks appear here once scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="space-y-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <Badge color={getStatusTone(task.status)}>{getStatusLabel(task.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.site}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.window}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.staff}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
