'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Equipment } from '@gleamops/shared';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClassByColor, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { EquipmentCardGrid } from './equipment-card-grid';
import { EquipmentForm } from '@/components/forms/equipment-form';
import { EntityAvatar } from '@/components/directory/entity-avatar';
import { EntityLink } from '@/components/links/entity-link';

interface EquipmentRow extends Equipment {
  staff?: { full_name: string; staff_code?: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface EquipmentAssignmentLite {
  equipment_id: string;
  assigned_date: string;
  staff?: { full_name: string; staff_code?: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
  onSelect?: (eq: EquipmentRow) => void;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

const STATUS_OPTIONS = ['GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE', 'all'] as const;

export default function EquipmentTable({ search, onSelect, formOpen, onFormClose, onRefresh }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('GOOD');
  const { view, setView } = useViewPreference('equipment');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('equipment')
      .select('*, staff:assigned_to(full_name, staff_code), site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) {
      const equipmentRows = data as unknown as EquipmentRow[];
      if (equipmentRows.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ids = equipmentRows.map((row) => row.id);
      const { data: assignmentRows } = await supabase
        .from('equipment_assignments')
        .select('equipment_id, assigned_date, staff:staff_id(full_name, staff_code), site:site_id(name, site_code)')
        .in('equipment_id', ids)
        .is('archived_at', null)
        .is('returned_date', null)
        .order('assigned_date', { ascending: false });

      const fallbackByEquipmentId = new Map<string, EquipmentAssignmentLite>();
      for (const row of (assignmentRows ?? []) as unknown as EquipmentAssignmentLite[]) {
        if (!fallbackByEquipmentId.has(row.equipment_id)) {
          fallbackByEquipmentId.set(row.equipment_id, row);
        }
      }

      setRows(
        equipmentRows.map((row) => {
          const fallback = fallbackByEquipmentId.get(row.id);
          return {
            ...row,
            staff: row.staff ?? fallback?.staff ?? null,
            site: row.site ?? fallback?.site ?? null,
          };
        })
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: EquipmentRow) => {
    if (onSelect) {
      onSelect(row);
    } else {
      router.push(`/assets/equipment/${encodeURIComponent(row.equipment_code)}`);
    }
  };

  const handleFormClose = () => {
    setCreateOpen(false);
    onFormClose?.();
  };

  const handleFormSuccess = () => {
    fetchData();
    onRefresh?.();
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const condition = row.condition ?? 'GOOD';
      counts[condition] = (counts[condition] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.condition ?? 'GOOD') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.equipment_code.toLowerCase().includes(q) ||
      (r.equipment_type ?? '').toLowerCase().includes(q) ||
      (r.serial_number ?? '').toLowerCase().includes(q) ||
      (r.manufacturer ?? '').toLowerCase().includes(q) ||
      (r.brand ?? '').toLowerCase().includes(q)
    );
  }, [rows, statusFilter, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as EquipmentRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No equipment yet'
    : `No ${selectedStatusLabel} equipment`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track asset condition, assignment, and site location in one place.'
      : `There are currently no equipment records with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered.map((row) => ({
            ...row,
            assigned_to_name: row.staff?.full_name ?? 'Not Set',
            site_name: row.site?.name ?? 'Not Set',
          })) as unknown as Record<string, unknown>[]}
          filename="equipment"
          columns={[
            { key: 'equipment_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'equipment_type', label: 'Type' },
            { key: 'serial_number', label: 'Serial #' },
            { key: 'assigned_to_name', label: 'Assigned To' },
            { key: 'site_name', label: 'Site' },
            { key: 'condition', label: 'Condition' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
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
        <EquipmentCardGrid rows={pag.page} onSelect={(item) => handleRowClick(item)} />
      ) : (
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'equipment_code' && sortDir} onSort={() => onSort('equipment_code')}>Code</TableHead>
              <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Serial #</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Condition</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={cn(
                  'cursor-pointer',
                  statusRowAccentClassByColor((EQUIPMENT_CONDITION_COLORS[row.condition ?? ''] as StatusColor) ?? 'gray')
                )}
              >
                <TableCell className="font-mono text-xs">
                  <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1">
                    <span className="truncate" title={row.equipment_code}>{row.equipment_code}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <EntityAvatar
                      name={row.name}
                      seed={row.equipment_code}
                      imageUrl={row.photo_url}
                      fallbackIcon={<Wrench className="h-3.5 w-3.5" />}
                      size="sm"
                    />
                    <StatusDot color={(EQUIPMENT_CONDITION_COLORS[row.condition ?? ''] as StatusColor) ?? 'gray'} />
                    <span className="inline-block max-w-[220px] truncate" title={row.name}>{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="inline-block max-w-[140px] truncate" title={row.equipment_type ?? 'Not Set'}>
                    {row.equipment_type ?? 'Not Set'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="inline-block max-w-[140px] truncate" title={row.serial_number ?? 'Not Set'}>
                    {row.serial_number ?? 'Not Set'}
                  </span>
                </TableCell>
                <TableCell>
                  {row.staff?.staff_code ? (
                    <EntityLink
                      entityType="staff"
                      code={row.staff.staff_code}
                      name={row.staff.full_name ?? row.staff.staff_code}
                      showCode={false}
                      stopPropagation
                      className="inline-block max-w-[170px] truncate text-muted-foreground align-middle"
                    />
                  ) : (
                    <span className="inline-block max-w-[170px] truncate text-muted-foreground" title={row.staff?.full_name ?? 'Not Set'}>
                      {row.staff?.full_name ?? 'Not Set'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.site?.site_code ? (
                    <EntityLink
                      entityType="site"
                      code={row.site.site_code}
                      name={row.site.name ?? row.site.site_code}
                      showCode={false}
                      stopPropagation
                      className="inline-block max-w-[170px] truncate text-muted-foreground align-middle"
                    />
                  ) : (
                    <span className="inline-block max-w-[170px] truncate text-muted-foreground" title={row.site?.name ?? 'Not Set'}>
                      {row.site?.name ?? 'Not Set'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge color={(EQUIPMENT_CONDITION_COLORS[row.condition ?? ''] as StatusColor) ?? 'gray'}>
                    {(row.condition ?? 'N/A').replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<Wrench className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Equipment' : undefined}
            onAction={showGuidedEmptyState ? () => setCreateOpen(true) : undefined}
          />
        </div>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <EquipmentForm
        open={createOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
