'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { prospectSchema, type ProspectFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { SalesProspect } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'UNQUALIFIED', label: 'Unqualified' },
  { value: 'DEAD', label: 'Dead' },
  { value: 'CONVERTED', label: 'Converted' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'OTHER', label: 'Other' },
];

const INDUSTRY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'MEDICAL_HEALTHCARE', label: 'Medical / Healthcare' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SCHOOL_EDUCATION', label: 'School / Education' },
  { value: 'INDUSTRIAL_MANUFACTURING', label: 'Industrial / Manufacturing' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'RESTAURANT_FOOD', label: 'Restaurant / Food Service' },
  { value: 'GYM_FITNESS', label: 'Gym / Fitness' },
  { value: 'OTHER', label: 'Other' },
];

const DEFAULTS: ProspectFormData = {
  company_name: '',
  prospect_status_code: 'NEW',
  owner_user_id: null,
  industry_type: null,
  website: null,
  notes: null,
  source: null,
  contacts: [],
};

interface ProspectFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SalesProspect | null;
  onSuccess?: () => void;
}

export function ProspectForm({ open, onClose, initialData, onSuccess }: ProspectFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [prospectCode, setProspectCode] = useState('');

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ProspectFormData>({
    schema: prospectSchema,
    initialValues: initialData
      ? {
          company_name: initialData.company_name,
          prospect_status_code: initialData.prospect_status_code,
          owner_user_id: initialData.owner_user_id,
          industry_type: (initialData as unknown as Record<string, unknown>).industry_type as string | null ?? null,
          website: (initialData as unknown as Record<string, unknown>).website as string | null ?? null,
          notes: initialData.notes,
          source: initialData.source,
          contacts: [],
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('sales_prospects')
          .update({
            company_name: data.company_name,
            prospect_status_code: data.prospect_status_code,
            industry_type: data.industry_type,
            website: data.website,
            notes: data.notes,
            source: data.source,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('sales_prospects').insert({
          prospect_code: prospectCode,
          company_name: data.company_name,
          prospect_status_code: data.prospect_status_code,
          industry_type: data.industry_type,
          website: data.website,
          notes: data.notes,
          source: data.source,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Generate next prospect code on create
  useEffect(() => {
    if (open && !isEdit && !prospectCode) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'PRO' }).then(({ data }) => {
        if (data) setProspectCode(data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    setProspectCode('');
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Prospect' : 'New Prospect'}
      subtitle={isEdit ? initialData?.prospect_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {!isEdit && (
            <Input
              label="Prospect Code"
              value={prospectCode}
              readOnly
              disabled
              hint="Auto-generated"
            />
          )}
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
            value={values.prospect_status_code}
            onChange={(e) => setValue('prospect_status_code', e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Source"
            value={values.source ?? ''}
            onChange={(e) => setValue('source', e.target.value || null)}
            options={SOURCE_OPTIONS}
          />
          <Select
            label="Industry"
            value={values.industry_type ?? ''}
            onChange={(e) => setValue('industry_type', e.target.value || null)}
            options={INDUSTRY_OPTIONS}
          />
          <Input
            label="Website"
            value={values.website ?? ''}
            onChange={(e) => setValue('website', e.target.value || null)}
            onBlur={() => onBlur('website')}
            error={errors.website}
            placeholder="https://example.com"
          />
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Prospect'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
