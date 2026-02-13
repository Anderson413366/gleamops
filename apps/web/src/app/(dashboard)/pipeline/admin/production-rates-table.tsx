'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Gauge } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button,
} from '@gleamops/ui';
import type { SalesProductionRate } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { ProductionRateForm } from '@/components/forms/production-rate-form';

interface ProductionRatesTableProps {
  search: string;
}

export default function ProductionRatesTable({ search }: ProductionRatesTableProps) {
  const [rows, setRows] = useState<SalesProductionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SalesProductionRate | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_production_rates')
      .select('*')
      .is('archived_at', null)
      .order('rate_code');
    if (!error && data) setRows(data as unknown as SalesProductionRate[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.rate_code.toLowerCase().includes(q) ||
        r.task_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'rate_code', 'asc'
  );
  const sortedRows = sorted as unknown as SalesProductionRate[];
  const pag = usePagination(sortedRows, 25);

  const handleAdd = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleSelect = (row: SalesProductionRate) => {
    setEditItem(row);
    setFormOpen(true);
  };

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  if (filtered.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={handleAdd}><Plus className="h-4 w-4" /> Add Rate</Button>
        </div>
        <EmptyState
          icon={<Gauge className="h-12 w-12" />}
          title="No production rates"
          description={search ? 'Try a different search term.' : 'Add your first production rate to get started.'}
        />
        <ProductionRateForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          initialData={editItem}
          onSuccess={fetchData}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAdd}><Plus className="h-4 w-4" /> Add Rate</Button>
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'rate_code' && sortDir} onSort={() => onSort('rate_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'task_name' && sortDir} onSort={() => onSort('task_name')}>Task Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead sortable sorted={sortKey === 'base_minutes' && sortDir} onSort={() => onSort('base_minutes')}>Base Min</TableHead>
            <TableHead>Floor Type</TableHead>
            <TableHead>Building Type</TableHead>
            <TableHead>Active</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleSelect(row)}>
              <TableCell className="font-mono text-xs">{row.rate_code}</TableCell>
              <TableCell className="font-medium">{row.task_name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{row.unit_code === 'SQFT_1000' ? 'Sq Ft/1K' : 'Each'}</TableCell>
              <TableCell className="text-right tabular-nums">{row.base_minutes}</TableCell>
              <TableCell className="text-muted-foreground">{row.floor_type_code ?? '---'}</TableCell>
              <TableCell className="text-muted-foreground">{row.building_type_code ?? '---'}</TableCell>
              <TableCell>
                <Badge color={row.is_active ? 'green' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
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
      <ProductionRateForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
