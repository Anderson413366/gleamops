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
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  ExportButton,
} from '@gleamops/ui';
import type { TrainingCourse } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface CoursesTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function CoursesTable({ search, autoCreate, onAutoCreateHandled }: CoursesTableProps) {
  const [rows, setRows] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TrainingCourse | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form fields
  const [courseCode, setCourseCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [provider, setProvider] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const isEdit = !!editItem;

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

  const resetForm = useCallback(() => {
    setCourseCode('');
    setName('');
    setDescription('');
    setCategory('');
    setIsRequired(false);
    setRecurrenceMonths('');
    setDurationHours('');
    setProvider('');
    setIsActive(true);
    setNotes('');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
    const supabase = getSupabaseBrowserClient();
    supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'TRC' }).then(({ data }) => {
      if (data) setCourseCode(data);
    });
  }, [resetForm]);

  const handleEdit = useCallback((row: TrainingCourse) => {
    setEditItem(row);
    setCourseCode(row.course_code);
    setName(row.name);
    setDescription(row.description ?? '');
    setCategory(row.category ?? '');
    setIsRequired(row.is_required);
    setRecurrenceMonths(row.recurrence_months != null ? String(row.recurrence_months) : '');
    setDurationHours(row.duration_hours != null ? String(row.duration_hours) : '');
    setProvider(row.provider ?? '');
    setIsActive(row.is_active);
    setNotes(row.notes ?? '');
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!courseCode.trim()) errs.courseCode = 'Course code is required';
    if (!name.trim()) errs.name = 'Course name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id;

      const payload = {
        course_code: courseCode.trim(),
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        is_required: isRequired,
        recurrence_months: recurrenceMonths.trim() ? parseInt(recurrenceMonths.trim()) : null,
        duration_hours: durationHours.trim() ? parseFloat(durationHours.trim()) : null,
        provider: provider.trim() || null,
        is_active: isActive,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('training_courses')
          .update(payload)
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('training_courses').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Course updated' : 'Course created');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save course', { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Course Code"
            value={courseCode}
            readOnly
            disabled
            hint="Auto-generated"
            error={formErrors.courseCode}
          />
          <Input
            label="Course Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
            }}
            error={formErrors.name}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              hint="e.g., Safety, OSHA, Equipment"
            />
            <Input
              label="Provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              hint="Training provider name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (hours)"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              type="number"
              placeholder="0.0"
            />
            <Input
              label="Recurrence (months)"
              value={recurrenceMonths}
              onChange={(e) => setRecurrenceMonths(e.target.value)}
              type="number"
              placeholder="Leave empty for one-time"
              hint="Repeat every N months"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-border"
              />
              Required for all staff
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border"
              />
              Active
            </label>
          </div>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    );
  }

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No training courses found"
          description={search ? 'Try a different search term.' : 'Add your first training course to get started.'}
        />
        <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Course' : 'New Training Course'}>
          {renderForm()}
        </SlideOver>
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
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
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

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Course' : 'New Training Course'}>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
