'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import type { Task } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { TaskForm } from '@/components/forms/task-form';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'gray'> = {
  RESTROOM: 'blue',
  FLOOR_CARE: 'green',
  GENERAL: 'gray',
  SPECIALTY: 'purple',
  EXTERIOR: 'orange',
};

const UNIT_OPTIONS = [
  { value: 'SQFT_1000', label: 'per 1,000 sqft' },
  { value: 'EACH', label: 'Each' },
  { value: 'LINEAR_FT', label: 'Linear Ft' },
  { value: 'HOUR', label: 'Hour' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TasksTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
  onRefresh?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TasksTable({ search, autoCreate, onAutoCreateHandled, onRefresh }: TasksTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state (SlideOver for NEW only)
  const [formOpen, setFormOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (!fetchErr && data) setRows(data as unknown as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // autoCreate support
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (autoCreate && !loading) {
      setFormOpen(true);
      onAutoCreateHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, loading]);

  // ---------------------------------------------------------------------------
  // Filter + Sort + Paginate
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.task_code.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as Task[];
  const pag = usePagination(sortedRows, 25);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) return <TableSkeleton rows={6} cols={5} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-12 w-12" />}
        title="No tasks"
        description={search ? 'Try a different search term.' : 'Add your first task to start building service templates.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="tasks"
          columns={[
            { key: 'task_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Category' },
            { key: 'unit_code', label: 'Unit' },
            { key: 'production_rate_sqft_per_hour', label: 'Prod. Rate (sqft/hr)' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'task_code' && sortDir} onSort={() => onSort('task_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead sortable sorted={sortKey === 'production_rate_sqft_per_hour' && sortDir} onSort={() => onSort('production_rate_sqft_per_hour')}>Prod. Rate</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => router.push(`/services/tasks/${row.task_code}`)}>
              <TableCell className="font-mono text-xs">{row.task_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                {row.category ? (
                  <Badge color={CATEGORY_COLORS[row.category] ?? 'gray'}>
                    {row.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {UNIT_OPTIONS.find((u) => u.value === row.unit_code)?.label ?? row.unit_code}
              </TableCell>
              <TableCell className="text-sm">
                {row.production_rate_sqft_per_hour != null
                  ? `${row.production_rate_sqft_per_hour.toLocaleString()} sqft/hr`
                  : <span className="text-muted-foreground">--</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      {/* Task Create Form */}
      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={null}
        onSuccess={() => {
          fetchData();
          onRefresh?.();
        }}
      />
    </div>
  );
}
