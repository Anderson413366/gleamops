'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { clientSchema, type ClientFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { Client } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PROSPECT', label: 'Prospect' },
];

const DEFAULTS: ClientFormData = {
  client_code: '',
  name: '',
  status: 'ACTIVE',
  billing_address: null,
};

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Client | null;
  onSuccess?: () => void;
}

export function ClientForm({ open, onClose, initialData, onSuccess }: ClientFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ClientFormData>({
    schema: clientSchema,
    initialValues: initialData
      ? {
          client_code: initialData.client_code,
          name: initialData.name,
          status: initialData.status,
          billing_address: initialData.billing_address,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: data.name,
            status: data.status,
            billing_address: data.billing_address,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert({
          client_code: data.client_code,
          name: data.name,
          status: data.status,
          billing_address: data.billing_address,
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
    if (open && !isEdit && !values.client_code) {
      supabase.rpc('next_code', {
        p_tenant_id: null, // Will be filled by the function
        p_prefix: 'CLI',
      }).then(({ data }) => {
        if (data) setValue('client_code', data);
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
      title={isEdit ? 'Edit Client' : 'New Client'}
      subtitle={isEdit ? initialData?.client_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Client Code"
            value={values.client_code}
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
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Billing Address</h3>
          <Input
            label="Street"
            value={values.billing_address?.street ?? ''}
            onChange={(e) =>
              setValue('billing_address', {
                ...values.billing_address,
                street: e.target.value,
              })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={values.billing_address?.city ?? ''}
              onChange={(e) =>
                setValue('billing_address', {
                  ...values.billing_address,
                  city: e.target.value,
                })
              }
            />
            <Input
              label="State"
              value={values.billing_address?.state ?? ''}
              onChange={(e) =>
                setValue('billing_address', {
                  ...values.billing_address,
                  state: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ZIP"
              value={values.billing_address?.zip ?? ''}
              onChange={(e) =>
                setValue('billing_address', {
                  ...values.billing_address,
                  zip: e.target.value,
                })
              }
            />
            <Input
              label="Country"
              value={values.billing_address?.country ?? ''}
              onChange={(e) =>
                setValue('billing_address', {
                  ...values.billing_address,
                  country: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
