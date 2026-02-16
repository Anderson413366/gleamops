'use client';

import { FileText, GraduationCap, ListChecks } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { trainingCourseSchema, type TrainingCourseFormData } from '@gleamops/shared';
import { SlideOver, Input, Textarea, Button, FormSection } from '@gleamops/ui';
import type { TrainingCourse } from '@gleamops/shared';

const DEFAULTS: TrainingCourseFormData = {
  course_code: '',
  name: '',
  description: null,
  category: null,
  is_required: false,
  recurrence_months: null,
  duration_hours: null,
  provider: null,
  is_active: true,
  notes: null,
};

interface TrainingCourseFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: TrainingCourse | null;
  onSuccess?: () => void;
}

export function TrainingCourseForm({ open, onClose, initialData, onSuccess }: TrainingCourseFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<TrainingCourseFormData>({
    schema: trainingCourseSchema,
    initialValues: initialData
      ? {
          course_code: initialData.course_code,
          name: initialData.name,
          description: initialData.description,
          category: initialData.category,
          is_required: initialData.is_required,
          recurrence_months: initialData.recurrence_months,
          duration_hours: initialData.duration_hours,
          provider: initialData.provider,
          is_active: initialData.is_active,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('training_courses')
          .update({
            name: data.name,
            description: data.description,
            category: data.category,
            is_required: data.is_required,
            recurrence_months: data.recurrence_months,
            duration_hours: data.duration_hours,
            provider: data.provider,
            is_active: data.is_active,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('training_courses').insert({
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
      title={isEdit ? 'Edit Course' : 'New Training Course'}
      subtitle={isEdit ? initialData?.course_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Course Basics" icon={<GraduationCap className="h-4 w-4" />} description="Course name and description.">
          <Input
            label="Course Code"
            value={values.course_code}
            onChange={(e) => setValue('course_code', e.target.value)}
            onBlur={() => onBlur('course_code')}
            error={errors.course_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
            hint={isEdit ? undefined : 'Auto-generated'}
          />
          <Input
            label="Course Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <Textarea
            label="Description"
            value={values.description ?? ''}
            onChange={(e) => setValue('description', e.target.value || null)}
          />
        </FormSection>

        <FormSection title="Details" icon={<ListChecks className="h-4 w-4" />} description="Provider, duration, recurrence, and requirement flags.">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category"
              value={values.category ?? ''}
              onChange={(e) => setValue('category', e.target.value || null)}
              hint="e.g., Safety, OSHA, Equipment"
            />
            <Input
              label="Provider"
              value={values.provider ?? ''}
              onChange={(e) => setValue('provider', e.target.value || null)}
              hint="Training provider name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (hours)"
              type="number"
              value={values.duration_hours ?? ''}
              onChange={(e) => setValue('duration_hours', e.target.value ? Number(e.target.value) : null)}
              placeholder="0.0"
            />
            <Input
              label="Recurrence (months)"
              type="number"
              value={values.recurrence_months ?? ''}
              onChange={(e) => setValue('recurrence_months', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty for one-time"
              hint="Repeat every N months"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.is_required}
                onChange={(e) => setValue('is_required', e.target.checked)}
                className="rounded border-border"
              />
              Required for all staff
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValue('is_active', e.target.checked)}
                className="rounded border-border"
              />
              Active
            </label>
          </div>
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
            {isEdit ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
