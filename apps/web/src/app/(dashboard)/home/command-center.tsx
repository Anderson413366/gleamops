'use client';

import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  MessageCircleWarning,
} from 'lucide-react';
import { ChipTabs } from '@gleamops/ui';
import { CoverageAlerts } from './command-center/coverage-alerts';
import { FieldRequests } from './command-center/field-requests';
import { QuickActions } from './command-center/quick-actions';
import { TodaysTasks } from './command-center/todays-tasks';
import { WeeklyProjects } from './command-center/weekly-projects';

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
        <WeeklyProjects filter={activeFilter} />

        <div className="grid gap-4">
          <QuickActions />

          <FieldRequests filter={activeFilter} />
        </div>
      </div>
    </div>
  );
}
