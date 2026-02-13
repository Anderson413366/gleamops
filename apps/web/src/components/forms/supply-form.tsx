'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { supplySchema, type SupplyFormData } from '@gleamops/shared';
import { SlideOver, Input, Textarea, Button } from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';

const DEFAULTS: SupplyFormData = {
  code: '',
  name: '',
  category: null,
  unit: 'EACH',
  unit_cost: null,
  sds_url: null,
  notes: null,
};

interface SupplyFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SupplyCatalog | null;
  onSuccess?: () => void;
}

export function SupplyForm({ open, onClose, initialData, onSuccess }: SupplyFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SupplyFormData>({
    schema: supplySchema,
    initialValues: initialData
      ? {
          code: initialData.code,
          name: initialData.name,
          category: initialData.category,
          unit: initialData.unit,
          unit_cost: initialData.unit_cost,
          sds_url: initialData.sds_url,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('supply_catalog')
          .update({
            name: data.name,
            category: data.category,
            unit: data.unit,
            unit_cost: data.unit_cost,
            sds_url: data.sds_url,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('supply_catalog').insert({
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
      title={isEdit ? 'Edit Supply' : 'New Supply'}
      subtitle={isEdit ? initialData?.code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Code"
            value={values.code}
            onChange={(e) => setValue('code', e.target.value)}
            onBlur={() => onBlur('code')}
            error={errors.code}
            required
            readOnly={isEdit}
            disabled={isEdit}
            hint={isEdit ? undefined : 'Free-text code (e.g. SUP-BLEACH-01)'}
          />
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <Input
            label="Category"
            value={values.category ?? ''}
            onChange={(e) => setValue('category', e.target.value || null)}
          />
          <Input
            label="Unit"
            value={values.unit}
            onChange={(e) => setValue('unit', e.target.value)}
            onBlur={() => onBlur('unit')}
            error={errors.unit}
            required
          />
          <Input
            label="Unit Cost ($)"
            type="number"
            value={values.unit_cost ?? ''}
            onChange={(e) => setValue('unit_cost', e.target.value ? Number(e.target.value) : null)}
          />
          <Input
            label="SDS URL"
            value={values.sds_url ?? ''}
            onChange={(e) => setValue('sds_url', e.target.value || null)}
            onBlur={() => onBlur('sds_url')}
            error={errors.sds_url}
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
            {isEdit ? 'Save Changes' : 'Create Supply'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
