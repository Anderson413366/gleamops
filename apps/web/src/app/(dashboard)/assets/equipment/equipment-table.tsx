'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Equipment } from '@gleamops/shared';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { EquipmentCardGrid } from './equipment-card-grid';
import { EquipmentForm } from '@/components/forms/equipment-form';

interface EquipmentRow extends Equipment {
  staff?: { full_name: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
  onSelect?: (eq: EquipmentRow) => void;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EquipmentTable({ search, onSelect, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentRow | null>(null);
  const { view, setView } = useViewPreference('equipment');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('equipment')
      .select('*, staff:assigned_to(full_name), site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as EquipmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: EquipmentRow) => {
    if (onSelect) {
      onSelect(row);
    } else {
      setEditItem(row);
      setCreateOpen(true);
    }
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
      r.name.toLowerCase().includes(q) ||
      r.equipment_code.toLowerCase().includes(q) ||
      (r.equipment_type ?? '').toLowerCase().includes(q) ||
      (r.serial_number ?? '').toLowerCase().includes(q) ||
      (r.manufacturer ?? '').toLowerCase().includes(q) ||
      (r.brand ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as EquipmentRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={9} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Wrench className="h-12 w-12" />}
          title="No equipment found"
          description={search ? 'Try a different search term.' : 'Add equipment to get started.'}
        />
        <EquipmentForm
          open={createOpen}
          onClose={handleFormClose}
          initialData={editItem}
          onSuccess={handleFormSuccess}
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
          filename="equipment"
          columns={[
            { key: 'equipment_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'equipment_type', label: 'Type' },
            { key: 'manufacturer', label: 'Manufacturer' },
            { key: 'model_number', label: 'Model' },
            { key: 'serial_number', label: 'Serial #' },
            { key: 'condition', label: 'Condition' },
            { key: 'purchase_price', label: 'Cost' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      {view === 'card' ? (
        <EquipmentCardGrid rows={pag.page} onSelect={(item) => handleRowClick(item)} />
      ) : (
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'equipment_code' && sortDir} onSort={() => onSort('equipment_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Site</TableHead>
            <TableHead sortable sorted={sortKey === 'purchase_price' && sortDir} onSort={() => onSort('purchase_price')}>Cost</TableHead>
            <TableHead>Condition</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleRowClick(row)}
              className="cursor-pointer"
            >
              <TableCell className="font-mono text-xs">{row.equipment_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.equipment_type ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.manufacturer ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.model_number ?? '—'}</TableCell>
              <TableCell>{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell>{row.site?.name ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(row.purchase_price ?? null)}</TableCell>
              <TableCell>
                <Badge color={(EQUIPMENT_CONDITION_COLORS[row.condition ?? ''] as StatusColor) ?? 'gray'}>
                  {(row.condition ?? 'N/A').replace(/_/g, ' ')}
                </Badge>
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

      <EquipmentForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
