'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
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
  Button,
  ViewToggle,
  cn,
} from '@gleamops/ui';
import type { Task } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { getStatusPillColor } from '@/lib/utils/status-colors';
import { useViewPreference } from '@/hooks/use-view-preference';
import { TaskForm } from '@/components/forms/task-form';
import { TaskCatalogCardGrid } from './task-catalog-card-grid';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'all'] as const;
const PRIORITY_OPTIONS = ['all', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'] as const;

const PRIORITY_COLORS: Record<string, 'red' | 'yellow' | 'blue' | 'green' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'yellow',
  NORMAL: 'blue',
  LOW: 'green',
};

interface TaskCatalogTableProps {
  search: string;
}

function formatCategory(category: string | null, subcategory: string | null): string {
  const pretty = (value: string | null) =>
    value
      ? value.toLowerCase().replace(/_/g, ' ').replace(/\\b\\w/g, (char) => char.toUpperCase())
      : null;
  const main = pretty(category);
  const sub = pretty(subcategory);
  if (!main && !sub) return 'Uncategorized';
  if (!sub) return main ?? 'Uncategorized';
  if (!main) return sub;
  return `${main} - ${sub}`;
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return 'Not Set';
  return Number(minutes).toFixed(2).replace(/\.00$/, '.0');
}

function formatRate(task: Task): string {
  if (task.production_rate) return task.production_rate;
  if (task.production_rate_sqft_per_hour != null && task.unit_code === 'SQFT_1000') {
    return `${Number(task.production_rate_sqft_per_hour).toLocaleString()} Per Thousand Sq. Ft.`;
  }
  if (task.production_rate_sqft_per_hour != null && task.unit_code === 'EACH') {
    return `${Number(task.production_rate_sqft_per_hour).toLocaleString()} Each`;
  }
  return 'Not Set';
}

export default function TaskCatalogTable({ search }: TaskCatalogTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { view, setView } = useViewPreference('taskCatalog');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('archived_at', null)
      .order('name');

    if (error) {
      toast.error(error.message);
    } else {
      setRows((data as Task[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = (row.status ?? (row.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((task) => {
        const status = (task.status ?? (task.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        return status === statusFilter;
      });
    }
    if (categoryFilter !== 'all') {
      result = result.filter((task) => (task.category ?? 'Uncategorized') === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((task) => (task.priority_level ?? 'MEDIUM') === priorityFilter);
    }
    if (!search) return result;

    const q = search.toLowerCase();
    return result.filter((task) =>
      task.name.toLowerCase().includes(q) ||
      task.code.toLowerCase().includes(q) ||
      (task.category ?? '').toLowerCase().includes(q) ||
      (task.subcategory ?? '').toLowerCase().includes(q) ||
      (task.production_rate ?? '').toLowerCase().includes(q)
    );
  }, [rows, search, statusFilter, categoryFilter, priorityFilter]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((task) => task.category?.trim()).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as Task[];
  const pag = usePagination(sortedRows, 25);

  const selectedStatusLabel = statusFilter === 'all' ? 'all' : statusFilter.toLowerCase();
  const emptyTitle = statusFilter === 'all' ? 'No tasks yet' : `No ${selectedStatusLabel} tasks`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Build your master task library to standardize scope of work.'
      : `There are currently no tasks with ${selectedStatusLabel} status.`;

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((task) => ({
              ...task,
              task_label: `${task.name} (${task.code})`,
              category_display: formatCategory(task.category, task.subcategory),
              priority_display: task.priority_level ?? 'Not Set',
              minutes_display: formatMinutes(task.default_minutes),
              rate_display: formatRate(task),
              status_display: (task.status ?? (task.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase(),
            })) as unknown as Record<string, unknown>[]}
            filename="task-catalog"
            columns={[
              { key: 'task_label', label: 'Task' },
              { key: 'category_display', label: 'Category' },
              { key: 'priority_display', label: 'Priority' },
              { key: 'minutes_display', label: 'Est. Minutes' },
              { key: 'rate_display', label: 'Production Rate' },
              { key: 'status_display', label: 'Status' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? getStatusPillColor(status)
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority === 'all'
                ? 'All Priorities'
                : priority.charAt(0) + priority.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={!search && statusFilter === 'all' ? '+ Add Your First Task' : undefined}
              onAction={!search && statusFilter === 'all' ? () => setFormOpen(true) : undefined}
            />
          </div>
        ) : (
          <TaskCatalogCardGrid
            rows={pag.page}
            onSelect={(task) => router.push(`/operations/task-catalog/${encodeURIComponent(task.code)}`)}
          />
        )
      ) : (
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Task</TableHead>
                <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>Category</TableHead>
                <TableHead sortable sorted={sortKey === 'priority_level' && sortDir} onSort={() => onSort('priority_level')}>Priority</TableHead>
                <TableHead sortable sorted={sortKey === 'default_minutes' && sortDir} onSort={() => onSort('default_minutes')}>Est. Minutes</TableHead>
                <TableHead>Production Rate</TableHead>
                <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((task) => {
                const status = (task.status ?? (task.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/operations/task-catalog/${encodeURIComponent(task.code)}`)}
                  >
                    <TableCell>
                      <div className="max-w-[300px]">
                        <p className="truncate text-sm font-semibold text-foreground" title={task.name}>{task.name}</p>
                        <p className="truncate text-xs text-muted-foreground font-mono" title={task.code}>{task.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-block max-w-[240px] truncate" title={formatCategory(task.category, task.subcategory)}>
                        {formatCategory(task.category, task.subcategory)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.priority_level ? (
                        <Badge color={PRIORITY_COLORS[task.priority_level] ?? 'gray'}>
                          {task.priority_level.toLowerCase().replace(/\\b\\w/g, (char) => char.toUpperCase())}
                        </Badge>
                      ) : (
                        <span className="italic text-muted-foreground">Not Set</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{formatMinutes(task.default_minutes)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-block max-w-[280px] truncate" title={formatRate(task)}>{formatRate(task)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge color={status === 'ACTIVE' ? 'green' : 'gray'} dot>
                        {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length === 0 && view !== 'card' && (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={!search && statusFilter === 'all' ? '+ Add Your First Task' : undefined}
            onAction={!search && statusFilter === 'all' ? () => setFormOpen(true) : undefined}
          />
        </div>
      )}

      {filtered.length > 0 && (
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
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={null}
        onSuccess={fetchData}
      />
    </div>
  );
}
