'use client';

import * as React from 'react';
import { Building2, CreditCard, Truck } from 'lucide-react';
import { Button, FormSection, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import type { SupplyVendorProfile } from '@/lib/vendors/supply-vendor-profiles';

interface SupplyVendorFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SupplyVendorProfile | null;
  onSave: (data: {
    id?: string | null;
    company_name: string;
    account_number: string | null;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    payment_terms: string | null;
    order_minimum: number | null;
    delivery_schedule: string | null;
    categories_supplied: string[];
    account_status: 'ACTIVE' | 'INACTIVE';
    notes: string | null;
  }) => void;
}

function categoriesToText(values: string[]): string {
  return values.join(', ');
}

function categoriesFromText(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function SupplyVendorForm({ open, onClose, initialData, onSave }: SupplyVendorFormProps) {
  const isEdit = !!initialData;
  const [companyName, setCompanyName] = React.useState(initialData?.company_name ?? '');
  const [accountNumber, setAccountNumber] = React.useState(initialData?.account_number ?? '');
  const [contactPerson, setContactPerson] = React.useState(initialData?.contact_person ?? '');
  const [phone, setPhone] = React.useState(initialData?.phone ?? '');
  const [email, setEmail] = React.useState(initialData?.email ?? '');
  const [website, setWebsite] = React.useState(initialData?.website ?? '');
  const [paymentTerms, setPaymentTerms] = React.useState(initialData?.payment_terms ?? '');
  const [orderMinimum, setOrderMinimum] = React.useState(
    initialData?.order_minimum != null ? String(initialData.order_minimum) : '',
  );
  const [deliverySchedule, setDeliverySchedule] = React.useState(initialData?.delivery_schedule ?? '');
  const [categoriesSuppliedText, setCategoriesSuppliedText] = React.useState(categoriesToText(initialData?.categories_supplied ?? []));
  const [accountStatus, setAccountStatus] = React.useState<'ACTIVE' | 'INACTIVE'>(initialData?.account_status ?? 'ACTIVE');
  const [notes, setNotes] = React.useState(initialData?.notes ?? '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCompanyName(initialData?.company_name ?? '');
    setAccountNumber(initialData?.account_number ?? '');
    setContactPerson(initialData?.contact_person ?? '');
    setPhone(initialData?.phone ?? '');
    setEmail(initialData?.email ?? '');
    setWebsite(initialData?.website ?? '');
    setPaymentTerms(initialData?.payment_terms ?? '');
    setOrderMinimum(initialData?.order_minimum != null ? String(initialData.order_minimum) : '');
    setDeliverySchedule(initialData?.delivery_schedule ?? '');
    setCategoriesSuppliedText(categoriesToText(initialData?.categories_supplied ?? []));
    setAccountStatus(initialData?.account_status ?? 'ACTIVE');
    setNotes(initialData?.notes ?? '');
    setError(null);
  }, [open, initialData]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setError('Company Name is required.');
      return;
    }

    setError(null);
    onSave({
      id: initialData?.id ?? null,
      company_name: trimmedName,
      account_number: accountNumber.trim() || null,
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      payment_terms: paymentTerms.trim() || null,
      order_minimum: orderMinimum.trim() ? Number(orderMinimum) : null,
      delivery_schedule: deliverySchedule.trim() || null,
      categories_supplied: categoriesFromText(categoriesSuppliedText),
      account_status: accountStatus,
      notes: notes.trim() || null,
    });
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Supply Vendor' : 'New Supply Vendor'}
      subtitle={isEdit ? initialData?.company_name : 'Create a vendor profile for supply purchasing'}
    >
      <form className="space-y-8" onSubmit={submit}>
        <FormSection title="Vendor Profile" icon={<Building2 className="h-4 w-4" />} description="Core company and contact details.">
          <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <Input label="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          <Input label="Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </FormSection>

        <FormSection title="Ordering" icon={<CreditCard className="h-4 w-4" />} description="Payment and ordering defaults.">
          <Input label="Payment Terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          <Input
            label="Order Minimum ($)"
            type="number"
            min="0"
            step="0.01"
            value={orderMinimum}
            onChange={(e) => setOrderMinimum(e.target.value)}
          />
          <Input label="Delivery Schedule" value={deliverySchedule} onChange={(e) => setDeliverySchedule(e.target.value)} />
          <Select
            label="Account Status"
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </FormSection>

        <FormSection title="Supply Scope" icon={<Truck className="h-4 w-4" />} description="Categories and account notes.">
          <Input
            label="Categories Supplied"
            value={categoriesSuppliedText}
            onChange={(e) => setCategoriesSuppliedText(e.target.value)}
            hint="Comma-separated categories, e.g. Liners & Bags, Chemicals, Safety & PPE"
          />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormSection>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save Changes' : 'Create Vendor'}</Button>
        </div>
      </form>
    </SlideOver>
  );
}
