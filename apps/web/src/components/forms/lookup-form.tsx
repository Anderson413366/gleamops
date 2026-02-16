'use client';

import { ListChecks } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { lookupSchema, type LookupFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button, FormSection } from '@gleamops/ui';

export interface LookupRow {
  id: string;
  category: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  version_etag: string;
}

const DEFAULTS: LookupFormData = {
  category: '',
  code: '',
  label: '',
  sort_order: 0,
  is_active: true,
};

interface LookupFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: LookupRow | null;
  onSuccess?: () => void;
}

export function LookupForm({ open, onClose, initialData, onSuccess }: LookupFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<LookupFormData>({
    schema: lookupSchema,
    initialValues: initialData
      ? {
          category: initialData.category,
          code: initialData.code,
          label: initialData.label,
          sort_order: initialData.sort_order,
          is_active: initialData.is_active,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('lookups')
          .update({
            label: data.label,
            sort_order: data.sort_order,
            is_active: data.is_active,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('lookups').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Lookup' : 'New Lookup'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Lookup Details" icon={<ListChecks className="h-4 w-4" />} description="Category, code, label, sort order, and activation status.">
          <Input
            label="Category"
            value={values.category}
            onChange={(e) => setValue('category', e.target.value)}
            onBlur={() => onBlur('category')}
            error={errors.category}
            required
            readOnly={isEdit}
            disabled={isEdit}
            placeholder="e.g. JOB_STATUS, EQUIPMENT_TYPE"
          />
          <Input
            label="Code"
            value={values.code}
            onChange={(e) => setValue('code', e.target.value)}
            onBlur={() => onBlur('code')}
            error={errors.code}
            required
            readOnly={isEdit}
            disabled={isEdit}
          />
          <Input
            label="Label"
            value={values.label}
            onChange={(e) => setValue('label', e.target.value)}
            onBlur={() => onBlur('label')}
            error={errors.label}
            required
          />
          <Input
            label="Sort Order"
            type="number"
            value={values.sort_order}
            onChange={(e) => setValue('sort_order', Number(e.target.value))}
          />
          <Select
            label="Status"
            value={values.is_active ? 'true' : 'false'}
            onChange={(e) => setValue('is_active', e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Lookup'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
