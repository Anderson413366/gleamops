'use client';

import { useState, useEffect } from 'react';
import { Calendar, ClipboardList, Briefcase } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import WeekCalendar from '../operations/calendar/week-calendar';
import PlanningBoard from './plan/planning-board';
import { ScheduleGrid } from './recurring/schedule-grid';
import type { RecurringScheduleRow } from './recurring/schedule-list';
import { WorkOrderTable } from './work-orders/work-order-table';

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
];

const WEEKDAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface RecurringTicketRow {
  id: string;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  position_code?: string | null;
  site?: { name?: string | null } | null;
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
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'recurring',
    aliases: { planning: 'recurring', plan: 'recurring', jobs: 'work-orders' },
  });
  const [search, setSearch] = useState('');
  const [recurringView, setRecurringView] = useState<'board' | 'grid'>('board');
  const [recurringRows, setRecurringRows] = useState<RecurringScheduleRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [refreshKey] = useState(0);
  const [, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [kpis, setKpis] = useState({
    todayTickets: 0,
    coverageGaps: 0,
    activeWorkOrders: 0,
    publishedPeriods: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);
      const [todayRes, gapsRes, workOrdersRes, periodsRes] = await Promise.all([
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
          .from('site_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .is('archived_at', null),
        supabase
          .from('schedule_periods')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PUBLISHED'),
      ]);

      setKpis({
        todayTickets: todayRes.count ?? 0,
        coverageGaps: gapsRes.count ?? 0,
        activeWorkOrders: workOrdersRes.count ?? 0,
        publishedPeriods: periodsRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecurringGridRows() {
      if (tab !== 'recurring' || recurringView !== 'grid') return;

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
          site:site_id(name),
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
        startTime: string;
        endTime: string;
        status: RecurringScheduleRow['status'];
        scheduleDays: Set<string>;
      }>();

      for (const raw of data as unknown as RecurringTicketRow[]) {
        const dayCode = dayCodeFromDate(raw.scheduled_date);
        const positionType = raw.position_code?.trim() || 'General Specialist';
        const siteName = raw.site?.name?.trim() || 'Unassigned Site';
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
            startTime,
            endTime,
            status,
            scheduleDays: new Set([dayCode]),
          });
        }
      }

      const rows: RecurringScheduleRow[] = Array.from(byAssignment.values()).map((entry, idx) => ({
        id: `${entry.staffName}-${entry.positionType}-${entry.siteName}-${entry.startTime}-${entry.endTime}-${idx}`,
        staffName: entry.staffName,
        positionType: entry.positionType,
        siteName: entry.siteName,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: entry.status,
        scheduleDays: Array.from(entry.scheduleDays).sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)),
      }));

      if (!cancelled) {
        setRecurringRows(rows);
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
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tickets Today</p>
            <p className="text-xl font-semibold">{kpis.todayTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Coverage Gaps</p>
            <p className={`text-xl font-semibold ${kpis.coverageGaps > 0 ? 'text-destructive' : ''}`}>
              {kpis.coverageGaps}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Work Orders</p>
            <p className="text-xl font-semibold">{kpis.activeWorkOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Published Periods</p>
            <p className="text-xl font-semibold">{kpis.publishedPeriods}</p>
          </CardContent>
        </Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab !== 'calendar' && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={
            tab === 'recurring'
              ? 'Search recurring assignments, roles, and sites...'
              : tab === 'work-orders'
                ? 'Search work orders, services, and sites...'
                : `Search ${tab}...`
          }
        />
      )}

      {tab === 'recurring' && (
        <div className="flex justify-end">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setRecurringView('board')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                recurringView === 'board'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Board
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
        <WeekCalendar
          key={`cal-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}

      {tab === 'recurring' && (
        recurringView === 'grid' ? (
          recurringLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Loading recurring schedule grid...
              </CardContent>
            </Card>
          ) : (
            <ScheduleGrid rows={recurringRows} search={search} />
          )
        ) : (
          <PlanningBoard key={`planning-${refreshKey}`} search={search} />
        )
      )}

      {tab === 'work-orders' && (
        <WorkOrderTable key={`work-orders-${refreshKey}`} search={search} />
      )}
    </div>
  );
}
