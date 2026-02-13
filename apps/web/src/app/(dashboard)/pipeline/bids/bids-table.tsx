'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { BID_STATUS_COLORS } from '@gleamops/shared';
import type { SalesBid } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
}

interface BidsTableProps {
  search: string;
  onSelect?: (bid: BidWithClient) => void;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function BidsTable({ search, onSelect }: BidsTableProps) {
  const [rows, setRows] = useState<BidWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_bids')
      .select('*, client:client_id(name, client_code), service:service_id(name)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as BidWithClient[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.bid_code.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'bid_code', 'asc'
  );
  const sortedRows = sorted as unknown as BidWithClient[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No bids"
        description={search ? 'Try a different search term.' : 'Create your first bid to start pricing jobs.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="bids"
          columns={[
            { key: 'bid_code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'total_sqft', label: 'Sq Ft' },
            { key: 'bid_monthly_price', label: 'Monthly Price' },
            { key: 'created_at', label: 'Created' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'bid_code' && sortDir} onSort={() => onSort('bid_code')}>Code</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Service</TableHead>
            <TableHead sortable sorted={sortKey === 'total_sqft' && sortDir} onSort={() => onSort('total_sqft')}>Sq Ft</TableHead>
            <TableHead sortable sorted={sortKey === 'bid_monthly_price' && sortDir} onSort={() => onSort('bid_monthly_price')}>Monthly Price</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)}>
              <TableCell className="font-mono text-xs">{row.bid_code}</TableCell>
              <TableCell className="font-medium">{row.client?.name ?? '—'}</TableCell>
              <TableCell className="text-muted">{row.service?.name ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{row.total_sqft?.toLocaleString() ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.bid_monthly_price)}</TableCell>
              <TableCell>
                <Badge color={BID_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
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
