'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent } from '@gleamops/ui';
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

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [tickets, setTickets] = useState<PlanningTicket[]>([]);
  const [planningSchemaMode, setPlanningSchemaMode] = useState<'v2' | 'legacy'>('v2');
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<PlanningStatus | null>(null);
  const [mobileColumn, setMobileColumn] = useState<PlanningStatus>('NOT_STARTED');
  const isMobile = useMediaQuery('(max-width: 767px)');

  // ----- data fetching -----
  const loadTickets = useCallback(async () => {
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadTickets(), loadStaff()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadTickets, loadStaff]);

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

  // ----- empty state -----
  if (!loading && tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No tickets scheduled</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are no tickets for {formatDateLabel(selectedDate)}.
            Try selecting a different date or create tickets from the Calendar view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Plan for: {formatDateLabel(selectedDate)}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(tomorrow())}
          >
            Tomorrow
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            aria-label="Next day"
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
    </div>
  );
}
