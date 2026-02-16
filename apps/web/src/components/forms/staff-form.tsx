'use client';

import { useEffect, useState } from 'react';
import { Briefcase, FileText, MapPin, Phone, Siren, UserRound } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { staffSchema, type StaffFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormWizard, useWizardSteps, FormSection } from '@gleamops/ui';
import type { WizardStep } from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';

const ROLE_OPTIONS = [
  { value: 'OWNER_ADMIN', label: 'Owner / Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'INSPECTOR', label: 'Inspector' },
  { value: 'SALES', label: 'Sales' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMP', label: 'Temporary' },
];

const PAY_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'CONTRACT', label: 'Contract' },
];

const SCHEDULE_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'DAY', label: 'Day Shift' },
  { value: 'EVENING', label: 'Evening Shift' },
  { value: 'NIGHT', label: 'Night Shift' },
  { value: 'FLEXIBLE', label: 'Flexible' },
];

const DEFAULTS: StaffFormData = {
  staff_code: '',
  full_name: '',
  first_name: null,
  last_name: null,
  preferred_name: null,
  role: '',
  staff_status: 'ACTIVE',
  employment_type: null,
  is_subcontractor: false,
  hire_date: null,
  pay_rate: null,
  pay_type: null,
  schedule_type: null,
  supervisor_id: null,
  email: null,
  phone: null,
  mobile_phone: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  address: null,
  certifications: null,
  background_check_date: null,
  photo_url: null,
  notes: null,
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 'personal', title: 'Personal Info' },
  { id: 'employment', title: 'Employment' },
  { id: 'emergency', title: 'Emergency & Notes' },
];

interface StaffFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Staff | null;
  onSuccess?: () => void;
}

export function StaffForm({ open, onClose, initialData, onSuccess }: StaffFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const wizard = useWizardSteps(WIZARD_STEPS.length);
  const [supervisors, setSupervisors] = useState<{ value: string; label: string }[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<StaffFormData>({
    schema: staffSchema,
    initialValues: initialData
      ? {
          staff_code: initialData.staff_code,
          full_name: initialData.full_name,
          first_name: initialData.first_name ?? null,
          last_name: initialData.last_name ?? null,
          preferred_name: initialData.preferred_name ?? null,
          role: initialData.role,
          staff_status: initialData.staff_status ?? 'ACTIVE',
          employment_type: initialData.employment_type ?? null,
          is_subcontractor: initialData.is_subcontractor,
          hire_date: initialData.hire_date ?? null,
          pay_rate: initialData.pay_rate,
          pay_type: initialData.pay_type ?? null,
          schedule_type: initialData.schedule_type ?? null,
          supervisor_id: initialData.supervisor_id ?? null,
          email: initialData.email,
          phone: initialData.phone,
          mobile_phone: initialData.mobile_phone ?? null,
          emergency_contact_name: initialData.emergency_contact_name ?? null,
          emergency_contact_phone: initialData.emergency_contact_phone ?? null,
          emergency_contact_relationship: initialData.emergency_contact_relationship ?? null,
          address: initialData.address ?? null,
          certifications: initialData.certifications ?? null,
          background_check_date: initialData.background_check_date ?? null,
          photo_url: initialData.photo_url ?? null,
          notes: initialData.notes ?? null,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      // Handle photo upload with client-side validation
      let photoUrl = data.photo_url;
      if (photoFile) {
        // Validate file size (5MB max)
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new Error('Photo must be under 5MB');
        }
        // Validate MIME type
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(photoFile.type)) {
          throw new Error('Photo must be a JPEG, PNG, WebP, or GIF image');
        }

        const ext = photoFile.name.split('.').pop();
        const path = `${data.staff_code}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('staff-photos').upload(path, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('staff-photos').getPublicUrl(path);
          photoUrl = urlData.publicUrl;

          // Insert files metadata row
          const user = (await supabase.auth.getUser()).data.user;
          const tenantId = user?.app_metadata?.tenant_id;
          if (tenantId) {
            await supabase.from('files').insert({
              tenant_id: tenantId,
              file_code: `FIL-${Date.now()}`,
              entity_type: 'staff',
              entity_id: isEdit ? initialData!.id : data.staff_code, // will be resolved after insert
              bucket: 'staff-photos',
              storage_path: path,
              original_filename: photoFile.name,
              mime_type: photoFile.type,
              size_bytes: photoFile.size,
            });
          }
        }
      }

      // Compute full_name from first+last if both provided
      const fullName = (data.first_name && data.last_name)
        ? `${data.first_name} ${data.last_name}`.trim()
        : data.full_name;

      const submitData = { ...data, full_name: fullName, photo_url: photoUrl };

      if (isEdit) {
        const { staff_code: _code, ...updateData } = submitData;
        const result = await supabase
          .from('staff')
          .update(updateData)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('staff').insert({
          ...submitData,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load supervisors
  useEffect(() => {
    if (open) {
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .order('full_name')
        .then(({ data }) => {
          if (data) {
            setSupervisors(data.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` })));
          }
        });
    }
  }, [open, supabase]);

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.staff_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'STF' }).then(({ data }) => {
        if (data) setValue('staff_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    wizard.reset();
    setPhotoFile(null);
    onClose();
  };

  const validateStep = (step: number): boolean => {
    if (step === 0) return !!values.full_name.trim() && !!values.role;
    return true;
  };

  // ---------- Edit mode: flat form ----------
  if (isEdit) {
    return (
      <SlideOver open={open} onClose={handleClose} title="Edit Staff" subtitle={initialData?.staff_code} wide>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <FormSection title="Personal Info" icon={<UserRound className="h-4 w-4" />} description="Identity, role, status, and photo.">
            <Input label="Staff Code" value={values.staff_code} readOnly disabled />
            <Input label="Full Name" value={values.full_name} onChange={(e) => setValue('full_name', e.target.value)} onBlur={() => onBlur('full_name')} error={errors.full_name} required />
            <div className="grid grid-cols-3 gap-3">
              <Input label="First Name" value={values.first_name ?? ''} onChange={(e) => setValue('first_name', e.target.value || null)} />
              <Input label="Last Name" value={values.last_name ?? ''} onChange={(e) => setValue('last_name', e.target.value || null)} />
              <Input label="Preferred Name" value={values.preferred_name ?? ''} onChange={(e) => setValue('preferred_name', e.target.value || null)} />
            </div>
            <Select label="Role" value={values.role} onChange={(e) => setValue('role', e.target.value)} options={ROLE_OPTIONS} required />
            <Select label="Status" value={values.staff_status} onChange={(e) => setValue('staff_status', e.target.value)} options={STATUS_OPTIONS} />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="block text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium" />
              {values.photo_url && !photoFile && <p className="text-xs text-muted-foreground">Current photo set</p>}
            </div>
          </FormSection>
          {/* Employment */}
          <FormSection title="Employment" icon={<Briefcase className="h-4 w-4" />} description="Hire details, pay, schedule, and supervisor.">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Employment Type" value={values.employment_type ?? ''} onChange={(e) => setValue('employment_type', e.target.value || null)} options={EMPLOYMENT_TYPE_OPTIONS} />
              <Input label="Hire Date" type="date" value={values.hire_date ?? ''} onChange={(e) => setValue('hire_date', e.target.value || null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pay Rate" type="number" value={values.pay_rate ?? ''} onChange={(e) => setValue('pay_rate', e.target.value ? Number(e.target.value) : null)} />
              <Select label="Pay Type" value={values.pay_type ?? ''} onChange={(e) => setValue('pay_type', e.target.value || null)} options={PAY_TYPE_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Schedule Type" value={values.schedule_type ?? ''} onChange={(e) => setValue('schedule_type', e.target.value || null)} options={SCHEDULE_TYPE_OPTIONS} />
              <Select label="Supervisor" value={values.supervisor_id ?? ''} onChange={(e) => setValue('supervisor_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...supervisors]} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_subcontractor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('is_subcontractor', e.target.checked)} className="rounded border-border" /> Subcontractor</label>
          </FormSection>
          {/* Contact */}
          <FormSection title="Contact" icon={<Phone className="h-4 w-4" />} description="Email, phone, and mailing address.">
            <Input label="Email" type="email" value={values.email ?? ''} onChange={(e) => setValue('email', e.target.value || null)} onBlur={() => onBlur('email')} error={errors.email} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" value={values.phone ?? ''} onChange={(e) => setValue('phone', e.target.value || null)} />
              <Input label="Mobile" value={values.mobile_phone ?? ''} onChange={(e) => setValue('mobile_phone', e.target.value || null)} />
            </div>
            <Input label="Street" value={values.address?.street ?? ''} onChange={(e) => setValue('address', { ...values.address, street: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={values.address?.city ?? ''} onChange={(e) => setValue('address', { ...values.address, city: e.target.value })} />
              <Input label="State" value={values.address?.state ?? ''} onChange={(e) => setValue('address', { ...values.address, state: e.target.value })} />
              <Input label="ZIP" value={values.address?.zip ?? ''} onChange={(e) => setValue('address', { ...values.address, zip: e.target.value })} />
            </div>
          </FormSection>
          {/* Emergency & Notes */}
          <FormSection title="Emergency & HR" icon={<Siren className="h-4 w-4" />} description="Emergency contact, certifications, background checks, and notes.">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Emergency Name" value={values.emergency_contact_name ?? ''} onChange={(e) => setValue('emergency_contact_name', e.target.value || null)} />
              <Input label="Emergency Phone" value={values.emergency_contact_phone ?? ''} onChange={(e) => setValue('emergency_contact_phone', e.target.value || null)} />
              <Input label="Relationship" value={values.emergency_contact_relationship ?? ''} onChange={(e) => setValue('emergency_contact_relationship', e.target.value || null)} />
            </div>
            <Input label="Certifications" value={values.certifications ?? ''} onChange={(e) => setValue('certifications', e.target.value || null)} />
            <Input label="Background Check Date" type="date" value={values.background_check_date ?? ''} onChange={(e) => setValue('background_check_date', e.target.value || null)} />
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={3} />
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
    <SlideOver open={open} onClose={handleClose} title="New Staff Member" wide>
      <FormWizard
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
        onStepChange={wizard.goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Staff"
        loading={loading}
        validateStep={validateStep}
      >
        {/* Step 0: Personal Info */}
        {wizard.currentStep === 0 && (
          <FormSection title="Personal Info" icon={<UserRound className="h-4 w-4" />} description="Identity, role, status, and photo.">
            <Input label="Staff Code" value={values.staff_code} readOnly disabled hint="Auto-generated" />
            <Input label="Full Name" value={values.full_name} onChange={(e) => setValue('full_name', e.target.value)} onBlur={() => onBlur('full_name')} error={errors.full_name} required />
            <div className="grid grid-cols-3 gap-3">
              <Input label="First Name" value={values.first_name ?? ''} onChange={(e) => setValue('first_name', e.target.value || null)} />
              <Input label="Last Name" value={values.last_name ?? ''} onChange={(e) => setValue('last_name', e.target.value || null)} />
              <Input label="Preferred Name" value={values.preferred_name ?? ''} onChange={(e) => setValue('preferred_name', e.target.value || null)} />
            </div>
            <Select label="Role" value={values.role} onChange={(e) => setValue('role', e.target.value)} onBlur={() => onBlur('role')} error={errors.role} options={[{ value: '', label: 'Select a role...' }, ...ROLE_OPTIONS]} required />
            <Select label="Status" value={values.staff_status} onChange={(e) => setValue('staff_status', e.target.value)} options={STATUS_OPTIONS} />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="block text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium" />
            </div>
          </FormSection>
        )}

        {/* Step 1: Employment */}
        {wizard.currentStep === 1 && (
          <div className="space-y-8">
            <FormSection title="Employment" icon={<Briefcase className="h-4 w-4" />} description="Hire details, pay, schedule, and supervisor.">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Employment Type" value={values.employment_type ?? ''} onChange={(e) => setValue('employment_type', e.target.value || null)} options={EMPLOYMENT_TYPE_OPTIONS} />
                <Input label="Hire Date" type="date" value={values.hire_date ?? ''} onChange={(e) => setValue('hire_date', e.target.value || null)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Pay Rate ($/hr)" type="number" value={values.pay_rate ?? ''} onChange={(e) => setValue('pay_rate', e.target.value ? Number(e.target.value) : null)} />
                <Select label="Pay Type" value={values.pay_type ?? ''} onChange={(e) => setValue('pay_type', e.target.value || null)} options={PAY_TYPE_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Schedule Type" value={values.schedule_type ?? ''} onChange={(e) => setValue('schedule_type', e.target.value || null)} options={SCHEDULE_TYPE_OPTIONS} />
                <Select label="Supervisor" value={values.supervisor_id ?? ''} onChange={(e) => setValue('supervisor_id', e.target.value || null)} options={[{ value: '', label: 'None' }, ...supervisors]} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={values.is_subcontractor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('is_subcontractor', e.target.checked)} className="rounded border-border" />
                Subcontractor
              </label>
            </FormSection>

            <FormSection title="Contact" icon={<Phone className="h-4 w-4" />} description="Email and phone numbers for quick reach.">
              <Input label="Email" type="email" value={values.email ?? ''} onChange={(e) => setValue('email', e.target.value || null)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" value={values.phone ?? ''} onChange={(e) => setValue('phone', e.target.value || null)} />
                <Input label="Mobile" value={values.mobile_phone ?? ''} onChange={(e) => setValue('mobile_phone', e.target.value || null)} />
              </div>
            </FormSection>
          </div>
        )}

        {/* Step 2: Emergency & Notes */}
        {wizard.currentStep === 2 && (
          <div className="space-y-8">
            <FormSection title="Emergency Contact" icon={<Siren className="h-4 w-4" />} description="Who to contact if something happens on-site.">
              <div className="grid grid-cols-3 gap-3">
                <Input label="Name" value={values.emergency_contact_name ?? ''} onChange={(e) => setValue('emergency_contact_name', e.target.value || null)} />
                <Input label="Phone" value={values.emergency_contact_phone ?? ''} onChange={(e) => setValue('emergency_contact_phone', e.target.value || null)} />
                <Input label="Relationship" value={values.emergency_contact_relationship ?? ''} onChange={(e) => setValue('emergency_contact_relationship', e.target.value || null)} />
              </div>
            </FormSection>

            <FormSection title="Address" icon={<MapPin className="h-4 w-4" />} description="Mailing address for this staff member.">
              <Input label="Street" value={values.address?.street ?? ''} onChange={(e) => setValue('address', { ...values.address, street: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={values.address?.city ?? ''} onChange={(e) => setValue('address', { ...values.address, city: e.target.value })} />
                <Input label="State" value={values.address?.state ?? ''} onChange={(e) => setValue('address', { ...values.address, state: e.target.value })} />
                <Input label="ZIP" value={values.address?.zip ?? ''} onChange={(e) => setValue('address', { ...values.address, zip: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="HR & Notes" icon={<FileText className="h-4 w-4" />} description="Certifications, background checks, and internal notes.">
              <Input label="Certifications" value={values.certifications ?? ''} onChange={(e) => setValue('certifications', e.target.value || null)} placeholder="e.g., OSHA 10, CPR" />
              <Input label="Background Check Date" type="date" value={values.background_check_date ?? ''} onChange={(e) => setValue('background_check_date', e.target.value || null)} />
              <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={3} />
            </FormSection>
          </div>
        )}
      </FormWizard>
    </SlideOver>
  );
}
