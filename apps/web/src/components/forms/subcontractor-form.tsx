'use client';

import { useEffect } from 'react';
import { ClipboardList, FileText, Phone, StickyNote } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { subcontractorSchema, type SubcontractorFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING', label: 'Pending' },
];

const DEFAULTS: SubcontractorFormData = {
  subcontractor_code: '',
  company_name: '',
  contact_name: null,
  email: null,
  phone: null,
  status: 'ACTIVE',
  services_provided: null,
  insurance_expiry: null,
  license_number: null,
  notes: null,
};

interface SubcontractorFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Subcontractor | null;
  onSuccess?: () => void;
}

export function SubcontractorForm({ open, onClose, initialData, onSuccess }: SubcontractorFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SubcontractorFormData>({
    schema: subcontractorSchema,
    initialValues: initialData
      ? {
          subcontractor_code: initialData.subcontractor_code,
          company_name: initialData.company_name,
          contact_name: initialData.contact_name,
          email: initialData.email,
          phone: initialData.phone,
          status: initialData.status as 'ACTIVE' | 'INACTIVE' | 'PENDING',
          services_provided: initialData.services_provided,
          insurance_expiry: initialData.insurance_expiry,
          license_number: initialData.license_number,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('subcontractors')
          .update({
            company_name: data.company_name,
            contact_name: data.contact_name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            services_provided: data.services_provided,
            insurance_expiry: data.insurance_expiry,
            license_number: data.license_number,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('subcontractors').insert({
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
    if (open && !isEdit && !values.subcontractor_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SUB' }).then(({ data }) => {
        if (data) setValue('subcontractor_code', data);
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
      title={isEdit ? 'Edit Subcontractor' : 'New Subcontractor'}
      subtitle={isEdit ? initialData?.subcontractor_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Company identity and current status.">
          <Input
            label="Subcontractor Code"
            value={values.subcontractor_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Company Name"
            value={values.company_name}
            onChange={(e) => setValue('company_name', e.target.value)}
            onBlur={() => onBlur('company_name')}
            error={errors.company_name}
            required
          />
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value as 'ACTIVE' | 'INACTIVE' | 'PENDING')}
            options={STATUS_OPTIONS}
          />
        </FormSection>

        <FormSection title="Contact Info" icon={<Phone className="h-4 w-4" />} description="Primary contact details for the subcontractor.">
          <Input
            label="Contact Name"
            value={values.contact_name ?? ''}
            onChange={(e) => setValue('contact_name', e.target.value || null)}
          />
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
        </FormSection>

        <FormSection title="Details" icon={<FileText className="h-4 w-4" />} description="Services provided and compliance details.">
          <Textarea
            label="Services Provided"
            value={values.services_provided ?? ''}
            onChange={(e) => setValue('services_provided', e.target.value || null)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Insurance Expiry"
              type="date"
              value={values.insurance_expiry ?? ''}
              onChange={(e) => setValue('insurance_expiry', e.target.value || null)}
            />
            <Input
              label="License Number"
              value={values.license_number ?? ''}
              onChange={(e) => setValue('license_number', e.target.value || null)}
            />
          </div>
        </FormSection>

        <FormSection title="Notes" icon={<StickyNote className="h-4 w-4" />} description="Optional notes for your team.">
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Subcontractor'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
