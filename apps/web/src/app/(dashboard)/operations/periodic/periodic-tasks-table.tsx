'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Badge,
  Pagination,
  TableSkeleton,
  ExportButton,
  ViewToggle,
  Button,
  cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PeriodicTaskForm } from '@/components/forms/periodic-task-form';
import { PeriodicTaskCardGrid, type PeriodicTaskCardItem } from './periodic-task-card-grid';

interface PeriodicTasksTableProps {
  search: string;
}

type DueScope = 'ALL' | 'OVERDUE' | 'DUE_SOON';
type PeriodicTaskRow = PeriodicTaskCardItem & {
  task_type: string;
};

const STATUS_OPTIONS = ['all', 'ACTIVE', 'PAUSED'] as const;
const DUE_OPTIONS: Array<{ key: DueScope; label: string }> = [
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'DUE_SOON', label: 'Due This Week' },
  { key: 'ALL', label: 'All' },
];

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'PAUSED':
      return 'yellow';
    case 'ARCHIVED':
      return 'gray';
    default:
      return 'gray';
  }
}

export default function PeriodicTasksTable({ search }: PeriodicTasksTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<PeriodicTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<DueScope>('OVERDUE');
  const [formOpen, setFormOpen] = useState(false);
  const { view, setView } = useViewPreference('operations-periodic-tasks');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/operations/periodic-tasks?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load periodic tasks.');
      }

      setRows((body.data ?? []) as PeriodicTaskRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load periodic tasks.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (dueFilter === 'OVERDUE') {
      list = list.filter((row) => row.is_overdue);
    } else if (dueFilter === 'DUE_SOON') {
      list = list.filter((row) => row.is_due_soon);
    }

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((row) =>
      row.periodic_code.toLowerCase().includes(query)
      || row.frequency.toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
      || row.task_type.toLowerCase().includes(query)
      || (row.site_job?.job_code ?? '').toLowerCase().includes(query)
      || (row.site_job?.site?.name ?? '').toLowerCase().includes(query)
      || (row.site_job?.site?.site_code ?? '').toLowerCase().includes(query)
      || (row.preferred_staff?.full_name ?? '').toLowerCase().includes(query)
      || (row.preferred_staff?.staff_code ?? '').toLowerCase().includes(query),
    );
  }, [rows, dueFilter, search]);

  const dueCounts = useMemo(() => {
    return {
      OVERDUE: rows.filter((row) => row.is_overdue).length,
      DUE_SOON: rows.filter((row) => row.is_due_soon).length,
      ALL: rows.length,
    };
  }, [rows]);

  const statusCounts = useMemo(() => {
    const active = rows.filter((row) => row.status === 'ACTIVE').length;
    const paused = rows.filter((row) => row.status === 'PAUSED').length;
    return {
      all: rows.length,
      ACTIVE: active,
      PAUSED: paused,
    };
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'next_due_date',
    'asc',
  );
  const sortedRows = sorted as unknown as PeriodicTaskRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Periodic Task
        </Button>

        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="periodic-tasks"
            columns={[
              { key: 'periodic_code', label: 'Periodic Code' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'task_type', label: 'Task Type' },
              { key: 'next_due_date', label: 'Next Due' },
              { key: 'status', label: 'Status' },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              statusFilter === status ? 'bg-primary-foreground/20' : 'bg-background',
            )}
            >
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {DUE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setDueFilter(option.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
              dueFilter === option.key
                ? option.key === 'OVERDUE'
                  ? 'bg-red-600 text-white'
                  : option.key === 'DUE_SOON'
                    ? 'bg-yellow-500 text-yellow-950'
                    : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {option.label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              dueFilter === option.key ? 'bg-background/20' : 'bg-background',
            )}
            >
              {dueCounts[option.key]}
            </span>
          </button>
        ))}
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<RefreshCw className="h-12 w-12" />}
            title="No periodic tasks"
            description="Create recurring work so route generation can auto-inject it."
            actionLabel="Create Periodic Task"
            onAction={() => setFormOpen(true)}
          />
        ) : (
          <PeriodicTaskCardGrid
            rows={pag.page}
            onSelect={(row) => router.push(`/operations/periodic/${encodeURIComponent(row.periodic_code)}`)}
          />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'periodic_code' && sortDir} onSort={() => onSort('periodic_code')}>Code</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead sortable sorted={sortKey === 'frequency' && sortDir} onSort={() => onSort('frequency')}>Frequency</TableHead>
                  <TableHead sortable sorted={sortKey === 'last_completed_at' && sortDir} onSort={() => onSort('last_completed_at')}>Last Done</TableHead>
                  <TableHead sortable sorted={sortKey === 'next_due_date' && sortDir} onSort={() => onSort('next_due_date')}>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/operations/periodic/${encodeURIComponent(row.periodic_code)}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.periodic_code}</TableCell>
                    <TableCell>{row.task_type.replaceAll('_', ' ')}</TableCell>
                    <TableCell>{row.site_job?.site?.name ?? row.site_job?.site?.site_code ?? row.site_job?.job_code ?? 'Unknown'}</TableCell>
                    <TableCell>{row.frequency}</TableCell>
                    <TableCell>{row.last_completed_at ? new Date(row.last_completed_at).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell className={row.is_overdue ? 'text-red-600 font-semibold' : undefined}>
                      {new Date(`${row.next_due_date}T00:00:00.000Z`).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color={statusColor(row.status)}>{row.status}</Badge>
                        {row.is_overdue ? <Badge color="red">OVERDUE</Badge> : null}
                        {!row.is_overdue && row.is_due_soon ? <Badge color="yellow">DUE SOON</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{row.preferred_staff?.full_name ?? row.preferred_staff?.staff_code ?? 'Unassigned'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-12 w-12" />}
              title="No periodic tasks"
              description="Create recurring work so route generation can auto-inject it."
              actionLabel="Create Periodic Task"
              onAction={() => setFormOpen(true)}
            />
          ) : null}
        </>
      )}

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

      <PeriodicTaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={async () => {
          setFormOpen(false);
          await load();
        }}
      />
    </div>
  );
}

