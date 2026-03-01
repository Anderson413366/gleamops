'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Clock, GripVertical, Plus, Sparkles, Users } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button, ChipTabs, Input, Select, Skeleton, SlideOver, cn } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
// Position bar colors are inlined via POSITION_BAR_COLORS constant

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string; frequency?: string | null; job_type?: string | null } | null;
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
  assignments?: { assignment_status?: string | null; staff?: { full_name: string | null } | null }[];
}

interface ActiveJob {
  id: string;
  job_code: string;
  job_name?: string | null;
  site_id: string;
  start_time?: string | null;
  end_time?: string | null;
  site?: { name: string; site_code: string; client?: { name: string } | null } | null;
}

type CalendarSource = 'all' | 'recurring' | 'work-orders';
type TicketSource = Exclude<CalendarSource, 'all'>;
type CalendarViewMode = 'day' | 'week' | 'month' | 'custom';
type TicketWithSource = TicketWithRelations & { source: TicketSource };

interface WeekCalendarProps {
  onSelectTicket?: (ticket: TicketWithRelations) => void;
  onCreatedTicket?: () => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORK_ORDER_FREQUENCIES = new Set(['AS_NEEDED', 'ONE_TIME', 'ON_DEMAND', 'AD_HOC']);
const CALENDAR_VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

const SOURCE_META: Record<TicketSource, { label: string; dotClass: string; chipClass: string }> = {
  recurring: {
    label: 'Recurring',
    dotClass: 'bg-blue-500',
    chipClass: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  },
  'work-orders': {
    label: 'Work Order',
    dotClass: 'bg-amber-500',
    chipClass: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  },
};

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + 1);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  return days;
}

function addDays(date: Date, days: number): Date {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return startOfDay(clone);
}

function buildDateRange(start: Date, end: Date): Date[] {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (from > to) return [from];
  const dates: Date[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isToday(d: Date): boolean {
  const today = new Date();
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

function formatRangeLabel(start: Date, end: Date): string {
  if (toDateInput(start) === toDateInput(end)) {
    return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function assignedNames(ticket: TicketWithRelations): string[] {
  return (ticket.assignments ?? [])
    .filter((assignment) => !assignment.assignment_status || assignment.assignment_status === 'ASSIGNED')
    .map((assignment) => assignment.staff?.full_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function classifySource(ticket: TicketWithRelations): TicketSource {
  const normalizedFrequency = normalizeToken(ticket.job?.frequency);
  if (WORK_ORDER_FREQUENCIES.has(normalizedFrequency)) {
    return 'work-orders';
  }

  const normalizedJobType = normalizeToken(ticket.job?.job_type);
  if (normalizedJobType.includes('PROJECT') || normalizedJobType.includes('WORK_ORDER')) {
    return 'work-orders';
  }

  if (ticket.position_code?.trim()) {
    return 'recurring';
  }

  return 'recurring';
}

const POSITION_BAR_COLORS: Record<string, string> = {
  FLOOR_SPECIALIST: 'bg-green-400',
  RESTROOM_SPECIALIST: 'bg-red-400',
  VACUUM_SPECIALIST: 'bg-blue-400',
  UTILITY_SPECIALIST: 'bg-yellow-400',
  DAY_PORTER: 'bg-slate-400',
};

function getPositionBarColor(positionCode: string | null | undefined): string {
  if (!positionCode) return 'bg-slate-300';
  return POSITION_BAR_COLORS[positionCode.trim()] ?? 'bg-slate-300';
}

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const HOUR_HEIGHT = 60; // px per hour

function timeToDecimal(time: string | null): number {
  if (!time) return 0;
  const parts = time.split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1] ?? '0', 10) / 60;
}

const STATUS_BG: Record<string, string> = {
  SCHEDULED: 'bg-primary/10 border-primary/30 hover:bg-primary/15',
  IN_PROGRESS: 'bg-warning/10 border-warning/30 hover:bg-warning/15',
  COMPLETED: 'bg-success/10 border-success/30 hover:bg-success/15',
  VERIFIED: 'bg-success/10 border-success/30 hover:bg-success/15',
  CANCELED: 'bg-muted border-border hover:bg-muted opacity-60',
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-primary',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-success',
  VERIFIED: 'bg-success',
  CANCELED: 'bg-muted-foreground',
};

function TicketCard({
  ticket,
  onSelectTicket,
  dragTicketId,
  onDragStart,
  onDragEnd,
}: {
  ticket: TicketWithSource;
  onSelectTicket?: (ticket: TicketWithRelations) => void;
  dragTicketId: string | null;
  onDragStart: (event: DragEvent, ticketId: string) => void;
  onDragEnd: () => void;
}) {
  const names = assignedNames(ticket);
  const shortNames = names.map((name) => name.split(' ')[0]);
  const isUnassigned = shortNames.length === 0;

  return (
    <div
      key={ticket.id}
      data-ticket-card="true"
      draggable
      onDragStart={(event) => onDragStart(event, ticket.id)}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        event.stopPropagation();
        onSelectTicket?.(ticket);
      }}
      className={`
        p-1.5 rounded border text-xs cursor-grab active:cursor-grabbing transition-all relative group
        ${STATUS_BG[ticket.status] ?? 'bg-muted border-border'}
        ${dragTicketId === ticket.id ? 'opacity-40 scale-95' : 'opacity-100'}
        ${isUnassigned ? 'ring-1 ring-destructive/30' : ''}
      `}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground absolute top-1 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ticket.status] ?? 'bg-muted-foreground'}`} />
        <p className="font-medium truncate">{ticket.site?.name ?? ticket.ticket_code}</p>
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span className={`inline-flex rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide ${SOURCE_META[ticket.source].chipClass}`}>
          {SOURCE_META[ticket.source].label}
        </span>
      </div>

      {ticket.start_time && (
        <div className="flex items-center gap-0.5 text-muted-foreground mt-0.5">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatTime(ticket.start_time)}{ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}</span>
        </div>
      )}

      {shortNames.length > 0 ? (
        <div className="flex items-center gap-0.5 text-muted-foreground mt-0.5">
          <Users className="h-2.5 w-2.5" />
          <span className="truncate">{shortNames.join(', ')}</span>
        </div>
      ) : (
        <p className="text-destructive text-[10px] mt-0.5 font-medium">Unassigned</p>
      )}
    </div>
  );
}

export default function WeekCalendar({ onSelectTicket, onCreatedTicket }: WeekCalendarProps) {
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [sourceFilter, setSourceFilter] = useState<CalendarSource>('all');
  const [tickets, setTickets] = useState<TicketWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragTicketId, setDragTicketId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(() => toDateInput(getWeekStart(new Date())));
  const [customEnd, setCustomEnd] = useState(() => toDateInput(addDays(getWeekStart(new Date()), 6)));
  const [createOpen, setCreateOpen] = useState(false);
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState('');
  const [createStartTime, setCreateStartTime] = useState('');
  const [createEndTime, setCreateEndTime] = useState('');
  const [createJobId, setCreateJobId] = useState('');

  const { rangeStart, rangeEnd, daysInRange, label, monthDays, monthLeadingEmptySlots } = useMemo(() => {
    if (viewMode === 'day') {
      const day = startOfDay(anchorDate);
      return {
        rangeStart: day,
        rangeEnd: day,
        daysInRange: [day],
        label: day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        monthDays: [] as Date[],
        monthLeadingEmptySlots: 0,
      };
    }

    if (viewMode === 'week') {
      const weekStart = getWeekStart(anchorDate);
      const weekDays = getWeekDays(weekStart);
      return {
        rangeStart: weekDays[0],
        rangeEnd: weekDays[6],
        daysInRange: weekDays,
        label: formatRangeLabel(weekDays[0], weekDays[6]),
        monthDays: [] as Date[],
        monthLeadingEmptySlots: 0,
      };
    }

    if (viewMode === 'month') {
      const days = getMonthDays(anchorDate);
      const first = days[0];
      const last = days[days.length - 1];
      return {
        rangeStart: first,
        rangeEnd: last,
        daysInRange: days,
        label: anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthDays: days,
        monthLeadingEmptySlots: first.getDay(),
      };
    }

    const parsedStart = parseDateInput(customStart) ?? startOfDay(anchorDate);
    const parsedEnd = parseDateInput(customEnd) ?? parsedStart;
    const start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
    const end = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
    const days = buildDateRange(start, end);
    return {
      rangeStart: start,
      rangeEnd: end,
      daysInRange: days,
      label: formatRangeLabel(start, end),
      monthDays: [] as Date[],
      monthLeadingEmptySlots: 0,
    };
  }, [anchorDate, customEnd, customStart, viewMode]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:site_jobs!work_tickets_job_id_fkey(job_code, frequency, job_type),
        site:sites!work_tickets_site_id_fkey(site_code, name, client:clients!sites_client_id_fkey(name)),
        assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
      `)
      .is('archived_at', null)
      .gte('scheduled_date', toDateInput(rangeStart))
      .lte('scheduled_date', toDateInput(rangeEnd))
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      const normalized = (data as unknown as TicketWithRelations[]).map((ticket) => ({
        ...ticket,
        source: classifySource(ticket),
      }));
      setTickets(normalized);
    }
    setLoading(false);
  }, [rangeEnd, rangeStart]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_jobs')
      .select('id, job_code, job_name, site_id, start_time, end_time, site:sites!site_jobs_site_id_fkey(name, site_code, client:clients!sites_client_id_fkey(name))')
      .is('archived_at', null)
      .eq('status', 'ACTIVE')
      .order('job_code', { ascending: true });

    if (!error && data) {
      setJobs(data as unknown as ActiveJob[]);
    } else {
      setJobs([]);
    }
    setJobsLoading(false);
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    if (jobs.length === 0) {
      void fetchJobs();
    }
  }, [createOpen, fetchJobs, jobs.length]);

  useEffect(() => {
    if (!createOpen) return;
    if (!createJobId && jobs.length > 0) {
      setCreateJobId(jobs[0].id);
    }
  }, [createOpen, createJobId, jobs]);

  const openCreateTicket = useCallback((prefill: { date: string; startTime?: string | null; endTime?: string | null }) => {
    setCreateError(null);
    setCreateDate(prefill.date);
    setCreateStartTime(prefill.startTime?.slice(0, 5) ?? '');
    setCreateEndTime(prefill.endTime?.slice(0, 5) ?? '');
    setCreateOpen(true);
  }, []);

  const closeCreateTicket = useCallback(() => {
    setCreateOpen(false);
    setCreateError(null);
    setCreateDate('');
    setCreateStartTime('');
    setCreateEndTime('');
  }, []);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === createJobId) ?? null, [createJobId, jobs]);

  const handleDaySurfaceClick = useCallback((event: MouseEvent<HTMLElement>, dateStr: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-ticket-card="true"]')) {
      return;
    }
    openCreateTicket({ date: dateStr });
  }, [openCreateTicket]);

  const handleCreateTicket = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!createJobId) {
      setCreateError('Select a service plan.');
      return;
    }
    if (!createDate) {
      setCreateError('Select a scheduled date.');
      return;
    }

    if (createStartTime && createEndTime && createEndTime <= createStartTime) {
      setCreateError('End time must be after start time.');
      return;
    }

    const siteId = selectedJob?.site_id;
    if (!siteId) {
      setCreateError('Selected service plan is missing a site.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

      let ticketCode: string;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          throw new Error('Missing session token for ticket code generation.');
        }

        const response = await fetch('/api/codes/next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ prefix: 'TKT' }),
        });

        if (!response.ok) {
          throw new Error('Unable to generate ticket code.');
        }

        const payload = await response.json() as { data?: unknown };
        if (typeof payload.data !== 'string' || !payload.data.trim()) {
          throw new Error('Invalid ticket code response.');
        }

        ticketCode = payload.data.trim();
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Unable to generate ticket code.');
        setCreating(false);
        return;
      }

      const { error } = await supabase.from('work_tickets').insert({
        tenant_id: tenantId,
        ticket_code: ticketCode,
        job_id: createJobId,
        site_id: siteId,
        scheduled_date: createDate,
        start_time: createStartTime ? `${createStartTime}:00` : null,
        end_time: createEndTime ? `${createEndTime}:00` : null,
        status: 'SCHEDULED',
      });

      if (error) throw error;

      closeCreateTicket();
      await fetchTickets();
      onCreatedTicket?.();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create ticket.');
    } finally {
      setCreating(false);
    }
  }, [
    closeCreateTicket,
    createDate,
    createEndTime,
    createJobId,
    createStartTime,
    fetchTickets,
    onCreatedTicket,
    selectedJob?.site_id,
  ]);

  const goToPrevWindow = () => {
    if (viewMode === 'day') {
      setAnchorDate((prev) => addDays(prev, -1));
      return;
    }

    if (viewMode === 'week') {
      setAnchorDate((prev) => addDays(prev, -7));
      return;
    }

    if (viewMode === 'month') {
      setAnchorDate((prev) => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() - 1);
        return startOfDay(next);
      });
      return;
    }

    const span = Math.max(1, daysInRange.length);
    const nextStart = addDays(rangeStart, -span);
    const nextEnd = addDays(rangeEnd, -span);
    setCustomStart(toDateInput(nextStart));
    setCustomEnd(toDateInput(nextEnd));
    setAnchorDate(nextStart);
  };

  const goToNextWindow = () => {
    if (viewMode === 'day') {
      setAnchorDate((prev) => addDays(prev, 1));
      return;
    }

    if (viewMode === 'week') {
      setAnchorDate((prev) => addDays(prev, 7));
      return;
    }

    if (viewMode === 'month') {
      setAnchorDate((prev) => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + 1);
        return startOfDay(next);
      });
      return;
    }

    const span = Math.max(1, daysInRange.length);
    const nextStart = addDays(rangeStart, span);
    const nextEnd = addDays(rangeEnd, span);
    setCustomStart(toDateInput(nextStart));
    setCustomEnd(toDateInput(nextEnd));
    setAnchorDate(nextStart);
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setAnchorDate(today);
    if (viewMode === 'custom') {
      setCustomStart(toDateInput(today));
      setCustomEnd(toDateInput(today));
    }
  };

  const handleDragStart = (event: DragEvent, ticketId: string) => {
    setDragTicketId(ticketId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (event: DragEvent, dateStr: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(dateStr);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (event: DragEvent, dateStr: string) => {
    event.preventDefault();
    setDropTarget(null);
    const ticketId = event.dataTransfer.getData('text/plain') || dragTicketId;
    if (!ticketId) return;

    const ticket = tickets.find((row) => row.id === ticketId);
    if (!ticket || ticket.scheduled_date.split('T')[0] === dateStr) return;

    setTickets((prev) => prev.map((row) => (row.id === ticketId ? { ...row, scheduled_date: dateStr } : row)));

    const supabase = getSupabaseBrowserClient();
    await supabase.from('work_tickets').update({ scheduled_date: dateStr }).eq('id', ticketId);
    setDragTicketId(null);
  };

  const handleDragEnd = () => {
    setDragTicketId(null);
    setDropTarget(null);
  };

  const handleTimelineDrop = async (event: DragEvent) => {
    event.preventDefault();
    setDropTarget(null);
    const ticketId = event.dataTransfer.getData('text/plain') || dragTicketId;
    if (!ticketId) return;

    const ticket = tickets.find((row) => row.id === ticketId);
    if (!ticket) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const yOffset = event.clientY - rect.top;
    const droppedHour = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR - 1, Math.floor(yOffset / HOUR_HEIGHT) + TIMELINE_START_HOUR));
    const newStartTime = `${String(droppedHour).padStart(2, '0')}:00`;

    if (ticket.start_time === newStartTime) return;

    // Preserve shift duration
    const oldStart = timeToDecimal(ticket.start_time);
    const oldEnd = ticket.end_time ? timeToDecimal(ticket.end_time) : oldStart + 1;
    const duration = oldEnd > oldStart ? oldEnd - oldStart : (oldEnd + 24) - oldStart;
    const newEndDecimal = droppedHour + duration;
    const endHour = Math.floor(newEndDecimal) % 24;
    const endMin = Math.round((newEndDecimal - Math.floor(newEndDecimal)) * 60);
    const newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    setTickets((prev) => prev.map((row) => (row.id === ticketId ? { ...row, start_time: newStartTime, end_time: newEndTime } : row)));

    const supabase = getSupabaseBrowserClient();
    await supabase.from('work_tickets').update({ start_time: newStartTime, end_time: newEndTime }).eq('id', ticketId);
    setDragTicketId(null);
  };

  const sourceCounts = useMemo(() => ({
    recurring: tickets.filter((ticket) => ticket.source === 'recurring').length,
    'work-orders': tickets.filter((ticket) => ticket.source === 'work-orders').length,
  }), [tickets]);

  const visibleTickets = useMemo(() => {
    if (sourceFilter === 'all') return tickets;
    return tickets.filter((ticket) => ticket.source === sourceFilter);
  }, [sourceFilter, tickets]);

  const sourceTabs = useMemo(() => ([
    {
      key: 'all',
      label: 'All',
      icon: <CalendarDays className="h-4 w-4" />,
      count: tickets.length,
    },
    {
      key: 'recurring',
      label: 'Recurring',
      icon: <Users className="h-4 w-4" />,
      count: sourceCounts.recurring,
    },
    {
      key: 'work-orders',
      label: 'Work Orders',
      icon: <BriefcaseBusiness className="h-4 w-4" />,
      count: sourceCounts['work-orders'],
    },
  ]), [sourceCounts, tickets.length]);

  const ticketsByDate = useMemo(() => {
    const map = new Map<string, TicketWithSource[]>();
    for (const day of daysInRange) {
      map.set(toDateInput(day), []);
    }
    for (const ticket of visibleTickets) {
      const dateStr = ticket.scheduled_date.split('T')[0];
      const current = map.get(dateStr);
      if (current) {
        current.push(ticket);
      }
    }
    return map;
  }, [daysInRange, visibleTickets]);

  const totalTickets = visibleTickets.length;
  const completedCount = visibleTickets.filter((ticket) => ticket.status === 'COMPLETED' || ticket.status === 'VERIFIED').length;
  const unassignedCount = visibleTickets.filter((ticket) => assignedNames(ticket).length === 0).length;

  const renderDayColumn = (day: Date) => {
    const dateStr = toDateInput(day);
    const dayTickets = ticketsByDate.get(dateStr) ?? [];
    const today = isToday(day);
    const isDropping = dropTarget === dateStr;
    const isPast = day < startOfDay(new Date()) && !today;

    return (
      <div
        key={dateStr}
        className={[
          'rounded-lg border p-2 transition-colors min-h-[140px] flex flex-col',
          today ? 'border-brand-400 bg-brand-50/30 ring-1 ring-brand-200' : 'border-border',
          isDropping ? 'border-brand-500 bg-brand-50 border-dashed border-2' : '',
          isPast ? 'bg-muted/50' : '',
        ].join(' ')}
        onClick={(event) => handleDaySurfaceClick(event, dateStr)}
        onDragOver={(event) => handleDragOver(event, dateStr)}
        onDragLeave={handleDragLeave}
        onDrop={(event) => handleDrop(event, dateStr)}
      >
        <button
          type="button"
          onClick={() => openCreateTicket({ date: dateStr })}
          className="mb-2 w-full border-b border-border/50 pb-1 text-center transition-colors hover:bg-muted/40 rounded-sm"
        >
          <p className={`text-xs font-medium ${today ? 'text-brand-600' : 'text-muted-foreground'}`}>
            {DAY_NAMES[day.getDay()]}
          </p>
          <p className={`text-lg font-bold leading-tight ${today ? 'text-brand-600' : 'text-foreground'}`}>
            {day.getDate()}
          </p>
          {dayTickets.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{dayTickets.length} ticket{dayTickets.length > 1 ? 's' : ''}</p>
          )}
        </button>

        <div className="space-y-1 flex-1 overflow-y-auto">
          {dayTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onSelectTicket={onSelectTicket}
              dragTicketId={dragTicketId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>
    );
  };

  const monthCells = useMemo(() => {
    if (viewMode !== 'month') return [] as Array<Date | null>;
    return [
      ...Array.from({ length: monthLeadingEmptySlots }, () => null),
      ...monthDays,
    ];
  }, [monthDays, monthLeadingEmptySlots, viewMode]);

  const showCustomAsList = viewMode === 'custom' && daysInRange.length > 14;

  return (
    <div className="space-y-4">
      <ChipTabs
        tabs={sourceTabs}
        active={sourceFilter}
        onChange={(value) => setSourceFilter(value as CalendarSource)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          {CALENDAR_VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setViewMode(option.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === option.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openCreateTicket({ date: toDateInput(anchorDate) })}>
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
          <Button variant="secondary" size="sm" onClick={goToPrevWindow}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={goToNextWindow}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-[180px_180px_auto] sm:items-end">
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>Start date</span>
            <input
              type="date"
              value={customStart}
              onChange={(event) => {
                setCustomStart(event.target.value);
                const parsed = parseDateInput(event.target.value);
                if (parsed) setAnchorDate(parsed);
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>End date</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <p className="text-xs text-muted-foreground">Drag tickets to reschedule within the selected range.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalTickets} tickets</span>
          <span className="text-success">{completedCount} done</span>
          {unassignedCount > 0 && (
            <span className="text-destructive font-medium">{unassignedCount} unassigned</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="text-muted-foreground capitalize">{status.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
        {Object.values(SOURCE_META).map((source) => (
          <div key={source.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${source.dotClass}`} />
            <span className="text-muted-foreground">{source.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : viewMode === 'day' ? (() => {
        const dateStr = toDateInput(anchorDate);
        const dayTickets = ticketsByDate.get(dateStr) ?? [];
        const totalHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;
        const hours = Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => TIMELINE_START_HOUR + i);

        return (
          <div
            className={cn(
              'rounded-xl border border-border overflow-hidden',
              dropTarget === `time:${dateStr}` && 'border-brand-500 border-dashed border-2',
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest('[data-ticket-card="true"]')) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const yOffset = event.clientY - rect.top;
              const clickedHour = Math.floor(yOffset / HOUR_HEIGHT) + TIMELINE_START_HOUR;
              const startHour = String(Math.min(clickedHour, 23)).padStart(2, '0');
              openCreateTicket({ date: dateStr, startTime: `${startHour}:00`, endTime: null });
            }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(`time:${dateStr}`); }}
            onDragLeave={handleDragLeave}
            onDrop={handleTimelineDrop}
          >
            <div className="relative" style={{ height: `${totalHeight}px` }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b border-border/40 flex items-start"
                  style={{ top: `${(hour - TIMELINE_START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="w-16 shrink-0 px-2 py-1 text-[10px] text-muted-foreground font-medium bg-muted/30">
                    {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
                  </span>
                  <div className="flex-1 h-full" />
                </div>
              ))}

              {dayTickets.map((ticket) => {
                const start = timeToDecimal(ticket.start_time);
                const end = ticket.end_time ? timeToDecimal(ticket.end_time) : start + 1;
                const duration = end > start ? end - start : (end + 24) - start;
                const topPx = Math.max(0, (start - TIMELINE_START_HOUR) * HOUR_HEIGHT);
                const heightPx = Math.max(HOUR_HEIGHT * 0.5, duration * HOUR_HEIGHT);
                const names = assignedNames(ticket);
                const barColor = getPositionBarColor(ticket.position_code);

                return (
                  <div
                    key={ticket.id}
                    data-ticket-card="true"
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTicket?.(ticket);
                    }}
                    className={cn(
                      'absolute left-16 right-2 rounded-lg border px-2 py-1 cursor-grab active:cursor-grabbing transition-all text-xs shadow-sm',
                      barColor.replace('bg-', 'border-').replace('400', '300/70'),
                      barColor.replace('400', '50'),
                      'text-foreground',
                      dragTicketId === ticket.id && 'opacity-40 scale-95',
                    )}
                    style={{ top: `${topPx}px`, height: `${heightPx}px`, minHeight: '30px' }}
                  >
                    <p className="font-medium truncate">{ticket.site?.name ?? ticket.ticket_code}</p>
                    <p className="text-muted-foreground truncate">
                      {formatTime(ticket.start_time)}{ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}
                    </p>
                    {names.length > 0 && (
                      <p className="text-muted-foreground truncate">{names.join(', ')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })() : viewMode === 'month' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {DAY_NAMES.map((dayName) => (
              <div key={dayName} className="py-1">{dayName}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[120px] rounded-lg border border-transparent" />;
              }

              const dateStr = toDateInput(day);
              const dayTickets = ticketsByDate.get(dateStr) ?? [];
              const today = isToday(day);
              const isDropping = dropTarget === dateStr;
              const isPast = day < startOfDay(new Date()) && !today;

              return (
                <div
                  key={dateStr}
                  className={[
                    'min-h-[120px] rounded-lg border p-2 transition-colors',
                    today ? 'border-brand-400 bg-brand-50/30 ring-1 ring-brand-200' : 'border-border',
                    isDropping ? 'border-brand-500 bg-brand-50 border-dashed border-2' : '',
                    isPast ? 'bg-muted/50' : '',
                  ].join(' ')}
                  onClick={(event) => handleDaySurfaceClick(event, dateStr)}
                  onDragOver={(event) => handleDragOver(event, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(event, dateStr)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${today ? 'text-brand-600' : 'text-foreground'}`}>{day.getDate()}</span>
                    {dayTickets.length > 0 ? (
                      <span className="text-[10px] text-muted-foreground">{dayTickets.length}</span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    {dayTickets.slice(0, 4).map((ticket) => {
                      const barColor = getPositionBarColor(ticket.position_code);
                      const siteName = ticket.site?.name ?? ticket.ticket_code;
                      const timeLabel = `${formatTime(ticket.start_time)}${ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}`;
                      return (
                        <div
                          key={ticket.id}
                          data-ticket-card="true"
                          draggable
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket?.(ticket);
                          }}
                          className={cn(
                            'h-5 rounded px-1 cursor-pointer transition-all flex items-center gap-1 text-white text-[10px] leading-tight font-medium overflow-hidden',
                            barColor,
                            dragTicketId === ticket.id && 'opacity-40',
                          )}
                          title={`${siteName} · ${timeLabel}`}
                        >
                          <span className="truncate">{siteName}</span>
                          <span className="shrink-0 opacity-75 hidden sm:inline">{formatTime(ticket.start_time)}</span>
                        </div>
                      );
                    })}
                    {dayTickets.length > 4 ? (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayTickets.length - 4} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : showCustomAsList ? (
        <div className="space-y-3">
          {daysInRange.map((day) => {
            const dateStr = toDateInput(day);
            const dayTickets = ticketsByDate.get(dateStr) ?? [];
            return (
              <div
                key={dateStr}
                className="rounded-lg border border-border p-3"
                onClick={(event) => handleDaySurfaceClick(event, dateStr)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openCreateTicket({ date: dateStr })}
                    className="text-sm font-semibold text-foreground hover:text-module-accent"
                  >
                    {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                  <p className="text-xs text-muted-foreground">{dayTickets.length} tickets</p>
                </div>
                {dayTickets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tickets</p>
                ) : (
                  <div className="space-y-1">
                    {dayTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onSelectTicket={onSelectTicket}
                        dragTicketId={dragTicketId}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid gap-2 min-h-[460px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(daysInRange.length, 1)}, minmax(190px, 1fr))`,
            }}
          >
            {daysInRange.map((day) => renderDayColumn(day))}
          </div>
        </div>
      )}

      <SlideOver
        open={createOpen}
        onClose={closeCreateTicket}
        title="New Ticket"
        subtitle="Create a ticket from the calendar"
      >
        <form className="space-y-4" onSubmit={handleCreateTicket}>
          <Select
            label="Service Plan"
            value={createJobId}
            onChange={(event) => setCreateJobId(event.target.value)}
            options={[
              {
                value: '',
                label: jobsLoading
                  ? 'Loading service plans...'
                  : jobs.length === 0
                    ? 'No active service plans found'
                    : 'Select a service plan...',
              },
              ...jobs.map((job) => ({
                value: job.id,
                label: `${job.job_code}${job.job_name ? ` - ${job.job_name}` : ''}${job.site?.name ? ` (${job.site.name})` : ''}`,
              })),
            ]}
            disabled={jobsLoading || jobs.length === 0}
            required
          />

          <Input
            label="Scheduled Date"
            type="date"
            value={createDate}
            onChange={(event) => setCreateDate(event.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={createStartTime}
              onChange={(event) => setCreateStartTime(event.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={createEndTime}
              onChange={(event) => setCreateEndTime(event.target.value)}
            />
          </div>

          {selectedJob?.site ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Site:</span> {selectedJob.site.name} ({selectedJob.site.site_code})</p>
              <p><span className="font-semibold text-foreground">Client:</span> {selectedJob.site.client?.name ?? 'N/A'}</p>
            </div>
          ) : null}

          {createError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {createError}
            </div>
          ) : null}

          <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tip: click a day in the calendar to prefill date and create quickly.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateTicket} disabled={creating}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Ticket</Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
