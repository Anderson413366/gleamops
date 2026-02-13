'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  ClipboardList,
  AlertTriangle,
  Calendar,
  DollarSign,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';

/* ---------- colour maps ---------- */

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
  COMPLETED: 'green',
};

const SEVERITY_COLORS: Record<string, 'red' | 'orange' | 'yellow'> = {
  CRITICAL: 'red',
  MAJOR: 'orange',
  MINOR: 'yellow',
};

const TICKET_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray'> = {
  COMPLETED: 'green',
  IN_PROGRESS: 'yellow',
  PENDING: 'gray',
};

/* ---------- helper types ---------- */

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  is_checked: boolean;
  sort_order: number;
}

interface TicketChecklist {
  id: string;
  status: string;
  items: ChecklistItem[];
}

interface TicketWithChecklist {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  status: string;
  checklist: TicketChecklist[];
}

interface InspectionIssue {
  id: string;
  severity: string;
  description: string;
  resolved_at: string | null;
}

/* ---------- helpers ---------- */

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ---------- component ---------- */

interface JobDetailProps {
  job: JobWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function JobDetail({ job, open, onClose }: JobDetailProps) {
  const [tickets, setTickets] = useState<TicketWithChecklist[]>([]);
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);

  useEffect(() => {
    if (!job || !open) return;
    const supabase = getSupabaseBrowserClient();

    // Fetch work tickets with checklists
    setLoadingTickets(true);
    supabase
      .from('work_tickets')
      .select(
        'id, ticket_code, scheduled_date, status, checklist:ticket_checklists(id, status, items:ticket_checklist_items(id, label, is_checked, sort_order))'
      )
      .eq('job_id', job.id)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTickets((data as unknown as TicketWithChecklist[]) ?? []);
        setLoadingTickets(false);

        // After tickets loaded, fetch inspection issues using ticket IDs
        const ticketIds = (data ?? []).map((t: { id: string }) => t.id);
        if (ticketIds.length === 0) {
          setIssues([]);
          setLoadingIssues(false);
          return;
        }

        setLoadingIssues(true);
        supabase
          .from('inspections')
          .select(
            'issues:inspection_issues(id, severity, description, resolved_at)'
          )
          .in('ticket_id', ticketIds)
          .is('archived_at', null)
          .then(({ data: inspData }) => {
            const allIssues = ((inspData ?? []) as unknown as { issues: InspectionIssue[] }[]).flatMap(
              (insp) => insp.issues ?? []
            );
            setIssues(allIssues);
            setLoadingIssues(false);
          });
      });
  }, [job, open]);

  if (!job) return null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={job.job_code}
      subtitle={job.site?.name ?? 'Service Plan'}
      wide
    >
      <div className="space-y-6">
        {/* Status badge */}
        <div>
          <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>
            {job.status}
          </Badge>
        </div>

        {/* Overview card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Overview
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Site</dt>
                <dd className="font-medium text-foreground">
                  {job.site?.name ?? '—'}
                  {job.site?.site_code && (
                    <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                      {job.site.site_code}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium text-foreground">
                  {job.site?.client?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Frequency</dt>
                <dd className="font-medium text-foreground">
                  {job.frequency ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Billing Amount
                </dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {formatCurrency(job.billing_amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Start Date
                </dt>
                <dd className="font-medium text-foreground">
                  {formatDate(job.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  End Date
                </dt>
                <dd className="font-medium text-foreground">
                  {formatDate(job.end_date)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Job Tasks card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Job Tasks
                <Badge color="blue">{tickets.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks configured.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((ticket) => {
                  const checklists = ticket.checklist ?? [];
                  const items = checklists.flatMap((cl) => cl.items ?? []);
                  const sortedItems = [...items].sort(
                    (a, b) => a.sort_order - b.sort_order
                  );

                  return (
                    <li key={ticket.id} className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.ticket_code}
                          </span>
                          <Badge
                            color={
                              TICKET_STATUS_COLORS[ticket.status] ?? 'gray'
                            }
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(ticket.scheduled_date)}
                        </span>
                      </div>
                      {sortedItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-1">
                          No checklist items.
                        </p>
                      ) : (
                        <ul className="space-y-1 pl-1">
                          {sortedItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              {item.is_checked ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span
                                className={
                                  item.is_checked
                                    ? 'text-muted-foreground line-through'
                                    : 'text-foreground'
                                }
                              >
                                {item.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Job Logs (Inspection Issues) card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Job Logs
                {issues.length > 0 && (
                  <Badge color="orange">{issues.length}</Badge>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingIssues ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No issues reported.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="py-2 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          color={SEVERITY_COLORS[issue.severity] ?? 'gray'}
                        >
                          {issue.severity}
                        </Badge>
                        {issue.resolved_at ? (
                          <Badge color="green">Resolved</Badge>
                        ) : (
                          <Badge color="red">Open</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {issue.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(job.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(job.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
