'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle, TrendingUp, Timer, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Badge, Button } from '@gleamops/ui';
import { TICKET_STATUS_COLORS, EXCEPTION_SEVERITY_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../_components/report-components';

interface TicketStats {
  total: number;
  byStatus: Record<string, number>;
}

interface ExceptionSummary {
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
}

interface TimeStats {
  totalEntriesToday: number;
  openEntries: number;
  totalHoursToday: number;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailySeries(days: number, getValue: (key: string) => number) {
  const out: { key: string; label: string; value: number }[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    out.push({ key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: getValue(key) });
  }
  return out;
}

export default function OpsDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [ticketStats, setTicketStats] = useState<TicketStats>({ total: 0, byStatus: {} });
  const [exceptionSummary, setExceptionSummary] = useState<ExceptionSummary>({ total: 0, unresolved: 0, bySeverity: {} });
  const [timeStats, setTimeStats] = useState<TimeStats>({ totalEntriesToday: 0, openEntries: 0, totalHoursToday: 0 });
  const [ticketSeries, setTicketSeries] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [hoursSeries, setHoursSeries] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(start.getDate() - props.rangeDays);
    const startISO = start.toISOString();

    const [ticketsTodayRes, ticketsRangeRes, exceptionsRes, timeTodayRes, timeRangeRes, openTimeRes] = await Promise.all([
      // Today's tickets
      supabase.from('work_tickets').select('id, status').eq('scheduled_date', today).is('archived_at', null),
      // Tickets in range (for trend)
      supabase.from('work_tickets').select('scheduled_date').gte('scheduled_date', dateKey(new Date(Date.now() - props.rangeDays * 86400000))).is('archived_at', null),
      // Unresolved exceptions
      supabase
        .from('time_exceptions')
        .select('id, severity, resolved_at')
        .is('archived_at', null),
      // Today's time entries
      supabase.from('time_entries').select('id, duration_minutes, status, start_at').gte('start_at', `${today}T00:00:00Z`).lte('start_at', `${today}T23:59:59Z`).is('archived_at', null),
      // Time entries in range (for trend)
      supabase.from('time_entries').select('start_at, duration_minutes').gte('start_at', startISO).is('archived_at', null),
      // Open time entries (currently clocked in)
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .is('archived_at', null),
    ]);

    // Process ticket stats
    if (ticketsTodayRes.data) {
      const byStatus: Record<string, number> = {};
      for (const t of ticketsTodayRes.data) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      }
      setTicketStats({ total: ticketsTodayRes.data.length, byStatus });
    }

    // Ticket trend
    if (ticketsRangeRes.data) {
      const counts: Record<string, number> = {};
      for (const t of ticketsRangeRes.data) {
        const key = t.scheduled_date as string;
        counts[key] = (counts[key] || 0) + 1;
      }
      const series = buildDailySeries(Math.min(14, Math.max(7, props.rangeDays)), (k) => counts[k] || 0);
      setTicketSeries({ labels: series.map((s) => s.label), values: series.map((s) => s.value) });
    }

    // Process exception stats
    if (exceptionsRes.data) {
      const bySeverity: Record<string, number> = {};
      let unresolved = 0;
      for (const e of exceptionsRes.data) {
        if (!e.resolved_at) {
          unresolved++;
          bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        }
      }
      setExceptionSummary({ total: exceptionsRes.data.length, unresolved, bySeverity });
    }

    // Process time stats
    if (timeTodayRes.data) {
      const totalMinutes = timeTodayRes.data.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      setTimeStats({
        totalEntriesToday: timeTodayRes.data.length,
        openEntries: openTimeRes.count || 0,
        totalHoursToday: Math.round((totalMinutes / 60) * 10) / 10,
      });
    }

    if (timeRangeRes.data) {
      const minutesByDay: Record<string, number> = {};
      for (const e of timeRangeRes.data) {
        const key = dateKey(new Date(e.start_at as string));
        minutesByDay[key] = (minutesByDay[key] || 0) + ((e.duration_minutes as number | null) || 0);
      }
      const series = buildDailySeries(Math.min(14, Math.max(7, props.rangeDays)), (k) => (minutesByDay[k] || 0) / 60);
      setHoursSeries({ labels: series.map((s) => s.label), values: series.map((s) => Math.round(s.value * 10) / 10) });
    }

    setLoading(false);
  }, [props.rangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchData(); }, [props.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={<Calendar className="h-5 w-5" />} tone="primary" label="Tickets Today" value={ticketStats.total} />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5" />}
          tone="success"
          label="Completed Today"
          value={(ticketStats.byStatus['COMPLETED'] || 0) + (ticketStats.byStatus['VERIFIED'] || 0)}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
          label="Open Exceptions"
          value={exceptionSummary.unresolved}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          tone="accent"
          label="Hours Logged Today"
          value={timeStats.totalHoursToday}
          helper={timeStats.openEntries > 0 ? `${timeStats.openEntries} currently clocked in` : undefined}
        />
        <MetricCard
          icon={<Timer className="h-5 w-5" />}
          tone="primary"
          label="Time Entries Today"
          value={timeStats.totalEntriesToday}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
          label={`Tickets Trend`}
          value={ticketSeries.values.reduce((a, b) => a + b, 0)}
          helper={`last ${Math.min(14, Math.max(7, props.rangeDays))} days`}
        />
      </div>

      {/* Ticket Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Ticket Status (Today)"
          subtitle="Visual breakdown of ticket statuses scheduled today."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/jobs')}>
              View Operations <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {Object.keys(ticketStats.byStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(ticketStats.byStatus).map(([status, count]) => (
                <BreakdownRow
                  key={status}
                  left={<Badge color={TICKET_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>}
                  right={count}
                  pct={ticketStats.total > 0 ? count / ticketStats.total : 0}
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Tickets Trend" subtitle={`Tickets per day (last ${Math.min(14, Math.max(7, props.rangeDays))} days)`}>
          {ticketSeries.values.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ticket history available for this range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{ticketSeries.values.reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-muted-foreground">Total tickets in range</p>
              </div>
              <MiniBars values={ticketSeries.values} ariaLabel="Tickets per day" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Hours Logged Trend" subtitle={`Hours per day (last ${Math.min(14, Math.max(7, props.rangeDays))} days)`}>
          {hoursSeries.values.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entry history available for this range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">
                  {Math.round(hoursSeries.values.reduce((a, b) => a + b, 0) * 10) / 10}
                </p>
                <p className="text-xs text-muted-foreground">Total hours in range</p>
              </div>
              <MiniBars values={hoursSeries.values} barClassName="fill-accent/60" ariaLabel="Hours per day" />
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Exception Inbox" subtitle="Unresolved exceptions by severity">
          {exceptionSummary.unresolved === 0 ? (
            <p className="text-sm text-muted-foreground">No open exceptions. All clear!</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(exceptionSummary.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <Badge color={EXCEPTION_SEVERITY_COLORS[severity] ?? 'gray'}>{severity}</Badge>
                  <span className="text-sm font-medium">{count} unresolved</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
