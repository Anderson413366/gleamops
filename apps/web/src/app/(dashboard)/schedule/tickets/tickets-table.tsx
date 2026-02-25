'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, StatusDot, ViewToggle, cn,
} from '@gleamops/ui';
import { TICKET_STATUS_COLORS } from '@gleamops/shared';
import type { WorkTicket } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { formatDate } from '@/lib/utils/date';
import { EntityLink } from '@/components/links/entity-link';
import { EntityAvatar } from '@/components/directory/entity-avatar';
import { EntityCard, getEntityInitials } from '@/components/directory/entity-card';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string } | null;
  site?: {
    site_code: string;
    name: string;
    photo_url?: string | null;
    client?: { name: string; client_code?: string | null } | null;
  } | null;
}

interface TicketsTableProps {
  search: string;
}

const STATUS_OPTIONS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELED', 'all'] as const;

function statusTone(status: string | null | undefined): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'COMPLETED' || normalized === 'VERIFIED') return 'green';
  if (normalized === 'IN_PROGRESS') return 'blue';
  if (normalized === 'SCHEDULED') return 'yellow';
  if (normalized === 'CANCELED') return 'red';
  return 'gray';
}

function statusLabel(status: string | null | undefined): string {
  return (status ?? 'UNKNOWN').replace(/_/g, ' ');
}

export default function TicketsTable({ search }: TicketsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('SCHEDULED');
  const { view, setView } = useViewPreference('schedule-tickets');

  const handleRowClick = useCallback((row: TicketWithRelations) => {
    router.push(`/operations/tickets/${encodeURIComponent(row.ticket_code)}`);
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:job_id(job_code),
        site:site_id(site_code, name, photo_url, client:client_id(name, client_code))
      `)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: true });
    if (!error && data) setRows(data as unknown as TicketWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'SCHEDULED';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.status ?? 'SCHEDULED') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.ticket_code.toLowerCase().includes(q) ||
        r.job?.job_code?.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.site?.client?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, statusFilter, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'scheduled_date', 'asc'
  );
  const sortedRows = sorted as unknown as TicketWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No work tickets yet'
    : `No ${selectedStatusLabel} work tickets`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track every scheduled ticket, site, and completion state.'
      : 'All work tickets are currently in other statuses.';

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-3">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="work-tickets"
          columns={[
            { key: 'ticket_code', label: 'Ticket' },
            { key: 'scheduled_date', label: 'Date' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      {view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pag.page.map((row) => (
            <EntityCard
              key={row.id}
              onClick={() => handleRowClick(row)}
              initials={getEntityInitials(row.site?.name ?? row.ticket_code)}
              initialsSeed={row.ticket_code}
              name={row.ticket_code}
              subtitle={row.site?.name ?? 'Unassigned site'}
              secondaryLine={row.site?.client?.name ?? row.job?.job_code ?? 'No client'}
              statusLabel={statusLabel(row.status)}
              statusTone={statusTone(row.status)}
              metricsLine={`Scheduled ${formatDate(row.scheduled_date)}`}
              code={row.ticket_code}
              imageUrl={row.site?.photo_url ?? null}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'ticket_code' && sortDir} onSort={() => onSort('ticket_code')}>Ticket</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Client</TableHead>
              <TableHead sortable sorted={sortKey === 'scheduled_date' && sortDir} onSort={() => onSort('scheduled_date')}>Date</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <EntityAvatar
                      name={row.site?.name ?? row.ticket_code}
                      seed={row.ticket_code}
                      imageUrl={row.site?.photo_url ?? null}
                      size="sm"
                    />
                    <StatusDot status={row.status} />
                    {row.ticket_code}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.job?.job_code ? (
                    <EntityLink entityType="job" code={row.job.job_code} name={row.job.job_code} showCode={false} stopPropagation />
                  ) : '—'}
                </TableCell>
                <TableCell className="font-medium">
                  {row.site?.site_code ? (
                    <EntityLink entityType="site" code={row.site.site_code} name={row.site.name ?? row.site.site_code} showCode={false} stopPropagation />
                  ) : (row.site?.name ?? '—')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.site?.client?.client_code ? (
                    <EntityLink entityType="client" code={row.site.client.client_code} name={row.site.client.name ?? row.site.client.client_code} showCode={false} stopPropagation />
                  ) : (row.site?.client?.name ?? '—')}
                </TableCell>
                <TableCell>{formatDate(row.scheduled_date)}</TableCell>
                <TableCell>
                  <Badge color={TICKET_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}
    </div>
  );
}
