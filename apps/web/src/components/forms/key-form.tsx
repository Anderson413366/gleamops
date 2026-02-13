'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { keySchema, type KeyFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { KeyInventory } from '@gleamops/shared';

const TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'FOB', label: 'Fob' },
  { value: 'CARD', label: 'Card' },
  { value: 'CODE', label: 'Code' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETURNED', label: 'Returned' },
];

const DEFAULTS: KeyFormData = {
  key_code: '',
  site_id: null,
  key_type: 'STANDARD',
  label: '',
  total_count: 1,
  status: 'AVAILABLE',
  notes: null,
};

interface KeyFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: KeyInventory | null;
  onSuccess?: () => void;
}

export function KeyForm({ open, onClose, initialData, onSuccess }: KeyFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<KeyFormData>({
    schema: keySchema,
    initialValues: initialData
      ? {
          key_code: initialData.key_code,
          site_id: initialData.site_id,
          key_type: initialData.key_type,
          label: initialData.label,
          total_count: initialData.total_count,
          status: initialData.status,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('key_inventory')
          .update({
            site_id: data.site_id,
            key_type: data.key_type,
            label: data.label,
            total_count: data.total_count,
            status: data.status,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('key_inventory').insert({
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
        .order('site_code')
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
      title={isEdit ? 'Edit Key' : 'New Key'}
      subtitle={isEdit ? initialData?.key_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Key Code"
            value={values.key_code}
            onChange={(e) => setValue('key_code', e.target.value)}
            onBlur={() => onBlur('key_code')}
            error={errors.key_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
            hint={isEdit ? undefined : 'Free-text code (e.g. KEY-FRONT-01)'}
          />
          <Input
            label="Label"
            value={values.label}
            onChange={(e) => setValue('label', e.target.value)}
            onBlur={() => onBlur('label')}
            error={errors.label}
            required
          />
          <Select
            label="Site"
            value={values.site_id ?? ''}
            onChange={(e) => setValue('site_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...sites]}
          />
          <Select
            label="Key Type"
            value={values.key_type}
            onChange={(e) => setValue('key_type', e.target.value as 'STANDARD' | 'FOB' | 'CARD' | 'CODE' | 'OTHER')}
            options={TYPE_OPTIONS}
          />
          <Input
            label="Total Count"
            type="number"
            value={values.total_count}
            onChange={(e) => setValue('total_count', e.target.value ? Number(e.target.value) : 1)}
          />
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value as 'AVAILABLE' | 'ASSIGNED' | 'LOST' | 'RETURNED')}
            options={STATUS_OPTIONS}
          />
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Key'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
