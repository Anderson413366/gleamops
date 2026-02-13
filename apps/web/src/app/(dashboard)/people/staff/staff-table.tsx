'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { StaffForm } from '@/components/forms/staff-form';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  ON_LEAVE: 'yellow',
  TERMINATED: 'red',
};

const ROLE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'yellow' | 'gray'> = {
  OWNER_ADMIN: 'purple',
  MANAGER: 'blue',
  SUPERVISOR: 'green',
  INSPECTOR: 'orange',
  SALES: 'yellow',
  CLEANER: 'gray',
};

interface StaffTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StaffTable({ search, autoCreate, onAutoCreateHandled }: StaffTableProps) {
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);

  const handleAdd = () => { setEditItem(null); setFormOpen(true); };
  const handleEdit = (item: Staff) => { setEditItem(item); setFormOpen(true); };

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

  useEffect(() => {
    if (autoCreate && !loading) {
      handleAdd();
      onAutoCreateHandled?.();
    }
  }, [autoCreate, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.staff_code.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.staff_status?.toLowerCase().includes(q) ?? false) ||
        (r.employment_type?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'full_name', 'asc'
  );
  const sortedRows = sorted as unknown as Staff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={8} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No staff found"
          description={search ? 'Try a different search term.' : 'Add your first staff member.'}
        />
        <StaffForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          initialData={editItem}
          onSuccess={fetchData}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="staff"
          columns={[
            { key: 'staff_code', label: 'Code' },
            { key: 'full_name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'staff_status', label: 'Status' },
            { key: 'employment_type', label: 'Employment' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'hire_date', label: 'Hire Date' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
            <TableHead sortable sorted={sortKey === 'role' && sortDir} onSort={() => onSort('role')}>Role</TableHead>
            <TableHead sortable sorted={sortKey === 'staff_status' && sortDir} onSort={() => onSort('staff_status')}>Status</TableHead>
            <TableHead>Employment</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead sortable sorted={sortKey === 'hire_date' && sortDir} onSort={() => onSort('hire_date')}>Hire Date</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.staff_code}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>
                <Badge color={ROLE_COLORS[row.role] ?? 'gray'}>
                  {row.role.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge color={STATUS_COLORS[row.staff_status ?? 'ACTIVE'] ?? 'gray'}>
                  {(row.staff_status ?? 'ACTIVE').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.employment_type ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.mobile_phone ?? row.phone ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.hire_date ?? null)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <StaffForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
