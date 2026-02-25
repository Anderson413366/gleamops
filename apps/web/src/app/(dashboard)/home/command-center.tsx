'use client';

import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  MessageCircleWarning,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChipTabs,
} from '@gleamops/ui';
import { CoverageAlerts } from './command-center/coverage-alerts';
import { FieldRequests } from './command-center/field-requests';
import { QuickActions } from './command-center/quick-actions';
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
        <CoverageAlerts filter={activeFilter} />
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
          <QuickActions />

          <FieldRequests filter={activeFilter} />
        </div>
      </div>
    </div>
  );
}
