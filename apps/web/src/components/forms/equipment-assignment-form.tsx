'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, FileText } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { equipmentAssignmentSchema, type EquipmentAssignmentFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { EquipmentAssignment } from '@gleamops/shared';

const DEFAULTS: EquipmentAssignmentFormData = {
  equipment_id: '',
  staff_id: null,
  site_id: null,
  assigned_date: new Date().toISOString().slice(0, 10),
  returned_date: null,
  notes: null,
};

interface EquipmentAssignmentFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: EquipmentAssignment | null;
  onSuccess?: () => void;
  presetEquipmentId?: string;
}

export function EquipmentAssignmentForm({
  open,
  onClose,
  initialData,
  onSuccess,
  presetEquipmentId,
}: EquipmentAssignmentFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [equipmentOptions, setEquipmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [siteOptions, setSiteOptions] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<EquipmentAssignmentFormData>({
    schema: equipmentAssignmentSchema,
    initialValues: initialData
      ? {
          equipment_id: initialData.equipment_id,
          staff_id: initialData.staff_id,
          site_id: initialData.site_id,
          assigned_date: initialData.assigned_date,
          returned_date: initialData.returned_date,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, equipment_id: presetEquipmentId ?? '' },
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('equipment_assignments')
          .update({
            equipment_id: data.equipment_id,
            staff_id: data.staff_id,
            site_id: data.site_id,
            assigned_date: data.assigned_date,
            returned_date: data.returned_date,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('equipment_assignments').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load dropdown options when form opens
  useEffect(() => {
    if (open) {
      supabase
        .from('equipment')
        .select('id, equipment_code, name')
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setEquipmentOptions(
              data.map((e) => ({ value: e.id, label: `${e.name} (${e.equipment_code})` }))
            );
          }
        });

      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .is('archived_at', null)
        .order('full_name')
        .then(({ data }) => {
          if (data) {
            setStaffOptions(
              data.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))
            );
          }
        });

      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setSiteOptions(
              data.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` }))
            );
          }
        });
    }
  }, [open, supabase]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Assignment' : 'New Equipment Assignment'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Assignment" icon={<ClipboardList className="h-4 w-4" />} description="Link equipment to a staff member and/or site.">
          <Select
            label="Equipment"
            value={values.equipment_id}
            onChange={(e) => setValue('equipment_id', e.target.value)}
            onBlur={() => onBlur('equipment_id')}
            error={errors.equipment_id}
            options={[{ value: '', label: 'Select equipment...' }, ...equipmentOptions]}
            required
            disabled={!!presetEquipmentId}
          />
          <Select
            label="Staff"
            value={values.staff_id ?? ''}
            onChange={(e) => setValue('staff_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...staffOptions]}
          />
          <Select
            label="Site"
            value={values.site_id ?? ''}
            onChange={(e) => setValue('site_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...siteOptions]}
          />
        </FormSection>

        <FormSection title="Dates" icon={<CalendarDays className="h-4 w-4" />} description="When the equipment was assigned and returned.">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Assigned Date"
              type="date"
              value={values.assigned_date}
              onChange={(e) => setValue('assigned_date', e.target.value)}
              onBlur={() => onBlur('assigned_date')}
              error={errors.assigned_date}
              required
            />
            <Input
              label="Returned Date"
              type="date"
              value={values.returned_date ?? ''}
              onChange={(e) => setValue('returned_date', e.target.value || null)}
            />
          </div>
        </FormSection>

        <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional notes for this assignment.">
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
            {isEdit ? 'Save Changes' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
