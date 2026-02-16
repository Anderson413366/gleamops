'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Layers, Plus, Save, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver,
  Input, Select, Textarea, Button, Card, CardHeader, CardTitle, CardContent,
  ExportButton,
} from '@gleamops/ui';
import type { Service, Task } from '@gleamops/shared';
import { FREQUENCIES } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServiceWithTaskCount extends Service {
  task_count?: number;
}

interface LinkedTask {
  id: string;
  task_id: string;
  frequency_default: string;
  sequence_order: number;
  is_required: boolean;
  estimated_minutes: number | null;
  quality_weight: number;
  priority_level: string | null;
  task: {
    task_code: string;
    name: string;
    category: string | null;
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ServiceConfigProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
  onRefresh?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ServiceConfig({ search, autoCreate, onAutoCreateHandled, onRefresh }: ServiceConfigProps) {
  const [rows, setRows] = useState<ServiceWithTaskCount[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver state
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const isEdit = !!selectedService;

  // Service form fields
  const [serviceCode, setServiceCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Linked tasks
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Available tasks for adding
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch services
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error: fetchErr } = await supabase
      .from('services')
      .select('*')
      .is('archived_at', null)
      .order('name');

    if (!fetchErr && data) {
      const services = data as unknown as ServiceWithTaskCount[];

      // Fetch task counts
      const serviceIds = services.map((s) => s.id);
      if (serviceIds.length > 0) {
        const { data: stData } = await supabase
          .from('service_tasks')
          .select('service_id')
          .in('service_id', serviceIds)
          .is('archived_at', null);

        if (stData) {
          const counts = new Map<string, number>();
          for (const item of stData) {
            counts.set(item.service_id, (counts.get(item.service_id) || 0) + 1);
          }
          for (const s of services) {
            s.task_count = counts.get(s.id) || 0;
          }
        }
      }

      setRows(services);
    }
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
        r.service_code.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as ServiceWithTaskCount[];
  const pag = usePagination(sortedRows, 25);

  // ---------------------------------------------------------------------------
  // Fetch linked tasks for selected service
  // ---------------------------------------------------------------------------
  const fetchLinkedTasks = useCallback(async (serviceId: string) => {
    setLoadingTasks(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('service_tasks')
      .select('id, task_id, frequency_default, sequence_order, is_required, estimated_minutes, quality_weight, priority_level, task:task_id(task_code, name, category)')
      .eq('service_id', serviceId)
      .is('archived_at', null)
      .order('sequence_order', { ascending: true });
    if (data) setLinkedTasks(data as unknown as LinkedTask[]);
    setLoadingTasks(false);
  }, []);

  // Fetch all tasks (for task picker)
  const fetchAllTasks = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (data) setAllTasks(data as unknown as Task[]);
  }, []);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setServiceCode('');
    setName('');
    setDescription('');
    setLinkedTasks([]);
    setShowTaskPicker(false);
    setError(null);
  };

  const handleAdd = async () => {
    resetForm();
    setSelectedService(null);

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'SVC' });
    setServiceCode(codeData || `SVC-${Date.now()}`);

    await fetchAllTasks();
    setConfigOpen(true);
  };

  const handleSelect = async (service: ServiceWithTaskCount) => {
    setSelectedService(service);
    setServiceCode(service.service_code);
    setName(service.name);
    setDescription(service.description ?? '');
    setError(null);

    await Promise.all([
      fetchLinkedTasks(service.id),
      fetchAllTasks(),
    ]);
    setConfigOpen(true);
  };

  const handleClose = () => {
    setConfigOpen(false);
    setSelectedService(null);
    resetForm();
  };

  // ---------------------------------------------------------------------------
  // Save service header
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Service name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); setError('Authentication error'); return; }

    if (isEdit && selectedService) {
      const { error: updateErr } = await supabase
        .from('services')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', selectedService.id);
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      // Create new service
      const { data: newSvc, error: insertErr } = await supabase
        .from('services')
        .insert({
          tenant_id: tenantId,
          service_code: serviceCode,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select()
        .single();

      if (insertErr || !newSvc) {
        setError(insertErr?.message ?? 'Failed to create service');
        setSaving(false);
        return;
      }

      // Switch to edit mode with the newly created service
      setSelectedService(newSvc as unknown as Service);
    }

    setSaving(false);
    fetchData();
    onRefresh?.();
    toast.success(isEdit ? 'Service updated' : 'Service created');
  };

  // ---------------------------------------------------------------------------
  // Add task to service
  // ---------------------------------------------------------------------------
  const handleAddTask = async (task: Task) => {
    if (!selectedService) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) return;

    const { error: insertErr } = await supabase
      .from('service_tasks')
      .insert({
        tenant_id: tenantId,
        service_id: selectedService.id,
        task_id: task.id,
        frequency_default: 'DAILY',
      });

    if (!insertErr) {
      await fetchLinkedTasks(selectedService.id);
      setShowTaskPicker(false);
      fetchData();
    }
  };

  // ---------------------------------------------------------------------------
  // Update any service_task field inline
  // ---------------------------------------------------------------------------
  const handleUpdateField = async (serviceTaskId: string, field: string, value: unknown) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('service_tasks')
      .update({ [field]: value })
      .eq('id', serviceTaskId);

    if (selectedService) {
      await fetchLinkedTasks(selectedService.id);
    }
  };

  // ---------------------------------------------------------------------------
  // Remove task from service (soft-delete)
  // ---------------------------------------------------------------------------
  const handleRemoveTask = async (serviceTaskId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('service_tasks')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', serviceTaskId);

    if (selectedService) {
      await fetchLinkedTasks(selectedService.id);
      fetchData();
    }
  };

  // ---------------------------------------------------------------------------
  // Available tasks (not already linked)
  // ---------------------------------------------------------------------------
  const linkedTaskIds = new Set(linkedTasks.map((lt) => lt.task_id));
  const availableTasks = allTasks.filter((t) => !linkedTaskIds.has(t.id));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) return <TableSkeleton rows={6} cols={4} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="h-12 w-12" />}
        title="No services"
        description={search ? 'Try a different search term.' : 'Create your first service template to group tasks together.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="services"
          columns={[
            { key: 'service_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'task_count', label: '# Tasks' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'service_code' && sortDir} onSort={() => onSort('service_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead># Tasks</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleSelect(row)}>
              <TableCell className="font-mono text-xs">{row.service_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{row.description ?? '--'}</TableCell>
              <TableCell>
                <Badge color={row.task_count ? 'blue' : 'gray'}>
                  {row.task_count ?? 0}
                </Badge>
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

      {/* Service Configurator SlideOver */}
      <SlideOver
        open={configOpen}
        onClose={handleClose}
        title={isEdit ? `Configure: ${selectedService?.name ?? ''}` : 'New Service'}
        subtitle="Build a service template by linking tasks"
        wide
      >
        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Service Code"
                  value={serviceCode}
                  disabled
                  hint="Auto-generated"
                />
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Nightly Janitorial"
                  required
                />
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this service includes..."
                  rows={2}
                />
                <div className="flex gap-3">
                  <Button onClick={handleSave} loading={saving} size="sm">
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Save Details' : 'Create Service'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Tasks — only show after service is created */}
          {isEdit && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      Linked Tasks ({linkedTasks.length})
                    </span>
                  </CardTitle>
                  <Button size="sm" variant="secondary" onClick={() => setShowTaskPicker(!showTaskPicker)}>
                    <Plus className="h-3 w-3" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">Loading tasks...</div>
                ) : linkedTasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No tasks linked yet. Click &quot;Add Task&quot; to attach tasks to this service.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedTasks.map((lt) => (
                      <div
                        key={lt.id}
                        className="p-3 rounded-lg border border-border hover:border-border transition-colors space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{lt.task.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lt.task.task_code}
                              {lt.task.category && <> &middot; {lt.task.category}</>}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(lt.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Remove task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Inline editable fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          <Input
                            label="Seq #"
                            type="number"
                            value={lt.sequence_order}
                            onChange={(e) => handleUpdateField(lt.id, 'sequence_order', Number(e.target.value) || 0)}
                            className="text-xs"
                          />
                          <Input
                            label="Est. Min"
                            type="number"
                            value={lt.estimated_minutes ?? ''}
                            onChange={(e) => handleUpdateField(lt.id, 'estimated_minutes', e.target.value ? Number(e.target.value) : null)}
                            className="text-xs"
                          />
                          <Input
                            label="QC Weight"
                            type="number"
                            value={lt.quality_weight}
                            onChange={(e) => handleUpdateField(lt.id, 'quality_weight', Number(e.target.value) || 1)}
                            className="text-xs"
                          />
                          <Select
                            label="Frequency"
                            value={lt.frequency_default}
                            onChange={(e) => handleUpdateField(lt.id, 'frequency_default', e.target.value)}
                            options={FREQUENCIES.map((f) => ({ value: f, label: f.charAt(0) + f.slice(1).toLowerCase() }))}
                            className="text-xs"
                          />
                          <Select
                            label="Priority"
                            value={lt.priority_level ?? ''}
                            onChange={(e) => handleUpdateField(lt.id, 'priority_level', e.target.value || null)}
                            options={[
                              { value: '', label: 'None' },
                              { value: 'LOW', label: 'Low' },
                              { value: 'MEDIUM', label: 'Med' },
                              { value: 'HIGH', label: 'High' },
                            ]}
                            className="text-xs"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={lt.is_required}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateField(lt.id, 'is_required', e.target.checked)}
                            className="rounded border-border"
                          />
                          Required
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Task Picker */}
                {showTaskPicker && (
                  <div className="mt-4 border border-border rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground mb-2">Select a task to add:</p>
                    {availableTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">All tasks are already linked to this service.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {availableTasks.map((task) => (
                          <button
                            type="button"
                            key={task.id}
                            onClick={() => handleAddTask(task)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-muted transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{task.name}</p>
                              <p className="text-xs text-muted-foreground">{task.task_code}</p>
                            </div>
                            {task.category && (
                              <Badge color="gray">{task.category}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowTaskPicker(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Close action */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
