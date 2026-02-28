'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ClipboardList, Briefcase, FileText, ListTodo, Plus, ChevronLeft, ChevronRight, Copy, LayoutDashboard, Route, Shield } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent, Button, ConfirmDialog } from '@gleamops/ui';
import { normalizeRoleCode, type WorkTicket } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import { useRole } from '@/hooks/use-role';

import { CombinedCalendar } from './calendar/combined-calendar';
import { ScheduleGrid } from './recurring/schedule-grid';
import { ScheduleList } from './recurring/schedule-list';
import { ScheduleCardGrid } from './recurring/schedule-card-grid';
import type { RecurringScheduleRow } from './recurring/schedule-list';
import { SiteBlueprintView } from './recurring/site-blueprint-view';
import { ShiftForm } from './recurring/shift-form';
import { FormsHub } from './forms/forms-hub';
import PlanningBoard from './plan/planning-board';
import { WorkOrderTable } from './work-orders/work-order-table';
import { ChecklistAdmin } from './checklist-admin';
import { ShiftChecklist } from './shift-checklist';
import { ShiftTradesPanel } from './recurring/shift-trades-panel';
import { AvailabilityPanel } from './recurring/availability-panel';
import { SchedulePeriodsPanel } from './recurring/schedule-periods-panel';
import { ConflictPanel } from './recurring/conflict-panel';
import { ScheduleFilters, applyScheduleFilters, type ScheduleFilterState } from './recurring/schedule-filters';
import { MasterBoard } from './boards/master-board';
import { FloaterBoard } from './boards/floater-board';
import { SupervisorDashboard } from './boards/supervisor-dashboard';

// Re-use ticket relations type
interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string; billing_amount?: number | null } | null;
  site?: {
    site_code: string;
    name: string;
    address?: { street?: string; city?: string; state?: string; zip?: string } | null;
    client?: { name: string; client_code?: string } | null;
  } | null;
  assignments?: { staff?: { full_name: string } | null }[];
}

const BASE_TABS = [
  { key: 'recurring', label: 'Employee Schedule', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'work-orders', label: 'Work Schedule', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'planning', label: 'Planning Board', icon: <ListTodo className="h-4 w-4" /> },
  { key: 'master', label: 'Master Board', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'floater', label: 'My Route', icon: <Route className="h-4 w-4" /> },
  { key: 'supervisor', label: 'Supervisor', icon: <Shield className="h-4 w-4" /> },
  { key: 'forms', label: 'Forms', icon: <FileText className="h-4 w-4" /> },
  { key: 'checklists', label: 'Checklists', icon: <ClipboardList className="h-4 w-4" /> },
];

const ALL_TAB_KEYS = BASE_TABS.map((t) => t.key);

const WEEKDAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
type RecurringHorizon = '1w' | '2w' | '4w' | '1m';

interface RecurringTicketRow {
  id: string;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  position_code?: string | null;
  site?: {
    name?: string | null;
    site_code?: string | null;
    janitorial_closet_location?: string | null;
    supply_storage_location?: string | null;
    water_source_location?: string | null;
    dumpster_location?: string | null;
    security_protocol?: string | null;
    entry_instructions?: string | null;
    parking_instructions?: string | null;
    access_notes?: string | null;
  } | null;
  assignments?: Array<{
    assignment_status?: string | null;
    staff?: { full_name?: string | null } | null;
  }> | null;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const distanceFromMonday = (day + 6) % 7;
  clone.setDate(clone.getDate() - distanceFromMonday);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function dayCodeFromDate(dateString: string) {
  const dayIndex = new Date(`${dateString}T12:00:00`).getDay();
  return WEEKDAY_ORDER[(dayIndex + 6) % 7] ?? 'MON';
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return '00:00';
  return value.slice(0, 5);
}

function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function rangeToDateKeys(start: Date, end: Date) {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function formatRangeLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function buildRecurringRange(anchor: Date, horizon: RecurringHorizon) {
  if (horizon === '1m') {
    const start = startOfMonth(anchor);
    start.setHours(0, 0, 0, 0);
    const end = endOfMonth(anchor);
    end.setHours(0, 0, 0, 0);
    return {
      start,
      end,
      visibleDates: rangeToDateKeys(start, end),
      label: formatRangeLabel(start, end),
    };
  }

  const dayCount = horizon === '1w' ? 7 : horizon === '2w' ? 14 : 28;
  const start = startOfWeek(anchor);
  const end = shiftDate(start, dayCount - 1);
  end.setHours(0, 0, 0, 0);

  return {
    start,
    end,
    visibleDates: rangeToDateKeys(start, end),
    label: formatRangeLabel(start, end),
  };
}

export default function SchedulePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useRole();
  const [tab, setTab] = useSyncedTab({
    tabKeys: ALL_TAB_KEYS,
    defaultTab: 'recurring',
    aliases: {
      plan: 'planning',
      board: 'planning',
      monday: 'master',
      'planning-board': 'planning',
      'daily-planning': 'planning',
      'employee-schedule': 'recurring',
      jobs: 'work-orders',
      'work-schedule': 'work-orders',
      'work-orders': 'work-orders',
      'master-board': 'master',
      'floater-board': 'floater',
      'my-route': 'floater',
    },
  });
  const [search, setSearch] = useState('');
  const [recurringView, setRecurringView] = useState<'list' | 'card' | 'grid'>('list');
  const [recurringHorizon, setRecurringHorizon] = useState<RecurringHorizon>('2w');
  const [recurringAnchorDate, setRecurringAnchorDate] = useState<Date>(() => startOfWeek(new Date()));
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [openWorkOrderCreateToken, setOpenWorkOrderCreateToken] = useState(0);
  const [openPlanningCreateToken, setOpenPlanningCreateToken] = useState(0);
  const [recurringRows, setRecurringRows] = useState<RecurringScheduleRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scheduleFilters, setScheduleFilters] = useState<ScheduleFilterState>({ site: '', position: '', staff: '' });
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekLoading, setCopyWeekLoading] = useState(false);
  const [, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedRecurringRow, setSelectedRecurringRow] = useState<RecurringScheduleRow | null>(null);
  const normalizedRole = normalizeRoleCode(role);
  const showChecklistAdmin = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const showShiftChecklist = normalizedRole === 'SUPERVISOR' || normalizedRole === 'CLEANER' || normalizedRole === 'INSPECTOR';
  const canCreateRecurringShift = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const showMasterBoard = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';
  const showFloaterBoard = normalizedRole === 'CLEANER' || normalizedRole === 'SUPERVISOR' || normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';
  const showSupervisorTab = normalizedRole === 'SUPERVISOR' || normalizedRole === 'MANAGER' || normalizedRole === 'OWNER_ADMIN';

  const visibleTabs = useMemo(() => {
    return BASE_TABS.filter((t) => {
      if (t.key === 'master') return showMasterBoard;
      if (t.key === 'floater') return showFloaterBoard;
      if (t.key === 'supervisor') return showSupervisorTab;
      return true;
    });
  }, [showMasterBoard, showFloaterBoard, showSupervisorTab]);

  const [kpis, setKpis] = useState({
    todayTickets: 0,
    coverageGaps: 0,
    openWorkOrders: 0,
    activeServicePlans: 0,
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const action = searchParams.get('action');
  const recurringRange = useMemo(
    () => buildRecurringRange(recurringAnchorDate, recurringHorizon),
    [recurringAnchorDate, recurringHorizon],
  );

  const clearActionParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (action === 'create-work-order') {
      setTab('work-orders');
      setOpenWorkOrderCreateToken((token) => token + 1);
      clearActionParam();
      return;
    }

    if (action === 'create-task') {
      setTab('planning');
      setOpenPlanningCreateToken((token) => token + 1);
      clearActionParam();
    }
  }, [action, clearActionParam, setTab]);

  useEffect(() => {
    async function fetchKpis() {
      setKpisLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const today = new Date().toISOString().slice(0, 10);
        const [todayRes, gapsRes, openWorkOrdersRes, servicePlansRes] = await Promise.all([
          supabase
            .from('work_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('scheduled_date', today)
            .is('archived_at', null),
          supabase
            .from('schedule_conflicts')
            .select('id', { count: 'exact', head: true })
            .eq('conflict_type', 'COVERAGE_GAP')
            .eq('is_blocking', true),
          supabase
            .from('work_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['SCHEDULED', 'IN_PROGRESS'])
            .is('archived_at', null),
          supabase
            .from('site_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ACTIVE')
            .is('archived_at', null),
        ]);

        setKpis({
          todayTickets: todayRes.count ?? 0,
          coverageGaps: gapsRes.count ?? 0,
          openWorkOrders: openWorkOrdersRes.count ?? 0,
          activeServicePlans: servicePlansRes.count ?? 0,
        });
      } finally {
        setKpisLoading(false);
      }
    }
    fetchKpis();
  }, [refreshKey]);

  useEffect(() => {
    if (tab !== 'recurring') {
      setSelectedRecurringRow(null);
    }
  }, [tab]);

  const stepRecurringRange = useCallback((direction: -1 | 1) => {
    setRecurringAnchorDate((current) => {
      if (recurringHorizon === '1m') {
        return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      }

      const days = recurringHorizon === '1w' ? 7 : recurringHorizon === '2w' ? 14 : 28;
      return shiftDate(current, direction * days);
    });
  }, [recurringHorizon]);

  const jumpRecurringToToday = useCallback(() => {
    const today = new Date();
    if (recurringHorizon === '1m') {
      setRecurringAnchorDate(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }
    setRecurringAnchorDate(startOfWeek(today));
  }, [recurringHorizon]);

  const canCopyWeek = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';

  const handleCopyPreviousWeek = useCallback(async () => {
    setCopyWeekLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const prevStart = shiftDate(recurringRange.start, -7);
      const prevEnd = shiftDate(recurringRange.end, -7);

      const { data: prevTickets } = await supabase
        .from('work_tickets')
        .select('id, job_id, site_id, position_code, start_time, end_time, scheduled_date')
        .gte('scheduled_date', toDateKey(prevStart))
        .lte('scheduled_date', toDateKey(prevEnd))
        .is('archived_at', null);

      if (!prevTickets || prevTickets.length === 0) {
        setCopyWeekOpen(false);
        setCopyWeekLoading(false);
        return;
      }

      // Fetch assignments for the previous week's tickets so we can duplicate them
      const prevTicketIds = prevTickets.map((t) => t.id);
      const { data: prevAssignments } = await supabase
        .from('ticket_assignments')
        .select('ticket_id, staff_id, role')
        .in('ticket_id', prevTicketIds);

      const assignmentsByTicket = new Map<string, Array<{ staff_id: string; role: string }>>();
      if (prevAssignments) {
        for (const a of prevAssignments) {
          const list = assignmentsByTicket.get(a.ticket_id) ?? [];
          list.push({ staff_id: a.staff_id, role: a.role });
          assignmentsByTicket.set(a.ticket_id, list);
        }
      }

      const { data: auth } = await supabase.auth.getUser();
      const tenantId = auth.user?.app_metadata?.tenant_id ?? null;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const inserts = [];
      const oldIdToIndex = new Map<string, number>();
      for (const ticket of prevTickets) {
        let ticketCode = `TKT-COPY-${Date.now()}`;
        if (accessToken) {
          try {
            const res = await fetch('/api/codes/next', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ prefix: 'TKT' }),
            });
            if (res.ok) {
              const payload = await res.json() as { data?: string };
              if (payload.data) ticketCode = payload.data;
            }
          } catch { /* use fallback code */ }
        }

        const oldDate = new Date(`${ticket.scheduled_date}T12:00:00`);
        const newDate = shiftDate(oldDate, 7);

        oldIdToIndex.set(ticket.id, inserts.length);
        inserts.push({
          tenant_id: tenantId,
          ticket_code: ticketCode,
          job_id: ticket.job_id,
          site_id: ticket.site_id,
          position_code: ticket.position_code,
          start_time: ticket.start_time,
          end_time: ticket.end_time,
          scheduled_date: toDateKey(newDate),
          status: 'SCHEDULED',
        });
      }

      if (inserts.length > 0) {
        const { data: newTickets } = await supabase.from('work_tickets').insert(inserts).select('id');

        // Duplicate assignments for the newly created tickets
        if (newTickets && newTickets.length === inserts.length) {
          const assignmentInserts: Array<{ tenant_id: string | null; ticket_id: string; staff_id: string; role: string }> = [];
          for (const [oldId, idx] of oldIdToIndex) {
            const assignments = assignmentsByTicket.get(oldId);
            if (assignments && newTickets[idx]) {
              for (const a of assignments) {
                assignmentInserts.push({
                  tenant_id: tenantId,
                  ticket_id: newTickets[idx].id,
                  staff_id: a.staff_id,
                  role: a.role,
                });
              }
            }
          }
          if (assignmentInserts.length > 0) {
            await supabase.from('ticket_assignments').insert(assignmentInserts);
          }
        }
      }

      setRefreshKey((k) => k + 1);
    } finally {
      setCopyWeekLoading(false);
      setCopyWeekOpen(false);
    }
  }, [recurringRange]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecurringGridRows() {
      if (tab !== 'recurring') return;

      setRecurringLoading(true);
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
          position_code,
          site:site_id(
            name,
            site_code,
            janitorial_closet_location,
            supply_storage_location,
            water_source_location,
            dumpster_location,
            security_protocol,
            entry_instructions,
            parking_instructions,
            access_notes
          ),
          assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
        `)
        .gte('scheduled_date', toDateKey(recurringRange.start))
        .lte('scheduled_date', toDateKey(recurringRange.end))
        .is('archived_at', null)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error || !data) {
        if (!cancelled) {
          setRecurringRows([]);
          setRecurringLoading(false);
        }
        return;
      }

      const byAssignment = new Map<string, {
        staffName: string;
        positionType: string;
        siteName: string;
        siteCode: string | null;
        startTime: string;
        endTime: string;
        status: RecurringScheduleRow['status'];
        scheduleDays: Set<string>;
        scheduledDates: Set<string>;
        blueprint: NonNullable<RecurringScheduleRow['blueprint']>;
      }>();

      for (const raw of data as unknown as RecurringTicketRow[]) {
        const dayCode = dayCodeFromDate(raw.scheduled_date);
        const positionType = raw.position_code?.trim() || 'General Specialist';
        const siteName = raw.site?.name?.trim() || 'Unassigned Site';
        const siteCode = raw.site?.site_code?.trim() || null;
        const startTime = normalizeTime(raw.start_time);
        const endTime = normalizeTime(raw.end_time);

        const activeAssignments = (raw.assignments ?? [])
          .filter((assignment) => !assignment.assignment_status || assignment.assignment_status === 'ASSIGNED')
          .map((assignment) => assignment.staff?.full_name?.trim())
          .filter((name): name is string => Boolean(name));

        const staffNames = activeAssignments.length ? activeAssignments : ['Open Shift'];

        for (const staffName of staffNames) {
          const status: RecurringScheduleRow['status'] = staffName === 'Open Shift'
            ? 'open'
            : raw.status === 'CANCELED'
              ? 'pending'
              : 'assigned';

          const key = [
            staffName,
            positionType,
            siteName,
            startTime,
            endTime,
            status,
          ].join('|');

          const existing = byAssignment.get(key);
          if (existing) {
            existing.scheduleDays.add(dayCode);
            existing.scheduledDates.add(raw.scheduled_date);
            continue;
          }

          byAssignment.set(key, {
            staffName,
            positionType,
            siteName,
            siteCode,
            startTime,
            endTime,
            status,
            scheduleDays: new Set([dayCode]),
            scheduledDates: new Set([raw.scheduled_date]),
            blueprint: {
              janitorialClosetLocation: raw.site?.janitorial_closet_location ?? null,
              supplyStorageLocation: raw.site?.supply_storage_location ?? null,
              waterSourceLocation: raw.site?.water_source_location ?? null,
              dumpsterLocation: raw.site?.dumpster_location ?? null,
              securityProtocol: raw.site?.security_protocol ?? null,
              entryInstructions: raw.site?.entry_instructions ?? null,
              parkingInstructions: raw.site?.parking_instructions ?? null,
              accessNotes: raw.site?.access_notes ?? null,
            },
          });
        }
      }

      const rows: RecurringScheduleRow[] = Array.from(byAssignment.values()).map((entry, idx) => ({
        id: `${entry.staffName}-${entry.positionType}-${entry.siteName}-${entry.startTime}-${entry.endTime}-${idx}`,
        staffName: entry.staffName,
        positionType: entry.positionType,
        siteName: entry.siteName,
        siteCode: entry.siteCode,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: entry.status,
        scheduledDates: Array.from(entry.scheduledDates).sort((a, b) => a.localeCompare(b)),
        scheduleDays: Array.from(entry.scheduleDays).sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)),
        blueprint: entry.blueprint,
      }));

      if (!cancelled) {
        setRecurringRows(rows);
        setSelectedRecurringRow((current) => {
          if (!current) return current;
          return rows.find((row) => row.id === current.id) ?? null;
        });
        setRecurringLoading(false);
      }
    }

    void fetchRecurringGridRows();

    return () => {
      cancelled = true;
    };
  }, [recurringRange, refreshKey, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Employee schedules, work schedules, and calendar coordination.
          </p>
        </div>
        {tab === 'recurring' && canCreateRecurringShift ? (
          <div className="flex items-center gap-2">
            {canCopyWeek && (
              <Button variant="secondary" onClick={() => setCopyWeekOpen(true)}>
                <Copy className="h-4 w-4" />
                Copy Week
              </Button>
            )}
            <Button onClick={() => setShiftFormOpen(true)}>
              <Plus className="h-4 w-4" />
              New Shift
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTab('calendar')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTab('calendar');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tickets Today</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoading ? '—' : kpis.todayTickets}</p>
            <p className="text-[11px] text-muted-foreground">Open Calendar</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTab('recurring')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTab('recurring');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Coverage Gaps</p>
            <p className={`text-lg font-semibold sm:text-xl leading-tight ${kpis.coverageGaps > 0 ? 'text-destructive' : ''}`}>
              {kpisLoading ? '—' : kpis.coverageGaps}
            </p>
            <p className="text-[11px] text-muted-foreground">Open Employee Schedule</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTab('work-orders')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTab('work-orders');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Work Orders</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoading ? '—' : kpis.openWorkOrders}</p>
            <p className="text-[11px] text-muted-foreground">Open Work Orders</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => router.push('/jobs?tab=service-plans')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              router.push('/jobs?tab=service-plans');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Service Plans</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoading ? '—' : kpis.activeServicePlans}</p>
            <p className="text-[11px] text-muted-foreground">Open Service Plans</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={visibleTabs} active={tab} onChange={setTab} />
        </div>

        {(tab === 'recurring' || tab === 'work-orders' || tab === 'planning' || tab === 'checklists') && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'recurring'
                ? 'Search employee schedule assignments, roles, and sites...'
                : tab === 'work-orders'
                  ? 'Search work orders, services, and sites...'
                  : tab === 'planning'
                    ? 'Search planning tickets, sites, positions, or codes...'
                  : tab === 'checklists'
                    ? 'Search checklist templates, sections, or items...'
                  : `Search ${tab}...`
            }
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
        )}
      </div>

      {tab === 'recurring' && (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Range</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
              {([
                { key: '1w', label: '1W' },
                { key: '2w', label: '2W' },
                { key: '4w', label: '4W' },
                { key: '1m', label: 'Month' },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRecurringHorizon(option.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    recurringHorizon === option.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => stepRecurringRange(-1)}
                className="rounded-l-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Previous recurring period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={jumpRecurringToToday}
                className="border-x border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => stepRecurringRange(1)}
                className="rounded-r-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Next recurring period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xs text-muted-foreground">{recurringRange.label}</span>
          </div>

          <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setRecurringView('list')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                recurringView === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setRecurringView('card')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                recurringView === 'card'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Card
            </button>
            <button
              type="button"
              onClick={() => setRecurringView('grid')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                recurringView === 'grid'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CombinedCalendar
          key={`cal-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
          onCreatedTicket={() => setRefreshKey((current) => current + 1)}
        />
      )}

      {tab === 'recurring' && (
        <>
          <ScheduleFilters filters={scheduleFilters} onChange={setScheduleFilters} rows={recurringRows} />
          {recurringLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Loading recurring schedule...
              </CardContent>
            </Card>
          ) : (
            recurringView === 'list' ? (
              <ScheduleList rows={applyScheduleFilters(recurringRows, scheduleFilters)} search={search} onSelect={setSelectedRecurringRow} />
            ) : recurringView === 'card' ? (
              <ScheduleCardGrid rows={applyScheduleFilters(recurringRows, scheduleFilters)} search={search} onSelect={setSelectedRecurringRow} />
            ) : (
              <ScheduleGrid
                rows={applyScheduleFilters(recurringRows, scheduleFilters)}
                visibleDates={recurringRange.visibleDates}
                search={search}
                onSelect={setSelectedRecurringRow}
                onReassign={() => setRefreshKey((k) => k + 1)}
              />
            )
          )}
        </>
      )}

      {tab === 'recurring' ? (
        <>
          <SiteBlueprintView row={selectedRecurringRow} onClear={() => setSelectedRecurringRow(null)} />
          <div className="space-y-4">
            <SchedulePeriodsPanel />
            <ConflictPanel />
            <ShiftTradesPanel />
            <AvailabilityPanel />
          </div>
        </>
      ) : null}

      {tab === 'work-orders' && (
        <WorkOrderTable
          key={`work-orders-${refreshKey}`}
          search={search}
          openCreateToken={openWorkOrderCreateToken}
        />
      )}

      {tab === 'planning' && (
        <PlanningBoard
          key={`planning-${refreshKey}`}
          search={search}
          openCreateToken={openPlanningCreateToken}
        />
      )}

      {tab === 'master' && showMasterBoard && (
        <MasterBoard key={`master-${refreshKey}`} />
      )}

      {tab === 'floater' && showFloaterBoard && (
        <FloaterBoard key={`floater-${refreshKey}`} />
      )}

      {tab === 'supervisor' && showSupervisorTab && (
        <SupervisorDashboard key={`supervisor-${refreshKey}`} />
      )}

      {tab === 'forms' && (
        <FormsHub key={`forms-${refreshKey}`} search={search} />
      )}

      {tab === 'checklists' && (
        <div className="space-y-4">
          {showChecklistAdmin ? <ChecklistAdmin search={search} /> : null}
          {showShiftChecklist ? <ShiftChecklist search={search} /> : null}
          {!showChecklistAdmin && !showShiftChecklist ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Checklist access is not enabled for your role.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <ShiftForm
        open={shiftFormOpen}
        onClose={() => setShiftFormOpen(false)}
        onCreated={() => setRefreshKey((current) => current + 1)}
      />

      <ConfirmDialog
        open={copyWeekOpen}
        onClose={() => setCopyWeekOpen(false)}
        onConfirm={handleCopyPreviousWeek}
        title="Copy Previous Week"
        description={`Copy all shifts from the previous week into the current range (${recurringRange.label})? This will create new tickets with the same assignments shifted forward by 7 days.`}
        confirmLabel={copyWeekLoading ? 'Copying...' : 'Copy Shifts'}
        variant="default"
      />
    </div>
  );
}
