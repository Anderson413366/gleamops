'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { routeTemplateStopSchema, type RouteTemplateStop } from '@gleamops/shared';
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
  site_job_id: string;
  stop_order: number;
  access_window_start: string | null;
  access_window_end: string | null;
  notes: string | null;
};

interface RouteTemplateStopFormProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  initialData?: RouteTemplateStop | null;
  onSuccess?: () => void;
}

const createSchema = routeTemplateStopSchema.omit({ template_id: true });

const DEFAULT_VALUES: FormValues = {
  site_job_id: '',
  stop_order: 1,
  access_window_start: null,
  access_window_end: null,
  notes: null,
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

export function RouteTemplateStopForm({
  open,
  onClose,
  templateId,
  initialData,
  onSuccess,
}: RouteTemplateStopFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [jobOptions, setJobOptions] = useState<Array<{ value: string; label: string }>>([]);

  const initialValues = useMemo<FormValues>(() => {
    if (!initialData) return DEFAULT_VALUES;

    return {
      site_job_id: initialData.site_job_id,
      stop_order: initialData.stop_order,
      access_window_start: initialData.access_window_start,
      access_window_end: initialData.access_window_end,
      notes: initialData.notes,
    };
  }, [initialData]);

  const { values, errors, loading, setValue, onBlur, reset, handleSubmit } = useForm<FormValues>({
    schema: createSchema,
    initialValues,
    onSubmit: async (data) => {
      const headers = await authHeaders();
      const url = isEdit
        ? `/api/operations/route-templates/stops/${initialData!.id}`
        : `/api/operations/route-templates/${templateId}/stops`;
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = isEdit
        ? {
            ...data,
            version_etag: initialData!.version_etag,
          }
        : data;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed.' }));
        throw new Error(body.detail ?? body.title ?? 'Failed to save route stop.');
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;

    supabase
      .from('site_jobs')
      .select('id, job_code, site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('job_code', { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{
          id: string;
          job_code: string;
          site?: { name?: string; site_code?: string } | null;
        }>;

        setJobOptions(
          rows.map((row) => ({
            value: row.id,
            label: `${row.job_code} - ${row.site?.name ?? row.site?.site_code ?? 'Site'}`,
          })),
        );
      });
  }, [open, supabase]);

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
      title={isEdit ? 'Edit Route Stop' : 'Add Route Stop'}
      subtitle={isEdit ? `Stop ${initialData?.stop_order}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Stop Details"
          icon={<MapPin className="h-4 w-4" />}
          description="Set the service plan, order, and optional access window."
        >
          <Select
            label="Service Plan"
            value={values.site_job_id}
            onChange={(event) => setValue('site_job_id', event.target.value)}
            onBlur={() => onBlur('site_job_id')}
            error={errors.site_job_id}
            options={[{ value: '', label: 'Select service plan...' }, ...jobOptions]}
            required
          />

          <Input
            label="Stop Order"
            type="number"
            min={1}
            value={values.stop_order}
            onChange={(event) => setValue('stop_order', Number(event.target.value || 1))}
            onBlur={() => onBlur('stop_order')}
            error={errors.stop_order}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Access Window Start"
              type="time"
              value={values.access_window_start ?? ''}
              onChange={(event) => setValue('access_window_start', event.target.value || null)}
              onBlur={() => onBlur('access_window_start')}
              error={errors.access_window_start}
            />

            <Input
              label="Access Window End"
              type="time"
              value={values.access_window_end ?? ''}
              onChange={(event) => setValue('access_window_end', event.target.value || null)}
              onBlur={() => onBlur('access_window_end')}
              error={errors.access_window_end}
            />
          </div>

          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(event) => setValue('notes', event.target.value || null)}
            onBlur={() => onBlur('notes')}
            error={errors.notes}
            rows={3}
          />
        </FormSection>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Stop' : 'Add Stop'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
