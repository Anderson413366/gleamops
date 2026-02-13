'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { HardHat } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Subcontractor } from '@gleamops/shared';
import { SUBCONTRACTOR_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
  onSelect?: (sub: Subcontractor) => void;
}

export default function SubcontractorsTable({ search, onSelect }: Props) {
  const [rows, setRows] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .is('archived_at', null)
      .order('company_name');
    if (!error && data) setRows(data as Subcontractor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.company_name.toLowerCase().includes(q) ||
      r.subcontractor_code.toLowerCase().includes(q) ||
      (r.contact_name ?? '').toLowerCase().includes(q) ||
      (r.services_provided ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'company_name', 'asc');
  const sortedRows = sorted as unknown as Subcontractor[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<HardHat className="h-10 w-10" />}
        title="No subcontractors found"
        description={search ? 'Try a different search term.' : 'Add a subcontractor to get started.'}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'subcontractor_code' && sortDir} onSort={() => onSort('subcontractor_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'company_name' && sortDir} onSort={() => onSort('company_name')}>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.subcontractor_code}</TableCell>
              <TableCell className="font-medium">{row.company_name}</TableCell>
              <TableCell>{row.contact_name ?? '—'}</TableCell>
              <TableCell>{row.phone ?? '—'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{row.services_provided ?? '—'}</TableCell>
              <TableCell>
                <Badge color={(SUBCONTRACTOR_STATUS_COLORS[row.status] as StatusColor) ?? 'gray'}>
                  {row.status}
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
