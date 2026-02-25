'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, ShieldAlert, UserMinus, UserX } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type CoverageAlert = {
  id: string;
  label: string;
  details: string;
  count: number;
  tone: 'green' | 'yellow' | 'red' | 'blue';
  icon: React.ReactNode;
};

interface TicketCoverageRow {
  id: string;
  required_staff_count: number | null;
  assignments: Array<{ assignment_status: string | null }> | null;
}

interface CoverageAlertsProps {
  date: string;
  filter: CommandCenterFilter;
}

function toStartOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function normalizeAlertsByFilter(filter: CommandCenterFilter, alerts: CoverageAlert[]) {
  if (filter === 'requests') {
    return alerts.map((alert) => {
      if (alert.id === 'open-shifts') {
        return { ...alert, count: Math.min(alert.count, 1) };
      }
      if (alert.id === 'call-outs') {
        return { ...alert, count: Math.min(alert.count, 1) };
      }
      return alert;
    });
  }

  return alerts;
}

export function CoverageAlerts({ date, filter }: CoverageAlertsProps) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<CoverageAlert[]>([
    {
      id: 'call-outs',
      label: 'Call-outs',
      details: 'Unplanned shift drop-offs for selected day',
      count: 0,
      tone: 'yellow',
      icon: <UserX className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'absences',
      label: 'Employees Off',
      details: 'Approved PTO or same-day absences',
      count: 0,
      tone: 'blue',
      icon: <UserMinus className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'medical-leave',
      label: 'Medical Leave',
      details: 'Approved PTO flagged as medical leave',
      count: 0,
      tone: 'blue',
      icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'open-shifts',
      label: 'Open Shifts',
      details: 'Coverage gaps that still need assignment',
      count: 0,
      tone: 'red',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCoverage() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      const [calloutsRes, absencesRes, medicalRes, ticketCoverageRes] = await Promise.all([
        supabase
          .from('ticket_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('assignment_status', 'RELEASED')
          .gte('released_at', toStartOfDayIso(date))
          .lte('released_at', toEndOfDayIso(date)),
        supabase
          .from('hr_pto_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'APPROVED')
          .lte('start_date', date)
          .gte('end_date', date),
        supabase
          .from('hr_pto_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'APPROVED')
          .lte('start_date', date)
          .gte('end_date', date)
          .or('reason.ilike.%medical%,reason.ilike.%doctor%,reason.ilike.%surgery%,reason.ilike.%injury%'),
        supabase
          .from('work_tickets')
          .select('id, required_staff_count, assignments:ticket_assignments(assignment_status)')
          .eq('scheduled_date', date)
          .is('archived_at', null),
      ]);

      if (cancelled) return;

      const openShiftCount = ((ticketCoverageRes.data ?? []) as unknown as TicketCoverageRow[]).reduce((total, row) => {
        const required = Math.max(1, row.required_staff_count ?? 1);
        const assigned = (row.assignments ?? []).filter((assignment) => assignment.assignment_status === 'ASSIGNED').length;
        const remaining = Math.max(required - assigned, 0);
        return total + remaining;
      }, 0);

      setAlerts([
        {
          id: 'call-outs',
          label: 'Call-outs',
          details: 'Unplanned shift drop-offs for selected day',
          count: calloutsRes.count ?? 0,
          tone: 'yellow',
          icon: <UserX className="h-4 w-4" aria-hidden="true" />,
        },
        {
          id: 'absences',
          label: 'Employees Off',
          details: 'Approved PTO or same-day absences',
          count: absencesRes.count ?? 0,
          tone: 'blue',
          icon: <UserMinus className="h-4 w-4" aria-hidden="true" />,
        },
        {
          id: 'medical-leave',
          label: 'Medical Leave',
          details: 'Approved PTO flagged as medical leave',
          count: medicalRes.count ?? 0,
          tone: 'blue',
          icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
        },
        {
          id: 'open-shifts',
          label: 'Open Shifts',
          details: 'Coverage gaps that still need assignment',
          count: openShiftCount,
          tone: 'red',
          icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
        },
      ]);
      setLoading(false);
    }

    void loadCoverage();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const filteredAlerts = useMemo(() => normalizeAlertsByFilter(filter, alerts), [alerts, filter]);
  const activeCount = useMemo(
    () => filteredAlerts.reduce((sum, alert) => sum + (alert.count > 0 ? 1 : 0), 0),
    [filteredAlerts],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Alerts & Coverage
        </CardTitle>
        <CardDescription>Call-outs, absences, medical leave, and open shifts</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading coverage alerts...</p>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {alert.icon}
                  {alert.label}
                </p>
                <Badge color={alert.tone}>{alert.count}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{alert.details}</p>
            </div>
          ))
        )}

        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {activeCount} alert groups require attention now
        </p>
      </CardContent>
    </Card>
  );
}
