'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupplyOrder } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
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

export default function OrdersTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<SupplyOrder | null>(null);

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
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.order_code.toLowerCase().includes(q) ||
      (r.supplier ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'order_date', 'asc'
  );
  const sortedRows = sorted as unknown as SupplyOrder[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="No supply orders yet"
          description="Create a supply order to get started."
        />
        <SupplyOrderForm
          open={createOpen}
          onClose={handleFormClose}
          initialData={editItem}
          onSuccess={handleFormSuccess}
        />
      </>
    );
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div>
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
            <TableHead>Total</TableHead>
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
              <TableCell className="font-mono text-xs">
                {row.total_amount != null ? currFmt.format(row.total_amount) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

      <SupplyOrderForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
