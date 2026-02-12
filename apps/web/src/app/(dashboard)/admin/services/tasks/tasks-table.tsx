'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClipboardList, Save, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver,
  Input, Select, Button,
} from '@gleamops/ui';
import type { Task } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORY_OPTIONS = [
  { value: 'RESTROOM', label: 'Restroom' },
  { value: 'FLOOR_CARE', label: 'Floor Care' },
  { value: 'GENERAL', label: 'General' },
  { value: 'SPECIALTY', label: 'Specialty' },
  { value: 'EXTERIOR', label: 'Exterior' },
];

const UNIT_OPTIONS = [
  { value: 'SQFT_1000', label: 'per 1,000 sqft' },
  { value: 'EACH', label: 'Each' },
  { value: 'LINEAR_FT', label: 'Linear Ft' },
  { value: 'HOUR', label: 'Hour' },
];

const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'gray'> = {
  RESTROOM: 'blue',
  FLOOR_CARE: 'green',
  GENERAL: 'gray',
  SPECIALTY: 'purple',
  EXTERIOR: 'orange',
};

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
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver state
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Form fields
  const [taskCode, setTaskCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unitCode, setUnitCode] = useState('SQFT_1000');
  const [productionRate, setProductionRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      handleAdd();
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
  // Form helpers
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setTaskCode('');
    setName('');
    setCategory('');
    setUnitCode('SQFT_1000');
    setProductionRate('');
    setError(null);
  };

  const handleAdd = async () => {
    resetForm();
    setEditTask(null);

    // Auto-generate code
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'TSK' });
    setTaskCode(codeData || `TSK-${Date.now()}`);

    setFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setTaskCode(task.task_code);
    setName(task.name);
    setCategory(task.category ?? '');
    setUnitCode(task.unit_code ?? 'SQFT_1000');
    setProductionRate(task.production_rate_sqft_per_hour != null ? String(task.production_rate_sqft_per_hour) : '');
    setError(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditTask(null);
    resetForm();
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Task name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); setError('Authentication error'); return; }

    const payload = {
      name: name.trim(),
      category: category || null,
      unit_code: unitCode,
      production_rate_sqft_per_hour: productionRate ? Number(productionRate) : null,
    };

    if (editTask) {
      // Update
      const { error: updateErr } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', editTask.id);
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      // Insert
      const { error: insertErr } = await supabase
        .from('tasks')
        .insert({
          ...payload,
          tenant_id: tenantId,
          task_code: taskCode,
        });
      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    handleClose();
    fetchData();
    onRefresh?.();
  };

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
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.task_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                {row.category ? (
                  <Badge color={CATEGORY_COLORS[row.category] ?? 'gray'}>
                    {row.category}
                  </Badge>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </TableCell>
              <TableCell className="text-muted text-sm">
                {UNIT_OPTIONS.find((u) => u.value === row.unit_code)?.label ?? row.unit_code}
              </TableCell>
              <TableCell className="text-sm">
                {row.production_rate_sqft_per_hour != null
                  ? `${row.production_rate_sqft_per_hour.toLocaleString()} sqft/hr`
                  : <span className="text-muted">--</span>}
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

      {/* Task Form SlideOver */}
      <SlideOver
        open={formOpen}
        onClose={handleClose}
        title={editTask ? 'Edit Task' : 'New Task'}
        subtitle="Define an atomic cleaning activity"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input
            label="Task Code"
            value={taskCode}
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Vacuum Carpeted Areas"
            required
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Select category..."
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Unit"
            value={unitCode}
            onChange={(e) => setUnitCode(e.target.value)}
            options={UNIT_OPTIONS}
          />
          <Input
            label="Production Rate (sqft/hr)"
            type="number"
            value={productionRate}
            onChange={(e) => setProductionRate(e.target.value)}
            placeholder="e.g., 5000"
            min={0}
            hint="How many square feet per hour for this task"
          />

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" />
              {editTask ? 'Save Changes' : 'Create Task'}
            </Button>
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
