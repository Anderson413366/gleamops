'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { EquipmentAssignment } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { toSafeDate } from '@/lib/utils/date';
import { EquipmentAssignmentForm } from '@/components/forms/equipment-assignment-form';
import { EntityLink } from '@/components/links/entity-link';

interface AssignmentRow extends EquipmentAssignment {
  equipment?: { name: string; equipment_code: string } | null;
  staff?: { full_name: string; staff_code?: string | null } | null;
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function EqAssignmentsTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssignmentRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('equipment_assignments')
      .select('*, equipment:equipment_id!equipment_assignments_equipment_id_fkey(name, equipment_code), staff:staff_id!equipment_assignments_staff_id_fkey(full_name, staff_code), site:site_id!staff_attendance_site_id_fkey(name, site_code)')
      .is('archived_at', null)
      .order('assigned_date', { ascending: false });
    if (!error && data) setRows(data as unknown as AssignmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleRowClick = (row: AssignmentRow) => {
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

  if (loading) return <TableSkeleton rows={8} cols={4} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ArrowLeftRight className="h-12 w-12" />}
          title="No assignments yet"
          description="Equipment checkout records will appear here."
        />
        <EquipmentAssignmentForm
          open={createOpen}
          onClose={handleFormClose}
          initialData={editItem}
          onSuccess={handleFormSuccess}
        />
      </>
    );
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead>Equipment</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Site</TableHead>
              <TableHead sortable sorted={sortKey === 'assigned_date' && sortDir} onSort={() => onSort('assigned_date')}>
                Assigned
              </TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
                <TableCell>
                  {row.equipment?.equipment_code ? (
                    <EntityLink
                      entityType="equipment"
                      code={row.equipment.equipment_code}
                      name={row.equipment.name ?? row.equipment.equipment_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    <span className="font-medium">{row.equipment?.name ?? '—'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.staff?.staff_code ? (
                    <EntityLink
                      entityType="staff"
                      code={row.staff.staff_code}
                      name={row.staff.full_name ?? row.staff.staff_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    row.staff?.full_name ?? '—'
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
                    />
                  ) : (
                    row.site?.name ?? '—'
                  )}
                </TableCell>
                <TableCell>{dateFmt.format(toSafeDate(row.assigned_date))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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

      <EquipmentAssignmentForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
