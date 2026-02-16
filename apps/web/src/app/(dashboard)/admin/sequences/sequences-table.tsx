'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Hash } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SystemSequence } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
}

export default function SequencesTable({ search }: Props) {
  const [rows, setRows] = useState<SystemSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('system_sequences')
      .select('*')
      .order('prefix');
    if (!error && data) setRows(data as SystemSequence[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.prefix.toLowerCase().includes(q));
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'prefix',
    'asc'
  );
  const sortedRows = sorted as unknown as SystemSequence[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={3} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Hash className="h-10 w-10" />}
        title="No sequences yet"
        description="No system sequences match your search criteria."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'prefix' && sortDir} onSort={() => onSort('prefix')}>Prefix</TableHead>
            <TableHead sortable sorted={sortKey === 'current_value' && sortDir} onSort={() => onSort('current_value')}>Current Value</TableHead>
            <TableHead>Next Code</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono font-medium">{row.prefix}</TableCell>
              <TableCell>{row.current_value}</TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {row.prefix}-{String(row.current_value + 1).padStart(4, '0')}
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
        onGoTo={pag.goToPage}
      />
    </div>
  );
}
