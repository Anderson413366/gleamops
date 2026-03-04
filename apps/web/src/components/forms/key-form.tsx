'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { requestNextCode } from '@/lib/api/request-next-code';
import { keySchema, type KeyFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
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
  focusSection?: 'details';
}

export function KeyForm({ open, onClose, initialData, onSuccess, focusSection }: KeyFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

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
            assigned_to: assignedTo,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('key_inventory').insert({
          ...data,
          assigned_to: assignedTo,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load sites + staff for dropdowns, and auto-generate key code
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    supabase
      .from('sites')
      .select('id, site_code, name')
      .is('archived_at', null)
      .order('site_code')
      .then(({ data }) => {
        if (data) {
          setSites(data.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` })));
        }
      });

    supabase
      .from('staff')
      .select('id, staff_code, full_name')
      .is('archived_at', null)
      .eq('status', 'ACTIVE')
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          setStaffOptions(data.map((s) => ({ value: s.id, label: `${s.full_name ?? s.staff_code} (${s.staff_code})` })));
        }
      });

    // Sync assigned_to from initialData
    setAssignedTo(initialData?.assigned_to ?? null);

    // Auto-generate key code for new keys
    if (!isEdit) {
      void (async () => {
        try {
          const data = await requestNextCode('KEY');
          if (!cancelled) setValue('key_code', data);
        } catch {
          if (!cancelled) setValue('key_code', `KEY-${String(Date.now()).slice(-6)}`);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, initialData, supabase, setValue]);

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>('[data-key-form-section="details"]');
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  const handleClose = () => {
    reset();
    setAssignedTo(null);
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Key' : 'New Key'}
      subtitle={isEdit ? initialData?.key_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div data-key-form-section="details" tabIndex={-1}>
          <FormSection title="Key Details" icon={<KeyRound className="h-4 w-4" />} description="Type, site association, and current availability status.">
          <Input
            label="Key Code"
            value={values.key_code}
            onChange={(e) => setValue('key_code', e.target.value)}
            onBlur={() => onBlur('key_code')}
            error={errors.key_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
            hint={isEdit ? undefined : 'Auto-generated — editable if needed'}
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
            label="Assigned To"
            value={assignedTo ?? ''}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
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
          </FormSection>
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
