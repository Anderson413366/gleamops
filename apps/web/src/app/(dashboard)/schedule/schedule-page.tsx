'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ClipboardList, Briefcase, FileText, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent, Button } from '@gleamops/ui';
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
import { WorkOrderTable } from './work-orders/work-order-table';
import { ChecklistAdmin } from './checklist-admin';
import { ShiftChecklist } from './shift-checklist';

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

const TABS = [
  { key: 'recurring', label: 'Recurring', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'work-orders', label: 'Work Orders', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'forms', label: 'Forms', icon: <FileText className="h-4 w-4" /> },
  { key: 'checklists', label: 'Checklists', icon: <ClipboardList className="h-4 w-4" /> },
];

const WEEKDAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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

export default function SchedulePageClient() {
  const router = useRouter();
  const { role } = useRole();
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'recurring',
    aliases: { planning: 'recurring', plan: 'recurring', jobs: 'work-orders' },
  });
  const [search, setSearch] = useState('');
  const [recurringView, setRecurringView] = useState<'list' | 'card' | 'grid'>('list');
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [recurringRows, setRecurringRows] = useState<RecurringScheduleRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedRecurringRow, setSelectedRecurringRow] = useState<RecurringScheduleRow | null>(null);
  const normalizedRole = normalizeRoleCode(role);
  const showChecklistAdmin = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const showShiftChecklist = normalizedRole === 'SUPERVISOR' || normalizedRole === 'CLEANER' || normalizedRole === 'INSPECTOR';
  const canCreateRecurringShift = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const [kpis, setKpis] = useState({
    todayTickets: 0,
    coverageGaps: 0,
    openWorkOrders: 0,
    activeServicePlans: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
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
    }
    fetchKpis();
  }, [refreshKey]);

  useEffect(() => {
    if (tab !== 'recurring' || recurringView !== 'grid') {
      setSelectedRecurringRow(null);
    }
  }, [tab, recurringView]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecurringGridRows() {
      if (tab !== 'recurring') return;

      setRecurringLoading(true);
      const supabase = getSupabaseBrowserClient();
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

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
        .gte('scheduled_date', toDateKey(weekStart))
        .lte('scheduled_date', toDateKey(weekEnd))
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
  }, [recurringView, refreshKey, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recurring assignments, work orders, and calendar coordination.
          </p>
        </div>
        {tab === 'recurring' && canCreateRecurringShift ? (
          <Button onClick={() => setShiftFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New Shift
          </Button>
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
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.todayTickets}</p>
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
              {kpis.coverageGaps}
            </p>
            <p className="text-[11px] text-muted-foreground">Open Recurring</p>
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
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.openWorkOrders}</p>
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
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeServicePlans}</p>
            <p className="text-[11px] text-muted-foreground">Open Service Plans</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {(tab === 'recurring' || tab === 'work-orders' || tab === 'checklists') && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'recurring'
                ? 'Search recurring assignments, roles, and sites...'
                : tab === 'work-orders'
                  ? 'Search work orders, services, and sites...'
                  : tab === 'checklists'
                    ? 'Search checklist templates, sections, or items...'
                  : `Search ${tab}...`
            }
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
        )}
      </div>

      {tab === 'recurring' && (
        <div className="flex justify-end">
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
        recurringLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading recurring schedule...
            </CardContent>
          </Card>
        ) : (
          recurringView === 'list' ? (
            <ScheduleList rows={recurringRows} search={search} onSelect={setSelectedRecurringRow} />
          ) : recurringView === 'card' ? (
            <ScheduleCardGrid rows={recurringRows} search={search} onSelect={setSelectedRecurringRow} />
          ) : (
            <ScheduleGrid rows={recurringRows} search={search} onSelect={setSelectedRecurringRow} />
          )
        )
      )}

      {tab === 'recurring' ? (
        <SiteBlueprintView row={selectedRecurringRow} onClear={() => setSelectedRecurringRow(null)} />
      ) : null}

      {tab === 'work-orders' && (
        <WorkOrderTable key={`work-orders-${refreshKey}`} search={search} />
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
    </div>
  );
}
