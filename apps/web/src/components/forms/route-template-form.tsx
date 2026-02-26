'use client';

import { useEffect, useMemo, useState } from 'react';
import { Route as RouteIcon } from 'lucide-react';
import { routeTemplateSchema, type RouteTemplate } from '@gleamops/shared';
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
  label: string;
  weekday: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  assigned_staff_id: string | null;
  default_vehicle_id: string | null;
  default_key_box: string | null;
  is_active: boolean;
  notes: string | null;
};

interface RouteTemplateFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: RouteTemplate | null;
  onSuccess?: () => void;
}

const WEEKDAY_OPTIONS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
] as const;

const DEFAULT_VALUES: FormValues = {
  label: '',
  weekday: 'MON',
  assigned_staff_id: null,
  default_vehicle_id: null,
  default_key_box: null,
  is_active: true,
  notes: null,
};

async function getAuthHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function RouteTemplateForm({
  open,
  onClose,
  initialData,
  onSuccess,
}: RouteTemplateFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ value: string; label: string }>>([]);

  const initialValues = useMemo<FormValues>(() => {
    if (!initialData) return DEFAULT_VALUES;

    return {
      label: initialData.label,
      weekday: initialData.weekday,
      assigned_staff_id: initialData.assigned_staff_id,
      default_vehicle_id: initialData.default_vehicle_id,
      default_key_box: initialData.default_key_box,
      is_active: initialData.is_active,
      notes: initialData.notes,
    };
  }, [initialData]);

  const { values, errors, loading, setValue, onBlur, reset, handleSubmit } = useForm<FormValues>({
    schema: routeTemplateSchema,
    initialValues,
    onSubmit: async (data) => {
      const headers = await getAuthHeaders();
      const url = isEdit
        ? `/api/operations/route-templates/${initialData!.id}`
        : '/api/operations/route-templates';
      const method = isEdit ? 'PATCH' : 'POST';
      const payload = isEdit
        ? { ...data, version_etag: initialData!.version_etag }
        : data;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Request failed.' }));
        throw new Error(body.detail ?? body.title ?? 'Failed to save route template.');
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE')
        .order('full_name'),
      supabase
        .from('vehicles')
        .select('id, name, vehicle_code')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .order('name'),
    ]).then(([staffResult, vehicleResult]) => {
      const staff = (staffResult.data ?? []) as Array<{ id: string; full_name: string | null; staff_code: string }>;
      const vehicles = (vehicleResult.data ?? []) as Array<{ id: string; name: string | null; vehicle_code: string }>;

      setStaffOptions(
        staff.map((item) => ({
          value: item.id,
          label: `${item.full_name ?? item.staff_code} (${item.staff_code})`,
        })),
      );

      setVehicleOptions(
        vehicles.map((item) => ({
          value: item.id,
          label: `${item.name ?? item.vehicle_code} (${item.vehicle_code})`,
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
      title={isEdit ? 'Edit Route Template' : 'New Route Template'}
      subtitle={isEdit ? initialData?.template_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Template Details"
          icon={<RouteIcon className="h-4 w-4" />}
          description="Define the recurring route owner, day, and defaults."
        >
          <Input
            label="Label"
            value={values.label}
            onChange={(event) => setValue('label', event.target.value)}
            onBlur={() => onBlur('label')}
            error={errors.label}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Weekday"
              value={values.weekday}
              onChange={(event) => setValue('weekday', event.target.value as FormValues['weekday'])}
              onBlur={() => onBlur('weekday')}
              error={errors.weekday}
              options={WEEKDAY_OPTIONS as unknown as Array<{ value: string; label: string }>}
              required
            />

            <Select
              label="Status"
              value={values.is_active ? 'active' : 'inactive'}
              onChange={(event) => setValue('is_active', event.target.value === 'active')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>

          <Select
            label="Assigned Staff"
            value={values.assigned_staff_id ?? ''}
            onChange={(event) => setValue('assigned_staff_id', event.target.value || null)}
            options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Default Vehicle"
              value={values.default_vehicle_id ?? ''}
              onChange={(event) => setValue('default_vehicle_id', event.target.value || null)}
              options={[{ value: '', label: 'No default vehicle' }, ...vehicleOptions]}
            />

            <Input
              label="Default Key Box"
              value={values.default_key_box ?? ''}
              onChange={(event) => setValue('default_key_box', event.target.value || null)}
              onBlur={() => onBlur('default_key_box')}
              error={errors.default_key_box}
              placeholder="e.g. 4"
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
            {isEdit ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
