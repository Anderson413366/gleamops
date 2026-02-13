'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { EquipmentAssignment } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface AssignmentRow extends EquipmentAssignment {
  equipment?: { name: string; equipment_code: string } | null;
  staff?: { full_name: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
}

export default function EqAssignmentsTable({ search }: Props) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('equipment_assignments')
      .select('*, equipment:equipment_id(name, equipment_code), staff:staff_id(full_name), site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('assigned_date', { ascending: false });
    if (!error && data) setRows(data as unknown as AssignmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.equipment?.name ?? '').toLowerCase().includes(q) ||
      (r.equipment?.equipment_code ?? '').toLowerCase().includes(q) ||
      (r.staff?.full_name ?? '').toLowerCase().includes(q) ||
      (r.site?.name ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'assigned_date', 'asc'
  );
  const sortedRows = sorted as unknown as AssignmentRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ArrowLeftRight className="h-12 w-12" />}
        title="No assignments found"
        description="Equipment checkout records will appear here."
      />
    );
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Equipment</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Site</TableHead>
            <TableHead sortable sorted={sortKey === 'assigned_date' && sortDir} onSort={() => onSort('assigned_date')}>
              Assigned
            </TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{row.equipment?.name ?? '—'}</span>
                  {row.equipment?.equipment_code && (
                    <span className="text-xs text-muted-foreground ml-2">{row.equipment.equipment_code}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell>{row.site?.name ?? '—'}</TableCell>
              <TableCell>{dateFmt.format(new Date(row.assigned_date + 'T00:00:00'))}</TableCell>
              <TableCell>
                <Badge color={row.returned_date ? 'gray' : 'green'}>
                  {row.returned_date ? 'Returned' : 'Checked Out'}
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
