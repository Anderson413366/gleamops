'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { equipmentSchema, type EquipmentFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
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
  condition: 'GOOD',
  serial_number: null,
  purchase_date: null,
  assigned_to: null,
  site_id: null,
  notes: null,
};

interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Equipment | null;
  onSuccess?: () => void;
}

export function EquipmentForm({ open, onClose, initialData, onSuccess }: EquipmentFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<EquipmentFormData>({
    schema: equipmentSchema,
    initialValues: initialData
      ? {
          equipment_code: initialData.equipment_code,
          name: initialData.name,
          equipment_type: initialData.equipment_type,
          condition: initialData.condition as 'GOOD' | 'FAIR' | 'POOR' | 'OUT_OF_SERVICE' ?? 'GOOD',
          serial_number: initialData.serial_number,
          purchase_date: initialData.purchase_date,
          assigned_to: initialData.assigned_to,
          site_id: initialData.site_id,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('equipment')
          .update({
            name: data.name,
            equipment_type: data.equipment_type,
            condition: data.condition,
            serial_number: data.serial_number,
            purchase_date: data.purchase_date,
            assigned_to: data.assigned_to,
            site_id: data.site_id,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
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
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
          <Input
            label="Equipment Type"
            value={values.equipment_type ?? ''}
            onChange={(e) => setValue('equipment_type', e.target.value || null)}
          />
          <Select
            label="Condition"
            value={values.condition}
            onChange={(e) => setValue('condition', e.target.value as 'GOOD' | 'FAIR' | 'POOR' | 'OUT_OF_SERVICE')}
            options={CONDITION_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Details</h3>
          <Input
            label="Serial Number"
            value={values.serial_number ?? ''}
            onChange={(e) => setValue('serial_number', e.target.value || null)}
          />
          <Input
            label="Purchase Date"
            type="date"
            value={values.purchase_date ?? ''}
            onChange={(e) => setValue('purchase_date', e.target.value || null)}
          />
        </div>

        <div className="space-y-4">
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
            {isEdit ? 'Save Changes' : 'Create Equipment'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
