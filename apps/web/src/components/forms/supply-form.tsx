'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { supplySchema, type SupplyFormData } from '@gleamops/shared';
import { SlideOver, Input, Textarea, Button, FormSection } from '@gleamops/ui';
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
  focusSection?: 'details';
}

export function SupplyForm({ open, onClose, initialData, onSuccess, focusSection }: SupplyFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  // Markup & billing rate are outside the Zod schema — managed separately
  const [markupPct, setMarkupPct] = useState<number | null>(null);
  const [billingRate, setBillingRate] = useState<number | null>(null);

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
      const pricingFields = {
        markup_percentage: markupPct,
        billing_rate: billingRate,
      };

      if (isEdit) {
        const result = await supabase
          .from('supply_catalog')
          .update({
            name: data.name,
            category: data.category,
            unit: data.unit,
            unit_cost: data.unit_cost,
            ...pricingFields,
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
          ...pricingFields,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Sync markup/billing from initialData when form opens
  useEffect(() => {
    if (open && initialData) {
      setMarkupPct(initialData.markup_percentage ?? null);
      setBillingRate(initialData.billing_rate ?? null);
    } else if (open) {
      setMarkupPct(null);
      setBillingRate(null);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>('[data-supply-form-section="details"]');
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  const handleClose = () => {
    reset();
    setMarkupPct(null);
    setBillingRate(null);
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Supply' : 'New Supply'}
      subtitle={isEdit ? initialData?.code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div data-supply-form-section="details" tabIndex={-1}>
          <FormSection title="Supply Details" icon={<Package className="h-4 w-4" />} description="Catalog info, unit pricing, and safety links.">
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Markup (%)"
              type="number"
              value={markupPct ?? ''}
              onChange={(e) => {
                const markup = e.target.value ? Number(e.target.value) : null;
                setMarkupPct(markup);
                if (markup != null && values.unit_cost != null) {
                  setBillingRate(Math.round(values.unit_cost * (1 + markup / 100) * 100) / 100);
                }
              }}
              hint="Auto-calculates billing rate"
            />
            <Input
              label="Billing Rate ($)"
              type="number"
              value={billingRate ?? ''}
              onChange={(e) => setBillingRate(e.target.value ? Number(e.target.value) : null)}
              hint="Override or auto-calculated"
            />
          </div>
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
          </FormSection>
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
