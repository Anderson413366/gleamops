'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { siteSchema, type SiteFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { Site, Client } from '@gleamops/shared';

const DEFAULTS: SiteFormData = {
  site_code: '',
  client_id: '',
  name: '',
  address: null,
  alarm_code: null,
  access_notes: null,
  square_footage: null,
  geofence_center_lat: null,
  geofence_center_lng: null,
  geofence_radius_meters: 50,
  notes: null,
};

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Site | null;
  onSuccess?: () => void;
  preselectedClientId?: string;
}

export function SiteForm({ open, onClose, initialData, onSuccess, preselectedClientId }: SiteFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SiteFormData>({
    schema: siteSchema,
    initialValues: initialData
      ? {
          site_code: initialData.site_code,
          client_id: initialData.client_id,
          name: initialData.name,
          address: initialData.address,
          alarm_code: initialData.alarm_code,
          access_notes: initialData.access_notes,
          square_footage: initialData.square_footage,
          geofence_center_lat: initialData.geofence_center_lat,
          geofence_center_lng: initialData.geofence_center_lng,
          geofence_radius_meters: initialData.geofence_radius_meters ?? 50,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, client_id: preselectedClientId ?? '' },
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('sites')
          .update({
            name: data.name,
            client_id: data.client_id,
            address: data.address,
            alarm_code: data.alarm_code,
            access_notes: data.access_notes,
            square_footage: data.square_footage,
            geofence_center_lat: data.geofence_center_lat,
            geofence_center_lng: data.geofence_center_lng,
            geofence_radius_meters: data.geofence_radius_meters,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sites').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load clients for dropdown
  useEffect(() => {
    if (open) {
      supabase
        .from('clients')
        .select('id, name, client_code')
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setClients(
              data.map((c) => ({ value: c.id, label: `${c.name} (${c.client_code})` }))
            );
          }
        });
    }
  }, [open, supabase]);

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.site_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SIT' }).then(({ data }) => {
        if (data) setValue('site_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title={isEdit ? 'Edit Site' : 'New Site'} subtitle={isEdit ? initialData?.site_code : undefined}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input label="Site Code" value={values.site_code} readOnly disabled hint="Auto-generated" />
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <Select
            label="Client"
            value={values.client_id}
            onChange={(e) => setValue('client_id', e.target.value)}
            onBlur={() => onBlur('client_id')}
            error={errors.client_id}
            options={clients}
            placeholder="Select a client..."
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Address</h3>
          <Input
            label="Street"
            value={values.address?.street ?? ''}
            onChange={(e) => setValue('address', { ...values.address, street: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={values.address?.city ?? ''}
              onChange={(e) => setValue('address', { ...values.address, city: e.target.value })}
            />
            <Input
              label="State"
              value={values.address?.state ?? ''}
              onChange={(e) => setValue('address', { ...values.address, state: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ZIP"
              value={values.address?.zip ?? ''}
              onChange={(e) => setValue('address', { ...values.address, zip: e.target.value })}
            />
            <Input
              label="Country"
              value={values.address?.country ?? ''}
              onChange={(e) => setValue('address', { ...values.address, country: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Access & Security</h3>
          <Input
            label="Alarm Code"
            value={values.alarm_code ?? ''}
            onChange={(e) => setValue('alarm_code', e.target.value || null)}
          />
          <Textarea
            label="Access Notes"
            value={values.access_notes ?? ''}
            onChange={(e) => setValue('access_notes', e.target.value || null)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Specs</h3>
          <Input
            label="Square Footage"
            type="number"
            value={values.square_footage ?? ''}
            onChange={(e) => setValue('square_footage', e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Site'}</Button>
        </div>
      </form>
    </SlideOver>
  );
}
