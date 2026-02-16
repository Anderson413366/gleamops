'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { StaffForm } from '@/components/forms/staff-form';
import { StaffCardGrid } from './staff-card-grid';

const ROLE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'yellow' | 'gray'> = {
  OWNER_ADMIN: 'purple',
  MANAGER: 'blue',
  SUPERVISOR: 'green',
  INSPECTOR: 'orange',
  SALES: 'yellow',
  CLEANER: 'gray',
};

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'all'] as const;

interface StaffTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function StaffTable({ search, autoCreate, onAutoCreateHandled }: StaffTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const { view, setView } = useViewPreference('staff');
  const handleAdd = () => { setEditItem(null); setFormOpen(true); };

  const handleRowClick = (row: Staff) => {
    router.push(`/workforce/staff/${row.staff_code}`);
  };
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No staff found'
    : `No ${selectedStatusLabel} staff found`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Add your first staff member.'
      : 'All staff are currently in other statuses.';

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

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered.map((row) => ({
            ...row,
            role_badge: row.role?.replace(/_/g, ' ') ?? '—',
            mobile_phone_display: row.mobile_phone ?? row.phone ?? '—',
          })) as unknown as Record<string, unknown>[]}
          filename="staff"
          columns={[
            { key: 'staff_code', label: 'Code' },
            { key: 'full_name', label: 'Name' },
            { key: 'role_badge', label: 'Role Badge' },
            { key: 'employment_type', label: 'Employment' },
            { key: 'mobile_phone_display', label: 'Mobile Phone' },
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
            icon={<Users className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <StaffCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
                <TableHead sortable sorted={sortKey === 'role' && sortDir} onSort={() => onSort('role')}>Role Badge</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>Mobile Phone</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => {
                const rowStatus = row.staff_status ?? 'ACTIVE';
                const isTerminated = rowStatus === 'TERMINATED';
                return (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={cn(
                    'cursor-pointer',
                    statusRowAccentClass(rowStatus),
                    isTerminated && 'opacity-65'
                  )}
                >
                  <TableCell>
                    <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                      <StatusDot status={rowStatus} />
                      <span>{row.staff_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn('font-medium', isTerminated && 'line-through decoration-muted-foreground/70')}>
                    {row.full_name}
                  </TableCell>
                  <TableCell>
                    <Badge color={ROLE_COLORS[row.role] ?? 'gray'}>
                      {row.role.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.employment_type ?? '---'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.mobile_phone ?? row.phone ?? '---'}</TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          )}
        </>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}

      <StaffForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
