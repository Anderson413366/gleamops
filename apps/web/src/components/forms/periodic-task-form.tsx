'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { periodicTaskCreateSchema, type PeriodicTask } from '@gleamops/shared';
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
  task_type:
    | 'DELIVER_PICKUP'
    | 'FULL_CLEAN'
    | 'LIGHT_CLEAN'
    | 'VACUUM_MOP_TRASH'
    | 'INSPECTION'
    | 'INVENTORY'
    | 'SUPPLY_REFILL'
    | 'RESTROOM_CLEAN'
    | 'FLOOR_SCRUB'
    | 'TRAINING'
    | 'CUSTOM';
  description_key: string | null;
  description_override: string | null;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
  custom_interval_days: number | null;
  next_due_date: string;
  auto_add_to_route: boolean;
  preferred_staff_id: string | null;
  evidence_required: boolean;
  notes: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

interface PeriodicTaskFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: PeriodicTask | null;
  onSuccess?: () => void;
}

const TASK_TYPE_OPTIONS = [
  { value: 'DELIVER_PICKUP', label: 'Deliver / Pick up' },
  { value: 'FULL_CLEAN', label: 'Full clean' },
  { value: 'LIGHT_CLEAN', label: 'Light clean' },
  { value: 'VACUUM_MOP_TRASH', label: 'Vacuum, mop, trash' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'SUPPLY_REFILL', label: 'Supply refill' },
  { value: 'RESTROOM_CLEAN', label: 'Restroom clean' },
  { value: 'FLOOR_SCRUB', label: 'Floor scrub' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'CUSTOM', label: 'Custom task' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'CUSTOM', label: 'Custom interval' },
] as const;

const DEFAULT_VALUES: FormValues = {
  site_job_id: '',
  task_type: 'FLOOR_SCRUB',
  description_key: null,
  description_override: null,
  frequency: 'MONTHLY',
  custom_interval_days: null,
  next_due_date: new Date().toISOString().slice(0, 10),
  auto_add_to_route: true,
  preferred_staff_id: null,
  evidence_required: false,
  notes: null,
  status: 'ACTIVE',
};

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function PeriodicTaskForm({
  open,
  onClose,
  initialData,
  onSuccess,
}: PeriodicTaskFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [siteJobOptions, setSiteJobOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([]);

  const initialValues = useMemo<FormValues>(() => {
    if (!initialData) return DEFAULT_VALUES;
    return {
      site_job_id: initialData.site_job_id,
      task_type: initialData.task_type,
      description_key: initialData.description_key,
      description_override: initialData.description_override,
      frequency: initialData.frequency,
      custom_interval_days: initialData.custom_interval_days,
      next_due_date: initialData.next_due_date,
      auto_add_to_route: initialData.auto_add_to_route,
      preferred_staff_id: initialData.preferred_staff_id,
      evidence_required: initialData.evidence_required,
      notes: initialData.notes,
      status: initialData.status,
    };
  }, [initialData]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<FormValues>({
    schema: periodicTaskCreateSchema,
    initialValues,
    onSubmit: async (data) => {
      const url = isEdit
        ? `/api/operations/periodic-tasks/${encodeURIComponent(initialData!.periodic_code)}`
        : '/api/operations/periodic-tasks';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        ...data,
        custom_interval_days: data.frequency === 'CUSTOM' ? data.custom_interval_days : null,
        ...(isEdit ? { version_etag: initialData!.version_etag } : {}),
      };

      const response = await fetch(url, {
        method,
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed.' }));
        throw new Error(body.detail ?? body.title ?? 'Failed to save periodic task.');
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase
        .from('site_jobs')
        .select('id, job_code, site:site_id(name, site_code)')
        .is('archived_at', null)
        .order('job_code'),
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE')
        .order('full_name'),
    ]).then(([jobsResult, staffResult]) => {
      const jobs = (jobsResult.data ?? []) as Array<{
        id: string;
        job_code: string;
        site?: { name?: string | null; site_code?: string | null } | null;
      }>;
      const staff = (staffResult.data ?? []) as Array<{ id: string; full_name: string | null; staff_code: string }>;

      setSiteJobOptions(
        jobs.map((job) => ({
          value: job.id,
          label: `${job.job_code} - ${job.site?.name ?? job.site?.site_code ?? 'Unknown site'}`,
        })),
      );
      setStaffOptions(
        staff.map((member) => ({
          value: member.id,
          label: `${member.full_name ?? member.staff_code} (${member.staff_code})`,
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
      title={isEdit ? 'Edit Periodic Task' : 'New Periodic Task'}
      subtitle={isEdit ? initialData?.periodic_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Periodic Task Setup"
          icon={<RefreshCw className="h-4 w-4" />}
          description="Set cadence, site assignment, and route-injection behavior."
        >
          <Select
            label="Site Job"
            value={values.site_job_id}
            onChange={(event) => setValue('site_job_id', event.target.value)}
            onBlur={() => onBlur('site_job_id')}
            error={errors.site_job_id}
            options={[{ value: '', label: 'Select site job...' }, ...siteJobOptions]}
            required
          />

          <Select
            label="Task Type"
            value={values.task_type}
            onChange={(event) => setValue('task_type', event.target.value as FormValues['task_type'])}
            options={TASK_TYPE_OPTIONS as unknown as Array<{ value: string; label: string }>}
          />

          <Textarea
            label="Description Override"
            value={values.description_override ?? ''}
            onChange={(event) => setValue('description_override', event.target.value || null)}
            onBlur={() => onBlur('description_override')}
            error={errors.description_override}
            rows={3}
            placeholder="e.g. Deep floor scrub in lobby and restrooms"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Frequency"
              value={values.frequency}
              onChange={(event) => setValue('frequency', event.target.value as FormValues['frequency'])}
              options={FREQUENCY_OPTIONS as unknown as Array<{ value: string; label: string }>}
            />
            <Input
              type="date"
              label="Next Due Date"
              value={values.next_due_date}
              onChange={(event) => setValue('next_due_date', event.target.value)}
              onBlur={() => onBlur('next_due_date')}
              error={errors.next_due_date}
              required
            />
          </div>

          {values.frequency === 'CUSTOM' ? (
            <Input
              type="number"
              label="Custom Interval (days)"
              value={values.custom_interval_days == null ? '' : String(values.custom_interval_days)}
              onChange={(event) => setValue('custom_interval_days', event.target.value ? Number(event.target.value) : null)}
              onBlur={() => onBlur('custom_interval_days')}
              error={errors.custom_interval_days}
              min={1}
            />
          ) : null}

          <Select
            label="Preferred Staff"
            value={values.preferred_staff_id ?? ''}
            onChange={(event) => setValue('preferred_staff_id', event.target.value || null)}
            options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Auto-add to Route"
              value={values.auto_add_to_route ? 'yes' : 'no'}
              onChange={(event) => setValue('auto_add_to_route', event.target.value === 'yes')}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Select
              label="Evidence Required"
              value={values.evidence_required ? 'yes' : 'no'}
              onChange={(event) => setValue('evidence_required', event.target.value === 'yes')}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </div>

          <Select
            label="Status"
            value={values.status}
            onChange={(event) => setValue('status', event.target.value as FormValues['status'])}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PAUSED', label: 'Paused' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
          />

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
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}

