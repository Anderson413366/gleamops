'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, cn,
} from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { StaffForm } from '@/components/forms/staff-form';
import { StaffCardGrid } from './staff-card-grid';

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

const STATUS_OPTIONS = ['all', 'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const;

interface StaffTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

function formatDate(d: string | null) {
  if (!d) return '---';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StaffTable({ search, autoCreate, onAutoCreateHandled }: StaffTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { view, setView } = useViewPreference('staff');
  const handleAdd = () => { setEditItem(null); setFormOpen(true); };

  const handleRowClick = (row: Staff) => {
    router.push(`/people/staff/${row.staff_code}`);
  };

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      const s = r.staff_status ?? 'ACTIVE';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.staff_status ?? 'ACTIVE') === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.staff_code.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          (r.email?.toLowerCase().includes(q) ?? false) ||
          (r.staff_status?.toLowerCase().includes(q) ?? false) ||
          (r.employment_type?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

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
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
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
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatusFilter(status);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-blue-600 text-white'
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
        <StaffCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
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
            <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
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
              <TableCell className="text-muted-foreground">{row.employment_type ?? '---'}</TableCell>
              <TableCell className="text-muted-foreground">{row.email ?? '---'}</TableCell>
              <TableCell className="text-muted-foreground">{row.mobile_phone ?? row.phone ?? '---'}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.hire_date ?? null)}</TableCell>
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

      <StaffForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
