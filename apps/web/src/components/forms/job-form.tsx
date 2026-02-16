'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, ClipboardList, CreditCard, FileText } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { siteJobSchema, type SiteJobFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormWizard, useWizardSteps, FormSection } from '@gleamops/ui';
import type { WizardStep } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'COMPLETED', label: 'Completed' },
];

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ONE_TIME', label: 'One Time' },
];

const BILLING_UOM_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'PER_SQFT', label: 'Per Sq Ft' },
  { value: 'PER_HOUR', label: 'Per Hour' },
  { value: 'PER_VISIT', label: 'Per Visit' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'SPECIAL', label: 'Special' },
];

const DEFAULTS: SiteJobFormData = {
  job_code: '',
  job_name: '',
  site_id: '',
  service_id: null,
  status: 'ACTIVE',
  frequency: 'WEEKLY',
  schedule_days: null,
  start_time: null,
  end_time: null,
  staff_needed: null,
  start_date: null,
  end_date: null,
  billing_uom: null,
  billing_amount: null,
  job_assigned_to: null,
  subcontractor_id: null,
  invoice_description: null,
  job_type: null,
  priority_level: null,
  estimated_hours_per_service: null,
  specifications: null,
  special_requirements: null,
  notes: null,
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 'basics', title: 'Basic Info' },
  { id: 'schedule', title: 'Schedule' },
  { id: 'billing', title: 'Billing' },
  { id: 'specs', title: 'Specs & Notes' },
];

interface JobFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SiteJob | null;
  onSuccess?: () => void;
  preselectedSiteId?: string;
}

export function JobForm({ open, onClose, initialData, onSuccess, preselectedSiteId }: JobFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const wizard = useWizardSteps(WIZARD_STEPS.length);
  const [sites, setSites] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ value: string; label: string }[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SiteJobFormData>({
    schema: siteJobSchema,
    initialValues: initialData
      ? {
          job_code: initialData.job_code,
          job_name: initialData.job_name ?? '',
          site_id: initialData.site_id,
          service_id: initialData.service_id,
          status: initialData.status,
          frequency: initialData.frequency,
          schedule_days: initialData.schedule_days,
          start_time: initialData.start_time,
          end_time: initialData.end_time,
          staff_needed: initialData.staff_needed,
          start_date: initialData.start_date,
          end_date: initialData.end_date,
          billing_uom: initialData.billing_uom,
          billing_amount: initialData.billing_amount,
          job_assigned_to: initialData.job_assigned_to,
          subcontractor_id: initialData.subcontractor_id,
          invoice_description: initialData.invoice_description,
          job_type: initialData.job_type,
          priority_level: initialData.priority_level,
          estimated_hours_per_service: initialData.estimated_hours_per_service,
          specifications: initialData.specifications,
          special_requirements: initialData.special_requirements,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, site_id: preselectedSiteId ?? '' },
    onSubmit: async (data) => {
      const { job_code, ...fields } = data;
      if (isEdit) {
        const result = await supabase
          .from('site_jobs')
          .update(fields)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('site_jobs').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load dropdowns
  useEffect(() => {
    if (open) {
      supabase.from('sites').select('id, name, site_code').is('archived_at', null).order('name').then(({ data }) => {
        if (data) setSites(data.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` })));
      });
      supabase.from('services').select('id, name, service_code').is('archived_at', null).order('name').then(({ data }) => {
        if (data) setServices(data.map((s) => ({ value: s.id, label: `${s.name} (${s.service_code})` })));
      });
      supabase.from('subcontractors').select('id, company_name, subcontractor_code').is('archived_at', null).order('company_name').then(({ data }) => {
        if (data) setSubcontractors(data.map((s) => ({ value: s.id, label: `${s.company_name} (${s.subcontractor_code})` })));
      });
    }
  }, [open, supabase]);

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.job_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'JOB' }).then(({ data }) => {
        if (data) setValue('job_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    wizard.reset();
    onClose();
  };

  const validateStep = (step: number): boolean => {
    if (step === 0) return !!values.job_name.trim() && !!values.site_id;
    return true;
  };

  // ---------- Edit mode: flat form ----------
  if (isEdit) {
    return (
      <SlideOver open={open} onClose={handleClose} title="Edit Job" subtitle={initialData?.job_code} wide>
        <form onSubmit={handleSubmit} className="space-y-8">
          <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Core identity, site, and current state.">
            <Input label="Job Code" value={values.job_code} readOnly disabled />
            <Input label="Name" value={values.job_name} onChange={(e) => setValue('job_name', e.target.value)} onBlur={() => onBlur('job_name')} error={errors.job_name} required />
            <Select label="Site" value={values.site_id} onChange={(e) => setValue('site_id', e.target.value)} options={sites} required />
            <Select label="Service" value={values.service_id ?? ''} onChange={(e) => setValue('service_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...services]} />
            <Select label="Status" value={values.status} onChange={(e) => setValue('status', e.target.value)} options={STATUS_OPTIONS} />
          </FormSection>

          <FormSection title="Schedule" icon={<CalendarClock className="h-4 w-4" />} description="Frequency, time window, staffing, and date range.">
            <Select label="Frequency" value={values.frequency} onChange={(e) => setValue('frequency', e.target.value)} options={FREQUENCY_OPTIONS} />
            <Input label="Schedule Days" value={values.schedule_days ?? ''} onChange={(e) => setValue('schedule_days', e.target.value || null)} placeholder="e.g., Mon,Wed,Fri" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={values.start_time ?? ''} onChange={(e) => setValue('start_time', e.target.value || null)} />
              <Input label="End Time" type="time" value={values.end_time ?? ''} onChange={(e) => setValue('end_time', e.target.value || null)} />
            </div>
            <Input label="Staff Needed" type="number" value={values.staff_needed ?? ''} onChange={(e) => setValue('staff_needed', e.target.value ? Number(e.target.value) : null)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={values.start_date ?? ''} onChange={(e) => setValue('start_date', e.target.value || null)} />
              <Input label="End Date" type="date" value={values.end_date ?? ''} onChange={(e) => setValue('end_date', e.target.value || null)} />
            </div>
          </FormSection>

          <FormSection title="Billing" icon={<CreditCard className="h-4 w-4" />} description="Billing unit, amount, assignment, and invoicing.">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Billing UOM" value={values.billing_uom ?? ''} onChange={(e) => setValue('billing_uom', e.target.value || null)} options={BILLING_UOM_OPTIONS} />
              <Input label="Billing Amount" type="number" value={values.billing_amount ?? ''} onChange={(e) => setValue('billing_amount', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <Input label="Assigned To" value={values.job_assigned_to ?? ''} onChange={(e) => setValue('job_assigned_to', e.target.value || null)} />
            <Select label="Subcontractor" value={values.subcontractor_id ?? ''} onChange={(e) => setValue('subcontractor_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...subcontractors]} />
            <Textarea label="Invoice Description" value={values.invoice_description ?? ''} onChange={(e) => setValue('invoice_description', e.target.value || null)} rows={2} />
          </FormSection>

          <FormSection title="Specs & Notes" icon={<FileText className="h-4 w-4" />} description="Operational details and internal context.">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Job Type" value={values.job_type ?? ''} onChange={(e) => setValue('job_type', e.target.value || null)} options={JOB_TYPE_OPTIONS} />
              <Select label="Priority" value={values.priority_level ?? ''} onChange={(e) => setValue('priority_level', e.target.value || null)} options={PRIORITY_OPTIONS} />
            </div>
            <Input label="Est. Hours / Service" type="number" value={values.estimated_hours_per_service ?? ''} onChange={(e) => setValue('estimated_hours_per_service', e.target.value ? Number(e.target.value) : null)} />
            <Textarea label="Specifications" value={values.specifications ?? ''} onChange={(e) => setValue('specifications', e.target.value || null)} rows={2} />
            <Textarea label="Special Requirements" value={values.special_requirements ?? ''} onChange={(e) => setValue('special_requirements', e.target.value || null)} rows={2} />
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={2} />
          </FormSection>
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
    <SlideOver open={open} onClose={handleClose} title="New Job" wide>
      <FormWizard
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
        onStepChange={wizard.goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Job"
        loading={loading}
        validateStep={validateStep}
      >
        {/* Step 0: Basic Info */}
        {wizard.currentStep === 0 && (
          <FormSection title="Basic Info" icon={<ClipboardList className="h-4 w-4" />} description="Core identity, site, and current state.">
            <Input label="Job Code" value={values.job_code} readOnly disabled hint="Auto-generated" />
            <Input label="Name" value={values.job_name} onChange={(e) => setValue('job_name', e.target.value)} onBlur={() => onBlur('job_name')} error={errors.job_name} required />
            <Select label="Site" value={values.site_id} onChange={(e) => setValue('site_id', e.target.value)} onBlur={() => onBlur('site_id')} error={errors.site_id} options={[{ value: '', label: 'Select a site...' }, ...sites]} required />
            <Select label="Service" value={values.service_id ?? ''} onChange={(e) => setValue('service_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...services]} />
            <Select label="Status" value={values.status} onChange={(e) => setValue('status', e.target.value)} options={STATUS_OPTIONS} />
          </FormSection>
        )}

        {/* Step 1: Schedule */}
        {wizard.currentStep === 1 && (
          <FormSection title="Schedule" icon={<CalendarClock className="h-4 w-4" />} description="Frequency, time window, staffing, and date range.">
            <Select label="Frequency" value={values.frequency} onChange={(e) => setValue('frequency', e.target.value)} options={FREQUENCY_OPTIONS} />
            <Input label="Schedule Days" value={values.schedule_days ?? ''} onChange={(e) => setValue('schedule_days', e.target.value || null)} placeholder="e.g., Mon,Wed,Fri" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={values.start_time ?? ''} onChange={(e) => setValue('start_time', e.target.value || null)} />
              <Input label="End Time" type="time" value={values.end_time ?? ''} onChange={(e) => setValue('end_time', e.target.value || null)} />
            </div>
            <Input label="Staff Needed" type="number" value={values.staff_needed ?? ''} onChange={(e) => setValue('staff_needed', e.target.value ? Number(e.target.value) : null)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={values.start_date ?? ''} onChange={(e) => setValue('start_date', e.target.value || null)} />
              <Input label="End Date" type="date" value={values.end_date ?? ''} onChange={(e) => setValue('end_date', e.target.value || null)} />
            </div>
          </FormSection>
        )}

        {/* Step 2: Billing */}
        {wizard.currentStep === 2 && (
          <FormSection title="Billing" icon={<CreditCard className="h-4 w-4" />} description="Billing unit, amount, assignment, and invoicing.">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Billing UOM" value={values.billing_uom ?? ''} onChange={(e) => setValue('billing_uom', e.target.value || null)} options={BILLING_UOM_OPTIONS} />
              <Input label="Billing Amount" type="number" value={values.billing_amount ?? ''} onChange={(e) => setValue('billing_amount', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <Input label="Assigned To" value={values.job_assigned_to ?? ''} onChange={(e) => setValue('job_assigned_to', e.target.value || null)} placeholder="Staff name or team" />
            <Select label="Subcontractor" value={values.subcontractor_id ?? ''} onChange={(e) => setValue('subcontractor_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...subcontractors]} />
            <Textarea label="Invoice Description" value={values.invoice_description ?? ''} onChange={(e) => setValue('invoice_description', e.target.value || null)} rows={2} placeholder="What appears on the invoice..." />
          </FormSection>
        )}

        {/* Step 3: Specs & Notes */}
        {wizard.currentStep === 3 && (
          <FormSection title="Specs & Notes" icon={<FileText className="h-4 w-4" />} description="Operational details and internal context.">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Job Type" value={values.job_type ?? ''} onChange={(e) => setValue('job_type', e.target.value || null)} options={JOB_TYPE_OPTIONS} />
              <Select label="Priority" value={values.priority_level ?? ''} onChange={(e) => setValue('priority_level', e.target.value || null)} options={PRIORITY_OPTIONS} />
            </div>
            <Input label="Est. Hours / Service" type="number" value={values.estimated_hours_per_service ?? ''} onChange={(e) => setValue('estimated_hours_per_service', e.target.value ? Number(e.target.value) : null)} />
            <Textarea label="Specifications" value={values.specifications ?? ''} onChange={(e) => setValue('specifications', e.target.value || null)} rows={3} placeholder="Service specifications..." />
            <Textarea label="Special Requirements" value={values.special_requirements ?? ''} onChange={(e) => setValue('special_requirements', e.target.value || null)} rows={2} />
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={2} />
          </FormSection>
        )}
      </FormWizard>
    </SlideOver>
  );
}
