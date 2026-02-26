'use client';

import { useEffect, useMemo } from 'react';
import { CheckSquare } from 'lucide-react';
import {
  ROUTE_TASK_TYPES,
  type RouteTemplateTask,
} from '@gleamops/shared';
import { z } from 'zod';
import { useForm } from '@/hooks/use-form';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  FormSection,
  Input,
  Select,
  Textarea,
  Button,
} from '@gleamops/ui';

type FormValues = {
  task_type: (typeof ROUTE_TASK_TYPES)[number];
  description_key: string | null;
  description_override: string | null;
  task_order: number;
  evidence_required: boolean;
  delivery_items: string;
};

interface RouteTemplateTaskFormProps {
  open: boolean;
  onClose: () => void;
  templateStopId: string;
  initialData?: RouteTemplateTask | null;
  onSuccess?: () => void;
}

const taskFormSchema = z.object({
  task_type: z.enum(ROUTE_TASK_TYPES),
  description_key: z.string().nullable(),
  description_override: z.string().max(500).nullable(),
  task_order: z.number().int().min(1),
  evidence_required: z.boolean().default(false),
  delivery_items: z.string(),
});

const DEFAULT_VALUES: FormValues = {
  task_type: 'CUSTOM',
  description_key: null,
  description_override: null,
  task_order: 1,
  evidence_required: false,
  delivery_items: '',
};

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function RouteTemplateTaskForm({
  open,
  onClose,
  templateStopId,
  initialData,
  onSuccess,
}: RouteTemplateTaskFormProps) {
  const isEdit = !!initialData?.id;

  const initialValues = useMemo<FormValues>(() => {
    if (!initialData) return DEFAULT_VALUES;

    return {
      task_type: initialData.task_type,
      description_key: initialData.description_key,
      description_override: initialData.description_override,
      task_order: initialData.task_order,
      evidence_required: initialData.evidence_required,
      delivery_items: initialData.delivery_items ? JSON.stringify(initialData.delivery_items, null, 2) : '',
    };
  }, [initialData]);

  const { values, errors, loading, setValue, onBlur, reset, handleSubmit } = useForm<FormValues>({
    schema: taskFormSchema,
    initialValues,
    onSubmit: async (data) => {
      const headers = await authHeaders();
      const url = isEdit
        ? `/api/operations/route-templates/tasks/${initialData!.id}`
        : `/api/operations/route-templates/stops/${templateStopId}/tasks`;
      const method = isEdit ? 'PATCH' : 'POST';

      let deliveryItems: unknown = null;
      if (data.delivery_items.trim()) {
        try {
          deliveryItems = JSON.parse(data.delivery_items);
        } catch {
          throw new Error('Delivery items must be valid JSON.');
        }
      }

      const payload = {
        task_type: data.task_type,
        description_key: data.description_key,
        description_override: data.description_override,
        task_order: data.task_order,
        evidence_required: data.evidence_required,
        delivery_items: deliveryItems,
        ...(isEdit ? { version_etag: initialData!.version_etag } : {}),
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed.' }));
        throw new Error(body.detail ?? body.title ?? 'Failed to save route task.');
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(initialValues);
  }, [open, initialValues, reset]);

  const handleClose = () => {
    reset(initialValues);
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Route Task' : 'Add Route Task'}
      subtitle={isEdit ? initialData?.task_type : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Task Details"
          icon={<CheckSquare className="h-4 w-4" />}
          description="Choose the task type and completion requirements."
        >
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Task Type"
              value={values.task_type}
              onChange={(event) => setValue('task_type', event.target.value as FormValues['task_type'])}
              onBlur={() => onBlur('task_type')}
              error={errors.task_type}
              options={ROUTE_TASK_TYPES.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
              required
            />

            <Input
              label="Task Order"
              type="number"
              min={1}
              value={values.task_order}
              onChange={(event) => setValue('task_order', Number(event.target.value || 1))}
              onBlur={() => onBlur('task_order')}
              error={errors.task_order}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Description Key"
              value={values.description_key ?? ''}
              onChange={(event) => setValue('description_key', event.target.value || null)}
              onBlur={() => onBlur('description_key')}
              error={errors.description_key}
              placeholder="route.task.custom"
            />

            <Select
              label="Evidence Required"
              value={values.evidence_required ? 'yes' : 'no'}
              onChange={(event) => setValue('evidence_required', event.target.value === 'yes')}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' },
              ]}
            />
          </div>

          <Textarea
            label="Description Override"
            value={values.description_override ?? ''}
            onChange={(event) => setValue('description_override', event.target.value || null)}
            onBlur={() => onBlur('description_override')}
            error={errors.description_override}
            rows={2}
          />

          <Textarea
            label="Delivery Items JSON (optional)"
            value={values.delivery_items}
            onChange={(event) => setValue('delivery_items', event.target.value)}
            placeholder='[{"supply_id":"uuid","quantity":2,"direction":"deliver"}]'
            rows={5}
          />
        </FormSection>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Task' : 'Add Task'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
