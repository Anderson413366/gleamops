'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Mail, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  ViewToggle,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';

interface ChangeRequestsTableProps {
  search: string;
}

interface AlertRow {
  id: string;
  title: string;
  severity: string;
  body: string | null;
  created_at: string;
}

type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ChangeRequestRow {
  id: string;
  title: string;
  severity: string;
  createdAt: string;
  requestType: string;
  priority: string;
  details: string;
  requestedDate: string | null;
  siteName: string;
  contactName: string;
  contactEmail: string;
  clientCode: string;
  status: DecisionStatus;
  decisionAt: string | null;
}

const STATUS_COLORS: Record<DecisionStatus, 'yellow' | 'green' | 'red'> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseBody(rawBody: string | null): Record<string, unknown> {
  if (!rawBody) return {};
  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toRow(alert: AlertRow): ChangeRequestRow {
  const body = parseBody(alert.body);
  const managerDecision = String(body.manager_decision ?? 'PENDING').toUpperCase();

  const status: DecisionStatus =
    managerDecision === 'APPROVED'
      ? 'APPROVED'
      : managerDecision === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING';

  return {
    id: alert.id,
    title: alert.title,
    severity: alert.severity,
    createdAt: alert.created_at,
    requestType: titleCase(String(body.request_type ?? 'GENERAL_CHANGE')),
    priority: String(body.priority ?? 'MEDIUM').toUpperCase(),
    details: String(body.details ?? ''),
    requestedDate: typeof body.requested_date === 'string' ? body.requested_date : null,
    siteName: String(body.site_name ?? 'Unknown Site'),
    contactName: String(body.contact_name ?? 'Unknown Contact'),
    contactEmail: String(body.contact_email ?? ''),
    clientCode: String(body.client_code ?? ''),
    status,
    decisionAt: typeof body.decision_at === 'string' ? body.decision_at : null,
  };
}

function statusDetail(row: ChangeRequestRow): string {
  if (row.status === 'PENDING') return `Requested ${formatDate(row.createdAt)}`;
  return `${titleCase(row.status)} ${formatDate(row.decisionAt)}`;
}

export default function ChangeRequestsTable({ search }: ChangeRequestsTableProps) {
  const supabase = getSupabaseBrowserClient();
  const { view, setView } = useViewPreference('clients-change-requests');

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('id, title, severity, body, created_at')
      .eq('alert_type', 'CLIENT_CHANGE_REQUEST')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Unable to load client change requests.');
      setRows([]);
      setLoading(false);
      return;
    }

    const mapped = ((data ?? []) as AlertRow[]).map(toRow);
    setRows(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => (
      row.title.toLowerCase().includes(query)
      || row.requestType.toLowerCase().includes(query)
      || row.priority.toLowerCase().includes(query)
      || row.siteName.toLowerCase().includes(query)
      || row.contactName.toLowerCase().includes(query)
      || row.contactEmail.toLowerCase().includes(query)
      || row.clientCode.toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
    ));
  }, [rows, search]);

  const pagination = usePagination(filtered, 25);

  const applyDecision = useCallback(async (row: ChangeRequestRow, decision: 'APPROVED' | 'REJECTED') => {
    setSavingId(row.id);
    const { data: latest, error: latestError } = await supabase
      .from('alerts')
      .select('body')
      .eq('id', row.id)
      .single();

    if (latestError) {
      toast.error('Unable to load request context.');
      setSavingId(null);
      return;
    }

    const originalBody = parseBody((latest as { body: string | null } | null)?.body ?? null);

    const payload = {
      ...originalBody,
      manager_decision: decision,
      decision_at: new Date().toISOString(),
      decision_source: 'clients_requests_tab',
    };

    const { error } = await supabase
      .from('alerts')
      .update({
        body: JSON.stringify(payload),
        read_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (error) {
      toast.error(`Unable to ${decision === 'APPROVED' ? 'approve' : 'reject'} this request.`);
      setSavingId(null);
      return;
    }

    toast.success(`Request ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`);
    setSavingId(null);
    void fetchRows();
  }, [fetchRows, supabase]);

  if (loading) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-12 w-12" />}
        title="No client change requests"
        description={search ? 'Try a different search term.' : 'Portal-submitted requests will appear here for manager review.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pagination.page.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.requestType} · {row.priority}</p>
                  </div>
                  <Badge color={STATUS_COLORS[row.status]}>{row.status}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Requested: {formatDate(row.createdAt)}</p>
                  <p className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Target: {formatDate(row.requestedDate)}</p>
                  <p className="truncate">Site: {row.siteName}</p>
                  <p className="truncate">Client: {row.clientCode || '—'}</p>
                  <p className="truncate">Contact: {row.contactName}</p>
                  <p className="truncate inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {row.contactEmail || '—'}</p>
                </div>

                <p className="text-sm text-foreground">{row.details || 'No additional details provided.'}</p>
                <p className="text-xs text-muted-foreground">{statusDetail(row)}</p>

                {row.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={savingId === row.id}
                      onClick={() => void applyDecision(row, 'APPROVED')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={savingId === row.id}
                      onClick={() => void applyDecision(row, 'REJECTED')}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Request</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pagination.page.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.requestType}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{row.siteName}</p>
                    <p className="text-xs">{row.clientCode || '—'}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{row.contactName}</p>
                    <p className="text-xs">{row.contactEmail || '—'}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p>{formatDate(row.createdAt)}</p>
                    <p className="text-xs">{row.requestedDate ? `Target ${formatDate(row.requestedDate)}` : 'No target date'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge color={row.priority === 'URGENT' || row.priority === 'HIGH' ? 'red' : row.priority === 'MEDIUM' ? 'yellow' : 'blue'}>
                      {row.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLORS[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === 'PENDING' ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          disabled={savingId === row.id}
                          onClick={() => void applyDecision(row, 'APPROVED')}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingId === row.id}
                          onClick={() => void applyDecision(row, 'REJECTED')}
                        >
                          <AlertCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{statusDetail(row)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        onNext={pagination.nextPage}
        onPrev={pagination.prevPage}
      />
    </div>
  );
}
