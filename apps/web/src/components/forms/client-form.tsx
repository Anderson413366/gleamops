'use client';

import { useEffect } from 'react';
import { Building2, CreditCard, FileText, StickyNote } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { clientSchema, type ClientFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormWizard, useWizardSteps, FormSection } from '@gleamops/ui';
import type { WizardStep } from '@gleamops/ui';
import type { Client } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CANCELED', label: 'Canceled' },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

const INVOICE_FREQ_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

const DEFAULTS: ClientFormData = {
  client_code: '',
  name: '',
  status: 'PROSPECT',
  client_type: null,
  industry: null,
  website: null,
  bill_to_name: null,
  billing_address: null,
  payment_terms: null,
  po_required: false,
  invoice_frequency: null,
  credit_limit: null,
  tax_id: null,
  contract_start_date: null,
  contract_end_date: null,
  auto_renewal: false,
  insurance_required: false,
  insurance_expiry: null,
  notes: null,
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 'basics', title: 'Basic Info' },
  { id: 'billing', title: 'Billing' },
  { id: 'contract', title: 'Contract & Insurance' },
  { id: 'notes', title: 'Notes' },
];

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Client | null;
  onSuccess?: () => void;
  /** Scrolls the form to a specific section when opened. */
  focusSection?: 'basics' | 'billing' | 'contract' | 'notes';
}

export function ClientForm({ open, onClose, initialData, onSuccess, focusSection }: ClientFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const wizard = useWizardSteps(WIZARD_STEPS.length);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ClientFormData>({
    schema: clientSchema,
    initialValues: initialData
      ? {
          client_code: initialData.client_code,
          name: initialData.name,
          status: initialData.status,
          client_type: initialData.client_type,
          industry: initialData.industry,
          website: initialData.website,
          bill_to_name: initialData.bill_to_name,
          billing_address: initialData.billing_address,
          payment_terms: initialData.payment_terms,
          po_required: initialData.po_required,
          invoice_frequency: initialData.invoice_frequency,
          credit_limit: initialData.credit_limit,
          tax_id: initialData.tax_id,
          contract_start_date: initialData.contract_start_date,
          contract_end_date: initialData.contract_end_date,
          auto_renewal: initialData.auto_renewal,
          insurance_required: initialData.insurance_required,
          insurance_expiry: initialData.insurance_expiry,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      const { client_code, ...fields } = data;
      if (isEdit) {
        const result = await supabase
          .from('clients')
          .update(fields)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
        // Status propagation: cascade ON_HOLD/INACTIVE to child sites
        if ((data.status === 'ON_HOLD' || data.status === 'INACTIVE') && data.status !== initialData!.status) {
          await supabase
            .from('sites')
            .update({ status: data.status })
            .eq('client_id', initialData!.id)
            .neq('status', data.status);
        }
      } else {
        const { error } = await supabase.from('clients').insert({
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
    if (open && !isEdit && !values.client_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'CLI' }).then(({ data }) => {
        if (data) setValue('client_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // When requested, take the user directly to a specific section.
  useEffect(() => {
    if (!open || !focusSection) return;

    if (!isEdit) {
      const idx = focusSection === 'basics' ? 0 : focusSection === 'billing' ? 1 : focusSection === 'contract' ? 2 : 3;
      wizard.goToStep(idx);
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-client-form-section="${focusSection}"]`);
    if (!el) return;
    // Smooth scroll after the SlideOver content has mounted.
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus?.();
    }, 50);
  }, [open, focusSection, isEdit, wizard]);

  const handleClose = () => {
    reset();
    wizard.reset();
    onClose();
  };

  // Validate step
  const validateStep = (step: number): boolean => {
    if (step === 0) return !!values.name.trim();
    return true;
  };

  // ---------- Edit mode: flat form ----------
  if (isEdit) {
    return (
      <SlideOver open={open} onClose={handleClose} title="Edit Client" subtitle={initialData?.client_code} wide>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div data-client-form-section="basics" tabIndex={-1}>
            <FormSection title="Basic Info" icon={<Building2 className="h-4 w-4" />}>
              <Input label="Client Code" value={values.client_code} readOnly disabled />
              <Input label="Name" value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => onBlur('name')} error={errors.name} required />
              <Select label="Status" value={values.status} onChange={(e) => setValue('status', e.target.value)} options={STATUS_OPTIONS} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Client Type" value={values.client_type ?? ''} onChange={(e) => setValue('client_type', e.target.value || null)} />
                <Input label="Industry" value={values.industry ?? ''} onChange={(e) => setValue('industry', e.target.value || null)} />
              </div>
              <Input label="Website" value={values.website ?? ''} onChange={(e) => setValue('website', e.target.value || null)} />
            </FormSection>
          </div>
          {/* Billing */}
          <div data-client-form-section="billing" tabIndex={-1}>
            <FormSection title="Billing" icon={<CreditCard className="h-4 w-4" />}>
              <Input label="Bill To Name" value={values.bill_to_name ?? ''} onChange={(e) => setValue('bill_to_name', e.target.value || null)} />
              <Input label="Street" value={values.billing_address?.street ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, street: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={values.billing_address?.city ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, city: e.target.value })} />
                <Input label="State" value={values.billing_address?.state ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, state: e.target.value })} />
                <Input label="ZIP" value={values.billing_address?.zip ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, zip: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Payment Terms" value={values.payment_terms ?? ''} onChange={(e) => setValue('payment_terms', e.target.value || null)} options={PAYMENT_TERMS_OPTIONS} />
                <Select label="Invoice Frequency" value={values.invoice_frequency ?? ''} onChange={(e) => setValue('invoice_frequency', e.target.value || null)} options={INVOICE_FREQ_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Credit Limit" type="number" value={values.credit_limit ?? ''} onChange={(e) => setValue('credit_limit', e.target.value ? Number(e.target.value) : null)} />
                <Input label="Tax ID" value={values.tax_id ?? ''} onChange={(e) => setValue('tax_id', e.target.value || null)} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.po_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('po_required', e.target.checked)} className="rounded border-border" /> PO Required</label>
            </FormSection>
          </div>
          {/* Contract */}
          <div data-client-form-section="contract" tabIndex={-1}>
            <FormSection title="Contract & Insurance" icon={<FileText className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Contract Start" type="date" value={values.contract_start_date ?? ''} onChange={(e) => setValue('contract_start_date', e.target.value || null)} />
                <Input label="Contract End" type="date" value={values.contract_end_date ?? ''} onChange={(e) => setValue('contract_end_date', e.target.value || null)} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.auto_renewal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('auto_renewal', e.target.checked)} className="rounded border-border" /> Auto-renewal</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.insurance_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('insurance_required', e.target.checked)} className="rounded border-border" /> Insurance Required</label>
              <Input label="Insurance Expiry" type="date" value={values.insurance_expiry ?? ''} onChange={(e) => setValue('insurance_expiry', e.target.value || null)} />
            </FormSection>
          </div>
          {/* Notes */}
          <div data-client-form-section="notes" tabIndex={-1}>
            <FormSection title="Notes" icon={<StickyNote className="h-4 w-4" />}>
              <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={3} />
            </FormSection>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </SlideOver>
    );
  }

  // ---------- Create mode: wizard ----------
  return (
    <SlideOver open={open} onClose={handleClose} title="New Client" wide>
      <FormWizard
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
        onStepChange={wizard.goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Client"
        loading={loading}
        validateStep={validateStep}
      >
        {/* Step 0: Basic Info */}
        {wizard.currentStep === 0 && (
          <FormSection title="Basic Info" icon={<Building2 className="h-4 w-4" />} description="Core identity and classification for this client.">
            <Input label="Client Code" value={values.client_code} readOnly disabled hint="Auto-generated" />
            <Input label="Name" value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => onBlur('name')} error={errors.name} required />
            <Select label="Status" value={values.status} onChange={(e) => setValue('status', e.target.value)} options={STATUS_OPTIONS} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Client Type" value={values.client_type ?? ''} onChange={(e) => setValue('client_type', e.target.value || null)} placeholder="e.g., Commercial, Government" />
              <Input label="Industry" value={values.industry ?? ''} onChange={(e) => setValue('industry', e.target.value || null)} placeholder="e.g., Healthcare, Education" />
            </div>
            <Input label="Website" value={values.website ?? ''} onChange={(e) => setValue('website', e.target.value || null)} />
          </FormSection>
        )}

        {/* Step 1: Billing */}
        {wizard.currentStep === 1 && (
          <FormSection title="Billing" icon={<CreditCard className="h-4 w-4" />} description="Invoice and payment settings for this client.">
            <Input label="Bill To Name" value={values.bill_to_name ?? ''} onChange={(e) => setValue('bill_to_name', e.target.value || null)} />
            <Input label="Street" value={values.billing_address?.street ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, street: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={values.billing_address?.city ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, city: e.target.value })} />
              <Input label="State" value={values.billing_address?.state ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, state: e.target.value })} />
              <Input label="ZIP" value={values.billing_address?.zip ?? ''} onChange={(e) => setValue('billing_address', { ...values.billing_address, zip: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Payment Terms" value={values.payment_terms ?? ''} onChange={(e) => setValue('payment_terms', e.target.value || null)} options={PAYMENT_TERMS_OPTIONS} />
              <Select label="Invoice Frequency" value={values.invoice_frequency ?? ''} onChange={(e) => setValue('invoice_frequency', e.target.value || null)} options={INVOICE_FREQ_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Credit Limit" type="number" value={values.credit_limit ?? ''} onChange={(e) => setValue('credit_limit', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Tax ID" value={values.tax_id ?? ''} onChange={(e) => setValue('tax_id', e.target.value || null)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.po_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('po_required', e.target.checked)} className="rounded border-border" /> PO Required</label>
          </FormSection>
        )}

        {/* Step 2: Contract & Insurance */}
        {wizard.currentStep === 2 && (
          <FormSection title="Contract & Insurance" icon={<FileText className="h-4 w-4" />} description="Contract dates, renewal, and insurance requirements.">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contract Start" type="date" value={values.contract_start_date ?? ''} onChange={(e) => setValue('contract_start_date', e.target.value || null)} />
              <Input label="Contract End" type="date" value={values.contract_end_date ?? ''} onChange={(e) => setValue('contract_end_date', e.target.value || null)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.auto_renewal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('auto_renewal', e.target.checked)} className="rounded border-border" /> Auto-renewal</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.insurance_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('insurance_required', e.target.checked)} className="rounded border-border" /> Insurance Required</label>
            {values.insurance_required && (
              <Input label="Insurance Expiry" type="date" value={values.insurance_expiry ?? ''} onChange={(e) => setValue('insurance_expiry', e.target.value || null)} />
            )}
          </FormSection>
        )}

        {/* Step 3: Notes */}
        {wizard.currentStep === 3 && (
          <FormSection title="Notes" icon={<StickyNote className="h-4 w-4" />} description="Optional notes to help your team serve this client.">
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={6} placeholder="Any additional notes about this client..." />
          </FormSection>
        )}
      </FormWizard>
    </SlideOver>
  );
}
