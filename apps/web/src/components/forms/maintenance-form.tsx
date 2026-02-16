'use client';

import { CalendarDays, FileText, Wrench } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { vehicleMaintenanceSchema, type VehicleMaintenanceFormData } from '@gleamops/shared';
import { SlideOver, Input, Textarea, Button, FormSection } from '@gleamops/ui';
import type { VehicleMaintenance } from '@gleamops/shared';

const DEFAULTS: VehicleMaintenanceFormData = {
  vehicle_id: '',
  service_date: new Date().toISOString().slice(0, 10),
  service_type: '',
  description: null,
  cost: null,
  odometer: null,
  performed_by: null,
  next_service_date: null,
  notes: null,
};

interface MaintenanceFormProps {
  open: boolean;
  onClose: () => void;
  vehicleId?: string;
  initialData?: VehicleMaintenance | null;
  onSuccess?: () => void;
}

export function MaintenanceForm({ open, onClose, vehicleId, initialData, onSuccess }: MaintenanceFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<VehicleMaintenanceFormData>({
    schema: vehicleMaintenanceSchema,
    initialValues: initialData
      ? {
          vehicle_id: initialData.vehicle_id,
          service_date: initialData.service_date,
          service_type: initialData.service_type,
          description: initialData.description,
          cost: initialData.cost,
          odometer: initialData.odometer,
          performed_by: initialData.performed_by,
          next_service_date: initialData.next_service_date,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, vehicle_id: vehicleId ?? '' },
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('vehicle_maintenance')
          .update({
            service_date: data.service_date,
            service_type: data.service_type,
            description: data.description,
            cost: data.cost,
            odometer: data.odometer,
            performed_by: data.performed_by,
            next_service_date: data.next_service_date,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('vehicle_maintenance').insert({
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
      title={isEdit ? 'Edit Service Record' : 'New Service Record'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Service Record" icon={<CalendarDays className="h-4 w-4" />} description="When the service happened and what was done.">
          <Input
            label="Service Date"
            type="date"
            value={values.service_date}
            onChange={(e) => setValue('service_date', e.target.value)}
            onBlur={() => onBlur('service_date')}
            error={errors.service_date}
            required
          />
          <Input
            label="Service Type"
            value={values.service_type}
            onChange={(e) => setValue('service_type', e.target.value)}
            onBlur={() => onBlur('service_type')}
            error={errors.service_type}
            required
            placeholder="e.g. Oil Change, Tire Rotation, Brake Service"
          />
          <Textarea
            label="Description"
            value={values.description ?? ''}
            onChange={(e) => setValue('description', e.target.value || null)}
          />
        </FormSection>

        <FormSection title="Details" icon={<Wrench className="h-4 w-4" />} description="Costs, odometer, who performed it, and next service date.">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost ($)"
              type="number"
              value={values.cost ?? ''}
              onChange={(e) => setValue('cost', e.target.value ? Number(e.target.value) : null)}
            />
            <Input
              label="Odometer"
              type="number"
              value={values.odometer ?? ''}
              onChange={(e) => setValue('odometer', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <Input
            label="Performed By"
            value={values.performed_by ?? ''}
            onChange={(e) => setValue('performed_by', e.target.value || null)}
            placeholder="Mechanic or shop name"
          />
          <Input
            label="Next Service Date"
            type="date"
            value={values.next_service_date ?? ''}
            onChange={(e) => setValue('next_service_date', e.target.value || null)}
          />
        </FormSection>

        <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional internal notes.">
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
            {isEdit ? 'Save Changes' : 'Add Record'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
