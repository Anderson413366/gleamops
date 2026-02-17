'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Link2, CalendarDays, Building2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { inventoryCountSchema, type InventoryCountFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { InventoryCount } from '@gleamops/shared';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'COMPLETED', label: 'Completed' },
];

const DEFAULTS: InventoryCountFormData = {
  count_code: '',
  site_id: null,
  counted_by: null,
  count_date: new Date().toISOString().slice(0, 10),
  status: 'DRAFT',
  notes: null,
};

interface InventoryCountFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: InventoryCount | null;
  initialSiteId?: string | null;
  onSuccess?: () => void;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
  tenant_id: string;
}

interface StaffOption {
  id: string;
  full_name: string;
  staff_code: string;
  user_id: string | null;
}

interface CreatedResult {
  countCode: string;
  token: string;
}

function buildPublicCountUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/count/${token}`;
  }
  return `https://gleamops.vercel.app/count/${token}`;
}

function normalizeSupplyName(name: string): string {
  return name.trim().toLowerCase();
}

export function InventoryCountForm({ open, onClose, initialData, initialSiteId, onSuccess }: InventoryCountFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [siteOptions, setSiteOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [counterOptions, setCounterOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [siteRows, setSiteRows] = useState<SiteOption[]>([]);
  const [staffRows, setStaffRows] = useState<StaffOption[]>([]);
  const [countedByName, setCountedByName] = useState('');
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [creatingCount, setCreatingCount] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<InventoryCountFormData>({
    schema: inventoryCountSchema,
    initialValues: initialData
      ? {
          count_code: initialData.count_code,
          site_id: initialData.site_id,
          counted_by: initialData.counted_by,
          count_date: initialData.count_date,
          status: (initialData.status as 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED') ?? 'DRAFT',
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('inventory_counts')
          .update({
            site_id: data.site_id,
            counted_by: data.counted_by,
            counted_by_name: countedByName || null,
            count_date: data.count_date,
            status: data.status,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
        onSuccess?.();
        handleClose();
        return;
      }

      if (createStep < 3) {
        setCreateStep((step) => (Math.min(3, step + 1) as 1 | 2 | 3));
        return;
      }

      if (!data.site_id) {
        toast.error('Please select a site before creating the count.');
        return;
      }

      setCreatingCount(true);
      try {
        const token = crypto.randomUUID().replace(/-/g, '');
        const selectedSite = siteRows.find((site) => site.id === data.site_id);
        const tenantId = selectedSite?.tenant_id ?? (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id ?? null;
        if (!tenantId) throw new Error('Unable to determine tenant for this site.');

        const createRes = await supabase
          .from('inventory_counts')
          .insert({
            tenant_id: tenantId,
            count_code: data.count_code,
            site_id: data.site_id,
            counted_by: data.counted_by,
            counted_by_name: countedByName || null,
            count_date: data.count_date,
            status: 'DRAFT',
            notes: data.notes,
            public_token: token,
          })
          .select('id, count_code')
          .single();

        if (createRes.error) throw createRes.error;

        const countId = createRes.data.id as string;
        const countCode = createRes.data.count_code as string;

        // Pull all site assignments and map to supply catalog by normalized name.
        const [{ data: assignments, error: assignmentError }, { data: catalogRows, error: catalogError }] = await Promise.all([
          supabase
            .from('site_supplies')
            .select('name')
            .eq('site_id', data.site_id)
            .is('archived_at', null),
          supabase
            .from('supply_catalog')
            .select('id, name')
            .is('archived_at', null),
        ]);

        if (assignmentError) throw assignmentError;
        if (catalogError) throw catalogError;

        const catalogByName = new Map<string, string>();
        for (const row of ((catalogRows ?? []) as Array<{ id: string; name: string }>)) {
          catalogByName.set(normalizeSupplyName(row.name), row.id);
        }

        const assignedSupplyIds = Array.from(new Set(
          ((assignments ?? []) as Array<{ name: string }>)
            .map((row) => catalogByName.get(normalizeSupplyName(row.name)))
            .filter(Boolean) as string[]
        ));

        // Get previous submitted/completed count for expected quantities.
        let previousQtyBySupplyId: Record<string, number | null> = {};
        const { data: previousCount } = await supabase
          .from('inventory_counts')
          .select('id')
          .eq('site_id', data.site_id)
          .is('archived_at', null)
          .in('status', ['SUBMITTED', 'COMPLETED'])
          .order('count_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousCount?.id) {
          const { data: previousDetails } = await supabase
            .from('inventory_count_details')
            .select('supply_id, actual_qty')
            .eq('count_id', previousCount.id)
            .is('archived_at', null);

          previousQtyBySupplyId = Object.fromEntries(
            ((previousDetails ?? []) as Array<{ supply_id: string; actual_qty: number | null }>)
              .map((row) => [row.supply_id, row.actual_qty])
          );
        }

        if (assignedSupplyIds.length > 0) {
          const detailsPayload = assignedSupplyIds.map((supplyId) => ({
            tenant_id: tenantId,
            count_id: countId,
            supply_id: supplyId,
            expected_qty: previousQtyBySupplyId[supplyId] ?? null,
            actual_qty: null,
            notes: null,
          }));
          const { error: insertDetailError } = await supabase
            .from('inventory_count_details')
            .insert(detailsPayload);
          if (insertDetailError) throw insertDetailError;
        }

        setCreatedResult({ countCode, token });
        toast.success('Count started! You can now fill it out.');
        onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to start count.');
      } finally {
        setCreatingCount(false);
      }
    },
  });

  const selectedSiteLabel = useMemo(
    () => siteOptions.find((site) => site.value === (values.site_id ?? ''))?.label ?? 'Not set',
    [siteOptions, values.site_id]
  );
  const selectedCounterLabel = useMemo(
    () => counterOptions.find((staff) => staff.value === (values.counted_by ?? ''))?.label ?? 'Not set',
    [counterOptions, values.counted_by]
  );

  const handleClose = () => {
    reset();
    setCountedByName('');
    setCreateStep(1);
    setCreatedResult(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function preloadOptions() {
      const [{ data: sitesData }, { data: staffData }, auth] = await Promise.all([
        supabase
          .from('sites')
          .select('id, name, site_code, tenant_id')
          .is('archived_at', null)
          .order('name'),
        supabase
          .from('staff')
          .select('id, full_name, staff_code, user_id')
          .is('archived_at', null)
          .order('full_name'),
        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      const nextSiteRows = (sitesData ?? []) as SiteOption[];
      const nextStaffRows = (staffData ?? []) as StaffOption[];
      setSiteRows(nextSiteRows);
      setStaffRows(nextStaffRows);
      setSiteOptions(nextSiteRows.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` })));
      setCounterOptions([{ value: '', label: 'Not set' }, ...nextStaffRows.map((staff) => ({ value: staff.id, label: `${staff.full_name} (${staff.staff_code})` }))]);

      if (isEdit && initialData) {
        const selectedStaff = nextStaffRows.find((staff) => staff.id === initialData.counted_by);
        setCountedByName(initialData.counted_by_name ?? selectedStaff?.full_name ?? '');
        return;
      }

      if (!values.counted_by) {
        const currentStaff = nextStaffRows.find((staff) => staff.user_id === auth.data.user?.id);
        if (currentStaff) {
          setValue('counted_by', currentStaff.id);
          setCountedByName(currentStaff.full_name);
        }
      }

      if (initialSiteId && !values.site_id) {
        setValue('site_id', initialSiteId);
      }

      if (!values.count_code) {
        const { data: generatedCode } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'CNT' });
        if (!cancelled && generatedCode) setValue('count_code', generatedCode as string);
      }
    }

    void preloadOptions();
    return () => {
      cancelled = true;
    };
  }, [initialData, initialSiteId, isEdit, open, setValue, supabase, values.count_code, values.counted_by, values.site_id]);

  useEffect(() => {
    if (!values.counted_by || !countedByName) return;
    const selected = staffRows.find((staff) => staff.id === values.counted_by);
    if (selected && countedByName !== selected.full_name) {
      setCountedByName(selected.full_name);
    }
  }, [countedByName, staffRows, values.counted_by]);

  const publicUrl = createdResult ? buildPublicCountUrl(createdResult.token) : null;

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Count' : 'Start New Inventory Count'}
      subtitle={isEdit ? initialData?.count_code : undefined}
      wide
    >
      {createdResult ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Count started</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {createdResult.countCode} is ready. Share the public form URL below for on-site counting.
            </p>
          </div>

          <FormSection title="Shareable Count URL" icon={<Link2 className="h-4 w-4" />}>
            <Input label="Public URL" value={publicUrl ?? ''} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!publicUrl) return;
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success('Count URL copied');
                }}
              >
                Copy URL
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!publicUrl) return;
                  window.open(publicUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                Open Form
              </Button>
            </div>
          </FormSection>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {!isEdit && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[1, 2, 3].map((step) => (
                  <div key={step} className={`rounded-full px-3 py-1 font-semibold ${createStep === step ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    Step {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isEdit || createStep === 1) && (
            <FormSection title="Step 1 — Select Site" icon={<Building2 className="h-4 w-4" />} description="Choose the site to generate this count for.">
              <Input
                label="Count Code"
                value={values.count_code}
                onChange={(e) => setValue('count_code', e.target.value)}
                onBlur={() => onBlur('count_code')}
                error={errors.count_code}
                required
                readOnly={isEdit}
                disabled={isEdit}
              />
              <Select
                label="Site"
                value={values.site_id ?? ''}
                onChange={(e) => setValue('site_id', e.target.value || null)}
                options={[{ value: '', label: 'Select a site...' }, ...siteOptions]}
                required
              />
            </FormSection>
          )}

          {(isEdit || createStep === 2) && (
            <FormSection title="Step 2 — Count Details" icon={<CalendarDays className="h-4 w-4" />} description="Set date, counter, and optional notes.">
              <Input
                label="Count Date"
                type="date"
                value={values.count_date}
                onChange={(e) => setValue('count_date', e.target.value)}
                onBlur={() => onBlur('count_date')}
                error={errors.count_date}
                required
              />
              <Select
                label="Counted By (User)"
                value={values.counted_by ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value || null;
                  setValue('counted_by', nextValue);
                  const selected = staffRows.find((staff) => staff.id === nextValue);
                  if (selected) setCountedByName(selected.full_name);
                }}
                options={counterOptions}
              />
              <Input
                label="Counted By Name"
                value={countedByName}
                onChange={(event) => setCountedByName(event.target.value)}
                placeholder="Allows external counters (subcontractor, supervisor, etc.)"
              />
              {isEdit && (
                <Select
                  label="Status"
                  value={values.status}
                  onChange={(e) => setValue('status', e.target.value as 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED')}
                  options={STATUS_OPTIONS}
                />
              )}
              <Textarea
                label="Notes"
                value={values.notes ?? ''}
                onChange={(e) => setValue('notes', e.target.value || null)}
              />
            </FormSection>
          )}

          {!isEdit && createStep === 3 && (
            <FormSection title="Step 3 — Generate Count Form" icon={<ClipboardList className="h-4 w-4" />} description="This will create a draft count with line items for all supplies assigned to the selected site.">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Site:</span> <span className="font-medium text-foreground">{selectedSiteLabel}</span></p>
                <p><span className="text-muted-foreground">Count date:</span> <span className="font-medium text-foreground">{values.count_date}</span></p>
                <p><span className="text-muted-foreground">Counted by:</span> <span className="font-medium text-foreground">{countedByName || selectedCounterLabel}</span></p>
                <p><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground">Draft</span></p>
              </div>
            </FormSection>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            {!isEdit && createStep > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setCreateStep((step) => (Math.max(1, step - 1) as 1 | 2 | 3))}>
                Back
              </Button>
            ) : null}
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading || creatingCount}>
              {isEdit ? 'Save Changes' : createStep < 3 ? 'Next' : 'Start Count'}
            </Button>
          </div>
        </form>
      )}
    </SlideOver>
  );
}
