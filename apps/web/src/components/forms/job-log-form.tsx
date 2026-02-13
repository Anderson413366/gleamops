'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { jobLogSchema, type JobLogFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';

const SEVERITY_OPTIONS = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'SAFETY', label: 'Safety Issue' },
  { value: 'QUALITY', label: 'Quality Issue' },
  { value: 'OTHER', label: 'Other' },
];

interface JobLogFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Record<string, unknown> | null;
  onSuccess?: () => void;
  preselectedSiteId?: string;
  preselectedJobId?: string;
}

export function JobLogForm({ open, onClose, initialData, onSuccess, preselectedSiteId, preselectedJobId }: JobLogFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);
  const [jobs, setJobs] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<JobLogFormData>({
    schema: jobLogSchema,
    initialValues: initialData
      ? {
          site_id: (initialData.site_id as string) ?? '',
          job_id: (initialData.job_id as string) ?? null,
          log_date: (initialData.log_date as string) ?? new Date().toISOString().split('T')[0],
          event_type: (initialData.event_type as string) ?? '',
          severity: (initialData.severity as 'MINOR' | 'MAJOR' | 'CRITICAL') ?? 'MINOR',
          message: (initialData.message as string) ?? null,
          description: (initialData.description as string) ?? null,
          corrective_action: (initialData.corrective_action as string) ?? null,
          status: (initialData.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') ?? 'OPEN',
          photos_link: (initialData.photos_link as string) ?? null,
          notes: (initialData.notes as string) ?? null,
        }
      : {
          site_id: preselectedSiteId ?? '',
          job_id: preselectedJobId ?? null,
          log_date: new Date().toISOString().split('T')[0],
          event_type: '',
          severity: 'MINOR',
          message: null,
          description: null,
          corrective_action: null,
          status: 'OPEN',
          photos_link: null,
          notes: null,
        },
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('job_logs')
          .update(data)
          .eq('id', initialData!.id as string)
          .eq('version_etag', initialData!.version_etag as string)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('job_logs').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load sites and jobs for dropdowns
  useEffect(() => {
    if (open) {
      supabase.from('sites').select('id, name, site_code').is('archived_at', null).order('name').then(({ data }) => {
        if (data) setSites(data.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` })));
      });
      supabase.from('site_jobs').select('id, job_code, job_name').is('archived_at', null).order('job_code').then(({ data }) => {
        if (data) setJobs(data.map((j) => ({ value: j.id, label: `${j.job_name ?? j.job_code} (${j.job_code})` })));
      });
    }
  }, [open, supabase]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title={isEdit ? 'Edit Log Entry' : 'New Log Entry'} wide>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Context</h3>
          <Select
            label="Site"
            value={values.site_id}
            onChange={(e) => setValue('site_id', e.target.value)}
            onBlur={() => onBlur('site_id')}
            error={errors.site_id}
            options={[{ value: '', label: 'Select a site...' }, ...sites]}
            required
          />
          <Select
            label="Job"
            value={values.job_id ?? ''}
            onChange={(e) => setValue('job_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...jobs]}
          />
          <Input
            label="Date"
            type="date"
            value={values.log_date}
            onChange={(e) => setValue('log_date', e.target.value)}
            onBlur={() => onBlur('log_date')}
            error={errors.log_date}
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event</h3>
          <Select
            label="Event Type"
            value={values.event_type}
            onChange={(e) => setValue('event_type', e.target.value)}
            onBlur={() => onBlur('event_type')}
            error={errors.event_type}
            options={[{ value: '', label: 'Select...' }, ...EVENT_TYPE_OPTIONS]}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Severity" value={values.severity} onChange={(e) => setValue('severity', e.target.value as 'MINOR' | 'MAJOR' | 'CRITICAL')} options={SEVERITY_OPTIONS} />
            <Select label="Status" value={values.status} onChange={(e) => setValue('status', e.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED')} options={STATUS_OPTIONS} />
          </div>
          <Input label="Message" value={values.message ?? ''} onChange={(e) => setValue('message', e.target.value || null)} placeholder="Brief summary..." />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
          <Textarea label="Description" value={values.description ?? ''} onChange={(e) => setValue('description', e.target.value || null)} rows={3} placeholder="Full description of the issue..." />
          <Textarea label="Corrective Action" value={values.corrective_action ?? ''} onChange={(e) => setValue('corrective_action', e.target.value || null)} rows={2} placeholder="What was done to resolve it..." />
          <Input label="Photos Link" value={values.photos_link ?? ''} onChange={(e) => setValue('photos_link', e.target.value || null)} placeholder="URL to photos..." />
          <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={2} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Log'}</Button>
        </div>
      </form>
    </SlideOver>
  );
}
