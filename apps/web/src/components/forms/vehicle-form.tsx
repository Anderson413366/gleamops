'use client';

import { useEffect } from 'react';
import { ClipboardList, FileText, Truck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { vehicleSchema, type VehicleFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { Vehicle } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_SHOP', label: 'In Shop' },
  { value: 'RETIRED', label: 'Retired' },
];

const DEFAULTS: VehicleFormData = {
  vehicle_code: '',
  name: '',
  make: null,
  model: null,
  year: null,
  license_plate: null,
  vin: null,
  color: null,
  status: 'ACTIVE',
  photo_url: null,
  notes: null,
};

interface VehicleFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Vehicle | null;
  onSuccess?: () => void;
  focusSection?: 'basics' | 'details' | 'notes';
}

export function VehicleForm({ open, onClose, initialData, onSuccess, focusSection }: VehicleFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<VehicleFormData>({
    schema: vehicleSchema,
    initialValues: initialData
      ? {
          vehicle_code: initialData.vehicle_code,
          name: initialData.name,
          make: initialData.make,
          model: initialData.model,
          year: initialData.year,
          license_plate: initialData.license_plate,
          vin: initialData.vin,
          color: initialData.color,
          status: initialData.status,
          photo_url: initialData.photo_url ?? null,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('vehicles')
          .update({
            name: data.name,
            make: data.make,
            model: data.model,
            year: data.year,
            license_plate: data.license_plate,
            vin: data.vin,
            color: data.color,
            status: data.status,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('vehicles').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>(`[data-vehicle-form-section="${focusSection}"]`);
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
      title={isEdit ? 'Edit Vehicle' : 'New Vehicle'}
      subtitle={isEdit ? initialData?.vehicle_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div data-vehicle-form-section="basics" tabIndex={-1}>
          <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Identity and current status.">
          <Input
            label="Vehicle Code"
            value={values.vehicle_code}
            onChange={(e) => setValue('vehicle_code', e.target.value)}
            onBlur={() => onBlur('vehicle_code')}
            error={errors.vehicle_code}
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
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value as 'ACTIVE' | 'IN_SHOP' | 'RETIRED')}
            options={STATUS_OPTIONS}
          />
          </FormSection>
        </div>

        <div data-vehicle-form-section="details" tabIndex={-1}>
          <FormSection title="Vehicle Details" icon={<Truck className="h-4 w-4" />} description="Make, model, and identification details.">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Make"
              value={values.make ?? ''}
              onChange={(e) => setValue('make', e.target.value || null)}
            />
            <Input
              label="Model"
              value={values.model ?? ''}
              onChange={(e) => setValue('model', e.target.value || null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year"
              type="number"
              value={values.year ?? ''}
              onChange={(e) => setValue('year', e.target.value ? Number(e.target.value) : null)}
            />
            <Input
              label="Color"
              value={values.color ?? ''}
              onChange={(e) => setValue('color', e.target.value || null)}
            />
          </div>
          <Input
            label="License Plate"
            value={values.license_plate ?? ''}
            onChange={(e) => setValue('license_plate', e.target.value || null)}
          />
          <Input
            label="VIN"
            value={values.vin ?? ''}
            onChange={(e) => setValue('vin', e.target.value || null)}
          />
          </FormSection>
        </div>

        <div data-vehicle-form-section="notes" tabIndex={-1}>
          <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional internal notes (maintenance, usage, etc.).">
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
            {isEdit ? 'Save Changes' : 'Create Vehicle'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
