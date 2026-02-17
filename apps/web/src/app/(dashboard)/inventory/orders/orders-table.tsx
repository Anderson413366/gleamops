'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupplyOrder } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Button,
  StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { toSafeDate } from '@/lib/utils/date';
import { SupplyOrderForm } from '@/components/forms/supply-order-form';

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

const STATUS_OPTIONS = ['ORDERED', 'SHIPPED', 'RECEIVED', 'DRAFT', 'CANCELED', 'all'] as const;

export default function OrdersTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<SupplyOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ORDERED');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('supply_orders')
      .select('*')
      .is('archived_at', null)
      .order('order_date', { ascending: false });
    if (!error && data) setRows(data as SupplyOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: SupplyOrder) => {
    setEditItem(row);
    setCreateOpen(true);
  };

  const handleFormClose = () => {
    setCreateOpen(false);
    setEditItem(null);
    onFormClose?.();
  };

  const handleFormSuccess = () => {
    fetchData();
    onRefresh?.();
  };

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((row) => (row.status ?? 'DRAFT') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter((r) =>
      r.order_code.toLowerCase().includes(q) ||
      (r.supplier ?? '').toLowerCase().includes(q) ||
      (r.notes ?? '').toLowerCase().includes(q)
    );
  }, [rows, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'DRAFT';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'order_date', 'asc'
  );
  const sortedRows = sorted as unknown as SupplyOrder[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const selectedStatusLabel = statusFilter === 'all' ? 'all statuses' : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all' ? 'No supply orders yet' : `No ${selectedStatusLabel} orders`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Create and track purchase orders from draft to received.'
      : `There are currently no supply orders with ${selectedStatusLabel} status.`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={() => { setEditItem(null); setCreateOpen(true); }}>
          New Order
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'order_code' && sortDir} onSort={() => onSort('order_code')}>
              Code
            </TableHead>
            <TableHead sortable sorted={sortKey === 'supplier' && sortDir} onSort={() => onSort('supplier')}>
              Supplier
            </TableHead>
            <TableHead sortable sorted={sortKey === 'order_date' && sortDir} onSort={() => onSort('order_date')}>
              Order Date
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Notes</TableHead>
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
                  <span>{row.order_code}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{row.supplier ?? '—'}</TableCell>
              <TableCell>{dateFmt.format(toSafeDate(row.order_date))}</TableCell>
              <TableCell className="text-muted-foreground">{row.status}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.total_amount != null ? currFmt.format(row.total_amount) : '$0'}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.notes ?? 'Not Set'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<ShoppingCart className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          pageSize={pag.pageSize}
          hasNext={pag.hasNext}
          hasPrev={pag.hasPrev}
          onNext={pag.nextPage}
          onPrev={pag.prevPage}
        />
      )}

      <SupplyOrderForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
