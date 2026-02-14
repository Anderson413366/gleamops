'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import type { Alert } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { formatDateTime } from '@/lib/utils/date';

const SEVERITY_COLORS: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  CRITICAL: 'red',
  WARNING: 'yellow',
  INFO: 'blue',
};

interface AlertTableProps {
  search: string;
}

export default function AlertsTable({ search }: AlertTableProps) {
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('alert_type', 'TIME_EXCEPTION')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as unknown as Alert[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.severity.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'created_at', 'desc'
  );
  const sortedRows = sorted as unknown as Alert[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12" />}
        title="No alerts"
        description={search ? 'Try a different search term.' : 'No time exception alerts to display.'}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'title' && sortDir} onSort={() => onSort('title')}>Title</TableHead>
            <TableHead sortable sorted={sortKey === 'severity' && sortDir} onSort={() => onSort('severity')}>Severity</TableHead>
            <TableHead>Details</TableHead>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Timestamp</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.title}</TableCell>
              <TableCell>
                <Badge color={SEVERITY_COLORS[row.severity] ?? 'gray'}>{row.severity}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                {row.body ?? '—'}
              </TableCell>
              <TableCell>{formatDateTime(row.created_at)}</TableCell>
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
