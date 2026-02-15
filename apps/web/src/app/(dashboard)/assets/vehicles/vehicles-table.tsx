'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
  ExportButton, ViewToggle,
} from '@gleamops/ui';
import type { Vehicle } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { VehiclesCardGrid } from './vehicles-card-grid';
import { VehicleForm } from '@/components/forms/vehicle-form';

interface VehicleWithAssigned extends Vehicle {
  assigned?: { full_name: string; staff_code: string } | null;
}

interface VehiclesTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function VehiclesTable({ search, formOpen, onFormClose, onRefresh }: VehiclesTableProps) {
  const [rows, setRows] = useState<VehicleWithAssigned[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const { view, setView } = useViewPreference('vehicles');
  const router = useRouter();

  const supabase = getSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, assigned:assigned_to(full_name, staff_code)')
      .is('archived_at', null)
      .order('vehicle_code');
    if (!error && data) setRows(data as unknown as VehicleWithAssigned[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle external form open trigger (New Vehicle button from parent)
  useEffect(() => {
    if (formOpen) {
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleCreateClose = () => {
    setCreateOpen(false);
    onFormClose?.();
  };

  const handleCreateSuccess = () => {
    fetchData();
    onRefresh?.();
  };

  const handleRowClick = (row: VehicleWithAssigned) => {
    router.push(`/assets/vehicles/${row.vehicle_code}`);
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.vehicle_code.toLowerCase().includes(q) ||
        (r.name?.toLowerCase().includes(q) ?? false) ||
        (r.make?.toLowerCase().includes(q) ?? false) ||
        (r.model?.toLowerCase().includes(q) ?? false) ||
        (r.license_plate?.toLowerCase().includes(q) ?? false) ||
        (r.assigned?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'vehicle_code', 'asc'
  );
  const sortedRows = sorted as unknown as VehicleWithAssigned[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="No vehicles found"
          description={search ? 'Try a different search term.' : 'Add your first vehicle to get started.'}
        />
        <VehicleForm
          open={createOpen}
          onClose={handleCreateClose}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="vehicles"
          columns={[
            { key: 'vehicle_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'make', label: 'Make' },
            { key: 'model', label: 'Model' },
            { key: 'year', label: 'Year' },
            { key: 'license_plate', label: 'License Plate' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      {view === 'card' ? (
        <VehiclesCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'vehicle_code' && sortDir} onSort={() => onSort('vehicle_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Make / Model</TableHead>
            <TableHead sortable sorted={sortKey === 'year' && sortDir} onSort={() => onSort('year')}>Year</TableHead>
            <TableHead>License Plate</TableHead>
            <TableHead>Assigned To</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleRowClick(row)}>
              <TableCell className="font-mono text-xs">{row.vehicle_code}</TableCell>
              <TableCell className="font-medium">{row.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
                {[row.make, row.model].filter(Boolean).join(' ') || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.year ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.license_plate ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.assigned?.full_name ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <VehicleForm
        open={createOpen}
        onClose={handleCreateClose}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
