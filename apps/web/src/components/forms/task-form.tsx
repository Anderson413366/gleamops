'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { taskSchema, type TaskFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button } from '@gleamops/ui';
import type { Task } from '@gleamops/shared';

const UNIT_OPTIONS = [
  { value: 'SQFT_1000', label: 'Sq Ft (per 1,000)' },
  { value: 'EACH', label: 'Each' },
];

const DEFAULTS: TaskFormData = {
  task_code: '',
  name: '',
  production_rate_sqft_per_hour: null,
  category: null,
  unit_code: 'SQFT_1000',
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
          unit_code: initialData.unit_code as 'SQFT_1000' | 'EACH',
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('tasks')
          .update({
            name: data.name,
            production_rate_sqft_per_hour: data.production_rate_sqft_per_hour,
            category: data.category,
            unit_code: data.unit_code,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
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
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Task Code"
            value={values.task_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <Input
            label="Category"
            value={values.category ?? ''}
            onChange={(e) => setValue('category', e.target.value || null)}
          />
          <Select
            label="Unit"
            value={values.unit_code}
            onChange={(e) => setValue('unit_code', e.target.value as 'SQFT_1000' | 'EACH')}
            options={UNIT_OPTIONS}
          />
          <Input
            label="Production Rate (sq ft / hour)"
            type="number"
            value={values.production_rate_sqft_per_hour ?? ''}
            onChange={(e) => setValue('production_rate_sqft_per_hour', e.target.value ? Number(e.target.value) : null)}
          />
        </div>

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
