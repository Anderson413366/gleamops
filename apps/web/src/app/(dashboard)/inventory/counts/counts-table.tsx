'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InventoryCount } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
  StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { toSafeDate } from '@/lib/utils/date';
import { InventoryCountForm } from '@/components/forms/inventory-count-form';

interface CountRow extends InventoryCount {
  site?: { name: string; site_code: string } | null;
  counter?: { full_name: string } | null;
}

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function CountsTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CountRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('inventory_counts')
      .select('*, site:site_id(name, site_code), counter:counted_by(full_name)')
      .is('archived_at', null)
      .order('count_date', { ascending: false });
    if (!error && data) setRows(data as unknown as CountRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: CountRow) => {
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
      r.count_code.toLowerCase().includes(q) ||
      (r.site?.name ?? '').toLowerCase().includes(q) ||
      (r.site?.site_code ?? '').toLowerCase().includes(q) ||
      (r.counter?.full_name ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'count_date', 'asc'
  );
  const sortedRows = sorted as unknown as CountRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No inventory counts yet"
          description="Create an inventory count to get started."
        />
        <InventoryCountForm
          open={createOpen}
          onClose={handleFormClose}
          initialData={editItem}
          onSuccess={handleFormSuccess}
        />
      </>
    );
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'count_code' && sortDir} onSort={() => onSort('count_code')}>
              Code
            </TableHead>
            <TableHead>Site</TableHead>
            <TableHead sortable sorted={sortKey === 'count_date' && sortDir} onSort={() => onSort('count_date')}>
              Date
            </TableHead>
            <TableHead>Counted By</TableHead>
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
                  <span>{row.count_code}</span>
                </div>
              </TableCell>
              <TableCell>{row.site?.name ?? '—'}</TableCell>
              <TableCell>{dateFmt.format(toSafeDate(row.count_date))}</TableCell>
              <TableCell>{row.counter?.full_name ?? '—'}</TableCell>
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

      <InventoryCountForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
