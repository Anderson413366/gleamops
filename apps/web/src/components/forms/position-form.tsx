'use client';

import { Briefcase, StickyNote } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { staffPositionSchema, type StaffPositionFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { StaffPosition } from '@gleamops/shared';

const DEFAULTS: StaffPositionFormData = {
  position_code: '',
  title: '',
  department: null,
  pay_grade: null,
  is_active: true,
  notes: null,
};

interface PositionFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: StaffPosition | null;
  onSuccess?: () => void;
}

export function PositionForm({ open, onClose, initialData, onSuccess }: PositionFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<StaffPositionFormData>({
    schema: staffPositionSchema,
    initialValues: initialData
      ? {
          position_code: initialData.position_code,
          title: initialData.title,
          department: initialData.department,
          pay_grade: initialData.pay_grade,
          is_active: initialData.is_active,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('staff_positions')
          .update({
            title: data.title,
            department: data.department,
            pay_grade: data.pay_grade,
            is_active: data.is_active,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('staff_positions').insert({
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
      title={isEdit ? 'Edit Position' : 'New Position'}
      subtitle={isEdit ? initialData?.position_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Position Details" icon={<Briefcase className="h-4 w-4" />} description="Title, department, and pay grade.">
          <Input
            label="Position Code"
            value={values.position_code}
            onChange={(e) => setValue('position_code', e.target.value)}
            onBlur={() => onBlur('position_code')}
            error={errors.position_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
          />
          <Input
            label="Title"
            value={values.title}
            onChange={(e) => setValue('title', e.target.value)}
            onBlur={() => onBlur('title')}
            error={errors.title}
            required
          />
          <Input
            label="Department"
            value={values.department ?? ''}
            onChange={(e) => setValue('department', e.target.value || null)}
          />
          <Input
            label="Pay Grade"
            value={values.pay_grade ?? ''}
            onChange={(e) => setValue('pay_grade', e.target.value || null)}
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

        <FormSection title="Notes" icon={<StickyNote className="h-4 w-4" />} description="Optional internal notes for this position.">
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
            {isEdit ? 'Save Changes' : 'Create Position'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
