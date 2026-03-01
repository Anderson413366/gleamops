'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Button, Input, Select, Skeleton, SlideOver } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string; job_name?: string | null } | null;
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
  assignments?: { staff?: { full_name: string } | null }[];
}

interface ActiveJob {
  id: string;
  job_code: string;
  job_name: string | null;
  site_id: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string; client?: { name: string } | null } | null;
}

interface WeekCalendarProps {
  onSelectTicket?: (ticket: TicketWithRelations) => void;
}

type CalendarView = 'day' | 'week' | 'month';

const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 22 * 60;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;
const TOTAL_SLOTS = (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;
const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT;

const WEEK_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type TicketStatusKey = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELED';

const STATUS_META: Record<TicketStatusKey, { label: string; badge: 'blue' | 'orange' | 'green' | 'gray'; dot: string; card: string }> = {
  SCHEDULED: {
    label: 'Scheduled',
    badge: 'blue',
    dot: 'bg-blue-500',
    card: 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'orange',
    dot: 'bg-orange-500',
    card: 'bg-orange-50 border-orange-300 text-orange-900 hover:bg-orange-100 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-200',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'green',
    dot: 'bg-green-500',
    card: 'bg-green-50 border-green-300 text-green-900 hover:bg-green-100 dark:bg-green-950/40 dark:border-green-800 dark:text-green-200',
  },
  VERIFIED: {
    label: 'Verified',
    badge: 'green',
    dot: 'bg-emerald-500',
    card: 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
  },
  CANCELED: {
    label: 'Canceled',
    badge: 'gray',
    dot: 'bg-slate-400',
    card: 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
  },
};

function normalizeStatus(status: string | null | undefined): TicketStatusKey {
  const value = (status ?? 'SCHEDULED').toUpperCase();
  if (value === 'CANCELLED') return 'CANCELED';
  return (value in STATUS_META ? value : 'SCHEDULED') as TicketStatusKey;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const offset = day === 0 ? 6 : day - 1; // Monday-based
  d.setDate(d.getDate() - offset);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthGrid(anchorDate: Date): Date[] {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const start = getWeekStart(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getRangeForView(view: CalendarView, anchorDate: Date): { start: Date; end: Date } {
  if (view === 'day') {
    const d = startOfDay(anchorDate);
    return { start: d, end: d };
  }
  if (view === 'week') {
    const start = getWeekStart(anchorDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  const grid = getMonthGrid(anchorDate);
  return { start: grid[0], end: grid[grid.length - 1] };
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function clampMinutes(value: number): number {
  return Math.min(Math.max(value, DAY_START_MINUTES), DAY_END_MINUTES);
}

function minutesToTimeValue(value: number): string {
  const mins = clampMinutes(value);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function formatHourLabel(value: number): string {
  const hour = Math.floor(value / 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${normalized} ${suffix}`;
}

function formatShortTime(value: string | null): string {
  const mins = timeToMinutes(value);
  if (mins == null) return '';
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  const suffix = hour >= 12 ? 'pm' : 'am';
  const normalized = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${normalized}:${pad2(minute)}${suffix}`;
}

function formatRangeLabel(view: CalendarView, anchorDate: Date): string {
  if (view === 'day') {
    return anchorDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (view === 'week') {
    const start = getWeekStart(anchorDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function navigateAnchor(view: CalendarView, anchorDate: Date, direction: -1 | 1): Date {
  const next = new Date(anchorDate);
  if (view === 'day') {
    next.setDate(next.getDate() + direction);
    return next;
  }
  if (view === 'week') {
    next.setDate(next.getDate() + (7 * direction));
    return next;
  }
  next.setMonth(next.getMonth() + direction);
  return next;
}

interface DragCreateState {
  date: string;
  start: number;
  end: number;
  active: boolean;
}

export default function WeekCalendar({ onSelectTicket }: WeekCalendarProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState('');
  const [createStartTime, setCreateStartTime] = useState('');
  const [createEndTime, setCreateEndTime] = useState('');
  const [createJobId, setCreateJobId] = useState('');

  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);

  const visibleDays = useMemo(() => {
    if (view === 'day') return [startOfDay(anchorDate)];
    if (view === 'week') return getWeekDays(getWeekStart(anchorDate));
    return [];
  }, [view, anchorDate]);

  const monthGrid = useMemo(() => (view === 'month' ? getMonthGrid(anchorDate) : []), [view, anchorDate]);

  const fetchTickets = useCallback(async () => {
    const range = getRangeForView(view, anchorDate);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:job_id(job_code, job_name),
        site:site_id(site_code, name, client:client_id(name)),
        assignments:ticket_assignments(staff:staff_id(full_name))
      `)
      .is('archived_at', null)
      .gte('scheduled_date', formatDateLocal(range.start))
      .lte('scheduled_date', formatDateLocal(range.end))
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      setTickets(data as unknown as TicketWithRelations[]);
    } else {
      setTickets([]);
    }
    setLoading(false);
  }, [view, anchorDate]);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_jobs')
      .select('id, job_code, job_name, site_id, start_time, end_time, site:site_id(name, site_code, client:client_id(name))')
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
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!createOpen) return;
    if (jobs.length === 0) {
      fetchJobs();
    }
  }, [createOpen, jobs.length, fetchJobs]);

  useEffect(() => {
    if (!createOpen) return;
    if (!createJobId && jobs.length > 0) {
      setCreateJobId(jobs[0].id);
    }
  }, [createOpen, createJobId, jobs]);

  const ticketsByDate = useMemo(() => {
    const map = new Map<string, TicketWithRelations[]>();
    for (const ticket of tickets) {
      const dateKey = ticket.scheduled_date.split('T')[0];
      const list = map.get(dateKey) ?? [];
      list.push(ticket);
      map.set(dateKey, list);
    }
    return map;
  }, [tickets]);

  const summary = useMemo(() => {
    const counts = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, VERIFIED: 0, CANCELED: 0 };
    for (const ticket of tickets) {
      counts[normalizeStatus(ticket.status)] += 1;
    }
    return counts;
  }, [tickets]);

  const openCreateTicket = useCallback((prefill: { date: string; startMinutes?: number; endMinutes?: number }) => {
    setCreateError(null);
    setCreateDate(prefill.date);

    if (prefill.startMinutes != null) {
      const start = clampMinutes(prefill.startMinutes);
      const end = clampMinutes(prefill.endMinutes ?? (start + 60));
      setCreateStartTime(minutesToTimeValue(start));
      setCreateEndTime(minutesToTimeValue(Math.max(end, start + SLOT_MINUTES)));
    } else {
      setCreateStartTime('');
      setCreateEndTime('');
    }

    setCreateOpen(true);
  }, []);

  const closeCreateTicket = () => {
    setCreateOpen(false);
    setCreateError(null);
    setCreateDate('');
    setCreateStartTime('');
    setCreateEndTime('');
  };

  const selectedJob = useMemo(() => jobs.find((job) => job.id === createJobId) ?? null, [jobs, createJobId]);

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createJobId) {
      setCreateError('Select a service plan.');
      return;
    }
    if (!createDate) {
      setCreateError('Select a scheduled date.');
      return;
    }

    if (createStartTime && createEndTime) {
      const start = timeToMinutes(createStartTime);
      const end = timeToMinutes(createEndTime);
      if (start != null && end != null && end <= start) {
        setCreateError('End time must be after start time.');
        return;
      }
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

      const start = createStartTime ? `${createStartTime}:00` : null;
      const end = createEndTime ? `${createEndTime}:00` : null;

      const { error } = await supabase.from('work_tickets').insert({
        tenant_id: tenantId,
        ticket_code: ticketCode,
        job_id: createJobId,
        site_id: siteId,
        scheduled_date: createDate,
        start_time: start,
        end_time: end,
        status: 'SCHEDULED',
      });

      if (error) throw error;

      closeCreateTicket();
      fetchTickets();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket.';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleSlotMouseDown = (date: string, minutes: number) => {
    setDragCreate({ date, start: minutes, end: minutes, active: true });
  };

  const handleSlotMouseEnter = (date: string, minutes: number) => {
    setDragCreate((prev) => {
      if (!prev?.active || prev.date !== date) return prev;
      return { ...prev, end: minutes };
    });
  };

  const finalizeDragCreate = useCallback((state: DragCreateState | null) => {
    if (!state) return;
    const start = Math.min(state.start, state.end);
    const end = Math.max(state.start, state.end) + SLOT_MINUTES;
    openCreateTicket({ date: state.date, startMinutes: start, endMinutes: end });
    setDragCreate(null);
  }, [openCreateTicket]);

  const handleSlotMouseUp = () => {
    setDragCreate((prev) => {
      if (!prev?.active) return prev;
      finalizeDragCreate(prev);
      return null;
    });
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (dragCreate?.active) {
        finalizeDragCreate(dragCreate);
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragCreate, finalizeDragCreate]);

  const goToday = () => setAnchorDate(startOfDay(new Date()));
  const goPrev = () => setAnchorDate((prev) => navigateAnchor(view, prev, -1));
  const goNext = () => setAnchorDate((prev) => navigateAnchor(view, prev, 1));

  const renderSummaryBar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="blue" dot={false}>{summary.SCHEDULED} scheduled</Badge>
      <Badge color="orange" dot={false}>{summary.IN_PROGRESS} in progress</Badge>
      <Badge color="green" dot={false}>{summary.COMPLETED} completed</Badge>
    </div>
  );

  const renderLegend = () => (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {Object.entries(STATUS_META).map(([status, meta]) => (
        <div key={status} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
          <span>{meta.label}</span>
        </div>
      ))}
    </div>
  );

  const renderTimeGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: Math.max(visibleDays.length, 3) }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      );
    }

    const gridColumns = `72px repeat(${visibleDays.length}, minmax(180px, 1fr))`;

    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: gridColumns }}>
          <div className="px-2 py-2 text-xs font-medium tracking-wide text-muted-foreground">Time</div>
          {visibleDays.map((day) => {
            const dateKey = formatDateLocal(day);
            const isToday = formatDateLocal(startOfDay(new Date())) === dateKey;
            const total = (ticketsByDate.get(dateKey) ?? []).length;

            return (
              <button
                key={dateKey}
                type="button"
                className={`px-2 py-2 text-left transition-colors hover:bg-muted/70 ${isToday ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}
                onClick={() => openCreateTicket({ date: dateKey })}
              >
                <p className="text-xs font-medium text-muted-foreground">{WEEK_DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}</p>
                <p className="text-sm font-semibold text-foreground">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <p className="text-[11px] text-muted-foreground">{total} ticket{total === 1 ? '' : 's'}</p>
              </button>
            );
          })}
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
            <div className="relative border-r border-border" style={{ height: GRID_HEIGHT }}>
              {Array.from({ length: ((DAY_END_MINUTES - DAY_START_MINUTES) / 60) + 1 }).map((_, index) => {
                const minutes = DAY_START_MINUTES + (index * 60);
                const top = ((minutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
                return (
                  <div key={minutes} className="absolute left-0 right-0" style={{ top }}>
                    <span className="-translate-y-1/2 inline-block px-2 text-[11px] text-muted-foreground">
                      {formatHourLabel(minutes)}
                    </span>
                  </div>
                );
              })}
            </div>

            {visibleDays.map((day) => {
              const dateKey = formatDateLocal(day);
              const dayTickets = (ticketsByDate.get(dateKey) ?? []).slice().sort((a, b) => {
                const aMin = timeToMinutes(a.start_time) ?? DAY_START_MINUTES;
                const bMin = timeToMinutes(b.start_time) ?? DAY_START_MINUTES;
                return aMin - bMin;
              });

              const selection = dragCreate?.date === dateKey ? {
                start: Math.min(dragCreate.start, dragCreate.end),
                end: Math.max(dragCreate.start, dragCreate.end) + SLOT_MINUTES,
              } : null;

              return (
                <div key={dateKey} className="relative border-r border-border last:border-r-0" style={{ height: GRID_HEIGHT }}>
                  {Array.from({ length: TOTAL_SLOTS }).map((_, index) => {
                    const minutes = DAY_START_MINUTES + (index * SLOT_MINUTES);
                    const top = index * SLOT_HEIGHT;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        className="absolute left-0 right-0 border-t border-border/70 text-left hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                        style={{ top, height: SLOT_HEIGHT }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSlotMouseDown(dateKey, minutes);
                        }}
                        onMouseEnter={() => handleSlotMouseEnter(dateKey, minutes)}
                        onMouseUp={handleSlotMouseUp}
                        onDoubleClick={() => openCreateTicket({ date: dateKey, startMinutes: minutes, endMinutes: minutes + 60 })}
                        aria-label={`Create ticket at ${minutesToTimeValue(minutes)} on ${dateKey}`}
                      />
                    );
                  })}

                  {selection && (
                    <div
                      className="pointer-events-none absolute left-1 right-1 rounded bg-blue-200/60 ring-1 ring-blue-400/50 dark:bg-blue-500/20"
                      style={{
                        top: ((selection.start - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT,
                        height: Math.max(((selection.end - selection.start) / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT),
                      }}
                    />
                  )}

                  <div className="pointer-events-none absolute inset-0">
                    {dayTickets.map((ticket) => {
                      const statusKey = normalizeStatus(ticket.status);
                      const start = clampMinutes(timeToMinutes(ticket.start_time) ?? (DAY_START_MINUTES + 120));
                      const rawEnd = timeToMinutes(ticket.end_time) ?? (start + 60);
                      const end = clampMinutes(Math.max(rawEnd, start + 30));
                      const top = ((start - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
                      const height = Math.max(((end - start) / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT);

                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectTicket?.(ticket);
                          }}
                          className={`pointer-events-auto absolute left-1 right-1 rounded border px-2 py-1 text-left text-[11px] shadow-sm transition-colors ${STATUS_META[statusKey].card}`}
                          style={{ top, height }}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[statusKey].dot}`} aria-hidden />
                            <span className="truncate font-semibold">{ticket.site?.name ?? ticket.ticket_code}</span>
                          </div>
                          <p className="truncate opacity-80">{formatShortTime(ticket.start_time)}{ticket.end_time ? ` - ${formatShortTime(ticket.end_time)}` : ''}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      );
    }

    const currentMonth = anchorDate.getMonth();

    return (
      <div className="rounded-xl border border-border bg-card p-2">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEK_DAY_NAMES.map((name) => (
            <div key={name} className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthGrid.map((day) => {
            const dateKey = formatDateLocal(day);
            const dayTickets = ticketsByDate.get(dateKey) ?? [];
            const inCurrentMonth = day.getMonth() === currentMonth;
            const today = formatDateLocal(startOfDay(new Date())) === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openCreateTicket({ date: dateKey })}
                className={`min-h-[120px] rounded-lg border p-2 text-left transition-colors hover:bg-muted/40 ${
                  today ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20' : 'border-border'
                } ${inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/70'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                  <Plus className="h-3.5 w-3.5 opacity-60" />
                </div>

                <div className="space-y-1">
                  {dayTickets.slice(0, 3).map((ticket) => {
                    const statusKey = normalizeStatus(ticket.status);
                    return (
                      <div key={ticket.id} className={`rounded border px-1.5 py-1 text-[11px] ${STATUS_META[statusKey].card}`}>
                        <p className="truncate font-medium">{ticket.site?.name ?? ticket.ticket_code}</p>
                        {ticket.start_time && <p className="opacity-80">{formatShortTime(ticket.start_time)}</p>}
                      </div>
                    );
                  })}
                  {dayTickets.length > 3 && (
                    <p className="text-[11px] text-muted-foreground">+{dayTickets.length - 3} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday}>Today</Button>
          <Button variant="secondary" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="text-sm font-semibold text-foreground">{formatRangeLabel(view, anchorDate)}</h3>

        <div className="inline-flex items-center rounded-xl border border-border bg-card p-1">
          {(['day', 'week', 'month'] as CalendarView[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === mode ? 'bg-module-accent text-module-accent-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {renderSummaryBar()}
      {renderLegend()}

      {view === 'month' ? renderMonthView() : renderTimeGrid()}

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
              { value: '', label: jobsLoading ? 'Loading service plans...' : jobs.length === 0 ? 'No active service plans found' : 'Select a service plan...' },
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
              min="06:00"
              max="22:00"
            />
            <Input
              label="End Time"
              type="time"
              value={createEndTime}
              onChange={(event) => setCreateEndTime(event.target.value)}
              min="06:00"
              max="22:00"
            />
          </div>

          {selectedJob?.site && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Site:</span> {selectedJob.site.name} ({selectedJob.site.site_code})</p>
              <p><span className="font-semibold text-foreground">Client:</span> {selectedJob.site.client?.name ?? 'N/A'}</p>
            </div>
          )}

          {createError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {createError}
            </div>
          )}

          <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tip: drag across time slots to prefill start and end time instantly.</span>
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
