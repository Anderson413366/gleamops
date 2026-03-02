'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, ClipboardList, Briefcase, FileText, ListTodo, Plus, ChevronLeft, ChevronRight, LayoutDashboard, Route, Shield, AlertTriangle, Send, X, Users } from 'lucide-react';
import { SearchInput, Card, CardContent, Button, ConfirmDialog, Badge } from '@gleamops/ui';
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
// Inline filters merged into ScheduleSidebar — schedule-filters.tsx kept for applyScheduleFilters export
import { ScheduleToolsDropdown } from './recurring/schedule-tools-dropdown';
import { TemplateManager } from './recurring/template-manager';
import { ScheduleSidebar } from './recurring/schedule-sidebar';
import { CoverageGrid, type CoverageCellParams } from './recurring/coverage-grid';
import { DayView } from './recurring/day-view';
import { useSchedulePrint } from './recurring/schedule-print';
import { BudgetOverlay } from './recurring/budget-overlay';
import { MasterBoard } from './boards/master-board';
import { FloaterBoard } from './boards/floater-board';
import { SupervisorDashboard } from './boards/supervisor-dashboard';
import { LeaveManagement } from './leave/leave-management';
import { AvailabilityModule } from './availability/availability-module';
import { MySchedule } from './my-schedule/my-schedule';
import { TagView } from './recurring/tag-view';
import { PositionColorLegend } from './recurring/position-color-legend';

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
  { key: 'leave', label: 'Leave', icon: <Calendar className="h-4 w-4" /> },
  { key: 'availability', label: 'Availability', icon: <Calendar className="h-4 w-4" /> },
  { key: 'my-schedule', label: 'My Schedule', icon: <Calendar className="h-4 w-4" /> },
];

const ALL_TAB_KEYS = BASE_TABS.map((t) => t.key);

const WEEKDAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
type RecurringHorizon = '1w' | '2w' | '4w' | '1m';

interface RecurringTicketRow {
  id: string;
  site_id?: string | null;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  position_code?: string | null;
  site?: {
    name?: string | null;
    site_code?: string | null;
    client_id?: string | null;
    janitorial_closet_location?: string | null;
    supply_storage_location?: string | null;
    water_source_location?: string | null;
    dumpster_location?: string | null;
    security_protocol?: string | null;
    entry_instructions?: string | null;
    parking_instructions?: string | null;
    access_notes?: string | null;
    client?: { name?: string | null; client_code?: string | null } | null;
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
  const day = clone.getDay(); // 0=Sun already
  clone.setDate(clone.getDate() - day);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function dayCodeFromDate(dateString: string) {
  const dayIndex = new Date(`${dateString}T12:00:00`).getDay();
  return WEEKDAY_ORDER[dayIndex] ?? 'SUN';
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
      'time-off': 'leave',
      'my-shifts': 'my-schedule',
    },
  });
  const [search, setSearch] = useState('');
  const [recurringView, setRecurringView] = useState<'list' | 'card' | 'grid' | 'coverage' | 'day' | 'tag'>('grid');
  const [recurringHorizon, setRecurringHorizon] = useState<RecurringHorizon>('2w');
  const [recurringAnchorDate, setRecurringAnchorDate] = useState<Date>(() => startOfWeek(new Date()));
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [openWorkOrderCreateToken, setOpenWorkOrderCreateToken] = useState(0);
  const [openPlanningCreateToken, setOpenPlanningCreateToken] = useState(0);
  const [recurringRows, setRecurringRows] = useState<RecurringScheduleRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekLoading, setCopyWeekLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishWarnings, setPublishWarnings] = useState<{ conflicts: number; unassigned: number }>({ conflicts: 0, unassigned: 0 });
  const [templateMode, setTemplateMode] = useState<'save' | 'load' | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [showAvailability, setShowAvailability] = useState(true);
  const [showLeave, setShowLeave] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Restore schedule filters from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gleamops-schedule-filters');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.clients?.length) setSelectedClients(saved.clients);
        if (saved.sites?.length) setSelectedSites(saved.sites);
        if (saved.positions?.length) setSelectedPositions(saved.positions);
        if (saved.employees?.length) setSelectedEmployees(saved.employees);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist schedule filters to localStorage
  useEffect(() => {
    const data = { clients: selectedClients, sites: selectedSites, positions: selectedPositions, employees: selectedEmployees };
    const hasAny = selectedClients.length || selectedSites.length || selectedPositions.length || selectedEmployees.length;
    if (hasAny) {
      localStorage.setItem('gleamops-schedule-filters', JSON.stringify(data));
    } else {
      localStorage.removeItem('gleamops-schedule-filters');
    }
  }, [selectedClients, selectedSites, selectedPositions, selectedEmployees]);

  const [shiftPrefill, setShiftPrefill] = useState<{ date?: string; staffName?: string } | null>(null);
  const [editShiftData, setEditShiftData] = useState<{
    id: string;
    version_etag?: string;
    siteId: string;
    jobId: string;
    positionCode: string;
    requiredStaff: number;
    startDate: string;
    startTime: string;
    endTime: string;
    weeksAhead: number;
    selectedDays: string[];
    note: string;
    title: string;
    openSlots: number;
    breakMinutes: number;
    breakPaid: boolean;
    remoteSite: string;
  } | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);
  const [, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedRecurringRow, setSelectedRecurringRow] = useState<RecurringScheduleRow | null>(null);
  const [coverageDrill, setCoverageDrill] = useState<CoverageCellParams | null>(null);
  const normalizedRole = normalizeRoleCode(role);
  const showChecklistAdmin = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const showShiftChecklist = normalizedRole === 'SUPERVISOR' || normalizedRole === 'CLEANER' || normalizedRole === 'INSPECTOR';
  const canCreateRecurringShift = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const showMasterBoard = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';
  const showFloaterBoard = normalizedRole === 'CLEANER' || normalizedRole === 'SUPERVISOR' || normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';
  const showSupervisorTab = normalizedRole === 'SUPERVISOR' || normalizedRole === 'MANAGER' || normalizedRole === 'OWNER_ADMIN';

  const availableEmployees = useMemo(() => {
    return Array.from(new Set(recurringRows.map((r) => r.staffName).filter((n) => n !== 'Open Shift'))).sort();
  }, [recurringRows]);

  const availablePositions = useMemo(() => {
    return Array.from(new Set(recurringRows.map((r) => r.positionType).filter(Boolean))).sort();
  }, [recurringRows]);

  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean; onClick?: () => void }[]>([
    { label: 'Tickets Today', value: '—' },
    { label: 'Coverage Gaps', value: '—' },
    { label: 'Open Work Orders', value: '—' },
    { label: 'Active Service Plans', value: '—' },
  ]);
  const [kpisLoading, setKpisLoading] = useState(true);
  const action = searchParams.get('action');
  const recurringRange = useMemo(
    () => buildRecurringRange(recurringAnchorDate, recurringHorizon),
    [recurringAnchorDate, recurringHorizon],
  );

  const filteredRecurringRows = useMemo((): RecurringScheduleRow[] => {
    let rows = recurringRows;
    if (selectedClients.length > 0) {
      const clientIdSet = new Set(selectedClients);
      rows = rows.filter((r) => r.clientId && clientIdSet.has(r.clientId));
    }
    if (selectedSites.length > 0) {
      const siteCodeSet = new Set(selectedSites);
      rows = rows.filter((r) => r.siteCode && siteCodeSet.has(r.siteCode));
    }
    if (selectedPositions.length > 0) {
      const posSet = new Set(selectedPositions);
      rows = rows.filter((r) => posSet.has(r.positionType));
    }
    if (selectedEmployees.length > 0) {
      const empSet = new Set(selectedEmployees);
      rows = rows.filter((r) => empSet.has(r.staffName));
    }
    return rows;
  }, [recurringRows, selectedClients, selectedSites, selectedPositions, selectedEmployees]);

  // Coverage drill-down: compute assigned/unassigned for the selected cell
  const coverageDrillData = useMemo(() => {
    if (!coverageDrill) return null;
    const matched = filteredRecurringRows.filter(
      (r) =>
        r.siteName === coverageDrill.siteName &&
        r.positionType === coverageDrill.positionType &&
        r.scheduledDates.includes(coverageDrill.dateKey),
    );
    const assigned = matched.filter((r) => r.status !== 'open');
    const unassigned = matched.filter((r) => r.status === 'open');
    return { assigned, unassigned };
  }, [coverageDrill, filteredRecurringRows]);

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
    async function fetchTabKpis() {
      setKpisLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const today = new Date().toISOString().slice(0, 10);
        const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

        if (tab === 'recurring') {
          const [workingRes, openRes, gapsRes, leaveRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null).in('status', ['SCHEDULED', 'IN_PROGRESS']),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null).eq('status', 'SCHEDULED'),
            supabase.from('schedule_conflicts').select('id', { count: 'exact', head: true }).eq('conflict_type', 'COVERAGE_GAP').eq('is_blocking', true),
            supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').lte('start_date', today).gte('end_date', today),
          ]);
          setTabKpis([
            { label: 'Working Today', value: workingRes.count ?? 0 },
            { label: 'Open Shifts', value: openRes.count ?? 0 },
            { label: 'Coverage Gaps', value: gapsRes.count ?? 0, warn: (gapsRes.count ?? 0) > 0 },
            { label: 'On Leave Today', value: leaveRes.count ?? 0 },
          ]);
        } else if (tab === 'calendar') {
          const [todayRes, recurringRes, unassignedRes, completedRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEnd).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null).eq('status', 'SCHEDULED'),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEnd).is('archived_at', null).eq('status', 'COMPLETED'),
          ]);
          setTabKpis([
            { label: 'Tickets Today', value: todayRes.count ?? 0 },
            { label: 'Recurring This Week', value: recurringRes.count ?? 0 },
            { label: 'Unassigned', value: unassignedRes.count ?? 0, warn: (unassignedRes.count ?? 0) > 0 },
            { label: 'Completed This Week', value: completedRes.count ?? 0 },
          ]);
        } else if (tab === 'planning') {
          const [todayRes, notStartedRes, inProgressRes, readyRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED').is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS').is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED').is('archived_at', null).gte('updated_at', today),
          ]);
          setTabKpis([
            { label: 'Tasks Today', value: todayRes.count ?? 0 },
            { label: 'Not Started', value: notStartedRes.count ?? 0 },
            { label: 'In Progress', value: inProgressRes.count ?? 0 },
            { label: 'Ready', value: readyRes.count ?? 0 },
          ]);
        } else if (tab === 'master') {
          const [totalRes, sitesRes, assignedRes, unassignedRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['SCHEDULED', 'IN_PROGRESS']),
            supabase.from('sites').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
            supabase.from('work_tickets').select('id, assignments:ticket_assignments(id)').is('archived_at', null).eq('status', 'SCHEDULED'),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'SCHEDULED'),
          ]);
          const assignedRows = (assignedRes.data ?? []) as unknown as Array<{ id: string; assignments?: Array<{ id: string }> }>;
          const withAssignment = assignedRows.filter(r => (r.assignments ?? []).length > 0).length;
          const totalTickets = unassignedRes.count ?? 0;
          setTabKpis([
            { label: 'Total Tickets', value: totalRes.count ?? 0 },
            { label: 'Sites', value: sitesRes.count ?? 0 },
            { label: 'Assigned', value: withAssignment },
            { label: 'Unassigned', value: Math.max(totalTickets - withAssignment, 0), warn: (totalTickets - withAssignment) > 0 },
          ]);
        } else if (tab === 'floater') {
          const [stopsRes, completedRes, scheduledRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null).eq('status', 'COMPLETED'),
            supabase.from('work_tickets').select('start_time, end_time').eq('scheduled_date', today).is('archived_at', null),
          ]);
          const totalStops = stopsRes.count ?? 0;
          const completedCount = completedRes.count ?? 0;
          const hours = (scheduledRes.data ?? []).reduce((sum, r: { start_time?: string | null; end_time?: string | null }) => {
            if (!r.start_time || !r.end_time) return sum;
            const [sh, sm] = r.start_time.slice(0, 5).split(':').map(Number);
            const [eh, em] = r.end_time.slice(0, 5).split(':').map(Number);
            return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
          }, 0);
          setTabKpis([
            { label: 'Stops Today', value: totalStops },
            { label: 'Completed', value: completedCount },
            { label: 'Remaining', value: Math.max(totalStops - completedCount, 0) },
            { label: 'Hours Scheduled', value: hours > 0 ? `${hours.toFixed(1)}h` : '0h' },
          ]);
        } else if (tab === 'supervisor') {
          const [shiftsRes, assignedRes, unassignedRes, staffRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id, assignments:ticket_assignments(id)').eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null).eq('status', 'SCHEDULED'),
            supabase.from('time_entries').select('staff_id').is('clock_out', null).gte('clock_in', `${today}T00:00:00`),
          ]);
          const assignedRows = (assignedRes.data ?? []) as unknown as Array<{ id: string; assignments?: Array<{ id: string }> }>;
          const withAssignment = assignedRows.filter(r => (r.assignments ?? []).length > 0).length;
          setTabKpis([
            { label: 'Shifts Today', value: shiftsRes.count ?? 0 },
            { label: 'Assigned', value: withAssignment },
            { label: 'Unassigned', value: unassignedRes.count ?? 0, warn: (unassignedRes.count ?? 0) > 0 },
            { label: 'Staff on Site', value: staffRes.data?.length ?? 0 },
          ]);
        } else if (tab === 'forms') {
          const [supplyRes, timeOffRes, submittedRes, alertsRes] = await Promise.all([
            supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'SUPPLY_REQUEST').is('dismissed_at', null),
            supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').is('archived_at', null),
            supabase.from('alerts').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`).is('dismissed_at', null),
            supabase.from('alerts').select('id', { count: 'exact', head: true }).is('dismissed_at', null),
          ]);
          setTabKpis([
            { label: 'Supply Requests', value: supplyRes.count ?? 0 },
            { label: 'Time Off Requests', value: timeOffRes.count ?? 0 },
            { label: 'Submitted Today', value: submittedRes.count ?? 0 },
            { label: 'Recent Alerts', value: alertsRes.count ?? 0 },
          ]);
        } else if (tab === 'checklists') {
          const [templatesRes, activeRes, itemsRes] = await Promise.all([
            supabase.from('checklist_templates').select('id', { count: 'exact', head: true }).is('archived_at', null),
            supabase.from('checklist_instances').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'IN_PROGRESS'),
            supabase.from('checklist_items').select('id, is_completed', { count: 'exact' }).is('archived_at', null),
          ]);
          const allItems = itemsRes.data ?? [];
          const totalItems = allItems.length;
          const completedItems = allItems.filter((i: { is_completed?: boolean }) => i.is_completed).length;
          const rate = totalItems > 0 ? `${Math.round((completedItems / totalItems) * 100)}%` : '0%';
          setTabKpis([
            { label: 'Templates', value: templatesRes.count ?? 0 },
            { label: 'Active Checklists', value: activeRes.count ?? 0 },
            { label: 'Items Total', value: totalItems },
            { label: 'Completion Rate', value: rate },
          ]);
        } else if (tab === 'my-schedule') {
          const [weekRes, todayShiftsRes, completedRes, hoursRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEnd).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEnd).is('archived_at', null).eq('status', 'COMPLETED'),
            supabase.from('work_tickets').select('start_time, end_time').gte('scheduled_date', today).lte('scheduled_date', weekEnd).is('archived_at', null),
          ]);
          const hours = (hoursRes.data ?? []).reduce((sum, r: { start_time?: string | null; end_time?: string | null }) => {
            if (!r.start_time || !r.end_time) return sum;
            const [sh, sm] = r.start_time.slice(0, 5).split(':').map(Number);
            const [eh, em] = r.end_time.slice(0, 5).split(':').map(Number);
            return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
          }, 0);
          setTabKpis([
            { label: 'My Shifts This Week', value: weekRes.count ?? 0 },
            { label: "Today's Shifts", value: todayShiftsRes.count ?? 0 },
            { label: 'Completed This Week', value: completedRes.count ?? 0 },
            { label: 'Hours This Week', value: hours > 0 ? `${hours.toFixed(1)}h` : '0h' },
          ]);
        } else if (tab === 'availability') {
          const [activeRes, hasAvailRes, staffRes] = await Promise.all([
            supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
            supabase.from('staff_availability_rules').select('staff_id').is('archived_at', null),
            supabase.from('staff').select('id').is('archived_at', null).eq('staff_status', 'ACTIVE'),
          ]);
          const totalStaff = activeRes.count ?? 0;
          const withAvail = new Set((hasAvailRes.data ?? []).map((r: { staff_id: string }) => r.staff_id)).size;
          setTabKpis([
            { label: 'Active Employees', value: totalStaff },
            { label: 'Availability Set', value: withAvail },
            { label: 'No Availability Set', value: Math.max(totalStaff - withAvail, 0), warn: (totalStaff - withAvail) > 0 },
            { label: 'Split Schedules', value: '—' },
          ]);
        } else if (tab === 'leave') {
          const [pendingRes, approvedRes, onLeaveRes, totalRes] = await Promise.all([
            supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').is('archived_at', null),
            supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').is('archived_at', null).gte('updated_at', new Date(Date.now() - 30 * 86400000).toISOString()),
            supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').lte('start_date', today).gte('end_date', today).is('archived_at', null),
            supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
          ]);
          setTabKpis([
            { label: 'Pending Requests', value: pendingRes.count ?? 0 },
            { label: 'Approved This Month', value: approvedRes.count ?? 0 },
            { label: 'On Leave Today', value: onLeaveRes.count ?? 0 },
            { label: 'Total Staff', value: totalRes.count ?? 0 },
          ]);
        } else {
          // work-orders fallback
          const [todayRes, gapsRes, openWorkOrdersRes, servicePlansRes] = await Promise.all([
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
            supabase.from('schedule_conflicts').select('id', { count: 'exact', head: true }).eq('conflict_type', 'COVERAGE_GAP').eq('is_blocking', true),
            supabase.from('work_tickets').select('id', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'IN_PROGRESS']).is('archived_at', null),
            supabase.from('site_jobs').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('archived_at', null),
          ]);
          setTabKpis([
            { label: 'Tickets Today', value: todayRes.count ?? 0 },
            { label: 'Coverage Gaps', value: gapsRes.count ?? 0, warn: (gapsRes.count ?? 0) > 0 },
            { label: 'Open Work Orders', value: openWorkOrdersRes.count ?? 0 },
            { label: 'Active Service Plans', value: servicePlansRes.count ?? 0 },
          ]);
        }
      } finally {
        setKpisLoading(false);
      }
    }
    fetchTabKpis();
  }, [refreshKey, tab]);

  // Fetch conflict count for toolbar badge
  useEffect(() => {
    let cancelled = false;

    async function fetchConflictCount() {
      const supabase = getSupabaseBrowserClient();
      const { count } = await supabase
        .from('schedule_conflicts')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null);
      if (!cancelled) setConflictCount(count ?? 0);
    }

    void fetchConflictCount();
    return () => { cancelled = true; };
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

  const handleShiftBlockClick = useCallback(async (row: RecurringScheduleRow) => {
    // Still update SiteBlueprintView
    setSelectedRecurringRow(row);

    // Fetch the actual work_ticket for this shift from Supabase
    const targetDate = row.scheduledDates[0];
    if (!targetDate) return;

    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from('work_tickets')
      .select('id, version_etag, site_id, job_id, position_code, scheduled_date, start_time, end_time, required_staff_count, note, status')
      .eq('scheduled_date', targetDate)
      .is('archived_at', null);

    // Match site precisely when available
    if (row.siteId) {
      query = query.eq('site_id', row.siteId);
    }

    // Handle position_code: 'General' means null in DB
    if (row.positionType && row.positionType !== 'General') {
      query = query.eq('position_code', row.positionType);
    }

    // Match times — use .like() pattern to handle HH:MM vs HH:MM:SS formats
    query = query.like('start_time', `${row.startTime}%`);
    query = query.like('end_time', `${row.endTime}%`);

    const { data: tickets } = await query.limit(1);

    const ticket = tickets?.[0];
    if (!ticket) {
      toast.error('Could not find the underlying work ticket.');
      return;
    }

    setEditShiftData({
      id: ticket.id,
      version_etag: ticket.version_etag,
      siteId: ticket.site_id,
      jobId: ticket.job_id ?? '',
      positionCode: ticket.position_code ?? '',
      requiredStaff: ticket.required_staff_count ?? 1,
      startDate: ticket.scheduled_date,
      startTime: (ticket.start_time ?? '18:00').slice(0, 5),
      endTime: (ticket.end_time ?? '22:00').slice(0, 5),
      weeksAhead: 1,
      selectedDays: row.scheduleDays,
      note: ticket.note ?? '',
      title: '',
      openSlots: 0,
      breakMinutes: 0,
      breakPaid: false,
      remoteSite: '',
    });
    setShiftFormOpen(true);
  }, []);

  const { handlePrint } = useSchedulePrint({
    rows: recurringRows,
    visibleDates: recurringRange.visibleDates,
    rangeLabel: recurringRange.label,
  });

  const canPublish = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';

  const handleQuickPublish = useCallback(async () => {
    setPublishLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Find or create a DRAFT period for the current range
      const rangeStart = toDateKey(recurringRange.start);
      const rangeEnd = toDateKey(recurringRange.end);

      const { data: existingPeriods } = await supabase
        .from('schedule_periods')
        .select('id, status')
        .eq('period_start', rangeStart)
        .eq('period_end', rangeEnd)
        .is('archived_at', null)
        .limit(1);

      let periodId: string;

      if (existingPeriods && existingPeriods.length > 0) {
        const period = existingPeriods[0];
        if (period.status === 'PUBLISHED' || period.status === 'LOCKED') {
          // Already published
          setPublishLoading(false);
          return;
        }
        periodId = period.id;
      } else {
        // Create a DRAFT period for this range
        const { data: auth } = await supabase.auth.getUser();
        const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

        const { data: newPeriod, error: createErr } = await supabase
          .from('schedule_periods')
          .insert({
            tenant_id: tenantId,
            period_name: `Schedule ${recurringRange.label}`,
            period_start: rangeStart,
            period_end: rangeEnd,
            status: 'DRAFT',
            period_type: recurringHorizon === '1m' ? 'MONTHLY' : recurringHorizon === '2w' ? 'BIWEEKLY' : 'WEEKLY',
          })
          .select('id')
          .single();

        if (createErr || !newPeriod) {
          setPublishLoading(false);
          return;
        }
        periodId = newPeriod.id;
      }

      // Try to publish via API, fallback to RPC
      const resp = await fetch(`/api/operations/schedule/periods/${periodId}/publish`, { method: 'POST' });
      if (!resp.ok) {
        // Fallback: direct RPC call
        await supabase.rpc('fn_publish_schedule_period', { p_period_id: periodId });
      }

      setRefreshKey((k) => k + 1);
    } finally {
      setPublishLoading(false);
    }
  }, [recurringRange, recurringHorizon]);

  const handlePublishClick = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const rangeStart = toDateKey(recurringRange.start);
    const rangeEnd = toDateKey(recurringRange.end);

    const [conflictsRes, unassignedRes] = await Promise.all([
      supabase
        .from('schedule_conflicts')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null),
      supabase
        .from('work_tickets')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd)
        .in('status', ['SCHEDULED', 'IN_PROGRESS'])
        .is('assigned_to', null),
    ]);

    const conflicts = conflictsRes.count ?? 0;
    const unassigned = unassignedRes.count ?? 0;

    if (conflicts > 0 || unassigned > 0) {
      setPublishWarnings({ conflicts, unassigned });
      setPublishConfirmOpen(true);
    } else {
      handleQuickPublish();
    }
  }, [recurringRange, handleQuickPublish]);

  const handleAutoFill = useCallback(async () => {
    setAutoFillLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const rangeStart = toDateKey(recurringRange.start);
      const rangeEnd = toDateKey(recurringRange.end);

      // Find open shifts (tickets with no active assignments) in the current range
      const { data: tickets } = await supabase
        .from('work_tickets')
        .select('id, position_code, scheduled_date, site_id, assignments:ticket_assignments(id, assignment_status, staff_id)')
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd)
        .is('archived_at', null);

      if (!tickets) { setAutoFillLoading(false); return; }

      const openTickets = (tickets as unknown as Array<{
        id: string;
        position_code: string | null;
        scheduled_date: string;
        site_id: string;
        assignments?: Array<{ id: string; assignment_status: string; staff_id: string }>;
      }>).filter((t) => {
        const active = t.assignments?.filter((a) => a.assignment_status === 'ASSIGNED') ?? [];
        return active.length === 0;
      });

      if (openTickets.length === 0) { setAutoFillLoading(false); return; }

      // Fetch eligible staff for each position
      const { data: eligibility } = await supabase
        .from('staff_eligible_positions')
        .select('staff_id, position_code')
        .is('archived_at', null);

      // Fetch availability
      const { data: availRules } = await supabase
        .from('staff_availability_rules')
        .select('staff_id, weekday:day_of_week, is_available')
        .eq('is_available', false);

      const unavailableSet = new Set<string>();
      if (availRules) {
        for (const r of availRules as Array<{ staff_id: string; weekday: number; is_available: boolean }>) {
          unavailableSet.add(`${r.staff_id}:${r.weekday}`);
        }
      }

      const eligByPosition = new Map<string, string[]>();
      if (eligibility) {
        for (const e of eligibility as Array<{ staff_id: string; position_code: string }>) {
          const list = eligByPosition.get(e.position_code) ?? [];
          list.push(e.staff_id);
          eligByPosition.set(e.position_code, list);
        }
      }

      // Track assigned staff per date to avoid double-booking
      const assignedPerDate = new Map<string, Set<string>>();
      const { data: auth } = await supabase.auth.getUser();
      const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

      let filledCount = 0;
      for (const ticket of openTickets) {
        const posCode = ticket.position_code;
        if (!posCode) continue;

        const eligible = eligByPosition.get(posCode) ?? [];
        if (eligible.length === 0) continue;

        const dow = new Date(`${ticket.scheduled_date}T12:00:00`).getDay();
        const dateAssigned = assignedPerDate.get(ticket.scheduled_date) ?? new Set();

        const candidate = eligible.find((staffId) =>
          !unavailableSet.has(`${staffId}:${dow}`) && !dateAssigned.has(staffId)
        );

        if (candidate) {
          await supabase.from('ticket_assignments').insert({
            tenant_id: tenantId,
            ticket_id: ticket.id,
            staff_id: candidate,
            assignment_status: 'ASSIGNED',
            assignment_type: 'DIRECT',
            role: posCode,
          });
          dateAssigned.add(candidate);
          assignedPerDate.set(ticket.scheduled_date, dateAssigned);
          filledCount++;
        }
      }

      setRefreshKey((k) => k + 1);

      // Dispatch toast with results
      window.dispatchEvent(new CustomEvent('gleamops:toast', {
        detail: { type: filledCount > 0 ? 'success' : 'info', message: filledCount > 0 ? `Auto-filled ${filledCount} open shift(s).` : 'No eligible staff available for open shifts.' },
      }));
    } finally {
      setAutoFillLoading(false);
    }
  }, [recurringRange]);

  const handleApplyTemplate = useCallback(async (templateData: Array<{ position_code: string; weekday: number; start_time: string; end_time: string; required_staff: number }>) => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const tenantId = auth.user?.app_metadata?.tenant_id ?? null;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    // Map weekday numbers to dates within the current range
    const datesByWeekday = new Map<number, string[]>();
    for (const dateKey of recurringRange.visibleDates) {
      const dow = new Date(`${dateKey}T12:00:00`).getDay();
      const list = datesByWeekday.get(dow) ?? [];
      list.push(dateKey);
      datesByWeekday.set(dow, list);
    }

    // Get a default site_id (first available site)
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .is('archived_at', null)
      .limit(1);
    const defaultSiteId = sites?.[0]?.id;

    // Get a default job_id (first available job)
    const { data: jobs } = await supabase
      .from('site_jobs')
      .select('id')
      .eq('status', 'ACTIVE')
      .is('archived_at', null)
      .limit(1);
    const defaultJobId = jobs?.[0]?.id;

    if (!defaultSiteId || !defaultJobId) return;

    const inserts = [];
    for (const pattern of templateData) {
      const dates = datesByWeekday.get(pattern.weekday) ?? [];
      for (const dateKey of dates) {
        let ticketCode = `TKT-TMPL-${Date.now()}`;
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
          } catch { /* use fallback */ }
        }

        inserts.push({
          tenant_id: tenantId,
          ticket_code: ticketCode,
          job_id: defaultJobId,
          site_id: defaultSiteId,
          position_code: pattern.position_code,
          start_time: pattern.start_time,
          end_time: pattern.end_time,
          scheduled_date: dateKey,
          status: 'SCHEDULED',
        });
      }
    }

    if (inserts.length > 0) {
      await supabase.from('work_tickets').insert(inserts);
    }

    setRefreshKey((k) => k + 1);
  }, [recurringRange]);

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
          site_id,
          scheduled_date,
          start_time,
          end_time,
          status,
          position_code,
          site:site_id(
            name,
            site_code,
            client_id,
            janitorial_closet_location,
            supply_storage_location,
            water_source_location,
            dumpster_location,
            security_protocol,
            entry_instructions,
            parking_instructions,
            access_notes,
            client:client_id(name, client_code)
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
        siteId: string | null;
        siteCode: string | null;
        clientName: string | null;
        clientId: string | null;
        clientCode: string | null;
        startTime: string;
        endTime: string;
        status: RecurringScheduleRow['status'];
        scheduleDays: Set<string>;
        scheduledDates: Set<string>;
        blueprint: NonNullable<RecurringScheduleRow['blueprint']>;
      }>();

      for (const raw of data as unknown as RecurringTicketRow[]) {
        const dayCode = dayCodeFromDate(raw.scheduled_date);
        const positionType = raw.position_code?.trim() || 'General';
        const siteName = raw.site?.name?.trim() || 'Unassigned Site';
        const siteId = raw.site_id || null;
        const siteCode = raw.site?.site_code?.trim() || null;
        const clientName = raw.site?.client?.name?.trim() || null;
        const clientId = raw.site?.client_id || null;
        const clientCode = raw.site?.client?.client_code?.trim() || null;
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
            siteId,
            siteCode,
            clientName,
            clientId,
            clientCode,
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
        siteId: entry.siteId,
        siteCode: entry.siteCode,
        clientName: entry.clientName,
        clientId: entry.clientId,
        clientCode: entry.clientCode,
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
      <div className="pt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-warning' : ''}`}>
                {kpisLoading ? '—' : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tab === 'recurring' && canCreateRecurringShift ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          {conflictCount > 0 && (
            <button
              type="button"
              onClick={() => {
                const conflictEl = document.getElementById('schedule-conflicts');
                if (conflictEl) {
                  conflictEl.scrollIntoView({ behavior: 'smooth' });
                  conflictEl.querySelector('button')?.click();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <AlertTriangle className="h-4 w-4" />
              {conflictCount} {conflictCount === 1 ? 'Conflict' : 'Conflicts'}
            </button>
          )}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search schedule..."
            className="w-56 sm:w-64"
          />
          <ScheduleToolsDropdown
            onCopyWeek={() => setCopyWeekOpen(true)}
            onSaveTemplate={() => setTemplateMode('save')}
            onLoadTemplate={() => setTemplateMode('load')}
            onAutoFill={handleAutoFill}
            onPrint={handlePrint}
            onToggleBudget={() => setBudgetMode((b) => !b)}
            budgetMode={budgetMode}
            autoFillLoading={autoFillLoading}
          />
          {canPublish && (
            <Button
              variant="secondary"
              onClick={handlePublishClick}
              disabled={publishLoading}
              className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
            >
              <Send className="h-4 w-4" />
              {publishLoading ? 'Publishing...' : 'Publish Schedule'}
            </Button>
          )}
          <Button onClick={() => { setEditShiftData(null); setShiftFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Shift
          </Button>
        </div>
      ) : null}

      {(tab === 'work-orders' || tab === 'planning' || tab === 'checklists') && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'work-orders'
                ? 'Search work orders, services, and sites...'
                : tab === 'planning'
                  ? 'Search planning tickets, sites, positions, or codes...'
                : tab === 'checklists'
                  ? 'Search checklist templates, sections, or items...'
                : `Search ${tab}...`
            }
            className="w-full sm:w-72 lg:w-80"
          />
        </div>
      )}

      {tab === 'recurring' && (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">Range</span>
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
            {([
              { key: 'grid', label: 'Grid' },
              { key: 'coverage', label: 'Coverage' },
              { key: 'day', label: 'Day' },
              { key: 'list', label: 'List' },
              { key: 'card', label: 'Card' },
              { key: 'tag', label: 'Tag' },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRecurringView(option.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  recurringView === option.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
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
        <div className="flex gap-4">
          <ScheduleSidebar
            anchorDate={recurringAnchorDate}
            onDateSelect={(date) => setRecurringAnchorDate(date)}
            showAvailability={showAvailability}
            onShowAvailabilityChange={setShowAvailability}
            showLeave={showLeave}
            onShowLeaveChange={setShowLeave}
            onResetFilters={() => {
              setSelectedClients([]);
              setSelectedSites([]);
              setSelectedPositions([]);
              setSelectedEmployees([]);
            }}
            selectedClients={selectedClients}
            onSelectedClientsChange={setSelectedClients}
            selectedSites={selectedSites}
            onSelectedSitesChange={setSelectedSites}
            selectedPositions={selectedPositions}
            onSelectedPositionsChange={setSelectedPositions}
            selectedEmployees={selectedEmployees}
            onSelectedEmployeesChange={setSelectedEmployees}
            availableEmployees={availableEmployees}
            availablePositions={availablePositions}
          />
          <div className="flex-1 min-w-0 space-y-4">
            {(recurringView === 'grid' || recurringView === 'coverage' || recurringView === 'tag') && (
              <PositionColorLegend />
            )}
            {recurringLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Loading recurring schedule...
                </CardContent>
              </Card>
            ) : recurringView === 'list' ? (
              <ScheduleList rows={filteredRecurringRows} search={search} onSelect={handleShiftBlockClick} />
            ) : recurringView === 'card' ? (
              <ScheduleCardGrid rows={filteredRecurringRows} search={search} onSelect={handleShiftBlockClick} />
            ) : recurringView === 'coverage' ? (
              <CoverageGrid
                rows={filteredRecurringRows}
                visibleDates={recurringRange.visibleDates}
                search={search}
                onCellClick={setCoverageDrill}
              />
            ) : recurringView === 'day' ? (
              <DayView
                rows={filteredRecurringRows}
                dateKey={toDateKey(recurringAnchorDate)}
                search={search}
                onSelect={handleShiftBlockClick}
              />
            ) : recurringView === 'tag' ? (
              <TagView
                rows={filteredRecurringRows}
                search={search}
              />
            ) : (
              <ScheduleGrid
                rows={filteredRecurringRows}
                visibleDates={recurringRange.visibleDates}
                search={search}
                onSelect={handleShiftBlockClick}
                onReassign={() => setRefreshKey((k) => k + 1)}
                onQuickCreate={(date, staffName) => {
                  setEditShiftData(null);
                  setShiftPrefill({ date, staffName });
                  setShiftFormOpen(true);
                }}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'recurring' && budgetMode && (
        <BudgetOverlay
          rows={filteredRecurringRows}
          visibleDates={recurringRange.visibleDates}
        />
      )}

      {tab === 'recurring' ? (
        <>
          <SiteBlueprintView row={selectedRecurringRow} onClear={() => setSelectedRecurringRow(null)} />

          {/* Coverage Drill-Down Panel */}
          {coverageDrill && coverageDrillData && (
            <Card className="border-primary/30">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {coverageDrill.siteCode ? `${coverageDrill.siteCode} – ` : ''}{coverageDrill.siteName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {coverageDrill.positionType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      {' · '}
                      {new Date(`${coverageDrill.dateKey}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCoverageDrill(null)} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge color="green">{coverageDrillData.assigned.length} assigned</Badge>
                  <Badge color="red">{coverageDrillData.unassigned.length} open</Badge>
                </div>
                {coverageDrillData.assigned.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned Staff</p>
                    <ul className="space-y-1">
                      {coverageDrillData.assigned.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                          <span className="text-foreground">{r.staffName}</span>
                          <span className="text-xs text-muted-foreground">{r.startTime} – {r.endTime}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {coverageDrillData.unassigned.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Open Slots</p>
                    <ul className="space-y-1">
                      {coverageDrillData.unassigned.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3 w-3 text-red-500 shrink-0" />
                          <span>{r.startTime} – {r.endTime}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {canCreateRecurringShift && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditShiftData(null);
                      setShiftPrefill({ date: coverageDrill.dateKey });
                      setShiftFormOpen(true);
                      setCoverageDrill(null);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Shift
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

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

      {(tab === 'leave' || tab === 'availability') && (
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => { if (tab !== 'leave') setTab('leave'); }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'leave' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Leave Management
            </button>
            <button
              type="button"
              onClick={() => { if (tab !== 'availability') setTab('availability'); }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === 'availability' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Availability
            </button>
          </div>
          {tab === 'leave' && <LeaveManagement />}
          {tab === 'availability' && <AvailabilityModule />}
        </div>
      )}
      {tab === 'my-schedule' && <MySchedule />}

      <ShiftForm
        open={shiftFormOpen}
        onClose={() => { setShiftFormOpen(false); setShiftPrefill(null); setEditShiftData(null); }}
        onCreated={() => { setRefreshKey((current) => current + 1); setEditShiftData(null); }}
        prefill={shiftPrefill}
        initialData={editShiftData}
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

      <ConfirmDialog
        open={publishConfirmOpen}
        onClose={() => setPublishConfirmOpen(false)}
        onConfirm={() => {
          setPublishConfirmOpen(false);
          handleQuickPublish();
        }}
        title="Publish with warnings?"
        description={[
          publishWarnings.conflicts > 0 ? `${publishWarnings.conflicts} unresolved schedule conflict${publishWarnings.conflicts === 1 ? '' : 's'}` : '',
          publishWarnings.unassigned > 0 ? `${publishWarnings.unassigned} unassigned ticket${publishWarnings.unassigned === 1 ? '' : 's'} in this range` : '',
        ].filter(Boolean).join(' and ') + '. Are you sure you want to publish?'}
        confirmLabel="Publish Anyway"
        variant="danger"
      />

      <TemplateManager
        mode={templateMode ?? 'save'}
        open={templateMode !== null}
        onClose={() => setTemplateMode(null)}
        currentRows={recurringRows}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
}
