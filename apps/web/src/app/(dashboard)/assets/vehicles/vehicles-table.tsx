'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
  ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn, Button,
} from '@gleamops/ui';
import type { Vehicle } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { VehiclesCardGrid } from './vehicles-card-grid';
import { VehicleForm } from '@/components/forms/vehicle-form';
import { EntityAvatar } from '@/components/directory/entity-avatar';
import { EntityLink } from '@/components/links/entity-link';

interface VehicleWithAssigned extends Vehicle {
  assigned?: { full_name: string; staff_code: string } | null;
}

interface VehiclesTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

const STATUS_OPTIONS = ['ACTIVE', 'IN_SHOP', 'RETIRED', 'all'] as const;

export default function VehiclesTable({ search, formOpen, onFormClose, onRefresh }: VehiclesTableProps) {
  const [rows, setRows] = useState<VehicleWithAssigned[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'ACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.status ?? 'ACTIVE') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.vehicle_code.toLowerCase().includes(q) ||
        (r.name?.toLowerCase().includes(q) ?? false) ||
        (r.make?.toLowerCase().includes(q) ?? false) ||
        (r.model?.toLowerCase().includes(q) ?? false) ||
        (r.license_plate?.toLowerCase().includes(q) ?? false) ||
        (r.assigned?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, statusFilter, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'vehicle_code', 'asc'
  );
  const sortedRows = sorted as unknown as VehicleWithAssigned[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No vehicles yet'
    : `No ${selectedStatusLabel} vehicles`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track fleet availability, maintenance state, and assignments.'
      : 'All vehicles are currently in other statuses.';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Vehicle
        </Button>
        <div className="flex items-center gap-3">
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
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <VehiclesCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
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
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={cn(statusRowAccentClass(row.status))}
                  >
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <StatusDot status={row.status} />
                        <span>{row.vehicle_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <EntityAvatar
                          name={row.name ?? row.vehicle_code}
                          seed={row.vehicle_code}
                          imageUrl={row.photo_url}
                          fallbackIcon={<Truck className="h-3.5 w-3.5" />}
                          size="sm"
                        />
                        <span className="inline-block max-w-[220px] truncate" title={row.name ?? row.vehicle_code}>
                          {row.name ?? '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[row.make, row.model].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.year ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.license_plate ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.assigned?.staff_code ? (
                        <EntityLink
                          entityType="staff"
                          code={row.assigned.staff_code}
                          name={row.assigned.full_name ?? row.assigned.staff_code}
                          showCode={false}
                          stopPropagation
                        />
                      ) : (row.assigned?.full_name ?? '—')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Truck className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          )}
        </>
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
