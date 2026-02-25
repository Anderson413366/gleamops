'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn, Button,
} from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { StaffForm } from '@/components/forms/staff-form';
import { EntityAvatar } from '@/components/directory/entity-avatar';
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
  showCreateButton?: boolean;
}

interface AssignmentLite {
  staff_id: string;
  end_date: string | null;
  job: { status: string | null } | null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(isFilled);
  return false;
}

function profilePercent(staff: Staff): number {
  const tracked: unknown[] = [
    staff.full_name,
    staff.role,
    staff.staff_status,
    staff.employment_type,
    staff.hire_date,
    staff.email,
    staff.mobile_phone ?? staff.phone,
    staff.pay_rate,
    staff.schedule_type,
    staff.address?.city,
    staff.address?.state,
    staff.emergency_contact_name,
    staff.emergency_contact_phone,
    staff.background_check_date,
  ];
  const complete = tracked.filter(isFilled).length;
  return Math.round((complete / tracked.length) * 100);
}

export default function StaffTable({
  search,
  autoCreate,
  onAutoCreateHandled,
  showCreateButton = true,
}: StaffTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Staff | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [activeJobsByStaff, setActiveJobsByStaff] = useState<Record<string, number>>({});

  const { view, setView } = useViewPreference('staff');
  const handleAdd = () => { setEditItem(null); setFormOpen(true); };

  const handleRowClick = (row: Staff) => {
    router.push(`/team/staff/${encodeURIComponent(row.staff_code)}`);
  };
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No staff yet'
    : `No ${selectedStatusLabel} staff`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Manage crew assignments, availability, and staffing performance.'
      : `There are currently no staff with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .is('archived_at', null)
      .order('full_name');
    if (!error && data) {
      const staffRows = data as unknown as Staff[];
      setRows(staffRows);

      if (staffRows.length > 0) {
        const staffIds = staffRows.map((row) => row.id);
        const { data: assignmentRows } = await supabase
          .from('job_staff_assignments')
          .select('staff_id, end_date, job:job_id(status)')
          .is('archived_at', null)
          .in('staff_id', staffIds);

        const counts: Record<string, number> = {};
        for (const assignment of (assignmentRows ?? []) as unknown as AssignmentLite[]) {
          const status = (assignment.job?.status ?? '').toUpperCase();
          const stillAssigned = !assignment.end_date;
          const isActiveJob = status === 'ACTIVE' || status === 'IN_PROGRESS';
          if (!stillAssigned || !isActiveJob) continue;
          counts[assignment.staff_id] = (counts[assignment.staff_id] ?? 0) + 1;
        }
        setActiveJobsByStaff(counts);
      } else {
        setActiveJobsByStaff({});
      }
    }
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

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          {showCreateButton && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4" /> New Staff
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((row) => ({
              ...row,
              role_display: row.role?.replace(/_/g, ' ') ?? 'Not Set',
              active_jobs: activeJobsByStaff[row.id] ?? 0,
              hire_date_display: row.hire_date ?? 'Not Set',
              profile_percent: profilePercent(row),
            })) as unknown as Record<string, unknown>[]}
            filename="staff"
            columns={[
              { key: 'staff_code', label: 'Code' },
              { key: 'full_name', label: 'Name' },
              { key: 'role_display', label: 'Role' },
              { key: 'employment_type', label: 'Employment' },
              { key: 'active_jobs', label: 'Active Jobs' },
              { key: 'hire_date_display', label: 'Hire Date' },
              { key: 'profile_percent', label: 'Profile %' },
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
            icon={<Users className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Staff Member' : undefined}
            onAction={showGuidedEmptyState ? handleAdd : undefined}
          >
            {showGuidedEmptyState && (
              <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Track staffing levels and active assignment load.</li>
                <li>Keep emergency contacts and HR details up to date.</li>
                <li>Spot profile gaps quickly with completion indicators.</li>
              </ul>
            )}
          </EmptyState>
        ) : (
          <StaffCardGrid rows={pag.page} onSelect={handleRowClick} activeJobsByStaff={activeJobsByStaff} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
                  <TableHead sortable sorted={sortKey === 'role' && sortDir} onSort={() => onSort('role')}>Role</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Active Jobs</TableHead>
                  <TableHead sortable sorted={sortKey === 'hire_date' && sortDir} onSort={() => onSort('hire_date')}>Hire Date</TableHead>
                  <TableHead>Profile %</TableHead>
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
                      <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                        <span className="truncate" title={row.staff_code}>{row.staff_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn('font-medium', isTerminated && 'line-through decoration-muted-foreground/70')}>
                      <div className="flex items-center gap-2">
                        <EntityAvatar
                          name={row.full_name}
                          seed={row.staff_code}
                          imageUrl={row.photo_url}
                          size="sm"
                        />
                        <StatusDot status={rowStatus} />
                        <span className="inline-block max-w-[220px] truncate" title={row.full_name}>{row.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color={ROLE_COLORS[row.role] ?? 'gray'}>
                        {row.role.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-block max-w-[160px] truncate" title={row.employment_type ?? 'Not Set'}>
                        {row.employment_type ?? 'Not Set'}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{activeJobsByStaff[row.id] ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.hire_date)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{profilePercent(row)}%</TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Staff Member' : undefined}
                onAction={showGuidedEmptyState ? handleAdd : undefined}
              >
                {showGuidedEmptyState && (
                  <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                    <li>Track staffing levels and active assignment load.</li>
                    <li>Keep emergency contacts and HR details up to date.</li>
                    <li>Spot profile gaps quickly with completion indicators.</li>
                  </ul>
                )}
              </EmptyState>
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
