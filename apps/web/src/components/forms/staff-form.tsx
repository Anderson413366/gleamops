'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { staffSchema, type StaffFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button } from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';

const ROLE_OPTIONS = [
  { value: 'OWNER_ADMIN', label: 'Owner / Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'INSPECTOR', label: 'Inspector' },
  { value: 'SALES', label: 'Sales' },
];

const SUBCONTRACTOR_OPTIONS = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
];

const DEFAULTS: StaffFormData = {
  staff_code: '',
  full_name: '',
  role: '',
  is_subcontractor: false,
  pay_rate: null,
  email: null,
  phone: null,
};

interface StaffFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Staff | null;
  onSuccess?: () => void;
}

export function StaffForm({ open, onClose, initialData, onSuccess }: StaffFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<StaffFormData>({
    schema: staffSchema,
    initialValues: initialData
      ? {
          staff_code: initialData.staff_code,
          full_name: initialData.full_name,
          role: initialData.role,
          is_subcontractor: initialData.is_subcontractor,
          pay_rate: initialData.pay_rate,
          email: initialData.email,
          phone: initialData.phone,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('staff')
          .update({
            full_name: data.full_name,
            role: data.role,
            is_subcontractor: data.is_subcontractor,
            pay_rate: data.pay_rate,
            email: data.email,
            phone: data.phone,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff').insert({
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
    if (open && !isEdit && !values.staff_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'STF' }).then(({ data }) => {
        if (data) setValue('staff_code', data);
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
      title={isEdit ? 'Edit Staff' : 'New Staff'}
      subtitle={isEdit ? initialData?.staff_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Staff Code"
            value={values.staff_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Full Name"
            value={values.full_name}
            onChange={(e) => setValue('full_name', e.target.value)}
            onBlur={() => onBlur('full_name')}
            error={errors.full_name}
            required
          />
          <Select
            label="Role"
            value={values.role}
            onChange={(e) => setValue('role', e.target.value)}
            onBlur={() => onBlur('role')}
            error={errors.role}
            options={ROLE_OPTIONS}
            placeholder="Select a role..."
            required
          />
          <Select
            label="Subcontractor"
            value={String(values.is_subcontractor)}
            onChange={(e) => setValue('is_subcontractor', e.target.value === 'true')}
            options={SUBCONTRACTOR_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Compensation</h3>
          <Input
            label="Pay Rate ($/hr)"
            type="number"
            value={values.pay_rate ?? ''}
            onChange={(e) => setValue('pay_rate', e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Contact Info</h3>
          <Input
            label="Email"
            type="email"
            value={values.email ?? ''}
            onChange={(e) => setValue('email', e.target.value || null)}
            onBlur={() => onBlur('email')}
            error={errors.email}
          />
          <Input
            label="Phone"
            value={values.phone ?? ''}
            onChange={(e) => setValue('phone', e.target.value || null)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Staff'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
