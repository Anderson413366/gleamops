'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface StaffTableProps {
  search: string;
}

export default function StaffTable({ search }: StaffTableProps) {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .is('archived_at', null)
      .order('full_name');
    if (!error && data) setRows(data as unknown as Staff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.staff_code.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'full_name', 'asc'
  );
  const sortedRows = sorted as unknown as Staff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No staff found"
        description={search ? 'Try a different search term.' : 'Add your first staff member.'}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.staff_code}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>
                <Badge color={row.role === 'OWNER_ADMIN' ? 'purple' : row.role === 'MANAGER' ? 'blue' : 'gray'}>
                  {row.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted">{row.email ?? '—'}</TableCell>
              <TableCell className="text-muted">{row.phone ?? '—'}</TableCell>
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
