'use client';

import { useEffect, useMemo } from 'react';
import { ClipboardList, FileText, Factory, Tag, CalendarClock } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { equipmentSchema, type EquipmentFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { Equipment } from '@gleamops/shared';

const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

const DEFAULTS: EquipmentFormData = {
  equipment_code: '',
  name: '',
  equipment_type: null,
  equipment_category: null,
  manufacturer: null,
  brand: null,
  model_number: null,
  condition: 'GOOD',
  serial_number: null,
  purchase_date: null,
  purchase_price: null,
  assigned_to: null,
  site_id: null,
  maintenance_schedule: null,
  last_maintenance_date: null,
  next_maintenance_date: null,
  maintenance_specs: null,
  notes: null,
};

interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Equipment | null;
  onSuccess?: () => void;
  focusSection?: 'basics' | 'model' | 'purchase' | 'maintenance' | 'notes';
}

function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  // Supabase can return a full timestamp; HTML date inputs require YYYY-MM-DD.
  return d.length >= 10 ? d.slice(0, 10) : d;
}

export function EquipmentForm({ open, onClose, initialData, onSuccess, focusSection }: EquipmentFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const initialValues = useMemo<EquipmentFormData>(() => {
    if (!initialData) return DEFAULTS;
    return {
      equipment_code: initialData.equipment_code,
      name: initialData.name,
      equipment_type: initialData.equipment_type,
      equipment_category: initialData.equipment_category,
      manufacturer: initialData.manufacturer,
      brand: initialData.brand,
      model_number: initialData.model_number,
      condition: (initialData.condition as 'GOOD' | 'FAIR' | 'POOR' | 'OUT_OF_SERVICE' | null) ?? 'GOOD',
      serial_number: initialData.serial_number,
      purchase_date: normalizeDate(initialData.purchase_date),
      purchase_price: initialData.purchase_price,
      assigned_to: initialData.assigned_to,
      site_id: initialData.site_id,
      maintenance_schedule: initialData.maintenance_schedule,
      last_maintenance_date: normalizeDate(initialData.last_maintenance_date),
      next_maintenance_date: normalizeDate(initialData.next_maintenance_date),
      maintenance_specs: initialData.maintenance_specs,
      notes: initialData.notes,
    };
  }, [initialData]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<EquipmentFormData>({
    schema: equipmentSchema,
    initialValues,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('equipment')
          .update({
            name: data.name,
            equipment_type: data.equipment_type,
            equipment_category: data.equipment_category,
            manufacturer: data.manufacturer,
            brand: data.brand,
            model_number: data.model_number,
            condition: data.condition,
            serial_number: data.serial_number,
            purchase_date: data.purchase_date,
            purchase_price: data.purchase_price,
            assigned_to: data.assigned_to,
            site_id: data.site_id,
            maintenance_schedule: data.maintenance_schedule,
            last_maintenance_date: data.last_maintenance_date,
            next_maintenance_date: data.next_maintenance_date,
            maintenance_specs: data.maintenance_specs,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('equipment').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // `useForm` doesn't automatically reinitialize when `initialData` changes.
  // When opening the SlideOver, reset to the current record defaults so edit forms prefill.
  useEffect(() => {
    if (!open) return;
    reset(initialValues);
  }, [open, reset, initialValues]);

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>(`[data-equipment-form-section="${focusSection}"]`);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Equipment' : 'New Equipment'}
      subtitle={isEdit ? initialData?.equipment_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div data-equipment-form-section="basics" tabIndex={-1}>
          <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Identity, classification, and current condition.">
          <Input
            label="Equipment Code"
            value={values.equipment_code}
            onChange={(e) => setValue('equipment_code', e.target.value)}
            onBlur={() => onBlur('equipment_code')}
            error={errors.equipment_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
          />
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Equipment Type"
              value={values.equipment_type ?? ''}
              onChange={(e) => setValue('equipment_type', e.target.value || null)}
            />
            <Input
              label="Category"
              value={values.equipment_category ?? ''}
              onChange={(e) => setValue('equipment_category', e.target.value || null)}
            />
          </div>
          <Select
            label="Condition"
            value={values.condition}
            onChange={(e) => setValue('condition', e.target.value as 'GOOD' | 'FAIR' | 'POOR' | 'OUT_OF_SERVICE')}
            options={CONDITION_OPTIONS}
          />
          </FormSection>
        </div>

        <div data-equipment-form-section="model" tabIndex={-1}>
          <FormSection title="Make & Model" icon={<Factory className="h-4 w-4" />} description="Manufacturer and device identity details.">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Manufacturer"
              value={values.manufacturer ?? ''}
              onChange={(e) => setValue('manufacturer', e.target.value || null)}
            />
            <Input
              label="Brand"
              value={values.brand ?? ''}
              onChange={(e) => setValue('brand', e.target.value || null)}
            />
          </div>
          <Input
            label="Model Number"
            value={values.model_number ?? ''}
            onChange={(e) => setValue('model_number', e.target.value || null)}
          />
          <Input
            label="Serial Number"
            value={values.serial_number ?? ''}
            onChange={(e) => setValue('serial_number', e.target.value || null)}
          />
          </FormSection>
        </div>

        <div data-equipment-form-section="purchase" tabIndex={-1}>
          <FormSection title="Purchase" icon={<Tag className="h-4 w-4" />} description="Acquisition date and cost (optional).">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Date"
              type="date"
              value={values.purchase_date ?? ''}
              onChange={(e) => setValue('purchase_date', e.target.value || null)}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={values.purchase_price ?? ''}
              onChange={(e) => setValue('purchase_price', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          </FormSection>
        </div>

        <div data-equipment-form-section="maintenance" tabIndex={-1}>
          <FormSection title="Maintenance" icon={<CalendarClock className="h-4 w-4" />} description="Optional maintenance schedule and next steps.">
          <Input
            label="Maintenance Schedule"
            value={values.maintenance_schedule ?? ''}
            onChange={(e) => setValue('maintenance_schedule', e.target.value || null)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Last Maintenance Date"
              type="date"
              value={values.last_maintenance_date ?? ''}
              onChange={(e) => setValue('last_maintenance_date', e.target.value || null)}
            />
            <Input
              label="Next Maintenance Date"
              type="date"
              value={values.next_maintenance_date ?? ''}
              onChange={(e) => setValue('next_maintenance_date', e.target.value || null)}
            />
          </div>
          <Textarea
            label="Maintenance Specs"
            value={values.maintenance_specs ?? ''}
            onChange={(e) => setValue('maintenance_specs', e.target.value || null)}
            rows={3}
          />
          </FormSection>
        </div>

        <div data-equipment-form-section="notes" tabIndex={-1}>
          <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional context for maintenance or assignment history.">
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
            {isEdit ? 'Save Changes' : 'Create Equipment'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
