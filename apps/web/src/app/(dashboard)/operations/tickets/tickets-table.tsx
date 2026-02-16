'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/utils/date';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string } | null;
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface TicketsTableProps {
  search: string;
  onGoToServicePlans?: () => void;
}

export default function TicketsTable({ search, onGoToServicePlans }: TicketsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const handleRowClick = useCallback((row: TicketWithRelations) => {
    // TODO: Create dedicated detail page route at /operations/tickets/[ticket_code].
    router.push(`/operations?tab=tickets&ticket=${encodeURIComponent(row.id)}`);
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:job_id(job_code),
        site:site_id(site_code, name, client:client_id(name))
      `)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: true });
    if (!error && data) setRows(data as unknown as TicketWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.ticket_code.toLowerCase().includes(q) ||
        r.job?.job_code?.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.site?.client?.name?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'scheduled_date', 'asc'
  );
  const sortedRows = sorted as unknown as TicketWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={(
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Building2 className="h-10 w-10" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
          </div>
        )}
        title="No work tickets"
        description={search ? 'Try a different search term.' : 'Service tickets will appear here as active work gets scheduled.'}
        actionLabel={search ? undefined : '+ Create Your First Service Plan'}
        onAction={search ? undefined : onGoToServicePlans}
      >
        {!search && (
          <ul className="space-y-2 text-left text-sm text-muted-foreground">
            <li>Track every scheduled visit with clear dates and site context.</li>
            <li>Give supervisors one queue for assignments and completion status.</li>
            <li>Reduce missed service windows with visible daily workload.</li>
          </ul>
        )}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="work-tickets"
          columns={[
            { key: 'ticket_code', label: 'Ticket' },
            { key: 'scheduled_date', label: 'Date' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'ticket_code' && sortDir} onSort={() => onSort('ticket_code')}>Ticket</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Client</TableHead>
            <TableHead sortable sorted={sortKey === 'scheduled_date' && sortDir} onSort={() => onSort('scheduled_date')}>Date</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleRowClick(row)}
              className={cn('cursor-pointer', statusRowAccentClass(row.status))}
            >
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-2">
                  <StatusDot status={row.status} />
                  <span>{row.ticket_code}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.job?.job_code ?? '—'}</TableCell>
              <TableCell className="font-medium">{row.site?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.site?.client?.name ?? '—'}</TableCell>
              <TableCell>{formatDate(row.scheduled_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />
    </div>
  );
}
