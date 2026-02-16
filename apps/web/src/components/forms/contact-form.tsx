'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link2, StickyNote, UserRound, Phone } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { contactSchema, type ContactFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';

const CONTACT_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'CLIENT', label: 'Client Contact' },
  { value: 'SITE', label: 'Site Contact' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'OTHER', label: 'Other' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'DECISION_MAKER', label: 'Decision Maker' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'OTHER', label: 'Other' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'TEXT', label: 'Text/SMS' },
];

const LANGUAGE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'EN', label: 'English' },
  { value: 'ES', label: 'Spanish' },
  { value: 'PT', label: 'Portuguese' },
];

const DEFAULTS: ContactFormData = {
  contact_code: '',
  client_id: null,
  site_id: null,
  first_name: '',
  last_name: '',
  name: '',
  contact_type: null,
  company_name: null,
  role_title: null,
  email: null,
  phone: null,
  mobile_phone: null,
  work_phone: null,
  role: null,
  preferred_contact_method: null,
  preferred_language: null,
  is_primary: false,
  timezone: null,
  notes: null,
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
  const [codeGenerationFailed, setCodeGenerationFailed] = useState(false);

  const initialValues = useMemo<ContactFormData>(() => {
    if (initialData) {
      return {
        contact_code: initialData.contact_code,
        client_id: initialData.client_id,
        site_id: initialData.site_id,
        first_name: initialData.first_name ?? '',
        last_name: initialData.last_name ?? '',
        name: initialData.name,
        contact_type: initialData.contact_type,
        company_name: initialData.company_name,
        role_title: initialData.role_title,
        email: initialData.email,
        phone: initialData.phone,
        mobile_phone: initialData.mobile_phone,
        work_phone: initialData.work_phone,
        role: initialData.role,
        preferred_contact_method: initialData.preferred_contact_method,
        preferred_language: initialData.preferred_language,
        is_primary: initialData.is_primary,
        timezone: initialData.timezone,
        notes: initialData.notes,
      };
    }
    return {
      ...DEFAULTS,
      client_id: preselectedClientId ?? null,
      site_id: preselectedSiteId ?? null,
    };
  }, [initialData, preselectedClientId, preselectedSiteId]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ContactFormData>({
    schema: contactSchema,
    initialValues,
    onSubmit: async (data) => {
      // Compute full name
      const fullName = `${data.first_name} ${data.last_name}`.trim();
      const submitData = { ...data, name: fullName };

      if (isEdit) {
        const { contact_code: _code, ...updateData } = submitData;
        const result = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('contacts').insert({
          ...submitData,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // `useForm` doesn't automatically reinitialize when `initialData` changes.
  // When opening, reset to the correct record/defaults so the form always pre-fills.
  useEffect(() => {
    if (!open) return;
    reset(initialValues);
    setCodeGenerationFailed(false);
  }, [open, reset, initialValues]);

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
    let cancelled = false;
    if (!open || isEdit || values.contact_code) return;

    (async () => {
      const { data, error } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'CON' });
      if (cancelled) return;
      if (error || !data) {
        // Backend RPC can be blocked by permissions in some environments.
        // Provide a safe client-side fallback that matches the `CON-XXXX` schema format.
        const fallback = `CON-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
        setCodeGenerationFailed(true);
        setValue('contact_code', fallback);
        return;
      }
      setCodeGenerationFailed(false);
      setValue('contact_code', data);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, values.contact_code, supabase, setValue]);

  const handleClose = () => {
    reset();
    setCodeGenerationFailed(false);
    onClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title={isEdit ? 'Edit Contact' : 'New Contact'} subtitle={isEdit ? initialData?.contact_code : undefined} wide>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identity */}
        <FormSection title="Identity" icon={<UserRound className="h-4 w-4" />} description="Who this person is and their role at the client/site.">
          <Input
            label="Contact Code"
            value={values.contact_code}
            readOnly={isEdit || !codeGenerationFailed}
            disabled={isEdit || !codeGenerationFailed}
            hint={codeGenerationFailed ? 'Could not auto-generate. Please verify this code before saving.' : 'Auto-generated'}
            onChange={(e) => setValue('contact_code', e.target.value)}
            onBlur={() => onBlur('contact_code')}
            error={errors.contact_code}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={values.first_name}
              onChange={(e) => setValue('first_name', e.target.value)}
              onBlur={() => onBlur('first_name')}
              error={errors.first_name}
              required
            />
            <Input
              label="Last Name"
              value={values.last_name}
              onChange={(e) => setValue('last_name', e.target.value)}
              onBlur={() => onBlur('last_name')}
              error={errors.last_name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Contact Type" value={values.contact_type ?? ''} onChange={(e) => setValue('contact_type', e.target.value || null)} options={CONTACT_TYPE_OPTIONS} />
            <Select label="Role" value={values.role ?? ''} onChange={(e) => setValue('role', e.target.value || null)} options={ROLE_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company Name" value={values.company_name ?? ''} onChange={(e) => setValue('company_name', e.target.value || null)} />
            <Input label="Role/Title" value={values.role_title ?? ''} onChange={(e) => setValue('role_title', e.target.value || null)} placeholder="e.g., Facility Manager" />
          </div>
        </FormSection>

        {/* Contact Info */}
        <FormSection title="Contact Info" icon={<Phone className="h-4 w-4" />} description="How to reach this contact quickly.">
          <Input
            label="Email"
            type="email"
            value={values.email ?? ''}
            onChange={(e) => setValue('email', e.target.value || null)}
            onBlur={() => onBlur('email')}
            error={errors.email}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Phone" value={values.phone ?? ''} onChange={(e) => setValue('phone', e.target.value || null)} />
            <Input label="Mobile" value={values.mobile_phone ?? ''} onChange={(e) => setValue('mobile_phone', e.target.value || null)} />
            <Input label="Work Phone" value={values.work_phone ?? ''} onChange={(e) => setValue('work_phone', e.target.value || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Preferred Contact" value={values.preferred_contact_method ?? ''} onChange={(e) => setValue('preferred_contact_method', e.target.value || null)} options={CONTACT_METHOD_OPTIONS} />
            <Select label="Preferred Language" value={values.preferred_language ?? ''} onChange={(e) => setValue('preferred_language', e.target.value || null)} options={LANGUAGE_OPTIONS} />
          </div>
        </FormSection>

        {/* Linked To */}
        <FormSection title="Linked To" icon={<Link2 className="h-4 w-4" />} description="Associate this contact with a client and/or a site.">
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.is_primary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('is_primary', e.target.checked)}
              className="rounded border-border"
            />
            Primary Contact
          </label>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" icon={<StickyNote className="h-4 w-4" />} description="Optional context your team will appreciate later.">
          <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={3} />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Contact'}</Button>
        </div>
      </form>
    </SlideOver>
  );
}
