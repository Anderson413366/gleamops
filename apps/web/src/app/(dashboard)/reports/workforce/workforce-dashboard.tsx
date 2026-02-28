'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Clock, AlertTriangle, UserCheck, ClipboardCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Badge, Button } from '@gleamops/ui';
import { EXCEPTION_SEVERITY_COLORS, TIMESHEET_STATUS_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../_components/report-components';

interface WorkforceStats {
  totalStaff: number;
  activeStaff: number;
  clockedInNow: number;
  hoursThisWeek: number;
}

interface ExceptionBreakdown {
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
}

interface TimesheetBreakdown {
  [status: string]: number;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyLabels(days: number) {
  const out: { key: string; label: string }[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ key: dateKey(d), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
  }
  return out;
}

export default function WorkforceDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [stats, setStats] = useState<WorkforceStats>({
    totalStaff: 0,
    activeStaff: 0,
    clockedInNow: 0,
    hoursThisWeek: 0,
  });
  const [exceptions, setExceptions] = useState<ExceptionBreakdown>({
    total: 0,
    unresolved: 0,
    bySeverity: {},
  });
  const [timesheets, setTimesheets] = useState<TimesheetBreakdown>({});
  const [hoursSeries, setHoursSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const rangeStart = new Date(Date.now() - props.rangeDays * 86400000).toISOString();

    // Calculate this week's Monday
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const mondayISO = monday.toISOString();

    const [staffRes, clockedInRes, timeRes, timeRangeRes, exceptionsRes, timesheetsRes] = await Promise.all([
      supabase
        .from('staff')
        .select('id, staff_status')
        .is('archived_at', null),
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .is('archived_at', null),
      supabase
        .from('time_entries')
        .select('id, duration_minutes')
        .gte('start_at', mondayISO)
        .is('archived_at', null),
      supabase
        .from('time_entries')
        .select('start_at, duration_minutes')
        .gte('start_at', rangeStart)
        .is('archived_at', null),
      supabase
        .from('time_exceptions')
        .select('id, severity, resolved_at')
        .is('archived_at', null),
      supabase
        .from('timesheets')
        .select('id, status')
        .is('archived_at', null)
        .gte('created_at', rangeStart),
    ]);

    // Staff
    if (staffRes.data) {
      const active = staffRes.data.filter((s) => s.staff_status === 'ACTIVE').length;
      setStats((prev) => ({
        ...prev,
        totalStaff: staffRes.data!.length,
        activeStaff: active,
        clockedInNow: clockedInRes.count || 0,
      }));
    }

    // Time this week
    if (timeRes.data) {
      const totalMinutes = timeRes.data.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      setStats((prev) => ({
        ...prev,
        hoursThisWeek: Math.round((totalMinutes / 60) * 10) / 10,
      }));
    }

    // Exceptions
    if (exceptionsRes.data) {
      const bySeverity: Record<string, number> = {};
      let unresolved = 0;
      for (const e of exceptionsRes.data) {
        if (!e.resolved_at) {
          unresolved++;
          bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        }
      }
      setExceptions({ total: exceptionsRes.data.length, unresolved, bySeverity });
    }

    // Timesheets
    if (timesheetsRes.data) {
      const byStatus: TimesheetBreakdown = {};
      for (const t of timesheetsRes.data) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      }
      setTimesheets(byStatus);
    }

    if (timeRangeRes.data) {
      const minsByDay: Record<string, number> = {};
      for (const e of timeRangeRes.data) {
        const key = dateKey(new Date(e.start_at as string));
        minsByDay[key] = (minsByDay[key] || 0) + ((e.duration_minutes as number | null) || 0);
      }
      const labels = buildDailyLabels(Math.min(14, Math.max(7, props.rangeDays)));
      setHoursSeries(labels.map((d) => Math.round(((minsByDay[d.key] || 0) / 60) * 10) / 10));
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
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          tone="primary"
          label="Total Staff"
          value={stats.totalStaff}
          helper={`${stats.activeStaff} active`}
        />
        <MetricCard
          icon={<UserCheck className="h-5 w-5" />}
          tone="success"
          label="Clocked In Now"
          value={stats.clockedInNow}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          tone="accent"
          label="Hours This Week"
          value={stats.hoursThisWeek}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
          label="Open Exceptions"
          value={exceptions.unresolved}
          helper={`${exceptions.total} total`}
        />
        <MetricCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="primary"
          label={`Timesheets (${props.rangeDays}d)`}
          value={Object.values(timesheets).reduce((a, b) => a + b, 0)}
          helper={`${timesheets.SUBMITTED || 0} submitted`}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
          label="Approval Rate"
          value={
            (() => {
              const total = Object.values(timesheets).reduce((a, b) => a + b, 0);
              const approved = timesheets.APPROVED || 0;
              return total > 0 ? `${Math.round((approved / total) * 100)}%` : '\u2014';
            })()
          }
          helper="Approved / total"
        />
      </div>

      {/* Timesheets + Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Timesheets by Status"
          subtitle={`Status breakdown (last ${props.rangeDays} days)`}
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/workforce')}>
              View Workforce <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
            {Object.keys(timesheets).length === 0 ? (
              <p className="text-sm text-muted-foreground">No timesheets recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const total = Object.values(timesheets).reduce((a, b) => a + b, 0);
                  return Object.entries(timesheets).map(([status, count]) => (
                    <BreakdownRow
                      key={status}
                      left={<Badge color={TIMESHEET_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>}
                      right={count}
                      pct={total > 0 ? count / total : 0}
                    />
                  ));
                })()}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Hours Trend" subtitle={`Hours per day (last ${props.rangeDays} days)`}>
          {hoursSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entry activity in this range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[clamp(1rem,3vw,1.5rem)] font-semibold tabular-nums leading-tight [overflow-wrap:anywhere]">
                  {Math.round(hoursSeries.reduce((a, b) => a + b, 0) * 10) / 10}
                </p>
                <p className="text-xs text-muted-foreground">Total hours in range</p>
              </div>
              <MiniBars values={hoursSeries} ariaLabel="Hours per day" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Unresolved Exceptions" subtitle="Open exceptions grouped by severity.">
            {exceptions.unresolved === 0 ? (
              <p className="text-sm text-muted-foreground">No open exceptions. All clear!</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(exceptions.bySeverity)
                  .sort((a, b) => {
                    const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
                    return (order[a[0]] ?? 3) - (order[b[0]] ?? 3);
                  })
                  .map(([severity, count]) => (
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
