'use client';

import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
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

type ProjectStatus = 'scheduled' | 'staffing-needed' | 'in-progress';

interface WeeklyProjectItem {
  id: string;
  title: string;
  site: string;
  window: string;
  crew: string;
  status: ProjectStatus;
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
  site: { name: string | null } | null;
  assignments: Array<{
    assignment_status: string | null;
    staff: { full_name: string | null } | null;
  }> | null;
}

interface WeeklyProjectsProps {
  date: string;
  filter: CommandCenterFilter;
}

function startOfWeek(dateValue: string): Date {
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();
  const distanceFromMonday = (day + 6) % 7;
  date.setDate(date.getDate() - distanceFromMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function formatWindow(date: string, startTime: string | null, endTime: string | null): string {
  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  return `${dayLabel} · ${formatClock(startTime)} - ${formatClock(endTime)}`;
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

function crewLabel(names: string[]): string {
  if (!names.length) return 'Unassigned crew';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function projectsForFilter(filter: CommandCenterFilter, projects: WeeklyProjectItem[]) {
  if (filter === 'regular-shifts') return [];
  if (filter === 'requests') {
    return projects.filter((project) => project.status === 'staffing-needed');
  }
  return projects;
}

function statusTone(status: ProjectStatus): 'blue' | 'yellow' | 'green' {
  if (status === 'staffing-needed') return 'yellow';
  if (status === 'in-progress') return 'green';
  return 'blue';
}

function statusLabel(status: ProjectStatus) {
  if (status === 'staffing-needed') return 'Staffing Needed';
  if (status === 'in-progress') return 'In Progress';
  return 'Scheduled';
}

export function WeeklyProjects({ date, filter }: WeeklyProjectsProps) {
  const [allProjects, setAllProjects] = useState<WeeklyProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const weekStart = startOfWeek(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          id,
          ticket_code,
          scheduled_date,
          start_time,
          end_time,
          status,
          required_staff_count,
          job:job_id(job_name, frequency, job_type),
          site:site_id(name),
          assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
        `)
        .gte('scheduled_date', toDateKey(weekStart))
        .lte('scheduled_date', toDateKey(weekEnd))
        .is('archived_at', null)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setAllProjects([]);
        setLoading(false);
        return;
      }

      const projects = ((data as unknown as TicketRow[]).filter((ticket) => {
        return !isRecurringTicket(ticket.job?.frequency, ticket.job?.job_type);
      }).map((ticket) => {
        const assigned = (ticket.assignments ?? [])
          .filter((assignment) => assignment.assignment_status === 'ASSIGNED')
          .map((assignment) => assignment.staff?.full_name?.trim())
          .filter((name): name is string => Boolean(name));
        const required = Math.max(1, ticket.required_staff_count ?? 1);
        const openCoverage = assigned.length < required;
        const ticketStatus = (ticket.status ?? '').toUpperCase();
        const status: ProjectStatus = ticketStatus === 'IN_PROGRESS'
          ? 'in-progress'
          : openCoverage
            ? 'staffing-needed'
            : 'scheduled';

        return {
          id: ticket.id,
          title: ticket.job?.job_name?.trim() || ticket.ticket_code,
          site: ticket.site?.name?.trim() || 'Unassigned Site',
          window: formatWindow(ticket.scheduled_date, ticket.start_time, ticket.end_time),
          crew: crewLabel(assigned),
          status,
        } satisfies WeeklyProjectItem;
      }));

      setAllProjects(projects);
      setLoading(false);
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const projects = useMemo(() => projectsForFilter(filter, allProjects), [allProjects, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="h-4 w-4 text-module-accent" aria-hidden="true" />
          This Week&apos;s Projects
        </CardTitle>
        <CardDescription>Work orders and project cleaning commitments</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        ) : !projects.length ? (
          <p className="text-sm text-muted-foreground">
            No projects for this filter. Project work orders will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id} className="space-y-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{project.title}</p>
                  <Badge color={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.site}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.window}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.crew}
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
