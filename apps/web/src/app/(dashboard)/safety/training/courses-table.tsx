'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
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
  cn,
} from '@gleamops/ui';
import type { TrainingCourse } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { getStatusPillColor } from '@/lib/utils/status-colors';
import { TrainingCourseForm } from '@/components/forms/training-course-form';

interface CoursesTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

const STATUS_OPTIONS = ['REQUIRED', 'OPTIONAL', 'all'] as const;

export default function CoursesTable({ search, formOpen, onFormClose, onRefresh }: CoursesTableProps) {
  const [rows, setRows] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<TrainingCourse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('REQUIRED');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as TrainingCourse[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle external form open trigger
  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setCreateOpen(true);
      // Auto-generate course code for new courses
      const supabase = getSupabaseBrowserClient();
      void supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'TRC' });
    }
  }, [formOpen]);

  const handleRowClick = (row: TrainingCourse) => {
    setEditItem(row);
    setCreateOpen(true);
  };

  const handleAdd = () => {
    setEditItem(null);
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
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (statusFilter === 'REQUIRED' ? r.is_required : !r.is_required));
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.course_code.toLowerCase().includes(q) ||
        (r.category?.toLowerCase().includes(q)) ||
        (r.provider?.toLowerCase().includes(q))
    );
  }, [rows, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const requiredCount = rows.filter((row) => row.is_required).length;
    const optionalCount = rows.length - requiredCount;
    return {
      all: rows.length,
      REQUIRED: requiredCount,
      OPTIONAL: optionalCount,
    };
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as TrainingCourse[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all courses'
    : statusFilter.toLowerCase();
  const emptyTitle = statusFilter === 'all'
    ? 'No training courses yet'
    : `No ${selectedStatusLabel} training courses`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Build your training catalog for onboarding and recurring compliance.'
      : 'No courses in this category. Create your first training course to get started.';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? getStatusPillColor(status)
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                statusFilter === status ? 'bg-white/20' : 'bg-background'
              )}
            >
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="training-courses"
          columns={[
            { key: 'course_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Category' },
            { key: 'provider', label: 'Provider' },
            { key: 'duration_hours', label: 'Duration (hrs)' },
            { key: 'recurrence_months', label: 'Recurrence (mo)' },
            { key: 'is_required', label: 'Required' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'course_code' && sortDir} onSort={() => onSort('course_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>Category</TableHead>
            <TableHead sortable sorted={sortKey === 'provider' && sortDir} onSort={() => onSort('provider')}>Provider</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead>Required</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleRowClick(row)}>
              <TableCell className="font-mono text-xs">{row.course_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.provider ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.duration_hours != null ? `${row.duration_hours}h` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.recurrence_months != null ? `Every ${row.recurrence_months}mo` : 'One-time'}
              </TableCell>
              <TableCell>
                {row.is_required ? (
                  <Badge color="orange">Required</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Optional</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <BookOpen className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={search || statusFilter !== 'all' ? undefined : '+ Add Your First Training Course'}
            onAction={search || statusFilter !== 'all' ? undefined : handleAdd}
          >
            {!search && statusFilter === 'all' && (
              <ul className="space-y-2 text-left text-sm text-muted-foreground">
                <li>Create reusable course records with duration and recurrence.</li>
                <li>Standardize onboarding and refresher expectations.</li>
                <li>Make completion tracking and compliance follow-through easier.</li>
              </ul>
            )}
          </EmptyState>
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

      <TrainingCourseForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
