'use client';

import * as React from 'react';
import { Building2, CreditCard, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, FormSection, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import { supplyVendorSchema, type SupplyVendorFormData } from '@gleamops/shared';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  slugifyVendorName,
  type SupplyVendorProfile,
  upsertSupplyVendorProfile,
} from '@/lib/vendors/supply-vendor-profiles';

interface SupplyVendorFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SupplyVendorProfile | null;
  focusSection?: 'profile' | 'ordering' | 'scope';
  onSuccess?: () => void;
}

interface SubcontractorRecord {
  id: string;
  version_etag: string;
  subcontractor_code: string;
}

const DEFAULTS: SupplyVendorFormData = {
  company_name: '',
  account_number: null,
  contact_person: null,
  phone: null,
  email: null,
  website: null,
  payment_terms: null,
  order_minimum: null,
  delivery_schedule: null,
  categories_supplied: [],
  account_status: 'ACTIVE',
  notes: null,
};

const VENDOR_META_PREFIX = '[SUPPLY_VENDOR_META]';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function categoriesToText(values: string[]): string {
  return values.join(', ');
}

function categoriesFromText(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeNullable(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function mapInitialToValues(initialData?: SupplyVendorProfile | null): SupplyVendorFormData {
  if (!initialData) return DEFAULTS;
  return {
    company_name: initialData.company_name ?? '',
    account_number: initialData.account_number ?? null,
    contact_person: initialData.contact_person ?? null,
    phone: initialData.phone ?? null,
    email: initialData.email ?? null,
    website: initialData.website ?? null,
    payment_terms: initialData.payment_terms ?? null,
    order_minimum: initialData.order_minimum ?? null,
    delivery_schedule: initialData.delivery_schedule ?? null,
    categories_supplied: Array.isArray(initialData.categories_supplied) ? initialData.categories_supplied : [],
    account_status: initialData.account_status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    notes: initialData.notes ?? null,
  };
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

function stripSupplyVendorMeta(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const lines = notes
    .split('\n')
    .filter((line) => !line.trimStart().startsWith(VENDOR_META_PREFIX))
    .join('\n')
    .trim();
  return lines || null;
}

function buildNotesWithMeta(data: SupplyVendorFormData): string | null {
  const cleanNotes = stripSupplyVendorMeta(data.notes);
  const meta = {
    account_number: data.account_number,
    order_minimum: data.order_minimum,
    delivery_schedule: data.delivery_schedule,
    categories_supplied: data.categories_supplied,
    account_status: data.account_status,
  };
  return [cleanNotes, `${VENDOR_META_PREFIX}${JSON.stringify(meta)}`].filter(Boolean).join('\n\n');
}

function generateVendorCodeFallback(): string {
  return `VEN-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
}

async function findExistingSubcontractorRecord(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  initialData: SupplyVendorProfile | null | undefined,
  companyName: string,
): Promise<SubcontractorRecord | null> {
  if (isUuid(initialData?.id)) {
    const { data, error } = await supabase
      .from('subcontractors')
      .select('id, version_etag, subcontractor_code')
      .eq('id', initialData.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as SubcontractorRecord;
  }

  const candidates = Array.from(
    new Set(
      [initialData?.company_name, companyName]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('subcontractors')
      .select('id, version_etag, subcontractor_code')
      .eq('company_name', candidate)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as SubcontractorRecord;
  }

  return null;
}

export function SupplyVendorForm({ open, onClose, initialData, focusSection, onSuccess }: SupplyVendorFormProps) {
  const isEdit = !!initialData;
  const supabase = getSupabaseBrowserClient();
  const [categoriesSuppliedText, setCategoriesSuppliedText] = React.useState('');

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SupplyVendorFormData>({
    schema: supplyVendorSchema,
    initialValues: mapInitialToValues(initialData),
    onSubmit: async (formData) => {
      const companyName = formData.company_name.trim();
      const cleanedData: SupplyVendorFormData = {
        ...formData,
        company_name: companyName,
        account_number: normalizeNullable(formData.account_number),
        contact_person: normalizeNullable(formData.contact_person),
        phone: normalizeNullable(formData.phone),
        email: normalizeNullable(formData.email),
        website: normalizeNullable(formData.website),
        payment_terms: normalizeNullable(formData.payment_terms),
        delivery_schedule: normalizeNullable(formData.delivery_schedule),
        categories_supplied: formData.categories_supplied.map((value) => value.trim()).filter(Boolean),
        notes: normalizeNullable(formData.notes),
      };

      const notesWithMeta = buildNotesWithMeta(cleanedData);
      const payload = {
        company_name: cleanedData.company_name,
        contact_name: cleanedData.contact_person,
        phone: cleanedData.phone,
        business_phone: cleanedData.phone,
        email: cleanedData.email,
        website: cleanedData.website,
        payment_terms: cleanedData.payment_terms,
        status: cleanedData.account_status,
        services_provided: cleanedData.categories_supplied.length > 0 ? cleanedData.categories_supplied.join(', ') : null,
        notes: notesWithMeta,
      };

      let persistedRecord: Pick<SubcontractorRecord, 'id' | 'version_etag'> | null = null;

      if (isEdit) {
        const existing = await findExistingSubcontractorRecord(supabase, initialData, cleanedData.company_name);
        if (existing) {
          const updateResult = await supabase
            .from('subcontractors')
            .update(payload)
            .eq('id', existing.id)
            .eq('version_etag', existing.version_etag)
            .select('id, version_etag')
            .single();
          assertUpdateSucceeded(updateResult as { data: unknown; error: unknown });
          persistedRecord = updateResult.data as Pick<SubcontractorRecord, 'id' | 'version_etag'>;
        }
      }

      if (!persistedRecord) {
        const auth = await supabase.auth.getUser();
        const tenantId = auth.data.user?.app_metadata?.tenant_id as string | undefined;
        if (!tenantId) {
          throw new Error('Missing tenant context. Please sign in again.');
        }

        const generated = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'VEN' });
        const vendorCode = typeof generated.data === 'string' && generated.data ? generated.data : generateVendorCodeFallback();

        const insertResult = await supabase
          .from('subcontractors')
          .insert({
            tenant_id: tenantId,
            subcontractor_code: vendorCode,
            ...payload,
          })
          .select('id, version_etag')
          .single();

        if (insertResult.error) throw insertResult.error;
        persistedRecord = insertResult.data as Pick<SubcontractorRecord, 'id' | 'version_etag'>;
      }

      upsertSupplyVendorProfile({
        id: persistedRecord?.id ?? initialData?.id ?? slugifyVendorName(cleanedData.company_name),
        company_name: cleanedData.company_name,
        account_number: cleanedData.account_number,
        contact_person: cleanedData.contact_person,
        phone: cleanedData.phone,
        email: cleanedData.email,
        website: cleanedData.website,
        payment_terms: cleanedData.payment_terms,
        order_minimum: cleanedData.order_minimum,
        delivery_schedule: cleanedData.delivery_schedule,
        categories_supplied: cleanedData.categories_supplied,
        account_status: cleanedData.account_status,
        notes: cleanedData.notes,
      });

      toast.success(isEdit ? 'Supply vendor updated.' : 'Supply vendor created.');
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = React.useCallback(() => {
    const nextValues = mapInitialToValues(initialData);
    reset(nextValues);
    setCategoriesSuppliedText(categoriesToText(nextValues.categories_supplied));
    onClose();
  }, [initialData, onClose, reset]);

  React.useEffect(() => {
    if (!open) return;
    const nextValues = mapInitialToValues(initialData);
    reset(nextValues);
    setCategoriesSuppliedText(categoriesToText(nextValues.categories_supplied));
  }, [initialData, open, reset]);

  React.useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>(`[data-supply-vendor-form-section="${focusSection}"]`);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Supply Vendor' : 'New Supply Vendor'}
      subtitle={isEdit ? initialData?.company_name : 'Create a vendor profile for supply purchasing'}
      wide
    >
      <form className="space-y-8" onSubmit={handleSubmit}>
        <div data-supply-vendor-form-section="profile" tabIndex={-1}>
          <FormSection title="Vendor Profile" icon={<Building2 className="h-4 w-4" />} description="Core company and contact details.">
            <Input
              label="Company Name"
              value={values.company_name}
              onChange={(event) => setValue('company_name', event.target.value)}
              onBlur={() => onBlur('company_name')}
              error={errors.company_name}
              required
            />
            <Input
              label="Account Number"
              value={values.account_number ?? ''}
              onChange={(event) => setValue('account_number', event.target.value || null)}
              onBlur={() => onBlur('account_number')}
              error={errors.account_number}
            />
            <Input
              label="Contact Person"
              value={values.contact_person ?? ''}
              onChange={(event) => setValue('contact_person', event.target.value || null)}
            />
            <Input
              label="Phone"
              value={values.phone ?? ''}
              onChange={(event) => setValue('phone', event.target.value || null)}
            />
            <Input
              label="Email"
              type="email"
              value={values.email ?? ''}
              onChange={(event) => setValue('email', event.target.value || null)}
              onBlur={() => onBlur('email')}
              error={errors.email}
            />
            <Input
              label="Website"
              value={values.website ?? ''}
              onChange={(event) => setValue('website', event.target.value || null)}
            />
          </FormSection>
        </div>

        <div data-supply-vendor-form-section="ordering" tabIndex={-1}>
          <FormSection title="Ordering" icon={<CreditCard className="h-4 w-4" />} description="Payment and ordering defaults.">
            <Input
              label="Payment Terms"
              value={values.payment_terms ?? ''}
              onChange={(event) => setValue('payment_terms', event.target.value || null)}
            />
            <Input
              label="Order Minimum ($)"
              type="number"
              min="0"
              step="0.01"
              value={values.order_minimum != null ? String(values.order_minimum) : ''}
              onChange={(event) => {
                if (!event.target.value.trim()) {
                  setValue('order_minimum', null);
                  return;
                }
                const parsed = Number(event.target.value);
                setValue('order_minimum', Number.isFinite(parsed) ? parsed : null);
              }}
              onBlur={() => onBlur('order_minimum')}
              error={errors.order_minimum}
            />
            <Input
              label="Delivery Schedule"
              value={values.delivery_schedule ?? ''}
              onChange={(event) => setValue('delivery_schedule', event.target.value || null)}
            />
            <Select
              label="Account Status"
              value={values.account_status}
              onChange={(event) => setValue('account_status', event.target.value as 'ACTIVE' | 'INACTIVE')}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </FormSection>
        </div>

        <div data-supply-vendor-form-section="scope" tabIndex={-1}>
          <FormSection title="Supply Scope" icon={<Truck className="h-4 w-4" />} description="Categories and account notes.">
            <Input
              label="Categories Supplied"
              value={categoriesSuppliedText}
              onChange={(event) => {
                setCategoriesSuppliedText(event.target.value);
                setValue('categories_supplied', categoriesFromText(event.target.value));
              }}
              hint="Comma-separated categories, e.g. Liners & Bags, Chemicals, Safety & PPE"
            />
            <Textarea
              label="Notes"
              value={values.notes ?? ''}
              onChange={(event) => setValue('notes', event.target.value || null)}
            />
          </FormSection>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
