'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { inventoryCountSchema, type InventoryCountFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
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

export function InventoryCountForm({ open, onClose, initialData, onSuccess }: InventoryCountFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

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
        const { error } = await supabase
          .from('inventory_counts')
          .update({
            site_id: data.site_id,
            counted_by: data.counted_by,
            count_date: data.count_date,
            status: data.status,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag);
        if (error) throw error;
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

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Count' : 'New Inventory Count'}
      subtitle={isEdit ? initialData?.count_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-4">
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
          />
        </div>

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
