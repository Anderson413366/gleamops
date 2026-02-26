'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { complaintCreateSchema } from '@gleamops/shared';
import { useForm } from '@/hooks/use-form';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  FormSection,
  Select,
  Textarea,
  Input,
  Button,
} from '@gleamops/ui';

interface ComplaintFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ComplaintFormValues = {
  site_id: string;
  reported_by_type: 'CUSTOMER' | 'SPECIALIST' | 'FLOATER' | 'MANAGER' | 'SYSTEM';
  reported_by_staff_id: string | null;
  reported_by_name: string | null;
  source: 'EMAIL' | 'PHONE' | 'APP' | 'PORTAL' | 'IN_PERSON';
  customer_original_message: string | null;
  category:
    | 'CLEANING_QUALITY'
    | 'MISSED_SERVICE'
    | 'SUPPLY_ISSUE'
    | 'DAMAGE'
    | 'BEHAVIOR'
    | 'SAFETY'
    | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT_SAME_NIGHT';
  assigned_to_staff_id: string | null;
};

const DEFAULT_VALUES: ComplaintFormValues = {
  site_id: '',
  reported_by_type: 'CUSTOMER',
  reported_by_staff_id: null,
  reported_by_name: null,
  source: 'EMAIL',
  customer_original_message: null,
  category: 'CLEANING_QUALITY',
  priority: 'NORMAL',
  assigned_to_staff_id: null,
};

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function ComplaintForm({ open, onClose, onSuccess }: ComplaintFormProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [siteOptions, setSiteOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ComplaintFormValues>({
    schema: complaintCreateSchema,
    initialValues: DEFAULT_VALUES,
    onSubmit: async (data) => {
      const response = await fetch('/api/operations/complaints', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed.' }));
        throw new Error(body.detail ?? body.title ?? 'Failed to create complaint.');
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE')
        .order('full_name'),
    ]).then(([siteResult, staffResult]) => {
      const sites = (siteResult.data ?? []) as Array<{ id: string; site_code: string; name: string }>;
      const staff = (staffResult.data ?? []) as Array<{ id: string; staff_code: string; full_name: string | null }>;

      setSiteOptions(
        sites.map((site) => ({
          value: site.id,
          label: `${site.name} (${site.site_code})`,
        })),
      );
      setStaffOptions(
        staff.map((person) => ({
          value: person.id,
          label: `${person.full_name ?? person.staff_code} (${person.staff_code})`,
        })),
      );
    });
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return;
    reset(DEFAULT_VALUES);
  }, [open, reset]);

  const handleClose = () => {
    reset(DEFAULT_VALUES);
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title="New Complaint"
      subtitle="Capture customer issue details and route ownership"
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Complaint Intake"
          icon={<MessageSquareWarning className="h-4 w-4" />}
          description="Log source, category, priority, and customer message."
        >
          <Select
            label="Site"
            value={values.site_id}
            onChange={(event) => setValue('site_id', event.target.value)}
            onBlur={() => onBlur('site_id')}
            error={errors.site_id}
            options={[{ value: '', label: 'Select site...' }, ...siteOptions]}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Source"
              value={values.source}
              onChange={(event) => setValue('source', event.target.value as ComplaintFormValues['source'])}
              options={[
                { value: 'EMAIL', label: 'Email' },
                { value: 'PHONE', label: 'Phone' },
                { value: 'APP', label: 'App' },
                { value: 'PORTAL', label: 'Portal' },
                { value: 'IN_PERSON', label: 'In person' },
              ]}
            />
            <Select
              label="Priority"
              value={values.priority}
              onChange={(event) => setValue('priority', event.target.value as ComplaintFormValues['priority'])}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT_SAME_NIGHT', label: 'Urgent - Same Night' },
              ]}
            />
          </div>

          <Select
            label="Category"
            value={values.category}
            onChange={(event) => setValue('category', event.target.value as ComplaintFormValues['category'])}
            options={[
              { value: 'CLEANING_QUALITY', label: 'Cleaning Quality' },
              { value: 'MISSED_SERVICE', label: 'Missed Service' },
              { value: 'SUPPLY_ISSUE', label: 'Supply Issue' },
              { value: 'DAMAGE', label: 'Damage' },
              { value: 'BEHAVIOR', label: 'Behavior' },
              { value: 'SAFETY', label: 'Safety' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Reported By"
              value={values.reported_by_type}
              onChange={(event) => setValue('reported_by_type', event.target.value as ComplaintFormValues['reported_by_type'])}
              options={[
                { value: 'CUSTOMER', label: 'Customer' },
                { value: 'SPECIALIST', label: 'Specialist' },
                { value: 'FLOATER', label: 'Floater' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'SYSTEM', label: 'System' },
              ]}
            />
            <Select
              label="Assign To"
              value={values.assigned_to_staff_id ?? ''}
              onChange={(event) => setValue('assigned_to_staff_id', event.target.value || null)}
              options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
            />
          </div>

          <Select
            label="Reported Staff (optional)"
            value={values.reported_by_staff_id ?? ''}
            onChange={(event) => setValue('reported_by_staff_id', event.target.value || null)}
            options={[{ value: '', label: 'Not staff reported' }, ...staffOptions]}
          />

          <Input
            label="Reporter Name (optional)"
            value={values.reported_by_name ?? ''}
            onChange={(event) => setValue('reported_by_name', event.target.value || null)}
            onBlur={() => onBlur('reported_by_name')}
            error={errors.reported_by_name}
          />

          <Textarea
            label="Customer Message"
            value={values.customer_original_message ?? ''}
            onChange={(event) => setValue('customer_original_message', event.target.value || null)}
            onBlur={() => onBlur('customer_original_message')}
            error={errors.customer_original_message}
            rows={5}
          />
        </FormSection>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Complaint
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
