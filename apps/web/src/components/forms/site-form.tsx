'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react';
import { Building2, CheckCircle2, FileText, ImagePlus, MapPin, Shield, Warehouse } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { siteSchema, type SiteFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormWizard, useWizardSteps, FormSection } from '@gleamops/ui';
import type { WizardStep } from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { LookupSelect } from './lookup-select';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const RISK_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DEFAULTS: SiteFormData = {
  site_code: '',
  client_id: '',
  name: '',
  status: 'ACTIVE',
  address: null,
  square_footage: null,
  number_of_floors: null,
  employees_on_site: null,
  alarm_code: null,
  alarm_system: null,
  security_protocol: null,
  entry_instructions: null,
  parking_instructions: null,
  access_notes: null,
  earliest_start_time: null,
  latest_start_time: null,
  weekend_access: false,
  osha_compliance_required: false,
  background_check_required: false,
  janitorial_closet_location: null,
  supply_storage_location: null,
  water_source_location: null,
  dumpster_location: null,
  risk_level: null,
  priority_level: null,
  geofence_center_lat: null,
  geofence_center_lng: null,
  geofence_radius_meters: 50,
  photo_url: null,
  notes: null,
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 'basics', title: 'Basic Info' },
  { id: 'address', title: 'Address & Facility' },
  { id: 'access', title: 'Access & Security' },
  { id: 'service', title: 'Service & Compliance' },
  { id: 'facility', title: 'Facility & Notes' },
];

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Site | null;
  onSuccess?: () => void;
  preselectedClientId?: string;
  focusSection?: 'basics' | 'address' | 'access' | 'service' | 'facility' | 'notes';
}

export function SiteForm({ open, onClose, initialData, onSuccess, preselectedClientId, focusSection }: SiteFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const wizard = useWizardSteps(WIZARD_STEPS.length);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SiteFormData>({
    schema: siteSchema,
    initialValues: initialData
      ? {
          site_code: initialData.site_code,
          client_id: initialData.client_id,
          name: initialData.name,
          status: initialData.status ?? 'ACTIVE',
          address: initialData.address,
          square_footage: initialData.square_footage,
          number_of_floors: initialData.number_of_floors,
          employees_on_site: initialData.employees_on_site,
          alarm_code: initialData.alarm_code,
          alarm_system: initialData.alarm_system,
          security_protocol: initialData.security_protocol,
          entry_instructions: initialData.entry_instructions,
          parking_instructions: initialData.parking_instructions,
          access_notes: initialData.access_notes,
          earliest_start_time: initialData.earliest_start_time,
          latest_start_time: initialData.latest_start_time,
          weekend_access: initialData.weekend_access,
          osha_compliance_required: initialData.osha_compliance_required,
          background_check_required: initialData.background_check_required,
          janitorial_closet_location: initialData.janitorial_closet_location,
          supply_storage_location: initialData.supply_storage_location,
          water_source_location: initialData.water_source_location,
          dumpster_location: initialData.dumpster_location,
          risk_level: initialData.risk_level,
          priority_level: initialData.priority_level,
          geofence_center_lat: initialData.geofence_center_lat,
          geofence_center_lng: initialData.geofence_center_lng,
          geofence_radius_meters: initialData.geofence_radius_meters ?? 50,
          photo_url: initialData.photo_url ?? null,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, client_id: preselectedClientId ?? '' },
    onSubmit: async (data) => {
      let photoUrl = data.photo_url;
      if (photoFile) {
        if (photoFile.size > MAX_PHOTO_SIZE) {
          throw new Error('Site photo must be under 2MB');
        }
        if (!ALLOWED_PHOTO_TYPES.includes(photoFile.type)) {
          throw new Error('Site photo must be JPEG, PNG, or WebP');
        }

        const ext = photoFile.name.split('.').pop();
        const path = `${data.site_code}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('site-photos').upload(path, photoFile, { upsert: true });
        if (uploadErr) {
          throw uploadErr;
        }
        const { data: urlData } = supabase.storage.from('site-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const submitData = { ...data, photo_url: photoUrl };
      const fields = { ...submitData } as Partial<SiteFormData>;
      delete fields.site_code;
      if (isEdit) {
        const result = await supabase
          .from('sites')
          .update(fields)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('sites').insert({
          ...submitData,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Load clients for dropdown
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
    }
  }, [open, supabase]);

  // Generate next code on create
  useEffect(() => {
    if (open && !isEdit && !values.site_code) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SIT' }).then(({ data }) => {
        if (data) setValue('site_code', data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>(`[data-site-form-section="${focusSection}"]`);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  const handleClose = () => {
    reset();
    wizard.reset();
    setPhotoFile(null);
    onClose();
  };

  const handlePhotoPick = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(e.target.files?.[0] ?? null);
  };

  const handlePhotoDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const photoPreviewUrl = photoPreview ?? values.photo_url;

  const validateStep = (step: number): boolean => {
    if (step === 0) return !!values.name.trim() && !!values.client_id;
    return true;
  };

  // ---------- Edit mode: flat form ----------
  if (isEdit) {
    return (
      <SlideOver open={open} onClose={handleClose} title="Edit Site" subtitle={initialData?.site_code} wide>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div data-site-form-section="basics" tabIndex={-1}>
            <FormSection title="Basic Info" icon={<Building2 className="h-4 w-4" />} description="Core identity, client association, and photo.">
            <Input label="Site Code" value={values.site_code} readOnly disabled />
            <Input label="Name" value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => onBlur('name')} error={errors.name} required />
            <Select label="Client" value={values.client_id} onChange={(e) => setValue('client_id', e.target.value)} options={clients} required />
            <LookupSelect
              label="Status"
              category={['Site Status', 'SITE_STATUS']}
              value={values.status}
              onChange={(value) => setValue('status', value)}
              fallbackOptions={STATUS_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Site Photo</label>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePhotoDrop}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 hover:border-module-accent/50 hover:bg-muted/40"
              >
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Site preview" className="h-14 w-14 rounded-lg border border-border object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium text-foreground">Drop image or click to upload</p>
                  <p className="text-xs text-muted-foreground">JPEG/PNG/WebP, max 2MB.</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoPick} className="hidden" />
              </label>
            </div>
            </FormSection>
          </div>

          <div data-site-form-section="address" tabIndex={-1}>
            <FormSection title="Address & Facility" icon={<MapPin className="h-4 w-4" />} description="Location and facility sizing details used for planning.">
            <Input label="Street" value={values.address?.street ?? ''} onChange={(e) => setValue('address', { ...values.address, street: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="City" value={values.address?.city ?? ''} onChange={(e) => setValue('address', { ...values.address, city: e.target.value })} />
              <Input label="State" value={values.address?.state ?? ''} onChange={(e) => setValue('address', { ...values.address, state: e.target.value })} />
              <Input label="ZIP" value={values.address?.zip ?? ''} onChange={(e) => setValue('address', { ...values.address, zip: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Square Footage" type="number" value={values.square_footage ?? ''} onChange={(e) => setValue('square_footage', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Floors" type="number" value={values.number_of_floors ?? ''} onChange={(e) => setValue('number_of_floors', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Employees On Site" type="number" value={values.employees_on_site ?? ''} onChange={(e) => setValue('employees_on_site', e.target.value ? Number(e.target.value) : null)} />
            </div>
            </FormSection>
          </div>

          <div data-site-form-section="access" tabIndex={-1}>
            <FormSection title="Access & Security" icon={<Shield className="h-4 w-4" />} description="How your team gets in, where to park, and security protocols.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Alarm Code" value={values.alarm_code ?? ''} onChange={(e) => setValue('alarm_code', e.target.value || null)} />
              <Input label="Alarm System" value={values.alarm_system ?? ''} onChange={(e) => setValue('alarm_system', e.target.value || null)} />
            </div>
            <Input label="Security Protocol" value={values.security_protocol ?? ''} onChange={(e) => setValue('security_protocol', e.target.value || null)} />
            <Textarea label="Entry Instructions" value={values.entry_instructions ?? ''} onChange={(e) => setValue('entry_instructions', e.target.value || null)} rows={2} />
            <Textarea label="Parking Instructions" value={values.parking_instructions ?? ''} onChange={(e) => setValue('parking_instructions', e.target.value || null)} rows={2} />
            <Textarea label="Access Notes" value={values.access_notes ?? ''} onChange={(e) => setValue('access_notes', e.target.value || null)} rows={2} />
            </FormSection>
          </div>

          <div data-site-form-section="service" tabIndex={-1}>
            <FormSection title="Service & Compliance" icon={<CheckCircle2 className="h-4 w-4" />} description="Service window and compliance requirements.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Earliest Start Time" type="time" value={values.earliest_start_time ?? ''} onChange={(e) => setValue('earliest_start_time', e.target.value || null)} />
              <Input label="Latest Start Time" type="time" value={values.latest_start_time ?? ''} onChange={(e) => setValue('latest_start_time', e.target.value || null)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.weekend_access} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('weekend_access', e.target.checked)} className="rounded border-border" /> Weekend Access</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.osha_compliance_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('osha_compliance_required', e.target.checked)} className="rounded border-border" /> OSHA Compliance Required</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.background_check_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('background_check_required', e.target.checked)} className="rounded border-border" /> Background Check Required</label>
            </FormSection>
          </div>

          <div data-site-form-section="facility" tabIndex={-1}>
            <FormSection title="Facility Details" icon={<Warehouse className="h-4 w-4" />} description="Storage locations, risk, and priority indicators.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Janitorial Closet" value={values.janitorial_closet_location ?? ''} onChange={(e) => setValue('janitorial_closet_location', e.target.value || null)} />
              <Input label="Supply Storage" value={values.supply_storage_location ?? ''} onChange={(e) => setValue('supply_storage_location', e.target.value || null)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Water Source" value={values.water_source_location ?? ''} onChange={(e) => setValue('water_source_location', e.target.value || null)} />
              <Input label="Dumpster Location" value={values.dumpster_location ?? ''} onChange={(e) => setValue('dumpster_location', e.target.value || null)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <LookupSelect
                label="Risk Level"
                category={['Risk Level', 'RISK_LEVEL']}
                value={values.risk_level ?? ''}
                onChange={(value) => setValue('risk_level', value || null)}
                fallbackOptions={RISK_OPTIONS}
              />
              <LookupSelect
                label="Priority Level"
                category={['Priority Level', 'PRIORITY_LEVEL']}
                value={values.priority_level ?? ''}
                onChange={(value) => setValue('priority_level', value || null)}
                fallbackOptions={PRIORITY_OPTIONS}
              />
            </div>
            </FormSection>
          </div>

          <div data-site-form-section="notes" tabIndex={-1}>
            <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional context your team will appreciate later.">
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
    <SlideOver open={open} onClose={handleClose} title="New Site" wide>
      <FormWizard
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
        onStepChange={wizard.goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Site"
        loading={loading}
        validateStep={validateStep}
      >
        {/* Step 0: Basic Info */}
        {wizard.currentStep === 0 && (
          <FormSection title="Basic Info" icon={<Building2 className="h-4 w-4" />} description="Core identity, client association, and photo.">
            <Input label="Site Code" value={values.site_code} readOnly disabled hint="Auto-generated" />
            <Input label="Name" value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => onBlur('name')} error={errors.name} required />
            <Select
              label="Client"
              value={values.client_id}
              onChange={(e) => setValue('client_id', e.target.value)}
              onBlur={() => onBlur('client_id')}
              error={errors.client_id}
              options={[{ value: '', label: 'Select a client...' }, ...clients]}
              required
            />
            <LookupSelect
              label="Status"
              category={['Site Status', 'SITE_STATUS']}
              value={values.status}
              onChange={(value) => setValue('status', value)}
              fallbackOptions={STATUS_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Site Photo</label>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handlePhotoDrop}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 hover:border-module-accent/50 hover:bg-muted/40"
              >
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Site preview" className="h-14 w-14 rounded-lg border border-border object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium text-foreground">Drop image or click to upload</p>
                  <p className="text-xs text-muted-foreground">JPEG/PNG/WebP, max 2MB.</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoPick} className="hidden" />
              </label>
            </div>
          </FormSection>
        )}

        {/* Step 1: Address & Facility */}
        {wizard.currentStep === 1 && (
          <FormSection title="Address & Facility" icon={<MapPin className="h-4 w-4" />} description="Location and facility sizing details used for planning.">
            <Input label="Street" value={values.address?.street ?? ''} onChange={(e) => setValue('address', { ...values.address, street: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="City" value={values.address?.city ?? ''} onChange={(e) => setValue('address', { ...values.address, city: e.target.value })} />
              <Input label="State" value={values.address?.state ?? ''} onChange={(e) => setValue('address', { ...values.address, state: e.target.value })} />
              <Input label="ZIP" value={values.address?.zip ?? ''} onChange={(e) => setValue('address', { ...values.address, zip: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Square Footage" type="number" value={values.square_footage ?? ''} onChange={(e) => setValue('square_footage', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Floors" type="number" value={values.number_of_floors ?? ''} onChange={(e) => setValue('number_of_floors', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Employees On Site" type="number" value={values.employees_on_site ?? ''} onChange={(e) => setValue('employees_on_site', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </FormSection>
        )}

        {/* Step 2: Access & Security */}
        {wizard.currentStep === 2 && (
          <FormSection title="Access & Security" icon={<Shield className="h-4 w-4" />} description="How your team gets in, where to park, and security protocols.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Alarm Code" value={values.alarm_code ?? ''} onChange={(e) => setValue('alarm_code', e.target.value || null)} />
              <Input label="Alarm System" value={values.alarm_system ?? ''} onChange={(e) => setValue('alarm_system', e.target.value || null)} placeholder="e.g., ADT, SimpliSafe" />
            </div>
            <Input label="Security Protocol" value={values.security_protocol ?? ''} onChange={(e) => setValue('security_protocol', e.target.value || null)} />
            <Textarea label="Entry Instructions" value={values.entry_instructions ?? ''} onChange={(e) => setValue('entry_instructions', e.target.value || null)} rows={2} placeholder="How to enter the building..." />
            <Textarea label="Parking Instructions" value={values.parking_instructions ?? ''} onChange={(e) => setValue('parking_instructions', e.target.value || null)} rows={2} placeholder="Where to park vehicles..." />
            <Textarea label="Access Notes" value={values.access_notes ?? ''} onChange={(e) => setValue('access_notes', e.target.value || null)} rows={2} />
          </FormSection>
        )}

        {/* Step 3: Service Window & Compliance */}
        {wizard.currentStep === 3 && (
          <FormSection title="Service & Compliance" icon={<CheckCircle2 className="h-4 w-4" />} description="Service window and compliance requirements.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Earliest Start Time" type="time" value={values.earliest_start_time ?? ''} onChange={(e) => setValue('earliest_start_time', e.target.value || null)} />
              <Input label="Latest Start Time" type="time" value={values.latest_start_time ?? ''} onChange={(e) => setValue('latest_start_time', e.target.value || null)} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.weekend_access} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('weekend_access', e.target.checked)} className="rounded border-border" /> Weekend Access</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.osha_compliance_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('osha_compliance_required', e.target.checked)} className="rounded border-border" /> OSHA Compliance Required</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.background_check_required} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('background_check_required', e.target.checked)} className="rounded border-border" /> Background Check Required</label>
          </FormSection>
        )}

        {/* Step 4: Facility Details & Notes */}
        {wizard.currentStep === 4 && (
          <FormSection title="Facility Details & Notes" icon={<Warehouse className="h-4 w-4" />} description="Storage locations, risk, priority, and internal notes.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Janitorial Closet" value={values.janitorial_closet_location ?? ''} onChange={(e) => setValue('janitorial_closet_location', e.target.value || null)} placeholder="e.g., Room 101" />
              <Input label="Supply Storage" value={values.supply_storage_location ?? ''} onChange={(e) => setValue('supply_storage_location', e.target.value || null)} placeholder="e.g., Basement B1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Water Source" value={values.water_source_location ?? ''} onChange={(e) => setValue('water_source_location', e.target.value || null)} />
              <Input label="Dumpster Location" value={values.dumpster_location ?? ''} onChange={(e) => setValue('dumpster_location', e.target.value || null)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <LookupSelect
                label="Risk Level"
                category={['Risk Level', 'RISK_LEVEL']}
                value={values.risk_level ?? ''}
                onChange={(value) => setValue('risk_level', value || null)}
                fallbackOptions={RISK_OPTIONS}
              />
              <LookupSelect
                label="Priority Level"
                category={['Priority Level', 'PRIORITY_LEVEL']}
                value={values.priority_level ?? ''}
                onChange={(value) => setValue('priority_level', value || null)}
                fallbackOptions={PRIORITY_OPTIONS}
              />
            </div>
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} rows={4} placeholder="Any additional notes about this site..." />
          </FormSection>
        )}
      </FormWizard>
    </SlideOver>
  );
}
