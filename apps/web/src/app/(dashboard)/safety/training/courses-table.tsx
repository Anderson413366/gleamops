'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
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
} from '@gleamops/ui';
import type { TrainingCourse } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { TrainingCourseForm } from '@/components/forms/training-course-form';

interface CoursesTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function CoursesTable({ search, formOpen, onFormClose, onRefresh }: CoursesTableProps) {
  const [rows, setRows] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<TrainingCourse | null>(null);

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
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'TRC' }).then(({ data }) => {
        // The form will be opened; code generation is handled separately
      });
    }
  }, [formOpen]);

  const handleRowClick = (row: TrainingCourse) => {
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
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.course_code.toLowerCase().includes(q) ||
        (r.category?.toLowerCase().includes(q)) ||
        (r.provider?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as TrainingCourse[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No training courses found"
          description={search ? 'Try a different search term.' : 'Add your first training course to get started.'}
        />
        <TrainingCourseForm
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
            { key: 'is_active', label: 'Active' },
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
            <TableHead>Status</TableHead>
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
              <TableCell>
                <Badge color={row.is_active ? 'green' : 'gray'}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

      <TrainingCourseForm
        open={createOpen}
        onClose={handleFormClose}
        initialData={editItem}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
