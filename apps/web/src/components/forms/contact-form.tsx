'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { contactSchema, type ContactFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Button } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';

const ROLE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'DECISION_MAKER', label: 'Decision Maker' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'OTHER', label: 'Other' },
];

const DEFAULTS: ContactFormData = {
  contact_code: '',
  client_id: null,
  site_id: null,
  name: '',
  email: null,
  phone: null,
  role: null,
  is_primary: false,
  timezone: null,
};

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Contact | null;
  onSuccess?: () => void;
  preselectedClientId?: string;
  preselectedSiteId?: string;
}

export function ContactForm({
  open,
  onClose,
  initialData,
  onSuccess,
  preselectedClientId,
  preselectedSiteId,
}: ContactFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ContactFormData>({
    schema: contactSchema,
    initialValues: initialData
      ? {
          contact_code: initialData.contact_code,
          client_id: initialData.client_id,
          site_id: initialData.site_id,
          name: initialData.name,
          email: initialData.email,
          phone: initialData.phone,
          role: initialData.role,
          is_primary: initialData.is_primary,
          timezone: initialData.timezone,
        }
      : {
          ...DEFAULTS,
          client_id: preselectedClientId ?? null,
          site_id: preselectedSiteId ?? null,
        },
    onSubmit: async (data) => {
      if (isEdit) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: data.name,
            client_id: data.client_id,
            site_id: data.site_id,
            email: data.email,
            phone: data.phone,
            role: data.role,
            is_primary: data.is_primary,
            timezone: data.timezone,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load clients and sites for dropdowns
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
      supabase
        .from('sites')
        .select('id, name, site_code')
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

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.contact_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'CON' }).then(({ data }) => {
        if (data) setValue('contact_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title={isEdit ? 'Edit Contact' : 'New Contact'} subtitle={isEdit ? initialData?.contact_code : undefined}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input label="Contact Code" value={values.contact_code} readOnly disabled hint="Auto-generated" />
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
          />
          <Select
            label="Role"
            value={values.role ?? ''}
            onChange={(e) => setValue('role', e.target.value || null)}
            options={ROLE_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Contact Info</h3>
          <Input
            label="Email"
            type="email"
            value={values.email ?? ''}
            onChange={(e) => setValue('email', e.target.value || null)}
            onBlur={() => onBlur('email')}
            error={errors.email}
          />
          <Input
            label="Phone"
            value={values.phone ?? ''}
            onChange={(e) => setValue('phone', e.target.value || null)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Linked To</h3>
          <Select
            label="Client"
            value={values.client_id ?? ''}
            onChange={(e) => setValue('client_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...clients]}
          />
          <Select
            label="Site"
            value={values.site_id ?? ''}
            onChange={(e) => setValue('site_id', e.target.value || null)}
            options={[{ value: '', label: 'None' }, ...sites]}
          />
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.is_primary}
              onChange={(e) => setValue('is_primary', e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="font-medium text-foreground">Primary contact</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Contact'}</Button>
        </div>
      </form>
    </SlideOver>
  );
}
