'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, ClipboardCheck, ClipboardList, Moon } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { OwnerDashboardSnapshot } from '@gleamops/shared';

interface DailySnapshotProps {
  snapshot: OwnerDashboardSnapshot | null;
  loading?: boolean;
}

function SnapshotCard(props: {
  title: string;
  value: number;
  icon: ReactNode;
  href?: string;
  helper?: ReactNode;
}) {
  const content = (
    <Card className="h-full transition-all duration-200 ease-in-out hover:border-primary/40">
      <CardContent className="pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{props.title}</p>
          {props.icon}
        </div>
        <p className="text-2xl font-semibold leading-tight">{props.value}</p>
        {props.helper ? <div className="mt-2">{props.helper}</div> : null}
      </CardContent>
    </Card>
  );

  if (!props.href) return content;
  return (
    <Link href={props.href} className="block">
      {content}
    </Link>
  );
}

export function DailySnapshot({ snapshot, loading = false }: DailySnapshotProps) {
  const data = snapshot ?? {
    pending_day_off_requests: 0,
    tonight_routes: 0,
    overdue_periodic_tasks: 0,
    unreviewed_night_bridge: 0,
    open_complaints: { total: 0, high_or_urgent: 0 },
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Daily Snapshot</CardTitle>
        <p className="text-sm text-muted-foreground">What is pending right now across operations.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SnapshotCard
            title="Pending Day-Off Requests"
            value={loading ? 0 : data.pending_day_off_requests}
            icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
            href="/team?tab=field-reports"
          />
          <SnapshotCard
            title="Tonight Routes"
            value={loading ? 0 : data.tonight_routes}
            icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
            href="/operations?tab=routes"
          />
          <SnapshotCard
            title="Overdue Periodic Tasks"
            value={loading ? 0 : data.overdue_periodic_tasks}
            icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
            href="/operations?tab=periodic"
          />
          <SnapshotCard
            title="Unreviewed Night Bridge"
            value={loading ? 0 : data.unreviewed_night_bridge}
            icon={<Moon className="h-4 w-4 text-muted-foreground" />}
            href="/operations?tab=night-bridge"
          />
          <SnapshotCard
            title="Open Complaints"
            value={loading ? 0 : data.open_complaints.total}
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            href="/operations?tab=complaints"
            helper={(
              <Badge color={data.open_complaints.high_or_urgent > 0 ? 'red' : 'gray'}>
                High/Urgent: {loading ? 0 : data.open_complaints.high_or_urgent}
              </Badge>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
