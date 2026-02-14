'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { TICKET_STATUS_COLORS } from '@gleamops/shared';
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
  onSelect?: (ticket: TicketWithRelations) => void;
}

export default function TicketsTable({ search, onSelect }: TicketsTableProps) {
  const [rows, setRows] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

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
        r.site?.client?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'scheduled_date', 'asc'
  );
  const sortedRows = sorted as unknown as TicketWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-12 w-12" />}
        title="No work tickets"
        description={search ? 'Try a different search term.' : 'Win a bid to generate your first work tickets.'}
      />
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
            { key: 'status', label: 'Status' },
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
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)}>
              <TableCell className="font-mono text-xs">{row.ticket_code}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.job?.job_code ?? '—'}</TableCell>
              <TableCell className="font-medium">{row.site?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.site?.client?.name ?? '—'}</TableCell>
              <TableCell>{formatDate(row.scheduled_date)}</TableCell>
              <TableCell>
                <Badge color={TICKET_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
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
