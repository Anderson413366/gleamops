'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { VehicleMaintenance } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Badge,
  StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { toSafeDate } from '@/lib/utils/date';
import { MaintenanceForm } from '@/components/forms/maintenance-form';

interface MaintenanceRow extends VehicleMaintenance {
  vehicle?: { name: string; vehicle_code: string } | null;
}

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

function getUrgency(nextServiceDate: string | null): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!nextServiceDate) return { label: 'Not Scheduled', color: 'gray' };
  const today = new Date();
  const due = new Date(nextServiceDate);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', color: 'red' };
  if (diffDays <= 7) return { label: 'Due This Week', color: 'yellow' };
  return { label: 'Scheduled', color: 'green' };
}

export default function MaintenanceTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<MaintenanceRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('vehicle_maintenance')
      .select('*, vehicle:vehicle_id!vehicle_maintenance_vehicle_id_fkey(name, vehicle_code)')
      .is('archived_at', null)
      .order('service_date', { ascending: false });
    if (!error && data) setRows(data as unknown as MaintenanceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: MaintenanceRow) => {
    setEditItem(row);
    setCreateOpen(true);
  };

  const handleFormClose = () => {
    setCreateOpen(false);
    setEditItem(null);
    onFormClose?.();
  };

  const handleFormSuccess = () => {
    fetchData();
    onRefresh?.();
  };

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
      <>
        <EmptyState
          icon={<Settings2 className="h-12 w-12" />}
          title="No maintenance records"
          description="Equipment and vehicle service history will appear here."
        />
        <MaintenanceForm
          open={createOpen}
          onClose={handleFormClose}
          initialData={editItem}
          onSuccess={handleFormSuccess}
        />
      </>
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
            <TableHead>Next Svc Odometer</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleRowClick(row)}
              className={cn('cursor-pointer', statusRowAccentClass(getUrgency(row.next_service_date).label))}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <StatusDot status={getUrgency(row.next_service_date).label} />
                  <span className="font-medium">{row.vehicle?.name ?? '—'}</span>
                  {row.vehicle?.vehicle_code && (
                    <span className="text-xs text-muted-foreground ml-2">{row.vehicle.vehicle_code}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{dateFmt.format(toSafeDate(row.service_date))}</TableCell>
              <TableCell>{row.service_type}</TableCell>
              <TableCell>{row.performed_by ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.cost != null ? currFmt.format(row.cost) : '—'}
              </TableCell>
              <TableCell>
                {(() => {
                  const urgency = getUrgency(row.next_service_date);
                  return (
                    <div className="flex items-center gap-2">
                      {row.next_service_date
                        ? dateFmt.format(toSafeDate(row.next_service_date))
                        : <span className="text-muted-foreground">—</span>}
                      <Badge color={urgency.color}>{urgency.label}</Badge>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell className="text-sm">
                {row.next_service_odometer != null ? `${row.next_service_odometer.toLocaleString()} mi` : '—'}
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

      <MaintenanceForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
