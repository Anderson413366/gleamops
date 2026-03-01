'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { CalendarCheck, Sparkles } from 'lucide-react';
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
import type { TrainingCompletion } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { EntityLink } from '@/components/links/entity-link';

interface CompletionsTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

interface CompletionRow extends TrainingCompletion {
  staff?: { full_name: string; staff_code?: string | null } | null;
  course?: { name: string; course_code: string } | null;
}

export default function CompletionsTable({ search, autoCreate, onAutoCreateHandled }: CompletionsTableProps) {
  const [rows, setRows] = useState<CompletionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompletionRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Lookups
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
  const [courseList, setCourseList] = useState<{ id: string; name: string; course_code: string; recurrence_months: number | null }[]>([]);

  // Form fields
  const [staffId, setStaffId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [score, setScore] = useState('');
  const [passed, setPassed] = useState<string>('');
  const [instructor, setInstructor] = useState('');
  const [notes, setNotes] = useState('');

  const isEdit = !!editItem;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [compRes, staffRes, courseRes] = await Promise.all([
      supabase
        .from('training_completions')
        .select('*, staff:staff_id(full_name, staff_code), course:course_id(name, course_code)')
        .is('archived_at', null)
        .order('completed_date', { ascending: false }),
      supabase
        .from('staff')
        .select('id, full_name')
        .is('archived_at', null)
        .order('full_name'),
      supabase
        .from('training_courses')
        .select('id, name, course_code, recurrence_months')
        .is('archived_at', null)
        .order('name'),
    ]);
    if (!compRes.error && compRes.data) setRows(compRes.data as unknown as CompletionRow[]);
    if (!staffRes.error && staffRes.data) setStaffList(staffRes.data);
    if (!courseRes.error && courseRes.data) setCourseList(courseRes.data as unknown as typeof courseList);
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
        (r.staff?.full_name?.toLowerCase().includes(q)) ||
        (r.course?.name?.toLowerCase().includes(q)) ||
        (r.course?.course_code?.toLowerCase().includes(q)) ||
        (r.instructor?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'completed_date',
    'desc'
  );
  const sortedRows = sorted as unknown as CompletionRow[];
  const pag = usePagination(sortedRows, 25);

  // Auto-compute expiry when course + completed_date change
  const computeExpiry = useCallback((cId: string, cDate: string) => {
    if (!cId || !cDate) return;
    const course = courseList.find((c) => c.id === cId);
    if (course?.recurrence_months) {
      const d = new Date(cDate);
      d.setMonth(d.getMonth() + course.recurrence_months);
      setExpiryDate(d.toISOString().split('T')[0]);
    } else {
      setExpiryDate('');
    }
  }, [courseList]);

  const resetForm = useCallback(() => {
    setStaffId('');
    setCourseId('');
    setCompletedDate('');
    setExpiryDate('');
    setScore('');
    setPassed('');
    setInstructor('');
    setNotes('');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const handleEdit = useCallback((row: CompletionRow) => {
    setEditItem(row);
    setStaffId(row.staff_id);
    setCourseId(row.course_id);
    setCompletedDate(row.completed_date);
    setExpiryDate(row.expiry_date ?? '');
    setScore(row.score != null ? String(row.score) : '');
    setPassed(row.passed != null ? (row.passed ? 'true' : 'false') : '');
    setInstructor(row.instructor ?? '');
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
    if (!staffId) errs.staffId = 'Staff member is required';
    if (!courseId) errs.courseId = 'Course is required';
    if (!completedDate) errs.completedDate = 'Completion date is required';
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
        staff_id: staffId,
        course_id: courseId,
        completed_date: completedDate,
        expiry_date: expiryDate || null,
        score: score.trim() ? parseFloat(score.trim()) : null,
        passed: passed === 'true' ? true : passed === 'false' ? false : null,
        instructor: instructor.trim() || null,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('training_completions')
          .update(payload)
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('training_completions').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Completion updated' : 'Completion recorded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save completion';
      toast.error(msg, { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Select
            label="Staff Member"
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setFormErrors((prev) => { const n = { ...prev }; delete n.staffId; return n; });
            }}
            options={[
              { value: '', label: 'Select staff...' },
              ...staffList.map((s) => ({ value: s.id, label: s.full_name })),
            ]}
            error={formErrors.staffId}
            required
          />
          <Select
            label="Course"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              computeExpiry(e.target.value, completedDate);
              setFormErrors((prev) => { const n = { ...prev }; delete n.courseId; return n; });
            }}
            options={[
              { value: '', label: 'Select course...' },
              ...courseList.map((c) => ({ value: c.id, label: `${c.course_code} — ${c.name}` })),
            ]}
            error={formErrors.courseId}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Completed Date"
              value={completedDate}
              onChange={(e) => {
                setCompletedDate(e.target.value);
                computeExpiry(courseId, e.target.value);
                setFormErrors((prev) => { const n = { ...prev }; delete n.completedDate; return n; });
              }}
              type="date"
              error={formErrors.completedDate}
              required
            />
            <Input
              label="Expiry Date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              type="date"
              hint="Auto-computed from course recurrence"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              type="number"
              placeholder="0-100"
              hint="Optional score (0–100)"
            />
            <Select
              label="Passed"
              value={passed}
              onChange={(e) => setPassed(e.target.value)}
              options={[
                { value: '', label: 'Not applicable' },
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </div>
          <Input
            label="Instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Record Completion'}
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
          icon={(
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              <CalendarCheck className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No training completions yet"
          description={search ? 'Try a different search term.' : 'Record completed training events and keep compliance current.'}
          actionLabel={search ? undefined : '+ Record First Completion'}
          onAction={search ? undefined : handleAdd}
        >
          {!search && (
            <ul className="space-y-2 text-left text-sm text-muted-foreground">
              <li>Log who completed each course and when.</li>
              <li>Track scores, pass status, and instructor notes.</li>
              <li>Auto-calculate renewal windows to prevent lapses.</li>
            </ul>
          )}
        </EmptyState>
        <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Completion' : 'Record Completion'}>
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
          filename="training-completions"
          columns={[
            { key: 'completed_date', label: 'Date' },
            { key: 'expiry_date', label: 'Expires' },
            { key: 'score', label: 'Score' },
            { key: 'passed', label: 'Passed' },
            { key: 'instructor', label: 'Instructor' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead>Staff</TableHead>
              <TableHead>Course</TableHead>
              <TableHead sortable sorted={sortKey === 'completed_date' && sortDir} onSort={() => onSort('completed_date')}>Completed</TableHead>
              <TableHead sortable sorted={sortKey === 'expiry_date' && sortDir} onSort={() => onSort('expiry_date')}>Expires</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Instructor</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => {
              const isExpired = row.expiry_date && new Date(row.expiry_date) < new Date();
              return (
                <TableRow key={row.id} onClick={() => handleEdit(row)}>
                  <TableCell className="font-medium">
                    {row.staff?.staff_code ? (
                      <EntityLink
                        entityType="staff"
                        code={row.staff.staff_code}
                        name={row.staff.full_name ?? row.staff.staff_code}
                        showCode={false}
                        stopPropagation
                      />
                    ) : (
                      row.staff?.full_name ?? '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{row.course?.course_code}</span>
                    <span className="ml-2">{row.course?.name ?? '—'}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.completed_date}</TableCell>
                  <TableCell>
                    {row.expiry_date ? (
                      <Badge color={isExpired ? 'red' : 'green'}>
                        {row.expiry_date}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.score != null ? `${row.score}%` : '—'}
                  </TableCell>
                  <TableCell>
                    {row.passed === true && <Badge color="green">Passed</Badge>}
                    {row.passed === false && <Badge color="yellow">Needs attention</Badge>}
                    {row.passed == null && <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.instructor ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
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

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Completion' : 'Record Completion'}>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
