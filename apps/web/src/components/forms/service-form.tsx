'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { serviceSchema, type ServiceFormData } from '@gleamops/shared';
import { SlideOver, Input, Textarea, Button } from '@gleamops/ui';
import type { Service } from '@gleamops/shared';

const DEFAULTS: ServiceFormData = {
  service_code: '',
  name: '',
  description: null,
};

interface ServiceFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Service | null;
  onSuccess?: () => void;
}

export function ServiceForm({ open, onClose, initialData, onSuccess }: ServiceFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ServiceFormData>({
    schema: serviceSchema,
    initialValues: initialData
      ? {
          service_code: initialData.service_code,
          name: initialData.name,
          description: initialData.description,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('services')
          .update({
            name: data.name,
            description: data.description,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('services').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.service_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SER' }).then(({ data }) => {
        if (data) setValue('service_code', data);
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
      title={isEdit ? 'Edit Service' : 'New Service'}
      subtitle={isEdit ? initialData?.service_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Service Code"
            value={values.service_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Name"
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
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Service'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
