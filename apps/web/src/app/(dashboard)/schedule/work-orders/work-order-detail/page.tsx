'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/date';
import { WorkOrderCompletion } from '../work-order-completion';
import type { WorkOrderTableRow } from '../work-order-table';

interface WorkOrderTicket {
  id: string;
  tenant_id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes?: string | null;
  position_code?: string | null;
  required_staff_count?: number | null;
  job?: { job_code?: string | null; job_name?: string | null } | null;
  site?: {
    site_code?: string | null;
    name?: string | null;
    client?: { name?: string | null; client_code?: string | null } | null;
  } | null;
  assignments?: Array<{
    assignment_status?: string | null;
    staff?: { full_name?: string | null } | null;
  }> | null;
}

const STATUS_BADGE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray' | 'red'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELED: 'red',
};

function crewNames(row: WorkOrderTicket): string[] {
  return (row.assignments ?? [])
    .filter((assignment) => !assignment.assignment_status || assignment.assignment_status === 'ASSIGNED')
    .map((assignment) => assignment.staff?.full_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function toTableRow(row: WorkOrderTicket): WorkOrderTableRow {
  return {
    ...row,
    site_name: row.site?.name?.trim() || row.site?.site_code?.trim() || '—',
    assigned_crew: crewNames(row).join(', '),
  } as WorkOrderTableRow;
}

function formatTime(value: string | null) {
  if (!value) return 'Not Set';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const hour12 = hour % 12 || 12;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minuteText ?? '00'} ${suffix}`;
}

export default function WorkOrderDetailPage() {
  const searchParams = useSearchParams();
  const ticketCode = searchParams.get('ticket')?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<WorkOrderTableRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketCode) {
      setLoading(false);
      setError('Missing ticket code.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: queryError } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:site_jobs!work_tickets_job_id_fkey(job_code, job_name),
        site:sites!work_tickets_site_id_fkey(site_code, name, client:clients!sites_client_id_fkey(name, client_code)),
        assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
      `)
      .eq('ticket_code', ticketCode)
      .is('archived_at', null)
      .maybeSingle();

    if (queryError) {
      setLoading(false);
      setError(queryError.message);
      return;
    }

    if (!data) {
      setLoading(false);
      setError('Work order not found.');
      return;
    }

    setRow(toTableRow(data as unknown as WorkOrderTicket));
    setError(null);
    setLoading(false);
  }, [ticketCode]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const crew = useMemo(() => (row?.assigned_crew || '').split(',').map((name) => name.trim()).filter(Boolean), [row]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !row) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">Work Order Not Available</p>
          <p className="text-sm text-muted-foreground">{error ?? 'No work order selected.'}</p>
          <div>
            <Link href="/schedule?tab=work-orders" className="text-sm text-module-accent underline">
              Back to Work Orders
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/schedule?tab=work-orders"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <Button onClick={() => setCompletionOpen(true)}>
          Complete Work Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5" />
            {row.ticket_code}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Service</p>
            <p className="text-sm font-medium text-foreground">{row.job?.job_name || row.job?.job_code || 'Project Work Order'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Site</p>
            <p className="text-sm font-medium text-foreground inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {row.site_name}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(row.scheduled_date)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <Badge color={STATUS_BADGE_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timing + Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Shift window:</span> {formatTime(row.start_time)} - {formatTime(row.end_time)}</p>
            <p><span className="text-muted-foreground">Position:</span> {row.position_code || 'General specialist'}</p>
            <p><span className="text-muted-foreground">Required crew:</span> {row.required_staff_count ?? 1}</p>
            <div>
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Assigned crew
              </p>
              {crew.length ? (
                <ul className="mt-2 space-y-1">
                  {crew.map((name) => (
                    <li key={name} className="rounded border border-border px-2 py-1 text-foreground">{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No assigned crew yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes + Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Client:</span>{' '}
              {row.site?.client?.client_code ? (
                <Link href={`/clients/${encodeURIComponent(row.site.client.client_code)}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {row.site.client.name || row.site.client.client_code}
                </Link>
              ) : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Client code:</span>{' '}
              {row.site?.client?.client_code ? (
                <Link href={`/clients/${encodeURIComponent(row.site.client.client_code)}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {row.site.client.client_code}
                </Link>
              ) : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Site code:</span>{' '}
              {row.site?.site_code ? (
                <Link href={`/clients/sites/${encodeURIComponent(row.site.site_code)}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {row.site.site_code}
                </Link>
              ) : '—'}
            </p>
            <div>
              <p className="text-muted-foreground">Operational summary</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground">
                {row.position_code
                  ? `Position focus: ${row.position_code}`
                  : 'No additional notes provided for this work order.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkOrderCompletion
        open={completionOpen}
        row={row}
        onClose={() => setCompletionOpen(false)}
        onCompleted={() => {
          toast.success('Work order refreshed.');
          void loadTicket();
        }}
      />
    </div>
  );
}
