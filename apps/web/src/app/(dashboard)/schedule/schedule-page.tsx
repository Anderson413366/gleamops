'use client';

import { useState, useEffect } from 'react';
import { Calendar, ClipboardList, Briefcase } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import WeekCalendar from '../operations/calendar/week-calendar';
import PlanningBoard from './plan/planning-board';
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

export default function SchedulePageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'recurring',
    aliases: { planning: 'recurring', plan: 'recurring', jobs: 'work-orders' },
  });
  const [search, setSearch] = useState('');
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

      {tab === 'calendar' && (
        <WeekCalendar
          key={`cal-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}

      {tab === 'recurring' && (
        <PlanningBoard key={`planning-${refreshKey}`} search={search} />
      )}

      {tab === 'work-orders' && (
        <WorkOrderTable key={`work-orders-${refreshKey}`} search={search} />
      )}
    </div>
  );
}
