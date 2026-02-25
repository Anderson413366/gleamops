'use client';

import { useMemo } from 'react';
import { Clock3, MessageCircleWarning, Package, ShieldAlert, Wrench } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type RequestPriority = 'asap' | 'high' | 'normal';

interface FieldRequestItem {
  id: string;
  category: 'supply' | 'equipment' | 'site-issue' | 'time-off';
  title: string;
  site: string;
  submittedBy: string;
  priority: RequestPriority;
}

interface FieldRequestsProps {
  filter: CommandCenterFilter;
}

const REQUESTS: FieldRequestItem[] = [
  {
    id: 'fr-1',
    category: 'supply',
    title: 'Restroom paper restock request',
    site: 'Pine Medical',
    submittedBy: 'Team Delta',
    priority: 'high',
  },
  {
    id: 'fr-2',
    category: 'site-issue',
    title: 'Lobby spill hazard report',
    site: 'Midtown Plaza',
    submittedBy: 'Night Lead - Maria L.',
    priority: 'asap',
  },
  {
    id: 'fr-3',
    category: 'equipment',
    title: 'Vacuum belt replacement needed',
    site: 'Downtown Tower',
    submittedBy: 'Jose R.',
    priority: 'normal',
  },
  {
    id: 'fr-4',
    category: 'time-off',
    title: 'Same-day PTO request',
    site: 'Site 018',
    submittedBy: 'Daniel G.',
    priority: 'high',
  },
];

function getPriorityTone(priority: RequestPriority): 'red' | 'yellow' | 'blue' {
  if (priority === 'asap') return 'red';
  if (priority === 'high') return 'yellow';
  return 'blue';
}

function getPriorityLabel(priority: RequestPriority) {
  if (priority === 'asap') return 'ASAP';
  if (priority === 'high') return 'High';
  return 'Normal';
}

function getCategoryIcon(category: FieldRequestItem['category']) {
  if (category === 'supply') return <Package className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'equipment') return <Wrench className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'site-issue') return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />;
}

function requestsForFilter(filter: CommandCenterFilter) {
  if (filter === 'regular-shifts') return [];
  if (filter === 'projects') {
    return REQUESTS.filter((request) => request.category !== 'time-off');
  }
  return REQUESTS;
}

export function FieldRequests({ filter }: FieldRequestsProps) {
  const requests = useMemo(() => requestsForFilter(filter), [filter]);
  const asapCount = useMemo(
    () => requests.filter((request) => request.priority === 'asap').length,
    [requests],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircleWarning className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Field Requests
          <Badge color={asapCount > 0 ? 'red' : 'blue'}>{requests.length}</Badge>
        </CardTitle>
        <CardDescription>Pending specialist requests and escalations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!requests.length ? (
          <p className="text-sm text-muted-foreground">
            No field requests for this filter. Specialist submissions will appear here.
          </p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {getCategoryIcon(request.category)}
                  {request.title}
                </p>
                <Badge color={getPriorityTone(request.priority)}>{getPriorityLabel(request.priority)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{request.site} · {request.submittedBy}</p>
            </div>
          ))
        )}

        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {asapCount > 0 ? `${asapCount} ASAP request(s) need immediate action` : 'No ASAP requests right now'}
        </p>
      </CardContent>
    </Card>
  );
}
