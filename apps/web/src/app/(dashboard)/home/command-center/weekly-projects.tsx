'use client';

import { useMemo } from 'react';
import { BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type ProjectStatus = 'scheduled' | 'staffing-needed' | 'in-progress';

interface WeeklyProjectItem {
  id: string;
  title: string;
  site: string;
  window: string;
  crew: string;
  status: ProjectStatus;
}

interface WeeklyProjectsProps {
  filter: CommandCenterFilter;
}

const PROJECTS: WeeklyProjectItem[] = [
  {
    id: 'wp-1',
    title: 'Strip and wax',
    site: 'Horizon Mall',
    window: 'Thu · 9:00 PM - 2:00 AM',
    crew: 'Team Delta',
    status: 'scheduled',
  },
  {
    id: 'wp-2',
    title: 'Post-construction cleanup',
    site: '9th Ave Clinic',
    window: 'Fri · 6:30 PM - 12:30 AM',
    crew: 'Unassigned lead',
    status: 'staffing-needed',
  },
  {
    id: 'wp-3',
    title: 'Lobby deep-clean',
    site: 'Atlas Financial',
    window: 'Sat · 8:00 PM - 11:30 PM',
    crew: 'Supervisor route team',
    status: 'in-progress',
  },
];

function projectsForFilter(filter: CommandCenterFilter) {
  if (filter === 'regular-shifts') return [];
  if (filter === 'requests') return PROJECTS.filter((project) => project.status === 'staffing-needed');
  return PROJECTS;
}

function statusTone(status: ProjectStatus): 'blue' | 'yellow' | 'green' {
  if (status === 'staffing-needed') return 'yellow';
  if (status === 'in-progress') return 'green';
  return 'blue';
}

function statusLabel(status: ProjectStatus) {
  if (status === 'staffing-needed') return 'Staffing Needed';
  if (status === 'in-progress') return 'In Progress';
  return 'Scheduled';
}

export function WeeklyProjects({ filter }: WeeklyProjectsProps) {
  const projects = useMemo(() => projectsForFilter(filter), [filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="h-4 w-4 text-module-accent" aria-hidden="true" />
          This Week&apos;s Projects
        </CardTitle>
        <CardDescription>Work orders and project cleaning commitments</CardDescription>
      </CardHeader>
      <CardContent>
        {!projects.length ? (
          <p className="text-sm text-muted-foreground">
            No projects for this filter. Project work orders will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id} className="space-y-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{project.title}</p>
                  <Badge color={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.site}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.window}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.crew}
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
