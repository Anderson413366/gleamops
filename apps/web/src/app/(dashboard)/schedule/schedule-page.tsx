'use client';

import { useState, useEffect } from 'react';
import { Calendar, ClipboardList, Clock, ArrowLeftRight } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import WeekCalendar from '../operations/calendar/week-calendar';
import PlanningPanel from '../operations/planning/planning-panel';

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
  { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'plan', label: 'Plan', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'availability', label: 'Availability', icon: <Clock className="h-4 w-4" /> },
  { key: 'trades', label: 'Trades', icon: <ArrowLeftRight className="h-4 w-4" /> },
];

export default function SchedulePageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'calendar',
    aliases: { planning: 'plan' },
  });
  const [search, setSearch] = useState('');
  const [refreshKey] = useState(0);
  const [, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [kpis, setKpis] = useState({
    todayTickets: 0,
    coverageGaps: 0,
    publishedPeriods: 0,
    pendingTrades: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);
      const [todayRes, gapsRes, periodsRes, tradesRes] = await Promise.all([
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
          .from('schedule_periods')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PUBLISHED'),
        supabase
          .from('shift_trade_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
      ]);

      setKpis({
        todayTickets: todayRes.count ?? 0,
        coverageGaps: gapsRes.count ?? 0,
        publishedPeriods: periodsRes.count ?? 0,
        pendingTrades: tradesRes.count ?? 0,
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
            Who goes where, when?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <p className="text-xs text-muted-foreground">Published Periods</p>
            <p className="text-xl font-semibold">{kpis.publishedPeriods}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending Trades</p>
            <p className={`text-xl font-semibold ${kpis.pendingTrades > 0 ? 'text-warning' : ''}`}>
              {kpis.pendingTrades}
            </p>
          </CardContent>
        </Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab !== 'calendar' && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={
            tab === 'plan'
              ? 'Search planning tickets, roles, and sites...'
              : tab === 'availability'
                ? 'Search staff availability...'
                : tab === 'trades'
                  ? 'Search trade requests...'
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

      {tab === 'plan' && (
        <PlanningPanel key={`planning-${refreshKey}`} search={search} />
      )}

      {tab === 'availability' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Staff Availability</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              View and manage staff availability rules, PTO calendar, and one-off exceptions.
              This view is coming soon.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === 'trades' && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Shift Trades</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No shift trade requests. Staff can request trades from their schedule view.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
