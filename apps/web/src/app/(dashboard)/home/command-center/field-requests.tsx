'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Biohazard,
  Camera,
  Clock3,
  Filter,
  FlaskConical,
  MessageCircleWarning,
  Package,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
} from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

type RequestPriority = 'asap' | 'high' | 'normal';
type WorkflowStatus = 'pending' | 'approved' | 'denied' | 'fulfilled';
type WorkflowAction = 'approved' | 'denied' | 'fulfilled';
type FieldRequestCategory =
  | 'supply'
  | 'equipment'
  | 'site-issue'
  | 'time-off'
  | 'bio-hazard'
  | 'photo-upload'
  | 'chemical-restock'
  | 'vacuum-bag'
  | 'other';

interface FieldRequestItem {
  id: string;
  category: FieldRequestCategory;
  title: string;
  site: string;
  submittedBy: string;
  priority: RequestPriority;
  status: WorkflowStatus;
  details: Record<string, unknown>;
  rawBody: Record<string, unknown>;
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

function getStatusTone(status: WorkflowStatus): 'blue' | 'yellow' | 'red' {
  if (status === 'approved') return 'blue';
  if (status === 'pending') return 'yellow';
  return 'red';
}

function getStatusLabel(status: WorkflowStatus) {
  if (status === 'approved') return 'Approved';
  if (status === 'denied') return 'Denied';
  if (status === 'fulfilled') return 'Fulfilled';
  return 'Pending';
}

function getCategoryLabel(category: FieldRequestCategory): string {
  if (category === 'time-off') return 'Time Off';
  if (category === 'site-issue') return 'Site Issue';
  if (category === 'bio-hazard') return 'Bio-Hazard';
  if (category === 'photo-upload') return 'Photo Upload';
  if (category === 'chemical-restock') return 'Chemical Restock';
  if (category === 'vacuum-bag') return 'Vacuum Bag';
  if (category === 'equipment') return 'Equipment';
  if (category === 'supply') return 'Supply';
  return 'Other';
}

function getCategoryIcon(category: FieldRequestCategory) {
  if (category === 'supply') return <Package className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'equipment') return <Wrench className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'site-issue') return <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'bio-hazard') return <Biohazard className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'photo-upload') return <Camera className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'chemical-restock') return <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />;
  if (category === 'vacuum-bag') return <Filter className="h-3.5 w-3.5" aria-hidden="true" />;
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

function normalizeStatus(value: unknown): WorkflowStatus {
  if (value === 'approved' || value === 'denied' || value === 'fulfilled' || value === 'pending') {
    return value;
  }
  return 'pending';
}

function normalizeCategory(value: unknown): FieldRequestCategory {
  const requestType = String(value ?? '').toLowerCase();
  if (requestType === 'supply') return 'supply';
  if (requestType === 'equipment') return 'equipment';
  if (requestType === 'site-issue') return 'site-issue';
  if (requestType === 'time-off') return 'time-off';
  if (requestType === 'bio-hazard') return 'bio-hazard';
  if (requestType === 'photo-upload') return 'photo-upload';
  if (requestType === 'chemical-restock') return 'chemical-restock';
  if (requestType === 'vacuum-bag') return 'vacuum-bag';
  return 'other';
}

function formatDetailLabel(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    const values = value.map((entry) => String(entry).trim()).filter(Boolean);
    return values.length ? values.join(', ') : '—';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function actionLabel(action: WorkflowAction): string {
  if (action === 'approved') return 'approved';
  if (action === 'denied') return 'denied';
  return 'fulfilled';
}

export function FieldRequests({ filter }: FieldRequestsProps) {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [allRequests, setAllRequests] = useState<FieldRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  const loadRequests = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('alerts')
      .select('id, title, body, severity')
      .eq('alert_type', 'FIELD_REQUEST')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setAllRequests([]);
      setLoading(false);
      return;
    }

    const mapped = (data as Array<{ id: string; title: string; body: string | null; severity: string | null }>)
      .map((row) => {
        const parsed = safeParse(row.body);
        const details = parsed.details && typeof parsed.details === 'object' && !Array.isArray(parsed.details)
          ? parsed.details as Record<string, unknown>
          : {};

        return {
          id: row.id,
          category: normalizeCategory(parsed.request_type),
          title: row.title,
          site: String(parsed.site_name ?? 'Unknown Site'),
          submittedBy: String(parsed.submitted_by ?? 'Field Staff'),
          priority: normalizePriority(parsed.urgency, row.severity),
          status: normalizeStatus(parsed.workflow_status),
          details,
          rawBody: parsed,
        };
      });

    setAllRequests(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const scopedRequests = useMemo(() => requestsForFilter(filter, allRequests), [allRequests, filter]);

  const typeOptions = useMemo(() => {
    const categories = Array.from(new Set(scopedRequests.map((request) => request.category)));
    return [
      { value: 'all', label: 'All Types' },
      ...categories.map((category) => ({ value: category, label: getCategoryLabel(category) })),
    ];
  }, [scopedRequests]);

  const siteOptions = useMemo(() => {
    const sites = Array.from(new Set(scopedRequests.map((request) => request.site))).sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Sites' },
      ...sites.map((site) => ({ value: site, label: site })),
    ];
  }, [scopedRequests]);

  const staffOptions = useMemo(() => {
    const staff = Array.from(new Set(scopedRequests.map((request) => request.submittedBy))).sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Staff' },
      ...staff.map((entry) => ({ value: entry, label: entry })),
    ];
  }, [scopedRequests]);

  const requests = useMemo(() => {
    return scopedRequests.filter((request) => {
      if (typeFilter !== 'all' && request.category !== typeFilter) return false;
      if (siteFilter !== 'all' && request.site !== siteFilter) return false;
      if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
      if (staffFilter !== 'all' && request.submittedBy !== staffFilter) return false;
      return true;
    });
  }, [priorityFilter, scopedRequests, siteFilter, staffFilter, typeFilter]);

  const asapCount = useMemo(
    () => requests.filter((request) => request.priority === 'asap').length,
    [requests],
  );

  const applyAction = useCallback(async (request: FieldRequestItem, action: WorkflowAction) => {
    const actionKey = `${request.id}:${action}`;
    setActionLoadingKey(actionKey);

    const now = new Date().toISOString();
    const updatedBody: Record<string, unknown> = {
      ...request.rawBody,
      workflow_status: action,
      workflow_updated_at: now,
      workflow_updated_by: user?.email ?? 'manager',
    };

    const updatePayload: {
      body: string;
      read_at: string;
      dismissed_at?: string;
    } = {
      body: JSON.stringify(updatedBody),
      read_at: now,
    };

    if (action === 'denied' || action === 'fulfilled') {
      updatePayload.dismissed_at = now;
    }

    const { error } = await supabase
      .from('alerts')
      .update(updatePayload)
      .eq('id', request.id)
      .is('dismissed_at', null);

    setActionLoadingKey(null);

    if (error) {
      toast.error(error.message || 'Unable to update request status.');
      return;
    }

    if (action === 'approved') {
      setAllRequests((prev) => prev.map((item) => (
        item.id === request.id
          ? { ...item, status: 'approved', rawBody: updatedBody }
          : item
      )));
    } else {
      setAllRequests((prev) => prev.filter((item) => item.id !== request.id));
      if (activeRequestId === request.id) {
        setActiveRequestId(null);
      }
    }

    toast.success(`Request ${actionLabel(action)}.`);
  }, [activeRequestId, supabase, user?.email]);

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
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            label="Type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            options={typeOptions}
          />
          <Select
            label="Site"
            value={siteFilter}
            onChange={(event) => setSiteFilter(event.target.value)}
            options={siteOptions}
          />
          <Select
            label="Urgency"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            options={[
              { value: 'all', label: 'All Urgency' },
              { value: 'asap', label: 'ASAP' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
            ]}
          />
          <Select
            label="Staff"
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
            options={staffOptions}
          />
        </div>

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
          requests.map((request) => {
            const isExpanded = activeRequestId === request.id;
            const detailEntries = Object.entries(request.details);

            return (
              <div key={request.id} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {getCategoryIcon(request.category)}
                    {request.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge color={getStatusTone(request.status)}>{getStatusLabel(request.status)}</Badge>
                    <Badge color={getPriorityTone(request.priority)}>{getPriorityLabel(request.priority)}</Badge>
                  </div>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">{request.site} · {request.submittedBy}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveRequestId((current) => (current === request.id ? null : request.id))}
                  >
                    {isExpanded ? 'Hide Review' : 'Review'}
                  </Button>
                </div>

                {isExpanded ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
                    {detailEntries.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {detailEntries.map(([key, value]) => (
                          <div key={key} className="rounded-md border border-border/70 bg-muted/40 px-2 py-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {formatDetailLabel(key)}
                            </p>
                            <p className="text-xs text-foreground">{formatDetailValue(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No structured details were provided for this request.</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {request.status !== 'approved' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={actionLoadingKey === `${request.id}:approved`}
                          onClick={() => void applyAction(request, 'approved')}
                        >
                          Approve
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="secondary"
                        loading={actionLoadingKey === `${request.id}:fulfilled`}
                        onClick={() => void applyAction(request, 'fulfilled')}
                      >
                        Mark Fulfilled
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        loading={actionLoadingKey === `${request.id}:denied`}
                        onClick={() => void applyAction(request, 'denied')}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {asapCount > 0 ? `${asapCount} ASAP request(s) need immediate action` : 'No ASAP requests right now'}
        </p>
      </CardContent>
    </Card>
  );
}
