'use client';

import { useMemo } from 'react';
import { ClipboardList, Clock3, MapPin, UserCircle2 } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type TaskKind = 'regular-shifts' | 'projects' | 'requests';

interface TodayTask {
  id: string;
  title: string;
  kind: TaskKind;
  site: string;
  window: string;
  staff: string;
  status: 'assigned' | 'open' | 'urgent';
}

const TASKS: TodayTask[] = [
  {
    id: 'task-1',
    title: 'Opening crew coverage check',
    kind: 'regular-shifts',
    site: 'Pine Medical',
    window: '5:00 PM - 7:30 PM',
    staff: 'Team Delta',
    status: 'assigned',
  },
  {
    id: 'task-2',
    title: 'Window touch-up project dispatch',
    kind: 'projects',
    site: 'Midtown Plaza',
    window: '8:00 PM - 10:00 PM',
    staff: 'Unassigned',
    status: 'open',
  },
  {
    id: 'task-3',
    title: 'Urgent restroom restock escalation',
    kind: 'requests',
    site: 'Site 018',
    window: 'ASAP',
    staff: 'Supervisor review',
    status: 'urgent',
  },
  {
    id: 'task-4',
    title: 'Close-out verification',
    kind: 'regular-shifts',
    site: 'Downtown Tower',
    window: '11:30 PM - 12:30 AM',
    staff: 'Night Lead - Maria L.',
    status: 'assigned',
  },
];

function getStatusTone(status: TodayTask['status']): 'green' | 'yellow' | 'red' {
  if (status === 'urgent') return 'red';
  if (status === 'open') return 'yellow';
  return 'green';
}

function getStatusLabel(status: TodayTask['status']) {
  if (status === 'urgent') return 'Urgent';
  if (status === 'open') return 'Open Shift';
  return 'Assigned';
}

interface TodaysTasksProps {
  date: string;
  filter: CommandCenterFilter;
}

export function TodaysTasks({ date, filter }: TodaysTasksProps) {
  const tasks = useMemo(() => {
    if (filter === 'all') {
      return TASKS;
    }
    return TASKS.filter((task) => task.kind === filter);
  }, [filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Today&apos;s Tasks
        </CardTitle>
        <CardDescription>Assignments and priorities for {date}</CardDescription>
      </CardHeader>

      <CardContent>
        {!tasks.length ? (
          <p className="text-sm text-muted-foreground">No tasks in this filter yet. Upcoming tasks appear here once scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="space-y-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <Badge color={getStatusTone(task.status)}>{getStatusLabel(task.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.site}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.window}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {task.staff}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
