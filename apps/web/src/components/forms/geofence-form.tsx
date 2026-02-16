'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { geofenceSchema, type GeofenceFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button, FormSection } from '@gleamops/ui';
import type { Geofence } from '@gleamops/shared';

const DEFAULTS: GeofenceFormData = {
  site_id: '',
  center_lat: 0,
  center_lng: 0,
  radius_meters: 100,
  is_active: true,
};

interface GeofenceFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Geofence | null;
  onSuccess?: () => void;
}

export function GeofenceForm({ open, onClose, initialData, onSuccess }: GeofenceFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<GeofenceFormData>({
    schema: geofenceSchema,
    initialValues: initialData
      ? {
          site_id: initialData.site_id,
          center_lat: initialData.center_lat,
          center_lng: initialData.center_lng,
          radius_meters: initialData.radius_meters,
          is_active: initialData.is_active,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('geofences')
          .update({
            site_id: data.site_id,
            center_lat: data.center_lat,
            center_lng: data.center_lng,
            radius_meters: data.radius_meters,
            is_active: data.is_active,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('geofences').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load sites for dropdown
  useEffect(() => {
    if (open) {
      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setSites(
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
      title={isEdit ? 'Edit Geofence' : 'New Geofence'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Geofence Settings" icon={<MapPin className="h-4 w-4" />} description="Location center, radius, and activation status.">
          <Select
            label="Site"
            value={values.site_id}
            onChange={(e) => setValue('site_id', e.target.value)}
            onBlur={() => onBlur('site_id')}
            error={errors.site_id}
            options={[{ value: '', label: 'Select a site...' }, ...sites]}
            required
          />
          <Input
            label="Center Latitude"
            type="number"
            step="any"
            value={values.center_lat}
            onChange={(e) => setValue('center_lat', e.target.value ? Number(e.target.value) : 0)}
            onBlur={() => onBlur('center_lat')}
            error={errors.center_lat}
            required
            hint="Range: -90 to 90"
          />
          <Input
            label="Center Longitude"
            type="number"
            step="any"
            value={values.center_lng}
            onChange={(e) => setValue('center_lng', e.target.value ? Number(e.target.value) : 0)}
            onBlur={() => onBlur('center_lng')}
            error={errors.center_lng}
            required
            hint="Range: -180 to 180"
          />
          <Input
            label="Radius (meters)"
            type="number"
            value={values.radius_meters}
            onChange={(e) => setValue('radius_meters', e.target.value ? Number(e.target.value) : 100)}
            onBlur={() => onBlur('radius_meters')}
            error={errors.radius_meters}
            required
            hint="Max: 5000m"
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

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Geofence'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
