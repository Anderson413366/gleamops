'use client';

import { useEffect } from 'react';
import { ClipboardList, Filter, ShieldCheck, Timer } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { productionRateSchema, type ProductionRateFormData } from '@gleamops/shared';
import type { SalesProductionRate } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';

const UNIT_OPTIONS = [
  { value: 'SQFT_1000', label: 'Sq Ft (per 1,000)' },
  { value: 'EACH', label: 'Each' },
];

const FLOOR_TYPE_OPTIONS = [
  { value: '', label: 'Any (no filter)' },
  { value: 'CARPET', label: 'Carpet' },
  { value: 'VCT', label: 'VCT' },
  { value: 'CERAMIC', label: 'Ceramic' },
  { value: 'HARDWOOD', label: 'Hardwood' },
  { value: 'CONCRETE', label: 'Concrete' },
  { value: 'LVT', label: 'LVT' },
];

const BUILDING_TYPE_OPTIONS = [
  { value: '', label: 'Any (no filter)' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'MEDICAL_HEALTHCARE', label: 'Medical / Healthcare' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SCHOOL_EDUCATION', label: 'School / Education' },
  { value: 'INDUSTRIAL_MANUFACTURING', label: 'Industrial / Manufacturing' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'RESTAURANT_FOOD', label: 'Restaurant / Food' },
  { value: 'GYM_FITNESS', label: 'Gym / Fitness' },
];

const DEFAULTS: ProductionRateFormData = {
  rate_code: '',
  task_name: '',
  unit_code: 'SQFT_1000',
  base_minutes: 0,
  default_ml_adjustment: 1.0,
  floor_type_code: null,
  building_type_code: null,
  is_active: true,
  notes: null,
};

interface ProductionRateFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SalesProductionRate | null;
  onSuccess?: () => void;
}

export function ProductionRateForm({ open, onClose, initialData, onSuccess }: ProductionRateFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ProductionRateFormData>({
    schema: productionRateSchema,
    initialValues: initialData
      ? {
          rate_code: initialData.rate_code,
          task_name: initialData.task_name,
          unit_code: initialData.unit_code as 'SQFT_1000' | 'EACH',
          base_minutes: initialData.base_minutes,
          default_ml_adjustment: initialData.default_ml_adjustment,
          floor_type_code: initialData.floor_type_code,
          building_type_code: initialData.building_type_code,
          is_active: initialData.is_active,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      const user = (await supabase.auth.getUser()).data.user;
      const tenantId = user?.app_metadata?.tenant_id;

      if (isEdit) {
        const { rate_code: _code, ...updateData } = data;
        const result = await supabase
          .from('sales_production_rates')
          .update(updateData)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('sales_production_rates').insert({
          ...data,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Auto-generate rate code on create
  useEffect(() => {
    if (open && !isEdit && !values.rate_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'PRD' }).then(({ data }) => {
        if (data) setValue('rate_code', data);
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
      title={isEdit ? 'Edit Production Rate' : 'New Production Rate'}
      subtitle={isEdit ? initialData?.rate_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Identity and unit for this production rate.">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate Code"
              value={values.rate_code}
              onChange={(e) => setValue('rate_code', e.target.value)}
              onBlur={() => onBlur('rate_code')}
              error={errors.rate_code}
              readOnly={isEdit}
              disabled={isEdit}
              hint={isEdit ? undefined : 'Auto-generated'}
              required
            />
            <Select
              label="Unit"
              value={values.unit_code}
              onChange={(e) => setValue('unit_code', e.target.value as 'SQFT_1000' | 'EACH')}
              options={UNIT_OPTIONS}
            />
          </div>
          <Input
            label="Task Name"
            value={values.task_name}
            onChange={(e) => setValue('task_name', e.target.value)}
            onBlur={() => onBlur('task_name')}
            error={errors.task_name}
            required
          />
        </FormSection>

        <FormSection title="Production Settings" icon={<Timer className="h-4 w-4" />} description="Base minutes plus default adjustment used for estimating.">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Minutes"
              type="number"
              value={values.base_minutes}
              onChange={(e) => setValue('base_minutes', Number(e.target.value))}
              onBlur={() => onBlur('base_minutes')}
              error={errors.base_minutes}
              required
            />
            <Input
              label="ML Adjustment (default)"
              type="number"
              step="0.1"
              value={values.default_ml_adjustment}
              onChange={(e) => setValue('default_ml_adjustment', Number(e.target.value))}
              onBlur={() => onBlur('default_ml_adjustment')}
              error={errors.default_ml_adjustment}
            />
          </div>
        </FormSection>

        <FormSection title="Scope Filters" icon={<Filter className="h-4 w-4" />} description="Optional: narrow this rate to specific environments.">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Floor Type"
              value={values.floor_type_code ?? ''}
              onChange={(e) => setValue('floor_type_code', e.target.value || null)}
              options={FLOOR_TYPE_OPTIONS}
            />
            <Select
              label="Building Type"
              value={values.building_type_code ?? ''}
              onChange={(e) => setValue('building_type_code', e.target.value || null)}
              options={BUILDING_TYPE_OPTIONS}
            />
          </div>
        </FormSection>

        <FormSection title="Status & Notes" icon={<ShieldCheck className="h-4 w-4" />} description="Enable/disable this rate and capture internal notes.">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('is_active', e.target.checked)}
              className="rounded border-border"
            />
            Active
          </label>
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
            rows={3}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Rate'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
