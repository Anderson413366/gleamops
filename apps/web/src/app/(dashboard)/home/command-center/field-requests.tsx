'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, MessageCircleWarning, Package, ShieldAlert, Wrench } from 'lucide-react';
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

type RequestPriority = 'asap' | 'high' | 'normal';

interface FieldRequestItem {
  id: string;
  category: 'supply' | 'equipment' | 'site-issue' | 'time-off' | 'other';
  title: string;
  site: string;
  submittedBy: string;
  priority: RequestPriority;
}

interface FieldRequestsProps {
  filter: CommandCenterFilter;
}

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

function requestsForFilter(filter: CommandCenterFilter, requests: FieldRequestItem[]) {
  if (filter === 'regular-shifts') return [];
  if (filter === 'projects') {
    return requests.filter((request) => request.category !== 'time-off');
  }
  return requests;
}

function safeParse(body: string | null): Record<string, unknown> {
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function normalizePriority(urgency: unknown, severity: string | null): RequestPriority {
  if (urgency === 'asap' || urgency === 'high' || urgency === 'normal') {
    return urgency;
  }
  if (severity === 'CRITICAL') return 'asap';
  if (severity === 'WARNING') return 'high';
  return 'normal';
}

function normalizeCategory(value: unknown): FieldRequestItem['category'] {
  const requestType = String(value ?? '').toLowerCase();
  if (requestType === 'supply') return 'supply';
  if (requestType === 'equipment') return 'equipment';
  if (requestType === 'site-issue') return 'site-issue';
  if (requestType === 'time-off') return 'time-off';
  return 'other';
}

export function FieldRequests({ filter }: FieldRequestsProps) {
  const [allRequests, setAllRequests] = useState<FieldRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRequests() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, body, severity')
        .eq('alert_type', 'FIELD_REQUEST')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(12);

      if (cancelled) return;

      if (error || !data) {
        setAllRequests([]);
        setLoading(false);
        return;
      }

      const mapped = (data as Array<{ id: string; title: string; body: string | null; severity: string | null }>)
        .map((row) => {
          const parsed = safeParse(row.body);
          return {
            id: row.id,
            category: normalizeCategory(parsed.request_type),
            title: row.title,
            site: String(parsed.site_name ?? 'Unknown Site'),
            submittedBy: String(parsed.submitted_by ?? 'Field Staff'),
            priority: normalizePriority(parsed.urgency, row.severity),
          };
        });

      setAllRequests(mapped);
      setLoading(false);
    }

    void fetchRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const requests = useMemo(() => requestsForFilter(filter, allRequests), [allRequests, filter]);
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
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading field requests...
          </p>
        ) : null}

        {!loading && !requests.length ? (
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
