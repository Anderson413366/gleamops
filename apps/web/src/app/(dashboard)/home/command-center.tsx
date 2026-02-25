'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Clock3,
  MessageCircleWarning,
  Plus,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChipTabs,
} from '@gleamops/ui';
import { TodaysTasks } from './command-center/todays-tasks';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: <CalendarDays className="h-4 w-4" /> },
  { key: 'regular-shifts', label: 'Regular Shifts', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'projects', label: 'Projects', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'requests', label: 'Requests', icon: <MessageCircleWarning className="h-4 w-4" /> },
] as const;

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().split('T')[0];
}

interface PlaceholderListProps {
  items: string[];
  emptyLabel: string;
}

function PlaceholderList({ items, emptyLabel }: PlaceholderListProps) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function CommandCenter() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [activeFilter, setActiveFilter] = useState<CommandCenterFilter>('all');

  const filterDescription = useMemo(() => {
    switch (activeFilter) {
      case 'regular-shifts':
        return 'Showing recurring schedule coverage and staffing only.';
      case 'projects':
        return 'Showing project work orders planned for this week.';
      case 'requests':
        return 'Showing field requests and urgent specialist forms.';
      default:
        return 'Showing all shifts, projects, and field requests.';
    }
  }, [activeFilter]);

  const weeklyProjectItems = useMemo(() => {
    if (activeFilter === 'regular-shifts') {
      return [];
    }
    return [
      'Strip and wax - Horizon Mall (Thu)',
      'Post-construction cleanup - 9th Ave Clinic (Fri)',
      'Lobby deep-clean - Atlas Financial (Sat)',
    ];
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Planning Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time command center for staffing, coverage, and field coordination.</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Select command center date"
          />
        </label>
      </div>

      <div className="space-y-2">
        <ChipTabs
          tabs={FILTER_TABS as unknown as Array<{ key: string; label: string; icon?: React.ReactNode }>}
          active={activeFilter}
          onChange={(next) => setActiveFilter(next as CommandCenterFilter)}
        />
        <p className="text-sm text-muted-foreground">{filterDescription}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysTasks date={selectedDate} filter={activeFilter} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
              Alerts & Coverage
            </CardTitle>
            <CardDescription>Call-outs, absences, and open shift coverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">Open shifts needing coverage: 4</div>
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">Call-outs in last 24 hours: 2</div>
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">Medical leave cases active: 1</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4 text-module-accent" aria-hidden="true" />
              This Week&apos;s Projects
            </CardTitle>
            <CardDescription>Work orders and project cleaning commitments</CardDescription>
          </CardHeader>
          <CardContent>
            <PlaceholderList
              items={weeklyProjectItems}
              emptyLabel="No projects for this filter. Project work orders will appear here."
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-module-accent" aria-hidden="true" />
                Quick Actions
              </CardTitle>
              <CardDescription>Run high-frequency manager workflows</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="justify-start">+ New Task</Button>
              <Button type="button" variant="secondary" className="justify-start">+ Work Order</Button>
              <Button type="button" variant="secondary" className="justify-start">View Schedule</Button>
              <Button type="button" variant="secondary" className="justify-start">Messages</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-module-accent" aria-hidden="true" />
                Field Requests
              </CardTitle>
              <CardDescription>Pending specialist requests and escalations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">Supply requests pending: 3</div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">ASAP service requests: 1</div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">Awaiting supervisor review: 2</div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Last refreshed moments ago
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
