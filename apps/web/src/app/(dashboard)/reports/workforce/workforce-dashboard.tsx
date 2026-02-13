'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';
import { EXCEPTION_SEVERITY_COLORS, TIMESHEET_STATUS_COLORS } from '@gleamops/shared';

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

export default function WorkforceDashboard() {
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Calculate this week's Monday
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const mondayISO = monday.toISOString();

    const [staffRes, clockedInRes, timeRes, exceptionsRes, timesheetsRes] = await Promise.all([
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
        .from('time_exceptions')
        .select('id, severity, resolved_at')
        .is('archived_at', null),
      supabase
        .from('timesheets')
        .select('id, status')
        .is('archived_at', null),
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{stats.totalStaff}</p>
                <p className="text-xs text-muted-foreground">{stats.activeStaff} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clocked In Now</p>
                <p className="text-2xl font-bold">{stats.clockedInNow}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hours This Week</p>
                <p className="text-2xl font-bold">{stats.hoursThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Open Exceptions</p>
                <p className="text-2xl font-bold">{exceptions.unresolved}</p>
                <p className="text-xs text-muted-foreground">{exceptions.total} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheets + Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Timesheets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(timesheets).length === 0 ? (
              <p className="text-sm text-muted-foreground">No timesheets recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(timesheets).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge color={TIMESHEET_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>
                    <div className="flex items-center gap-2 flex-1 mx-4">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{
                            width: `${Object.values(timesheets).reduce((a, b) => a + b, 0) > 0
                              ? (count / Object.values(timesheets).reduce((a, b) => a + b, 0)) * 100
                              : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unresolved Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
