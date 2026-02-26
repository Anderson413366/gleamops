'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input, Select, SlideOver } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PlanningStatus } from '@gleamops/shared';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PlanningCard, type PlanningTicket } from './planning-card';
import { StaffingGapPanel } from './staffing-gap-panel';
import { HandoffSummary } from './handoff-summary';

interface StaffOption {
  id: string;
  staff_code: string;
  full_name: string | null;
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

const COLUMNS: { key: PlanningStatus; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'READY', label: 'Ready' },
];

const TICKET_SELECT_V2 = `
  id, ticket_code, scheduled_date, start_time, end_time, status,
  planning_status, required_staff_count, position_code,
  site:site_id(id, name, site_code),
  assignments:ticket_assignments(id, assignment_status, staff_id, staff:staff_id(full_name))
`;

const TICKET_SELECT_LEGACY = `
  id, ticket_code, scheduled_date, start_time, end_time, status,
  position_code,
  site:site_id(id, name, site_code),
  assignments:ticket_assignments(id, assignment_status, staff_id, staff:staff_id(full_name))
`;
const PLANNING_V2_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PLANNING_V2 === 'true';

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function today(): string {
  return toLocalDateKey(new Date());
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateKey(d);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

function formatDateLabel(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPlanningSchemaMissing(message: string | undefined): boolean {
  const normalized = (message ?? '').toLowerCase();
  if (!normalized) return false;
  return normalized.includes('planning_status')
    || normalized.includes('required_staff_count')
    || (normalized.includes('column') && normalized.includes('work_tickets'));
}

function normalizeTicket(row: Partial<PlanningTicket>): PlanningTicket {
  return {
    id: row.id ?? '',
    ticket_code: row.ticket_code ?? '',
    scheduled_date: row.scheduled_date ?? '',
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    status: row.status ?? 'SCHEDULED',
    planning_status: (row.planning_status ?? 'NOT_STARTED') as PlanningStatus,
    required_staff_count: row.required_staff_count ?? 1,
    position_code: row.position_code ?? null,
    site: row.site ?? null,
    assignments: row.assignments ?? [],
    notes: row.notes ?? null,
  };
}

interface PlanningBoardProps {
  search?: string;
}

export default function PlanningBoard({ search = '' }: PlanningBoardProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [selectedDate, setSelectedDate] = useState('');
  const [tickets, setTickets] = useState<PlanningTicket[]>([]);
  const [planningSchemaMode, setPlanningSchemaMode] = useState<'v2' | 'legacy'>(
    PLANNING_V2_ENABLED ? 'v2' : 'legacy'
  );
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createJobId, setCreateJobId] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createStartTime, setCreateStartTime] = useState('');
  const [createEndTime, setCreateEndTime] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState<PlanningStatus | null>(null);
  const [mobileColumn, setMobileColumn] = useState<PlanningStatus>('NOT_STARTED');
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    setSelectedDate(today());
  }, []);

  // ----- data fetching -----
  const loadTickets = useCallback(async () => {
    if (!selectedDate) {
      setTickets([]);
      return;
    }

    const loadLegacyTickets = async () => {
      const legacy = await supabase
        .from('work_tickets')
        .select(TICKET_SELECT_LEGACY)
        .eq('scheduled_date', selectedDate)
        .is('archived_at', null)
        .order('start_time', { ascending: true });

      if (legacy.error) {
        toast.error(legacy.error.message);
        return;
      }

      setPlanningSchemaMode('legacy');
      setTickets((legacy.data ?? []).map((row) => normalizeTicket(row as Partial<PlanningTicket>)));
    };

    if (!PLANNING_V2_ENABLED) {
      await loadLegacyTickets();
      return;
    }

    const primary = await supabase
      .from('work_tickets')
      .select(TICKET_SELECT_V2)
      .eq('scheduled_date', selectedDate)
      .is('archived_at', null)
      .order('start_time', { ascending: true });

    if (!primary.error) {
      setPlanningSchemaMode('v2');
      setTickets((primary.data ?? []).map((row) => normalizeTicket(row as Partial<PlanningTicket>)));
      return;
    }

    if (!isPlanningSchemaMissing(primary.error?.message)) {
      toast.error(primary.error.message);
      return;
    }

    await loadLegacyTickets();
    toast.info('Planning status column not available in this environment. Showing compatibility view.');
  }, [supabase, selectedDate]);

  const loadStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, staff_code, full_name')
      .is('archived_at', null)
      .order('full_name', { ascending: true })
      .limit(500);

    if (error) {
      toast.error(error.message);
      return;
    }
    setStaff((data ?? []) as StaffOption[]);
  }, [supabase]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    const { data, error } = await supabase
      .from('site_jobs')
      .select('id, job_code, job_name, site_id, start_time, end_time, site:site_id(name, site_code, client:client_id(name))')
      .is('archived_at', null)
      .eq('status', 'ACTIVE')
      .order('job_code', { ascending: true });

    if (error) {
      toast.error(error.message);
      setJobs([]);
      setJobsLoading(false);
      return;
    }

    const normalizedJobs = (data ?? []).map((row) => {
      const rawSite = Array.isArray((row as { site?: unknown }).site)
        ? (row as { site?: Array<{ name?: string | null; site_code?: string | null; client?: Array<{ name?: string | null }> | { name?: string | null } | null }> }).site?.[0]
        : (row as { site?: { name?: string | null; site_code?: string | null; client?: Array<{ name?: string | null }> | { name?: string | null } | null } | null }).site;

      const rawClient = Array.isArray(rawSite?.client) ? rawSite.client[0] : rawSite?.client ?? null;

      return {
        id: String((row as { id: string }).id),
        job_code: String((row as { job_code: string }).job_code),
        job_name: ((row as { job_name?: string | null }).job_name ?? null),
        site_id: String((row as { site_id: string }).site_id),
        start_time: ((row as { start_time?: string | null }).start_time ?? null),
        end_time: ((row as { end_time?: string | null }).end_time ?? null),
        site: rawSite
          ? {
              name: rawSite.name ?? '',
              site_code: rawSite.site_code ?? '',
              client: rawClient ? { name: rawClient.name ?? '' } : null,
            }
          : null,
      } satisfies ActiveJob;
    });

    setJobs(normalizedJobs);
    setJobsLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadTickets(), loadStaff()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadTickets, loadStaff]);

  useEffect(() => {
    if (!createOpen) return;
    if (jobs.length === 0 && !jobsLoading) {
      void loadJobs();
    }
  }, [createOpen, jobs.length, jobsLoading, loadJobs]);

  useEffect(() => {
    if (!createOpen) return;
    if (!createJobId && jobs.length > 0) {
      setCreateJobId(jobs[0].id);
    }
  }, [createOpen, createJobId, jobs]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === createJobId) ?? null, [createJobId, jobs]);

  // ----- search filter -----
  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticket_code.toLowerCase().includes(q) ||
        (t.site?.name ?? '').toLowerCase().includes(q) ||
        (t.site?.site_code ?? '').toLowerCase().includes(q) ||
        (t.position_code ?? '').toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const columnTickets = useMemo(() => {
    const map: Record<PlanningStatus, PlanningTicket[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      READY: [],
    };
    for (const t of filteredTickets) {
      const col = map[t.planning_status];
      if (col) col.push(t);
      else map.NOT_STARTED.push(t);
    }
    return map;
  }, [filteredTickets]);

  // ----- mutations -----
  const updatePlanningStatus = useCallback(
    async (ticketId: string, status: PlanningStatus) => {
      if (planningSchemaMode === 'legacy') {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, planning_status: status } : t))
        );
        toast.info('Planning status is running in compatibility mode and is not persisted yet.');
        return;
      }

      setBusy(true);
      const { error } = await supabase
        .from('work_tickets')
        .update({ planning_status: status })
        .eq('id', ticketId);

      if (error) {
        if (isPlanningSchemaMissing(error.message)) {
          setPlanningSchemaMode('legacy');
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, planning_status: status } : t))
          );
          toast.info('Planning status is running in compatibility mode and is not persisted yet.');
          setBusy(false);
          return;
        }
        toast.error("Status didn't save. Tap to retry.");
        setBusy(false);
        return;
      }

      // Optimistic: update local state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, planning_status: status } : t))
      );
      setBusy(false);
    },
    [planningSchemaMode, supabase]
  );

  const handleMarkReady = useCallback(
    (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;

      const active = (ticket.assignments ?? []).filter(
        (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
      );
      if (active.length < (ticket.required_staff_count ?? 1)) {
        toast.warning('Almost ready — assign remaining staff first.');
        void updatePlanningStatus(ticketId, 'IN_PROGRESS');
        return;
      }
      void updatePlanningStatus(ticketId, 'READY');
    },
    [tickets, updatePlanningStatus]
  );

  const handleQuickAssign = useCallback(
    async (ticketId: string, staffId: string) => {
      if (!staffId) {
        toast.info('Use the Staffing Gaps panel to assign staff.');
        return;
      }
      setBusy(true);
      const { error } = await supabase.from('ticket_assignments').insert({
        ticket_id: ticketId,
        staff_id: staffId,
        role: 'CLEANER',
        assignment_status: 'ASSIGNED',
        assignment_type: 'DIRECT',
        overtime_flag: false,
      });

      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }

      toast.success('Staff assigned');
      await loadTickets();
      setBusy(false);
    },
    [supabase, loadTickets]
  );

  const openCreateTicket = useCallback(() => {
    setCreateError(null);
    setCreateDate(selectedDate || today());
    setCreateStartTime('');
    setCreateEndTime('');
    setCreateOpen(true);
  }, [selectedDate]);

  const closeCreateTicket = useCallback(() => {
    setCreateOpen(false);
    setCreateError(null);
    setCreateDate('');
    setCreateStartTime('');
    setCreateEndTime('');
  }, []);

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
      const { data: auth } = await supabase.auth.getUser();
      const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing session token for ticket code generation.');
      }

      const codeResponse = await fetch('/api/codes/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prefix: 'TKT' }),
      });

      if (!codeResponse.ok) {
        throw new Error('Unable to generate ticket code.');
      }

      const payload = await codeResponse.json() as { data?: unknown };
      if (typeof payload.data !== 'string' || !payload.data.trim()) {
        throw new Error('Invalid ticket code response.');
      }
      const ticketCode = payload.data.trim();

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

      if (error) {
        throw error;
      }

      closeCreateTicket();
      toast.success('Task created');
      if (selectedDate === createDate) {
        await loadTickets();
      } else {
        setSelectedDate(createDate);
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  }, [
    closeCreateTicket,
    createDate,
    createEndTime,
    createJobId,
    createStartTime,
    loadTickets,
    selectedDate,
    selectedJob?.site_id,
    supabase,
  ]);

  // ----- drag-and-drop -----
  const handleDragStart = useCallback(
    (e: React.DragEvent, ticketId: string) => {
      e.dataTransfer.setData('text/plain', ticketId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, column: PlanningStatus) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(column);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumn: PlanningStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const ticketId = e.dataTransfer.getData('text/plain');
      if (!ticketId) return;

      if (targetColumn === 'READY') {
        handleMarkReady(ticketId);
      } else {
        void updatePlanningStatus(ticketId, targetColumn);
      }
    },
    [handleMarkReady, updatePlanningStatus]
  );

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="truncate text-base font-semibold text-foreground">
            Plan for: {selectedDate ? formatDateLabel(selectedDate) : 'Loading date...'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={openCreateTicket}
            disabled={!selectedDate}
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
          <label className="sr-only" htmlFor="planning-date">Planning date</label>
          <input
            id="planning-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Planning date"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => shiftDate(d || today(), -1))}
            aria-label="Previous day"
            disabled={!selectedDate}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(today())}
            disabled={!selectedDate}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(tomorrow())}
            disabled={!selectedDate}
          >
            Tomorrow
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => shiftDate(d || today(), 1))}
            aria-label="Next day"
            disabled={!selectedDate}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Handoff summary (shows when all ready) */}
      <HandoffSummary
        tickets={filteredTickets}
        selectedDate={selectedDate}
        busy={busy}
      />

      {/* Board columns */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isMobile ? (
        /* Mobile: segmented tabs for columns, single column view */
        <div className="space-y-3">
          <div role="tablist" aria-label="Planning columns" className="flex gap-1 rounded-lg bg-muted p-1">
            {COLUMNS.map((col) => {
              const count = columnTickets[col.key].length;
              return (
                <button
                  key={col.key}
                  type="button"
                  role="tab"
                  aria-selected={mobileColumn === col.key}
                  onClick={() => setMobileColumn(col.key)}
                  className={`flex-1 min-h-[44px] rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    mobileColumn === col.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {col.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {columnTickets[mobileColumn].map((ticket) => (
              <PlanningCard
                key={ticket.id}
                ticket={ticket}
                onMarkReady={handleMarkReady}
                onAssign={() => toast.info('Use the Staffing Gaps panel to assign staff.')}
              />
            ))}
            {columnTickets[mobileColumn].length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {mobileColumn === 'READY'
                  ? 'Mark tickets as ready from the other tabs'
                  : 'No tickets'}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Desktop: 3-column drag-and-drop board */
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = columnTickets[col.key];
            const isOver = dragOverColumn === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-xl border-2 border-dashed p-3 min-h-[200px] transition-colors ${
                  isOver
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-transparent bg-muted/20'
                }`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {items.map((ticket) => (
                    <PlanningCard
                      key={ticket.id}
                      ticket={ticket}
                      onMarkReady={handleMarkReady}
                      onAssign={() => toast.info('Use the Staffing Gaps panel to assign staff.')}
                      draggable
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {col.key === 'READY'
                        ? 'Drag tickets here when ready'
                        : 'No tickets'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staffing gap panel */}
      <StaffingGapPanel
        tickets={filteredTickets}
        availableStaff={staff}
        onQuickAssign={handleQuickAssign}
        busy={busy}
      />

      <SlideOver
        open={createOpen}
        onClose={closeCreateTicket}
        title="New Task"
        subtitle="Create a planning task"
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
            disabled={jobsLoading || jobs.length === 0 || creating}
            required
          />

          <Input
            label="Scheduled Date"
            type="date"
            value={createDate}
            onChange={(event) => setCreateDate(event.target.value)}
            disabled={creating}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={createStartTime}
              onChange={(event) => setCreateStartTime(event.target.value)}
              disabled={creating}
            />
            <Input
              label="End Time"
              type="time"
              value={createEndTime}
              onChange={(event) => setCreateEndTime(event.target.value)}
              disabled={creating}
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
              <span>Tip: use date navigation first, then create tasks for that day.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateTicket} disabled={creating}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Task</Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
