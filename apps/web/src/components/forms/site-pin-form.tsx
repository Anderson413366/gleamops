'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { sitePinCodeSchema, type SitePinCodeFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button } from '@gleamops/ui';

const DEFAULTS: SitePinCodeFormData = {
  site_id: '',
  pin: '',
  label: 'Main',
  is_active: true,
  expires_at: null,
};

interface SitePinFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SitePinForm({ open, onClose, onSuccess }: SitePinFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SitePinCodeFormData>({
    schema: sitePinCodeSchema,
    initialValues: DEFAULTS,
    onSubmit: async (data) => {
      // Call the API route that hashes the PIN server-side
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/sites/${data.site_id}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pin: data.pin,
          label: data.label,
          is_active: data.is_active,
          expires_at: data.expires_at,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to create PIN' }));
        throw new Error(err.detail || 'Failed to create PIN');
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
      title="New Site PIN"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
            label="PIN"
            value={values.pin}
            onChange={(e) => setValue('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={() => onBlur('pin')}
            error={errors.pin}
            required
            hint="4-6 digits"
            inputMode="numeric"
            maxLength={6}
          />
          <Input
            label="Label"
            value={values.label}
            onChange={(e) => setValue('label', e.target.value)}
            onBlur={() => onBlur('label')}
            error={errors.label}
            required
            hint='e.g. "Front Entrance", "Back Door"'
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
          <Input
            label="Expires At (optional)"
            type="datetime-local"
            value={values.expires_at ?? ''}
            onChange={(e) => setValue('expires_at', e.target.value || null)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create PIN
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
