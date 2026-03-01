'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  FileText,
  History,
} from 'lucide-react';
import { Badge, Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ActivityFilter = 'all' | 'changes' | 'tickets' | 'inspections' | 'notes';
type ActivityType = Exclude<ActivityFilter, 'all'>;

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  occurredAt: string;
  badge?: {
    label: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple';
  };
}

interface TicketScope {
  siteIds?: string[];
  jobIds?: string[];
  staffId?: string;
}

interface InspectionScope {
  siteIds?: string[];
  jobIds?: string[];
  staffId?: string;
}

interface ActivityHistorySectionProps {
  entityType: string;
  entityId: string;
  entityCode?: string | null;
  notes?: string | null;
  entityUpdatedAt?: string | null;
  ticketScope?: TicketScope;
  inspectionScope?: InspectionScope;
  ticketLimit?: number;
}

interface AuditRow {
  id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_user_id: string | null;
  created_at: string;
}

interface TicketRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  status: string;
}

interface InspectionRow {
  id: string;
  inspection_code: string;
  status: string;
  score_pct: number | null;
  completed_at: string | null;
  started_at: string | null;
  created_at: string;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadgeColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple' {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETED' || normalized === 'VERIFIED' || normalized === 'ACTIVE' || normalized === 'RECEIVED') return 'green';
  if (normalized === 'IN_PROGRESS' || normalized === 'SHIPPED' || normalized === 'ORDERED' || normalized === 'ON_HOLD') return 'yellow';
  if (normalized === 'CANCELED' || normalized === 'CANCELLED' || normalized === 'EXPIRED' || normalized === 'INACTIVE') return 'red';
  if (normalized === 'SCHEDULED' || normalized === 'SUBMITTED') return 'blue';
  if (normalized === 'DRAFT') return 'gray';
  return 'gray';
}

function toLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayValue(key: string, value: unknown): string {
  if (value == null) return 'empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (/(amount|price|cost|rate|revenue|limit|total)/i.test(key)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    }
    return String(value);
  }
  if (typeof value === 'string') {
    const maybeDate = new Date(value);
    if (!Number.isNaN(maybeDate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return maybeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return value.length > 60 ? `${value.slice(0, 57)}...` : value;
  }
  return '[complex value]';
}

function summarizeAuditEvent(event: AuditRow, actorName: string): { title: string; detail?: string; changedKey?: string } {
  const action = (event.action ?? '').toUpperCase();
  const before = event.before ?? {};
  const after = event.after ?? {};

  if (action === 'UPDATE') {
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const changedKey = allKeys.find((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (changedKey) {
      const beforeText = displayValue(changedKey, before[changedKey]);
      const afterText = displayValue(changedKey, after[changedKey]);
      return {
        title: `${actorName} updated ${toLabel(changedKey)} from ${beforeText} to ${afterText}`,
        detail: `Change recorded ${formatDateTime(event.created_at)}`,
        changedKey,
      };
    }
    return {
      title: `${actorName} updated this record`,
      detail: `Change recorded ${formatDateTime(event.created_at)}`,
    };
  }

  if (action === 'INSERT' || action === 'CREATE') {
    return {
      title: `${actorName} created this record`,
      detail: `Created on ${formatDateTime(event.created_at)}`,
    };
  }

  if (action === 'DELETE' || action === 'ARCHIVE') {
    return {
      title: `${actorName} archived this record`,
      detail: `Archived on ${formatDateTime(event.created_at)}`,
    };
  }

  return {
    title: `${actorName} performed ${action.toLowerCase() || 'an update'} on this record`,
    detail: `Recorded ${formatDateTime(event.created_at)}`,
  };
}

export function ActivityHistorySection({
  entityType,
  entityId,
  entityCode,
  notes,
  entityUpdatedAt,
  ticketScope,
  inspectionScope,
  ticketLimit = 5,
}: ActivityHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ticketSiteIdsKey = ticketScope?.siteIds?.join(',') ?? '';
  const ticketJobIdsKey = ticketScope?.jobIds?.join(',') ?? '';
  const ticketStaffId = ticketScope?.staffId ?? '';
  const inspectionSiteIdsKey = inspectionScope?.siteIds?.join(',') ?? '';
  const inspectionJobIdsKey = inspectionScope?.jobIds?.join(',') ?? '';
  const inspectionStaffId = inspectionScope?.staffId ?? '';
  const ticketSiteIds = useMemo(() => (ticketSiteIdsKey ? ticketSiteIdsKey.split(',') : []), [ticketSiteIdsKey]);
  const ticketJobIds = useMemo(() => (ticketJobIdsKey ? ticketJobIdsKey.split(',') : []), [ticketJobIdsKey]);
  const inspectionSiteIds = useMemo(
    () => (inspectionSiteIdsKey ? inspectionSiteIdsKey.split(',') : []),
    [inspectionSiteIdsKey]
  );
  const inspectionJobIds = useMemo(
    () => (inspectionJobIdsKey ? inspectionJobIdsKey.split(',') : []),
    [inspectionJobIdsKey]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();

      const { data: auditData, error: auditError } = await supabase
        .from('audit_events')
        .select('id, action, before, after, actor_user_id, created_at')
        .eq('entity_id', entityId)
        .in('entity_type', [entityType, entityType.toLowerCase(), entityType.toUpperCase()])
        .order('created_at', { ascending: false })
        .limit(30);

      if (auditError) {
        setError(auditError.message);
      }

      const audits = ((auditData ?? []) as AuditRow[]);
      const actorIds = Array.from(new Set(audits.map((row) => row.actor_user_id).filter(Boolean))) as string[];
      const actorMap = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: staffRows } = await supabase
          .from('staff')
          .select('user_id, full_name')
          .in('user_id', actorIds)
          .is('archived_at', null);
        for (const row of (staffRows ?? []) as Array<{ user_id: string; full_name: string }>) {
          actorMap.set(row.user_id, row.full_name);
        }
      }

      const changeItems: ActivityItem[] = audits.map((event) => {
        const actorName = actorMap.get(event.actor_user_id ?? '') ?? 'Someone';
        const summary = summarizeAuditEvent(event, actorName);
        return {
          id: `chg-${event.id}`,
          type: 'changes',
          title: summary.title,
          detail: summary.detail,
          occurredAt: event.created_at,
        };
      });

      let noteItems: ActivityItem[] = [];
      const noteChangeItems = audits
        .map((event) => {
          const actorName = actorMap.get(event.actor_user_id ?? '') ?? 'Someone';
          const summary = summarizeAuditEvent(event, actorName);
          if (!summary.changedKey || !summary.changedKey.toLowerCase().includes('note')) return null;
          return {
            id: `note-${event.id}`,
            type: 'notes' as const,
            title: summary.title,
            detail: summary.detail,
            occurredAt: event.created_at,
          };
        })
        .filter(Boolean) as ActivityItem[];
      noteItems = noteChangeItems;
      if (noteItems.length === 0 && notes && notes.trim()) {
        noteItems = [{
          id: `note-current-${entityId}`,
          type: 'notes',
          title: `Notes on ${entityCode ?? 'record'} updated`,
          detail: notes.length > 180 ? `${notes.slice(0, 177)}...` : notes,
          occurredAt: entityUpdatedAt ?? new Date().toISOString(),
        }];
      }

      let tickets: TicketRow[] = [];
      if (ticketStaffId) {
        const { data: assignmentRows } = await supabase
          .from('ticket_assignments')
          .select('ticket:work_tickets!ticket_assignments_ticket_id_fkey(id, ticket_code, scheduled_date, status)')
          .eq('staff_id', ticketStaffId)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(ticketLimit);
        tickets = ((assignmentRows ?? []) as Array<{ ticket?: TicketRow | TicketRow[] | null }>)
          .map((row) => Array.isArray(row.ticket) ? row.ticket[0] : row.ticket)
          .filter(Boolean) as TicketRow[];
      } else if (ticketSiteIds.length) {
        const { data } = await supabase
          .from('work_tickets')
          .select('id, ticket_code, scheduled_date, status')
          .in('site_id', ticketSiteIds)
          .is('archived_at', null)
          .order('scheduled_date', { ascending: false })
          .limit(ticketLimit);
        tickets = (data ?? []) as TicketRow[];
      } else if (ticketJobIds.length) {
        const { data } = await supabase
          .from('work_tickets')
          .select('id, ticket_code, scheduled_date, status')
          .in('job_id', ticketJobIds)
          .is('archived_at', null)
          .order('scheduled_date', { ascending: false })
          .limit(ticketLimit);
        tickets = (data ?? []) as TicketRow[];
      }

      const ticketItems: ActivityItem[] = tickets.map((ticket) => ({
        id: `ticket-${ticket.id}`,
        type: 'tickets',
        title: `Work ticket #${ticket.ticket_code} ${toLabel(ticket.status).toLowerCase()}`,
        detail: `Scheduled ${formatDateTime(ticket.scheduled_date)}`,
        occurredAt: ticket.scheduled_date,
        badge: {
          label: toLabel(ticket.status),
          color: statusBadgeColor(ticket.status),
        },
      }));

      let inspections: InspectionRow[] = [];
      if (inspectionStaffId) {
        const { data } = await supabase
          .from('inspections')
          .select('id, inspection_code, status, score_pct, completed_at, started_at, created_at')
          .eq('inspector_id', inspectionStaffId)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(10);
        inspections = (data ?? []) as InspectionRow[];
      } else if (inspectionSiteIds.length) {
        const { data } = await supabase
          .from('inspections')
          .select('id, inspection_code, status, score_pct, completed_at, started_at, created_at')
          .in('site_id', inspectionSiteIds)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(10);
        inspections = (data ?? []) as InspectionRow[];
      } else if (inspectionJobIds.length) {
        const { data: jobTicketRows } = await supabase
          .from('work_tickets')
          .select('id')
          .in('job_id', inspectionJobIds)
          .is('archived_at', null)
          .limit(25);
        const ticketIds = (jobTicketRows ?? []).map((row: { id: string }) => row.id);
        if (ticketIds.length > 0) {
          const { data } = await supabase
            .from('inspections')
            .select('id, inspection_code, status, score_pct, completed_at, started_at, created_at')
            .in('ticket_id', ticketIds)
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(10);
          inspections = (data ?? []) as InspectionRow[];
        }
      }

      const inspectionItems: ActivityItem[] = inspections.map((inspection) => {
        const scored = inspection.score_pct != null ? `${Math.round(inspection.score_pct)}%` : 'N/A';
        return {
          id: `inspection-${inspection.id}`,
          type: 'inspections',
          title: `Inspection score: ${scored}`,
          detail: `${inspection.inspection_code || 'Inspection'} ${toLabel(inspection.status).toLowerCase()}`,
          occurredAt: inspection.completed_at ?? inspection.started_at ?? inspection.created_at,
          badge: {
            label: toLabel(inspection.status),
            color: statusBadgeColor(inspection.status),
          },
        };
      });

      const allItems = [...changeItems, ...ticketItems, ...inspectionItems, ...noteItems]
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      if (!cancelled) {
        setItems(allItems);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    entityId,
    entityType,
    entityCode,
    notes,
    entityUpdatedAt,
    ticketLimit,
    ticketSiteIds,
    ticketJobIds,
    ticketSiteIdsKey,
    ticketJobIdsKey,
    ticketStaffId,
    inspectionSiteIds,
    inspectionJobIds,
    inspectionSiteIdsKey,
    inspectionJobIdsKey,
    inspectionStaffId,
  ]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  const tabClass = (tab: ActivityFilter) => [
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    activeFilter === tab
      ? 'bg-module-accent text-module-accent-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted/80',
  ].join(' ');

  const iconForType = (type: ActivityType) => {
    if (type === 'changes') return <History className="h-4 w-4" />;
    if (type === 'tickets') return <ClipboardList className="h-4 w-4" />;
    if (type === 'inspections') return <ClipboardCheck className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (!open) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Show Activity
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Activity &amp; History</h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Hide Activity
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={tabClass('all')} onClick={() => setActiveFilter('all')}>All</button>
        <button type="button" className={tabClass('changes')} onClick={() => setActiveFilter('changes')}>Changes</button>
        <button type="button" className={tabClass('tickets')} onClick={() => setActiveFilter('tickets')}>Tickets</button>
        <button type="button" className={tabClass('inspections')} onClick={() => setActiveFilter('inspections')}>Inspections</button>
        <button type="button" className={tabClass('notes')} onClick={() => setActiveFilter('notes')}>Notes</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity events match this filter.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {iconForType(item.type)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {item.badge && (
                  <div className="mb-1">
                    <Badge color={item.badge.color}>{item.badge.label}</Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
