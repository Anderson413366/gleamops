'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { VehicleMaintenance } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface MaintenanceRow extends VehicleMaintenance {
  vehicle?: { name: string; vehicle_code: string } | null;
}

interface Props {
  search: string;
}

export default function MaintenanceTable({ search }: Props) {
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('vehicle_maintenance')
      .select('*, vehicle:vehicle_id(name, vehicle_code)')
      .is('archived_at', null)
      .order('service_date', { ascending: false });
    if (!error && data) setRows(data as unknown as MaintenanceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.vehicle?.name ?? '').toLowerCase().includes(q) ||
      (r.vehicle?.vehicle_code ?? '').toLowerCase().includes(q) ||
      r.service_type.toLowerCase().includes(q) ||
      (r.performed_by ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'service_date', 'asc'
  );
  const sortedRows = sorted as unknown as MaintenanceRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Settings2 className="h-12 w-12" />}
        title="No maintenance records"
        description="Vehicle service history will appear here."
      />
    );
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Vehicle</TableHead>
            <TableHead sortable sorted={sortKey === 'service_date' && sortDir} onSort={() => onSort('service_date')}>
              Date
            </TableHead>
            <TableHead sortable sorted={sortKey === 'service_type' && sortDir} onSort={() => onSort('service_type')}>
              Type
            </TableHead>
            <TableHead>Performed By</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Next Service</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{row.vehicle?.name ?? '—'}</span>
                  {row.vehicle?.vehicle_code && (
                    <span className="text-xs text-muted-foreground ml-2">{row.vehicle.vehicle_code}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{dateFmt.format(new Date(row.service_date + 'T00:00:00'))}</TableCell>
              <TableCell>{row.service_type}</TableCell>
              <TableCell>{row.performed_by ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.cost != null ? currFmt.format(row.cost) : '—'}
              </TableCell>
              <TableCell>
                {row.next_service_date
                  ? dateFmt.format(new Date(row.next_service_date + 'T00:00:00'))
                  : <span className="text-muted-foreground">—</span>}
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
