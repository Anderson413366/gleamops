'use client';

import { useMemo } from 'react';
import { AlertTriangle, Clock3, ShieldAlert, UserMinus, UserX } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type CoverageAlert = {
  id: string;
  label: string;
  details: string;
  count: number;
  tone: 'green' | 'yellow' | 'red' | 'blue';
  icon: React.ReactNode;
};

interface CoverageAlertsProps {
  filter: CommandCenterFilter;
}

const BASE_ALERTS: CoverageAlert[] = [
  {
    id: 'call-outs',
    label: 'Call-outs',
    details: 'Unplanned shift drop-offs in the last 24h',
    count: 2,
    tone: 'yellow',
    icon: <UserX className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'absences',
    label: 'Employees Off',
    details: 'Approved PTO or same-day absences',
    count: 2,
    tone: 'blue',
    icon: <UserMinus className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'medical-leave',
    label: 'Medical Leave',
    details: 'Longer leave requiring route substitution',
    count: 1,
    tone: 'blue',
    icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'open-shifts',
    label: 'Open Shifts',
    details: 'Coverage gaps that still need assignment',
    count: 4,
    tone: 'red',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
];

function adjustedAlerts(filter: CommandCenterFilter): CoverageAlert[] {
  if (filter === 'projects') {
    return BASE_ALERTS.map((alert) => {
      if (alert.id === 'open-shifts') return { ...alert, count: 2 };
      if (alert.id === 'call-outs') return { ...alert, count: 1 };
      return alert;
    });
  }

  if (filter === 'requests') {
    return BASE_ALERTS.map((alert) => {
      if (alert.id === 'open-shifts') return { ...alert, count: 1 };
      if (alert.id === 'call-outs') return { ...alert, count: 0 };
      return alert;
    });
  }

  return BASE_ALERTS;
}

export function CoverageAlerts({ filter }: CoverageAlertsProps) {
  const alerts = useMemo(() => adjustedAlerts(filter), [filter]);
  const activeCount = useMemo(
    () => alerts.reduce((sum, alert) => sum + (alert.count > 0 ? 1 : 0), 0),
    [alerts],
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
        {alerts.map((alert) => (
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
        ))}

        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {activeCount} alert groups require attention now
        </p>
      </CardContent>
    </Card>
  );
}
