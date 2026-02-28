'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Briefcase, Calendar, CheckSquare, ClipboardList, Clock, Users } from 'lucide-react';
import { Badge, Skeleton } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { TICKET_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDate, formatDateTime, formatRelative } from '@/lib/utils/date';
import { EntityLink } from '@/components/links/entity-link';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';

interface TicketWithRelations extends WorkTicket {
  job?: {
    id: string;
    job_code: string;
    job_name: string | null;
    frequency: string | null;
    billing_amount: number | null;
    priority_level: string | null;
  } | null;
  site?: {
    id: string;
    site_code: string;
    name: string;
    client?: { client_code: string | null; name: string | null } | null;
  } | null;
}

interface AssignmentRow {
  id: string;
  role: string | null;
  staff?: { full_name: string; staff_code: string | null } | null;
}

interface ChecklistItemRow {
  id: string;
  label: string;
  is_checked: boolean;
  requires_photo: boolean;
  notes: string | null;
}

interface TimeEntryRow {
  id: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  status: string;
  staff?: { full_name: string | null; staff_code: string | null } | null;
}

interface InspectionRow {
  id: string;
  inspection_code: string;
  status: string;
  score_pct: number | null;
  completed_at: string | null;
  created_at: string;
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatClock(value: string | null | undefined) {
  if (!value) return 'Not Set';
  const [h, m] = value.split(':');
  const hour = Number(h);
  if (!Number.isFinite(hour)) return value;
  const minute = Number(m ?? '0');
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketCode = decodeURIComponent(params.id ?? '');

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemRow[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      const { data: ticketData } = await supabase
        .from('work_tickets')
        .select(`
          *,
          job:job_id(id, job_code, job_name, frequency, billing_amount, priority_level),
          site:site_id(id, site_code, name, client:client_id(client_code, name))
        `)
        .eq('ticket_code', ticketCode)
        .is('archived_at', null)
        .maybeSingle();

      if (!ticketData) {
        if (!cancelled) {
          setTicket(null);
          setAssignments([]);
          setChecklistItems([]);
          setTimeEntries([]);
          setInspections([]);
          setLoading(false);
        }
        return;
      }

      const typedTicket = ticketData as unknown as TicketWithRelations;
      const [assignRes, checklistRes, timeRes, inspectionRes] = await Promise.all([
        supabase
          .from('ticket_assignments')
          .select('id, role, staff:staff_id(full_name, staff_code)')
          .eq('ticket_id', typedTicket.id)
          .is('archived_at', null),
        supabase
          .from('ticket_checklists')
          .select('id')
          .eq('ticket_id', typedTicket.id)
          .is('archived_at', null)
          .maybeSingle(),
        supabase
          .from('time_entries')
          .select('id, start_at, end_at, duration_minutes, status, staff:staff_id(full_name, staff_code)')
          .eq('ticket_id', typedTicket.id)
          .is('archived_at', null)
          .order('start_at', { ascending: false }),
        supabase
          .from('inspections')
          .select('id, inspection_code, status, score_pct, completed_at, created_at')
          .eq('ticket_id', typedTicket.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
      ]);

      let checklistRows: ChecklistItemRow[] = [];
      const checklistId = checklistRes.data?.id;
      if (checklistId) {
        const { data: checklistItemsData } = await supabase
          .from('ticket_checklist_items')
          .select('id, label, is_checked, requires_photo, notes')
          .eq('checklist_id', checklistId)
          .is('archived_at', null)
          .order('sort_order', { ascending: true });
        checklistRows = (checklistItemsData as unknown as ChecklistItemRow[]) ?? [];
      }

      if (!cancelled) {
        setTicket(typedTicket);
        setAssignments((assignRes.data as unknown as AssignmentRow[]) ?? []);
        setChecklistItems(checklistRows);
        setTimeEntries((timeRes.data as unknown as TimeEntryRow[]) ?? []);
        setInspections((inspectionRes.data as unknown as InspectionRow[]) ?? []);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ticketCode]);

  const checklistChecked = useMemo(
    () => checklistItems.filter((item) => item.is_checked).length,
    [checklistItems]
  );
  const loggedMinutes = useMemo(
    () => timeEntries.reduce((sum, entry) => sum + Number(entry.duration_minutes ?? 0), 0),
    [timeEntries]
  );
  const loggedHours = (loggedMinutes / 60).toFixed(1);

  const completenessItems: CompletenessItem[] = ticket ? [
    { key: 'job', label: 'Service Plan', isComplete: isFieldComplete(ticket.job?.job_code), section: 'context' },
    { key: 'site', label: 'Site', isComplete: isFieldComplete(ticket.site?.site_code), section: 'context' },
    { key: 'client', label: 'Client', isComplete: isFieldComplete(ticket.site?.client?.client_code), section: 'context' },
    { key: 'scheduled_date', label: 'Scheduled Date', isComplete: isFieldComplete(ticket.scheduled_date), section: 'schedule' },
    { key: 'start_time', label: 'Start Time', isComplete: isFieldComplete(ticket.start_time), section: 'schedule' },
    { key: 'end_time', label: 'End Time', isComplete: isFieldComplete(ticket.end_time), section: 'schedule' },
    { key: 'crew', label: 'Assigned Crew', isComplete: assignments.length > 0, section: 'crew' },
    { key: 'checklist', label: 'Checklist', isComplete: checklistItems.length > 0, section: 'quality' },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-base text-muted-foreground">Work ticket not found.</p>
        <Link
          href="/jobs?tab=tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Link>
      </div>
    );
  }

  const ticketStatusColor = (TICKET_STATUS_COLORS[ticket.status] as StatusColor | undefined) ?? 'gray';

  return (
    <div className="space-y-6">
      <Link
        href="/jobs?tab=tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Work Ticket {ticket.ticket_code}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Updated {formatRelative(ticket.updated_at)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge color={ticketStatusColor}>{ticket.status}</Badge>
              <Badge color="blue">{formatDate(ticket.scheduled_date)}</Badge>
            </div>
          </div>
          <Link
            href={`/operations?tab=tickets&ticket=${encodeURIComponent(ticket.id)}`}
            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Open in Ticket Panel
          </Link>
        </div>
      </div>

      <ProfileCompletenessCard title="Ticket Profile" items={completenessItems} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Assigned Crew</p><p className="mt-1 text-2xl font-bold text-foreground">{assignments.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Checklist Progress</p><p className="mt-1 text-2xl font-bold text-foreground">{checklistChecked}/{checklistItems.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Inspections</p><p className="mt-1 text-2xl font-bold text-foreground">{inspections.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Logged Time</p><p className="mt-1 text-2xl font-bold text-foreground">{loggedHours} hrs</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Briefcase className="h-4 w-4 text-muted-foreground" /> Service Context</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Service Plan</dt><dd className="font-medium">{ticket.job?.job_code ? <EntityLink entityType="job" code={ticket.job.job_code} name={ticket.job.job_name ?? ticket.job.job_code} /> : 'Not Set'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Site</dt><dd className="font-medium">{ticket.site?.site_code ? <EntityLink entityType="site" code={ticket.site.site_code} name={ticket.site.name ?? ticket.site.site_code} /> : 'Not Set'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Client</dt><dd className="font-medium">{ticket.site?.client?.client_code ? <EntityLink entityType="client" code={ticket.site.client.client_code} name={ticket.site.client.name ?? ticket.site.client.client_code} /> : 'Not Set'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Billing</dt><dd className="font-medium">{formatCurrency(ticket.job?.billing_amount)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Calendar className="h-4 w-4 text-muted-foreground" /> Schedule & Status</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{formatDate(ticket.scheduled_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Start</dt><dd className="font-medium">{formatClock(ticket.start_time)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">End</dt><dd className="font-medium">{formatClock(ticket.end_time)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status</dt><dd><Badge color={ticketStatusColor}>{ticket.status}</Badge></dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-muted-foreground" /> Crew Assignments</h3>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crew assigned yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="font-medium">
                    {assignment.staff?.staff_code
                      ? <EntityLink entityType="staff" code={assignment.staff.staff_code} name={assignment.staff.full_name ?? assignment.staff.staff_code} />
                      : (assignment.staff?.full_name ?? 'Not Set')}
                  </span>
                  <Badge color="blue">{assignment.role ?? 'Cleaner'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><CheckSquare className="h-4 w-4 text-muted-foreground" /> Checklist Snapshot</h3>
          {checklistItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist attached to this ticket.</p>
          ) : (
            <div className="space-y-2">
              {checklistItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className={item.is_checked ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  <Badge color={item.is_checked ? 'green' : 'gray'}>{item.is_checked ? 'Done' : 'Open'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="h-4 w-4 text-muted-foreground" /> Recent Inspections</h3>
          {inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspections recorded for this ticket.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {inspections.slice(0, 6).map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs">{inspection.inspection_code}</span>
                  <div className="flex items-center gap-2">
                    <Badge color="blue">{inspection.status}</Badge>
                    <span className="text-muted-foreground">{inspection.score_pct != null ? `${inspection.score_pct}%` : 'No score'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Clock className="h-4 w-4 text-muted-foreground" /> Time Entries</h3>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entries recorded yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {timeEntries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{entry.staff?.full_name ?? 'Unknown staff'}</span>
                    <Badge color="blue">{entry.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(entry.start_at)} {entry.end_at ? `→ ${formatDateTime(entry.end_at)}` : ''}
                    {entry.duration_minutes != null ? ` · ${entry.duration_minutes} min` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ActivityHistorySection
        entityType="work_tickets"
        entityId={ticket.id}
        entityCode={ticket.ticket_code}
        entityUpdatedAt={ticket.updated_at}
        ticketScope={{
          siteIds: ticket.site?.id ? [ticket.site.id] : [],
          jobIds: ticket.job?.id ? [ticket.job.id] : [],
        }}
        inspectionScope={{
          siteIds: ticket.site?.id ? [ticket.site.id] : [],
          jobIds: ticket.job?.id ? [ticket.job.id] : [],
        }}
      />

      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Created: {formatDate(ticket.created_at)}</p>
        <p>Updated: {formatDate(ticket.updated_at)}</p>
      </div>
    </div>
  );
}
