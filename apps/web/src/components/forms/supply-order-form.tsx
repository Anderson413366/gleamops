'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { supplyOrderSchema, type SupplyOrderFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { SupplyOrder } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELED', label: 'Canceled' },
];

const DEFAULTS: SupplyOrderFormData = {
  order_code: '',
  supplier: null,
  order_date: new Date().toISOString().slice(0, 10),
  expected_delivery: null,
  status: 'DRAFT',
  total_amount: null,
  notes: null,
};

interface SupplyOrderFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SupplyOrder | null;
  onSuccess?: () => void;
}

export function SupplyOrderForm({ open, onClose, initialData, onSuccess }: SupplyOrderFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SupplyOrderFormData>({
    schema: supplyOrderSchema,
    initialValues: initialData
      ? {
          order_code: initialData.order_code,
          supplier: initialData.supplier,
          order_date: initialData.order_date,
          expected_delivery: initialData.expected_delivery,
          status: initialData.status as 'DRAFT' | 'ORDERED' | 'SHIPPED' | 'RECEIVED' | 'CANCELED',
          total_amount: initialData.total_amount,
          notes: initialData.notes,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('supply_orders')
          .update({
            supplier: data.supplier,
            order_date: data.order_date,
            expected_delivery: data.expected_delivery,
            status: data.status,
            total_amount: data.total_amount,
            notes: data.notes,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('supply_orders').insert({
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
      title={isEdit ? 'Edit Order' : 'New Supply Order'}
      subtitle={isEdit ? initialData?.order_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Order Code"
            value={values.order_code}
            onChange={(e) => setValue('order_code', e.target.value)}
            onBlur={() => onBlur('order_code')}
            error={errors.order_code}
            required
            readOnly={isEdit}
            disabled={isEdit}
          />
          <Input
            label="Supplier"
            value={values.supplier ?? ''}
            onChange={(e) => setValue('supplier', e.target.value || null)}
            placeholder="Supplier name"
          />
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => setValue('status', e.target.value as 'DRAFT' | 'ORDERED' | 'SHIPPED' | 'RECEIVED' | 'CANCELED')}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Dates & Amount</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Order Date"
              type="date"
              value={values.order_date}
              onChange={(e) => setValue('order_date', e.target.value)}
              onBlur={() => onBlur('order_date')}
              error={errors.order_date}
              required
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={values.expected_delivery ?? ''}
              onChange={(e) => setValue('expected_delivery', e.target.value || null)}
            />
          </div>
          <Input
            label="Total Amount ($)"
            type="number"
            value={values.total_amount ?? ''}
            onChange={(e) => setValue('total_amount', e.target.value ? Number(e.target.value) : null)}
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
            {isEdit ? 'Save Changes' : 'Create Order'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
