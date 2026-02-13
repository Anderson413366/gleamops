'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupplyOrder } from '@gleamops/shared';
import { SUPPLY_ORDER_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
}

export default function OrdersTable({ search }: Props) {
  const [rows, setRows] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
      <EmptyState
        icon={<ShoppingCart className="h-12 w-12" />}
        title="No orders found"
        description="Create a supply order to get started."
      />
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
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.order_code}</TableCell>
              <TableCell className="font-medium">{row.supplier ?? '—'}</TableCell>
              <TableCell>{dateFmt.format(new Date(row.order_date + 'T00:00:00'))}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.total_amount != null ? currFmt.format(row.total_amount) : '—'}
              </TableCell>
              <TableCell>
                <Badge color={(SUPPLY_ORDER_STATUS_COLORS[row.status] as StatusColor) ?? 'gray'}>
                  {row.status.replace(/_/g, ' ')}
                </Badge>
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
    </div>
  );
}
