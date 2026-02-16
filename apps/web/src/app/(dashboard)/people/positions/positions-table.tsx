'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { StaffPosition } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver, ExportButton
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
}

export default function PositionsTable({ search }: Props) {
  const [rows, setRows] = useState<StaffPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffPosition | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff_positions')
      .select('*')
      .is('archived_at', null)
      .order('title');
    if (!error && data) setRows(data as StaffPosition[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.position_code.toLowerCase().includes(q) ||
      (r.department ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'title', 'asc');
  const sortedRows = sorted as unknown as StaffPosition[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;
  if (filtered.length === 0) return <EmptyState icon={<BriefcaseBusiness className="h-10 w-10" />} title="No positions found" description="Add a position to get started." />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="positions"
          columns={[
            { key: 'position_code', label: 'Code' },
            { key: 'title', label: 'Title' },
            { key: 'department', label: 'Department' },
            { key: 'pay_grade', label: 'Pay Grade' },
          ]}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'position_code' && sortDir} onSort={() => onSort('position_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'title' && sortDir} onSort={() => onSort('title')}>Title</TableHead>
            <TableHead sortable sorted={sortKey === 'department' && sortDir} onSort={() => onSort('department')}>Department</TableHead>
            <TableHead>Pay Grade</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
              <TableCell className="font-mono text-xs">{row.position_code}</TableCell>
              <TableCell className="font-medium">{row.title}</TableCell>
              <TableCell>{row.department ?? '—'}</TableCell>
              <TableCell>{row.pay_grade ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages}
        totalItems={pag.totalItems} pageSize={pag.pageSize}
        hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.title}` : 'Position'}
        subtitle={selected?.position_code}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <Badge color={selected.is_active ? 'green' : 'gray'}>
                {selected.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium text-right">{selected.department ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pay Grade</span>
              <span className="font-medium text-right">{selected.pay_grade ?? '—'}</span>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
