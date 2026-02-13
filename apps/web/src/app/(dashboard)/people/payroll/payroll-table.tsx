'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DollarSign } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Staff } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  search: string;
}

export default function PayrollTable({ search }: Props) {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .is('archived_at', null)
      .order('full_name');
    if (!error && data) setRows(data as Staff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Wait for auth to load before checking role
  if (authLoading) return <TableSkeleton rows={8} cols={5} />;

  // Only OWNER_ADMIN can see payroll
  if (role !== 'OWNER_ADMIN') {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
        <p className="text-sm text-muted-foreground">Payroll data is only visible to Owner/Admin users.</p>
      </div>
    );
  }

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      r.staff_code.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'full_name', 'asc');
  const sortedRows = sorted as unknown as Staff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;
  if (filtered.length === 0) return <EmptyState icon={<DollarSign className="h-10 w-10" />} title="No payroll data" description="Payroll information will appear here when staff records are available." />;

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead sortable sorted={sortKey === 'pay_rate' && sortDir} onSort={() => onSort('pay_rate')}>Pay Rate</TableHead>
            <TableHead>Type</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.staff_code}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{row.pay_rate ? `${fmt.format(row.pay_rate)}/hr` : '—'}</TableCell>
              <TableCell>
                <Badge color={row.is_subcontractor ? 'orange' : 'blue'}>
                  {row.is_subcontractor ? 'Subcontractor' : 'Employee'}
                </Badge>
              </TableCell>
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
    </div>
  );
}
