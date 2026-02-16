'use client';

import { useEffect } from 'react';
import { ClipboardList, FileText, Layers, ShieldCheck, Timer } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { taskSchema, type TaskFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { Task } from '@gleamops/shared';

const UNIT_OPTIONS = [
  { value: 'SQFT_1000', label: 'Sq Ft (per 1,000)' },
  { value: 'EACH', label: 'Each' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DEFAULTS: TaskFormData = {
  task_code: '',
  name: '',
  production_rate_sqft_per_hour: null,
  category: null,
  subcategory: null,
  area_type: null,
  floor_type: null,
  priority_level: null,
  default_minutes: null,
  unit_code: 'SQFT_1000',
  spec_description: null,
  work_description: null,
  tools_materials: null,
  is_active: true,
  notes: null,
};

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Task | null;
  onSuccess?: () => void;
}

export function TaskForm({ open, onClose, initialData, onSuccess }: TaskFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<TaskFormData>({
    schema: taskSchema,
    initialValues: initialData
      ? {
          task_code: initialData.task_code,
          name: initialData.name,
          production_rate_sqft_per_hour: initialData.production_rate_sqft_per_hour,
          category: initialData.category,
          subcategory: initialData.subcategory,
          area_type: initialData.area_type,
          floor_type: initialData.floor_type,
          priority_level: initialData.priority_level,
          default_minutes: initialData.default_minutes,
          unit_code: initialData.unit_code as 'SQFT_1000' | 'EACH',
          spec_description: initialData.spec_description,
          work_description: initialData.work_description,
          tools_materials: initialData.tools_materials,
          is_active: initialData.is_active,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        // Task code is immutable after create.
        const { task_code, ...updateData } = data;
        void task_code;
        const result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('tasks').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.task_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'TSK' }).then(({ data }) => {
        if (data) setValue('task_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Task' : 'New Task'}
      subtitle={isEdit ? initialData?.task_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Identity, unit, and categorization for this task.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Task Code"
              value={values.task_code}
              readOnly
              disabled
              hint="Auto-generated"
            />
            <Select
              label="Unit"
              value={values.unit_code}
              onChange={(e) => setValue('unit_code', e.target.value as 'SQFT_1000' | 'EACH')}
              options={UNIT_OPTIONS}
            />
          </div>
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category"
              value={values.category ?? ''}
              onChange={(e) => setValue('category', e.target.value || null)}
            />
            <Input
              label="Subcategory"
              value={values.subcategory ?? ''}
              onChange={(e) => setValue('subcategory', e.target.value || null)}
            />
          </div>
        </FormSection>

        <FormSection title="Classification" icon={<Layers className="h-4 w-4" />} description="Optional attributes used for scoping and filtering.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Area Type"
              value={values.area_type ?? ''}
              onChange={(e) => setValue('area_type', e.target.value || null)}
              placeholder="e.g., Office, Restroom"
            />
            <Input
              label="Floor Type"
              value={values.floor_type ?? ''}
              onChange={(e) => setValue('floor_type', e.target.value || null)}
              placeholder="e.g., Carpet, VCT"
            />
            <Select
              label="Priority"
              value={values.priority_level ?? ''}
              onChange={(e) => setValue('priority_level', e.target.value || null)}
              options={PRIORITY_OPTIONS}
            />
          </div>
        </FormSection>

        <FormSection title="Production & Time" icon={<Timer className="h-4 w-4" />} description="Defaults used for estimating labor and schedules.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Production Rate (sq ft / hour)"
              type="number"
              value={values.production_rate_sqft_per_hour ?? ''}
              onChange={(e) => setValue('production_rate_sqft_per_hour', e.target.value ? Number(e.target.value) : null)}
            />
            <Input
              label="Default Minutes"
              type="number"
              value={values.default_minutes ?? ''}
              onChange={(e) => setValue('default_minutes', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </FormSection>

        <FormSection title="Descriptions" icon={<FileText className="h-4 w-4" />} description="What clients see vs. internal instructions for staff.">
          <Textarea
            label="Spec Description"
            value={values.spec_description ?? ''}
            onChange={(e) => setValue('spec_description', e.target.value || null)}
            placeholder="What the client sees..."
            rows={2}
          />
          <Textarea
            label="Work Description"
            value={values.work_description ?? ''}
            onChange={(e) => setValue('work_description', e.target.value || null)}
            placeholder="Internal instructions for staff..."
            rows={2}
          />
          <Input
            label="Tools & Materials"
            value={values.tools_materials ?? ''}
            onChange={(e) => setValue('tools_materials', e.target.value || null)}
            placeholder="e.g., Mop, Bucket, All-purpose cleaner"
          />
        </FormSection>

        <FormSection title="Status & Notes" icon={<ShieldCheck className="h-4 w-4" />} description="Enable/disable this task and capture any internal notes.">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('is_active', e.target.checked)}
              className="rounded border-border"
            />
            Active
          </label>
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
            rows={2}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
