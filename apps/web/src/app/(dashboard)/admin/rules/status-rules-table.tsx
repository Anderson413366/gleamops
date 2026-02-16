'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { GitBranch } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { StatusTransition } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
}

export default function StatusRulesTable({ search }: Props) {
  const [rows, setRows] = useState<StatusTransition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('status_transitions')
      .select('*')
      .order('entity_type')
      .order('from_status');
    if (!error && data) setRows(data as StatusTransition[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.entity_type.toLowerCase().includes(q) ||
      r.from_status.toLowerCase().includes(q) ||
      r.to_status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'entity_type',
    'asc'
  );
  const sortedRows = sorted as unknown as StatusTransition[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={4} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<GitBranch className="h-10 w-10" />}
        title="No status rules yet"
        description="No status transition rules match your search criteria."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'entity_type' && sortDir} onSort={() => onSort('entity_type')}>Entity</TableHead>
            <TableHead sortable sorted={sortKey === 'from_status' && sortDir} onSort={() => onSort('from_status')}>From</TableHead>
            <TableHead sortable sorted={sortKey === 'to_status' && sortDir} onSort={() => onSort('to_status')}>To</TableHead>
            <TableHead>Allowed Roles</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge color="purple">{row.entity_type.replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.from_status}</TableCell>
              <TableCell className="font-mono text-xs">{row.to_status}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(row.allowed_roles ?? []).map((r) => (
                    <Badge key={r} color="blue">{r.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
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
