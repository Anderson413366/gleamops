'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Target, UserRound } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { prospectSchema, type ProspectFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection, Badge } from '@gleamops/ui';
import type { SalesProspect } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'UNQUALIFIED', label: 'Unqualified' },
  { value: 'DEAD', label: 'Dead' },
  { value: 'CONVERTED', label: 'Converted' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'OTHER', label: 'Other' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TEXT', label: 'Text' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const INDUSTRY_FALLBACK = [
  'Healthcare',
  'Education',
  'Real Estate',
  'Retail/Entertainment',
  'Professional Services',
  'Sports/Recreation',
  'Government',
  'Religious',
  'Non-Profit',
  'Manufacturing',
  'Hospitality',
  'Other',
];

const FACILITY_TYPE_FALLBACK = [
  'Office Building',
  'Medical Facility',
  'Retail Store',
  'School/University',
  'Church/Religious',
  'Sports Facility',
  'Restaurant',
  'Government Building',
  'Industrial/Manufacturing',
  'Residential Property Management',
  'Other',
];

const META_START = '[GOPS_PROSPECT_META]';
const META_END = '[/GOPS_PROSPECT_META]';
const OTHER_VALUE = '__OTHER__';

type LookupOption = { code: string; label: string };

interface ProspectMetaPayload {
  facility_type: string | null;
  estimated_square_footage: number | null;
  primary_contact_role_title: string | null;
  best_time_to_call: string | null;
  preferred_contact_method: string | null;
  estimated_monthly_value: number | null;
  target_follow_up_date: string | null;
  priority_level: string | null;
}

const EMPTY_META: ProspectMetaPayload = {
  facility_type: null,
  estimated_square_footage: null,
  primary_contact_role_title: null,
  best_time_to_call: null,
  preferred_contact_method: null,
  estimated_monthly_value: null,
  target_follow_up_date: null,
  priority_level: null,
};

const DEFAULTS: ProspectFormData = {
  company_name: '',
  prospect_status_code: 'NEW',
  owner_user_id: null,
  industry_type: null,
  website: null,
  facility_type: null,
  estimated_square_footage: null,
  primary_contact_name: null,
  primary_contact_phone: null,
  primary_contact_email: null,
  primary_contact_role_title: null,
  best_time_to_call: null,
  preferred_contact_method: null,
  estimated_monthly_value: null,
  target_follow_up_date: null,
  priority_level: null,
  notes: null,
  source: null,
  contacts: [],
};

interface ProspectFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SalesProspect | null;
  onSuccess?: () => void;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseProspectNotes(rawNotes: string | null): { plainNotes: string | null; meta: ProspectMetaPayload } {
  if (!rawNotes) return { plainNotes: null, meta: EMPTY_META };

  const start = rawNotes.indexOf(META_START);
  const end = rawNotes.indexOf(META_END);
  if (start === -1 || end === -1 || end <= start) {
    return { plainNotes: rawNotes, meta: EMPTY_META };
  }

  const jsonChunk = rawNotes.slice(start + META_START.length, end).trim();
  const before = rawNotes.slice(0, start).trim();
  const after = rawNotes.slice(end + META_END.length).trim();
  const plainNotes = [before, after].filter(Boolean).join('\n\n') || null;

  try {
    const parsed = JSON.parse(jsonChunk) as Partial<ProspectMetaPayload>;
    return {
      plainNotes,
      meta: {
        facility_type: trimToNull(parsed.facility_type),
        estimated_square_footage: typeof parsed.estimated_square_footage === 'number' ? parsed.estimated_square_footage : null,
        primary_contact_role_title: trimToNull(parsed.primary_contact_role_title),
        best_time_to_call: trimToNull(parsed.best_time_to_call),
        preferred_contact_method: trimToNull(parsed.preferred_contact_method),
        estimated_monthly_value: typeof parsed.estimated_monthly_value === 'number' ? parsed.estimated_monthly_value : null,
        target_follow_up_date: trimToNull(parsed.target_follow_up_date),
        priority_level: trimToNull(parsed.priority_level),
      },
    };
  } catch {
    return { plainNotes: rawNotes, meta: EMPTY_META };
  }
}

function serializeProspectNotes(plainNotes: string | null, meta: ProspectMetaPayload): string | null {
  const cleanedNotes = trimToNull(plainNotes);
  const hasMeta = Object.values(meta).some((v) => v !== null && v !== '');
  if (!hasMeta) return cleanedNotes;

  const payload = JSON.stringify(meta);
  return cleanedNotes
    ? `${cleanedNotes}\n\n${META_START}${payload}${META_END}`
    : `${META_START}${payload}${META_END}`;
}

export function ProspectForm({ open, onClose, initialData, onSuccess }: ProspectFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [prospectCode, setProspectCode] = useState('');
  const [codeGenerationFailed, setCodeGenerationFailed] = useState(false);
  const [industryLookups, setIndustryLookups] = useState<LookupOption[]>([]);
  const [facilityLookups, setFacilityLookups] = useState<LookupOption[]>([]);
  const [industrySelect, setIndustrySelect] = useState<string>('');
  const [industryOther, setIndustryOther] = useState<string>('');
  const [facilitySelect, setFacilitySelect] = useState<string>('');
  const [facilityOther, setFacilityOther] = useState<string>('');

  const parsedInitial = useMemo(
    () => parseProspectNotes(initialData?.notes ?? null),
    [initialData?.notes],
  );

  const initialValues = useMemo<ProspectFormData>(() => {
    if (!initialData) return DEFAULTS;
    return {
      company_name: initialData.company_name,
      prospect_status_code: initialData.prospect_status_code,
      owner_user_id: initialData.owner_user_id,
      industry_type: (initialData as unknown as Record<string, unknown>).industry_type as string | null ?? null,
      website: (initialData as unknown as Record<string, unknown>).website as string | null ?? null,
      facility_type: parsedInitial.meta.facility_type,
      estimated_square_footage: parsedInitial.meta.estimated_square_footage,
      primary_contact_name: null,
      primary_contact_phone: null,
      primary_contact_email: null,
      primary_contact_role_title: parsedInitial.meta.primary_contact_role_title,
      best_time_to_call: parsedInitial.meta.best_time_to_call,
      preferred_contact_method: parsedInitial.meta.preferred_contact_method,
      estimated_monthly_value: parsedInitial.meta.estimated_monthly_value,
      target_follow_up_date: parsedInitial.meta.target_follow_up_date,
      priority_level: parsedInitial.meta.priority_level,
      notes: parsedInitial.plainNotes,
      source: initialData.source,
      contacts: [],
    };
  }, [initialData, parsedInitial]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<ProspectFormData>({
    schema: prospectSchema,
    initialValues,
    onSubmit: async (data) => {
      const user = (await supabase.auth.getUser()).data.user;
      const tenantId = user?.app_metadata?.tenant_id as string | undefined;

      const serializedNotes = serializeProspectNotes(data.notes, {
        facility_type: trimToNull(data.facility_type),
        estimated_square_footage: data.estimated_square_footage ?? null,
        primary_contact_role_title: trimToNull(data.primary_contact_role_title),
        best_time_to_call: trimToNull(data.best_time_to_call),
        preferred_contact_method: trimToNull(data.preferred_contact_method),
        estimated_monthly_value: data.estimated_monthly_value ?? null,
        target_follow_up_date: trimToNull(data.target_follow_up_date),
        priority_level: trimToNull(data.priority_level),
      });

      const prospectPayload = {
        company_name: data.company_name,
        prospect_status_code: data.prospect_status_code,
        industry_type: data.industry_type,
        website: data.website,
        notes: serializedNotes,
        source: data.source,
      };

      let prospectId = initialData?.id ?? null;

      if (isEdit) {
        const result = await supabase
          .from('sales_prospects')
          .update(prospectPayload)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { data: created, error } = await supabase
          .from('sales_prospects')
          .insert({
            prospect_code: prospectCode,
            ...prospectPayload,
            tenant_id: tenantId,
          })
          .select('id')
          .single();
        if (error) throw error;
        prospectId = created?.id ?? null;
      }

      const primaryContactName = trimToNull(data.primary_contact_name);
      if (prospectId && primaryContactName) {
        const { data: existingPrimary } = await supabase
          .from('sales_prospect_contacts')
          .select('id')
          .eq('prospect_id', prospectId)
          .eq('is_primary', true)
          .is('archived_at', null)
          .order('created_at', { ascending: true })
          .limit(1);

        const contactPayload = {
          contact_name: primaryContactName,
          phone: trimToNull(data.primary_contact_phone),
          email: trimToNull(data.primary_contact_email),
          is_primary: true,
        };

        if (existingPrimary && existingPrimary.length > 0) {
          const { error } = await supabase
            .from('sales_prospect_contacts')
            .update(contactPayload)
            .eq('id', existingPrimary[0].id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('sales_prospect_contacts').insert({
            tenant_id: tenantId,
            prospect_id: prospectId,
            ...contactPayload,
          });
          if (error) throw error;
        }
      }

      onSuccess?.();
      handleClose();
    },
  });

  const industryLabels = useMemo(() => {
    const labels = industryLookups.length > 0 ? industryLookups.map((l) => l.label) : INDUSTRY_FALLBACK;
    return Array.from(new Set(labels.filter(Boolean)));
  }, [industryLookups]);

  const facilityTypeLabels = useMemo(() => {
    const labels = facilityLookups.length > 0 ? facilityLookups.map((l) => l.label) : FACILITY_TYPE_FALLBACK;
    return Array.from(new Set(labels.filter(Boolean)));
  }, [facilityLookups]);

  const industryOptions = useMemo(() => {
    const base = industryLabels.filter((l) => l.toLowerCase() !== 'other');
    return [{ value: '', label: 'Select...' }, ...base.map((l) => ({ value: l, label: l })), { value: OTHER_VALUE, label: 'Other' }];
  }, [industryLabels]);

  const facilityTypeOptions = useMemo(() => {
    const base = facilityTypeLabels.filter((l) => l.toLowerCase() !== 'other');
    return [{ value: '', label: 'Select...' }, ...base.map((l) => ({ value: l, label: l })), { value: OTHER_VALUE, label: 'Other' }];
  }, [facilityTypeLabels]);

  useEffect(() => {
    if (!open) return;
    reset(initialValues);
    setCodeGenerationFailed(false);
  }, [open, reset, initialValues]);

  // Load lookups for Industry + Facility Type (Admin > Lookups)
  useEffect(() => {
    if (!open) return;
    const industryCats = ['industry', 'INDUSTRY'];
    const clientTypeCats = ['client_type', 'CLIENT_TYPE'];

    supabase
      .from('lookups')
      .select('code, label')
      .in('category', industryCats)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setIndustryLookups((data as unknown as LookupOption[]) ?? []));

    supabase
      .from('lookups')
      .select('code, label')
      .in('category', clientTypeCats)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setFacilityLookups((data as unknown as LookupOption[]) ?? []));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync select/other states with current values for edit flows.
  useEffect(() => {
    if (!open) return;
    const currentIndustry = (values.industry_type ?? '').trim();
    if (!currentIndustry) {
      setIndustrySelect('');
      setIndustryOther('');
    } else if (industryLabels.some((l) => l.toLowerCase() === currentIndustry.toLowerCase() && l.toLowerCase() !== 'other')) {
      const canonical = industryLabels.find((l) => l.toLowerCase() === currentIndustry.toLowerCase()) ?? currentIndustry;
      setIndustrySelect(canonical);
      setIndustryOther('');
    } else {
      setIndustrySelect(OTHER_VALUE);
      setIndustryOther(currentIndustry);
    }

    const currentFacility = (values.facility_type ?? '').trim();
    if (!currentFacility) {
      setFacilitySelect('');
      setFacilityOther('');
    } else if (facilityTypeLabels.some((l) => l.toLowerCase() === currentFacility.toLowerCase() && l.toLowerCase() !== 'other')) {
      const canonical = facilityTypeLabels.find((l) => l.toLowerCase() === currentFacility.toLowerCase()) ?? currentFacility;
      setFacilitySelect(canonical);
      setFacilityOther('');
    } else {
      setFacilitySelect(OTHER_VALUE);
      setFacilityOther(currentFacility);
    }
  }, [open, values.industry_type, values.facility_type, industryLabels, facilityTypeLabels]);

  // Generate next prospect code on create.
  useEffect(() => {
    let cancelled = false;
    if (!open || isEdit || prospectCode) return;

    (async () => {
      const { data, error } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'PRO' });
      if (cancelled) return;
      if (error || !data) {
        const fallback = `PRO-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
        setCodeGenerationFailed(true);
        setProspectCode(fallback);
        return;
      }
      setCodeGenerationFailed(false);
      setProspectCode(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, prospectCode, supabase]);

  // Load primary contact for existing prospect.
  useEffect(() => {
    if (!open || !isEdit || !initialData?.id) return;
    let cancelled = false;

    supabase
      .from('sales_prospect_contacts')
      .select('contact_name, phone, email, is_primary')
      .eq('prospect_id', initialData.id)
      .is('archived_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const row = data?.[0];
        if (!row) return;
        setValue('primary_contact_name', row.contact_name ?? null);
        setValue('primary_contact_phone', row.phone ?? null);
        setValue('primary_contact_email', row.email ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, initialData?.id, setValue, supabase]);

  const handleClose = () => {
    reset();
    setProspectCode('');
    setCodeGenerationFailed(false);
    onClose();
  };

  const priorityColor: 'blue' | 'yellow' | 'red' | 'gray' =
    values.priority_level === 'HIGH'
      ? 'red'
      : values.priority_level === 'MEDIUM'
        ? 'yellow'
        : values.priority_level === 'LOW'
          ? 'blue'
          : 'gray';

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Prospect' : 'New Prospect'}
      subtitle={isEdit ? initialData?.prospect_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Section 1 — Company"
          icon={<Building2 className="h-4 w-4" />}
          description="Capture company-level details during initial outreach."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEdit && (
              <Input
                label="Prospect Code"
                value={prospectCode}
                readOnly
                disabled
                hint={codeGenerationFailed ? 'Using local fallback code; save will still work.' : 'Auto-generated'}
              />
            )}
            <Input
              label="Company Name"
              value={values.company_name}
              onChange={(e) => setValue('company_name', e.target.value)}
              onBlur={() => onBlur('company_name')}
              error={errors.company_name}
              required
            />
            <Select
              label="Status"
              value={values.prospect_status_code}
              onChange={(e) => setValue('prospect_status_code', e.target.value)}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Industry"
              value={industrySelect}
              onChange={(e) => {
                const v = e.target.value;
                setIndustrySelect(v);
                if (v === OTHER_VALUE) {
                  const existing = (values.industry_type ?? '').trim();
                  const shouldPreserve = existing && !industryLabels.some((l) => l.toLowerCase() === existing.toLowerCase());
                  const next = shouldPreserve ? existing : industryOther;
                  setIndustryOther(next || '');
                  setValue('industry_type', next.trim() ? next : null);
                } else {
                  setIndustryOther('');
                  setValue('industry_type', v ? v : null);
                }
              }}
              options={industryOptions}
            />
            {industrySelect === OTHER_VALUE && (
              <Input
                label="Industry (Other)"
                value={industryOther}
                onChange={(e) => {
                  const v = e.target.value;
                  setIndustryOther(v);
                  setValue('industry_type', v.trim() ? v : null);
                }}
                placeholder="Describe industry"
              />
            )}
            <Select
              label="Type of Facility"
              value={facilitySelect}
              onChange={(e) => {
                const v = e.target.value;
                setFacilitySelect(v);
                if (v === OTHER_VALUE) {
                  const existing = (values.facility_type ?? '').trim();
                  const shouldPreserve = existing && !facilityTypeLabels.some((l) => l.toLowerCase() === existing.toLowerCase());
                  const next = shouldPreserve ? existing : facilityOther;
                  setFacilityOther(next || '');
                  setValue('facility_type', next.trim() ? next : null);
                } else {
                  setFacilityOther('');
                  setValue('facility_type', v ? v : null);
                }
              }}
              options={facilityTypeOptions}
            />
            {facilitySelect === OTHER_VALUE && (
              <Input
                label="Facility Type (Other)"
                value={facilityOther}
                onChange={(e) => {
                  const v = e.target.value;
                  setFacilityOther(v);
                  setValue('facility_type', v.trim() ? v : null);
                }}
                placeholder="Describe facility type"
              />
            )}
            <Input
              label="Estimated Square Footage"
              type="number"
              min={1}
              value={values.estimated_square_footage ?? ''}
              onChange={(e) => setValue('estimated_square_footage', e.target.value ? Number(e.target.value) : null)}
              onBlur={() => onBlur('estimated_square_footage')}
              error={errors.estimated_square_footage}
              placeholder="e.g., 25000"
            />
            <Select
              label="Source"
              value={values.source ?? ''}
              onChange={(e) => setValue('source', e.target.value || null)}
              options={SOURCE_OPTIONS}
            />
            <Input
              label="Website"
              value={values.website ?? ''}
              onChange={(e) => setValue('website', e.target.value || null)}
              onBlur={() => onBlur('website')}
              error={errors.website}
              placeholder="https://example.com"
            />
          </div>
        </FormSection>

        <FormSection
          title="Section 2 — Primary Contact"
          icon={<UserRound className="h-4 w-4" />}
          description="Store who to call, when to call, and preferred outreach method."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              value={values.primary_contact_name ?? ''}
              onChange={(e) => setValue('primary_contact_name', e.target.value || null)}
              onBlur={() => onBlur('primary_contact_name')}
              error={errors.primary_contact_name}
              required
            />
            <Input
              label="Role / Title"
              value={values.primary_contact_role_title ?? ''}
              onChange={(e) => setValue('primary_contact_role_title', e.target.value || null)}
              onBlur={() => onBlur('primary_contact_role_title')}
              error={errors.primary_contact_role_title}
              placeholder="e.g., Facility Manager"
            />
            <Input
              label="Phone"
              value={values.primary_contact_phone ?? ''}
              onChange={(e) => setValue('primary_contact_phone', e.target.value || null)}
              onBlur={() => onBlur('primary_contact_phone')}
              error={errors.primary_contact_phone}
            />
            <Input
              label="Email"
              type="email"
              value={values.primary_contact_email ?? ''}
              onChange={(e) => setValue('primary_contact_email', e.target.value || null)}
              onBlur={() => onBlur('primary_contact_email')}
              error={errors.primary_contact_email}
            />
            <Input
              label="Best Time to Call"
              value={values.best_time_to_call ?? ''}
              onChange={(e) => setValue('best_time_to_call', e.target.value || null)}
              onBlur={() => onBlur('best_time_to_call')}
              error={errors.best_time_to_call}
              placeholder="e.g., Weekdays 8-11 AM"
            />
            <Select
              label="Preferred Contact Method"
              value={values.preferred_contact_method ?? ''}
              onChange={(e) => setValue('preferred_contact_method', e.target.value || null)}
              options={CONTACT_METHOD_OPTIONS}
            />
          </div>
        </FormSection>

        <FormSection
          title="Section 3 — Opportunity"
          icon={<Target className="h-4 w-4" />}
          description="Capture initial value, follow-up timing, and urgency."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Estimated Monthly Value"
              type="number"
              min={0}
              step="0.01"
              value={values.estimated_monthly_value ?? ''}
              onChange={(e) => setValue('estimated_monthly_value', e.target.value ? Number(e.target.value) : null)}
              onBlur={() => onBlur('estimated_monthly_value')}
              error={errors.estimated_monthly_value}
              placeholder="e.g., 5500"
            />
            <Input
              label="Target Follow-up Date"
              type="date"
              value={values.target_follow_up_date ?? ''}
              onChange={(e) => setValue('target_follow_up_date', e.target.value || null)}
              onBlur={() => onBlur('target_follow_up_date')}
              error={errors.target_follow_up_date}
            />
            <div className="space-y-1.5">
              <Select
                label="Priority"
                value={values.priority_level ?? ''}
                onChange={(e) => setValue('priority_level', e.target.value || null)}
                options={PRIORITY_OPTIONS}
              />
              {values.priority_level && (
                <div className="pt-1">
                  <Badge color={priorityColor} dot={false}>{values.priority_level}</Badge>
                </div>
              )}
            </div>
            <div />
            <div className="md:col-span-2">
              <Textarea
                label="Notes"
                value={values.notes ?? ''}
                onChange={(e) => setValue('notes', e.target.value || null)}
                placeholder="Call summary, objections, decision timeline, and next steps..."
                rows={4}
              />
            </div>
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Prospect'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
