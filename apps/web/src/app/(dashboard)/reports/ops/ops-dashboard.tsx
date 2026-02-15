'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';
import { TICKET_STATUS_COLORS, EXCEPTION_SEVERITY_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow } from '../_components/report-components';

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

export default function OpsDashboard() {
  const [ticketStats, setTicketStats] = useState<TicketStats>({ total: 0, byStatus: {} });
  const [exceptionSummary, setExceptionSummary] = useState<ExceptionSummary>({ total: 0, unresolved: 0, bySeverity: {} });
  const [timeStats, setTimeStats] = useState<TimeStats>({ totalEntriesToday: 0, openEntries: 0, totalHoursToday: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const today = new Date().toISOString().slice(0, 10);

    const [ticketsRes, exceptionsRes, timeRes, openTimeRes] = await Promise.all([
      // Today's tickets (use range to handle timestamp/date format differences)
      supabase
        .from('work_tickets')
        .select('id, status')
        .gte('scheduled_date', today)
        .lt('scheduled_date', new Date(Date.now() + 86400000).toISOString().slice(0, 10))
        .is('archived_at', null),
      // Unresolved exceptions
      supabase
        .from('time_exceptions')
        .select('id, severity, resolved_at')
        .is('archived_at', null),
      // Today's time entries (with timezone Z suffix)
      supabase
        .from('time_entries')
        .select('id, duration_minutes, status')
        .gte('start_at', `${today}T00:00:00Z`)
        .lte('start_at', `${today}T23:59:59Z`)
        .is('archived_at', null),
      // Open time entries (currently clocked in)
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .is('archived_at', null),
    ]);

    // Process ticket stats
    if (ticketsRes.data) {
      const byStatus: Record<string, number> = {};
      for (const t of ticketsRes.data) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      }
      setTicketStats({ total: ticketsRes.data.length, byStatus });
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
    if (timeRes.data) {
      const totalMinutes = timeRes.data.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      setTimeStats({
        totalEntriesToday: timeRes.data.length,
        openEntries: openTimeRes.count || 0,
        totalHoursToday: Math.round((totalMinutes / 60) * 10) / 10,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Ticket Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exception Inbox</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
