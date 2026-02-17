'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { inventoryCountSchema, type InventoryCountFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { InventoryCount } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
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
  onSuccess?: () => void;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface StaffOption {
  id: string;
  full_name: string;
  staff_code: string;
  user_id: string | null;
}

export function InventoryCountForm({ open, onClose, initialData, onSuccess }: InventoryCountFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [siteOptions, setSiteOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [counterOptions, setCounterOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<InventoryCountFormData>({
    schema: inventoryCountSchema,
    initialValues: initialData
      ? {
          count_code: initialData.count_code,
          site_id: initialData.site_id,
          counted_by: initialData.counted_by,
          count_date: initialData.count_date,
          status: initialData.status as 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED',
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
            count_date: data.count_date,
            status: data.status,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('inventory_counts').insert({
          ...data,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function preloadOptions() {
      const [{ data: sitesData }, { data: staffData }, auth] = await Promise.all([
        supabase
          .from('sites')
          .select('id, name, site_code')
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

      const siteRows = (sitesData ?? []) as SiteOption[];
      const staffRows = (staffData ?? []) as StaffOption[];

      setSiteOptions([
        { value: '', label: 'Not set' },
        ...siteRows.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` })),
      ]);

      setCounterOptions([
        { value: '', label: 'Not set' },
        ...staffRows.map((staff) => ({ value: staff.id, label: `${staff.full_name} (${staff.staff_code})` })),
      ]);

      if (!isEdit) {
        const currentStaff = staffRows.find((staff) => staff.user_id === auth.data.user?.id);
        if (currentStaff && !values.counted_by) {
          setValue('counted_by', currentStaff.id);
        }
        if (!values.count_code) {
          const { data: generatedCode } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'CNT' });
          if (!cancelled && generatedCode) {
            setValue('count_code', generatedCode as string);
          }
        }
      }
    }

    void preloadOptions();
    return () => {
      cancelled = true;
    };
  }, [isEdit, open, setValue, supabase, values.count_code, values.counted_by]);

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Count' : 'New Inventory Count'}
      subtitle={isEdit ? initialData?.count_code : undefined}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Count Details" icon={<ClipboardList className="h-4 w-4" />} description="Code, date, and current status for this count.">
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
            options={siteOptions}
          />
          <Select
            label="Counted By"
            value={values.counted_by ?? ''}
            onChange={(e) => setValue('counted_by', e.target.value || null)}
            options={counterOptions}
          />
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
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value as 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED')}
            options={STATUS_OPTIONS}
          />
        </FormSection>

        <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Optional notes to help your team during the count.">
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Start Count'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
