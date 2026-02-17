'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CreditCard, FileText, PauseCircle, PlayCircle, ShoppingCart, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Button, EmptyState, Input, Select, Skeleton, SlideOver, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@gleamops/ui';
import { SupplyVendorForm } from '@/components/forms/supply-vendor-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import {
  findVendorProfileBySlug,
  slugifyVendorName,
  type SupplyVendorProfile,
  upsertSupplyVendorProfile,
} from '@/lib/vendors/supply-vendor-profiles';

interface SupplyLite {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit_cost: number | null;
  supply_status: string | null;
  preferred_vendor: string | null;
}

interface OrderLite {
  id: string;
  order_code: string | null;
  supplier: string | null;
  order_date: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function formatDate(value: string | null): string {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(value: number | null): string {
  if (value == null) return 'Not Set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function label(text: string | null | undefined): string {
  if (!text) return 'Not Set';
  return text;
}

function statusColor(status: string | null | undefined): 'green' | 'gray' | 'yellow' | 'red' {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RECEIVED') return 'green';
  if (normalized === 'ORDERED' || normalized === 'SHIPPED') return 'yellow';
  if (normalized === 'CANCELED' || normalized === 'INACTIVE') return 'red';
  return 'gray';
}

export default function SupplyVendorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<SupplyVendorProfile | null>(null);
  const [supplies, setSupplies] = useState<SupplyLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [vendorFormFocus, setVendorFormFocus] = useState<'profile' | 'ordering' | 'scope' | undefined>(undefined);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [orderStatus, setOrderStatus] = useState<'DRAFT' | 'ORDERED' | 'SHIPPED' | 'RECEIVED' | 'CANCELED'>('DRAFT');
  const [orderTotal, setOrderTotal] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const supabase = getSupabaseBrowserClient();
    const [suppliesRes, ordersRes] = await Promise.all([
      supabase
        .from('supply_catalog')
        .select('id, code, name, category, unit_cost, supply_status, preferred_vendor')
        .is('archived_at', null)
        .not('preferred_vendor', 'is', null),
      supabase
        .from('supply_orders')
        .select('id, order_code, supplier, order_date, status, total_amount, notes')
        .is('archived_at', null)
        .not('supplier', 'is', null)
        .order('order_date', { ascending: false }),
    ]);

    const supplyRows = (suppliesRes.data ?? []) as SupplyLite[];
    const orderRows = (ordersRes.data ?? []) as OrderLite[];
    const savedProfile = findVendorProfileBySlug(slug);

    const slugMatches = new Set<string>();
    for (const row of supplyRows) {
      const vendor = row.preferred_vendor?.trim();
      if (!vendor) continue;
      if (slugifyVendorName(vendor) === slug) slugMatches.add(vendor);
    }
    for (const row of orderRows) {
      const vendor = row.supplier?.trim();
      if (!vendor) continue;
      if (slugifyVendorName(vendor) === slug) slugMatches.add(vendor);
    }

    if (!savedProfile && slugMatches.size === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const canonicalName = savedProfile?.company_name ?? Array.from(slugMatches)[0];
    const accepted = new Set<string>([normalize(canonicalName), ...Array.from(slugMatches).map(normalize)]);

    const linkedSupplies = supplyRows.filter((row) => accepted.has(normalize(row.preferred_vendor)));
    const linkedOrders = orderRows.filter((row) => accepted.has(normalize(row.supplier)));
    const categoriesFromSupplies = Array.from(new Set(linkedSupplies.map((row) => row.category).filter(Boolean))) as string[];

    const hydratedProfile: SupplyVendorProfile = savedProfile ?? {
      id: slug,
      company_name: canonicalName,
      account_number: null,
      contact_person: null,
      phone: null,
      email: null,
      website: null,
      payment_terms: null,
      order_minimum: null,
      delivery_schedule: null,
      categories_supplied: categoriesFromSupplies,
      account_status: linkedSupplies.length > 0 || linkedOrders.length > 0 ? 'ACTIVE' : 'INACTIVE',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProfile(hydratedProfile);
    setSupplies(linkedSupplies.sort((a, b) => a.name.localeCompare(b.name)));
    setOrders(linkedOrders);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const latestOrder = useMemo(() => orders[0] ?? null, [orders]);
  const vendorCompletenessItems: CompletenessItem[] = useMemo(
    () =>
      profile
        ? [
            { key: 'company_name', label: 'Company Name', isComplete: isFieldComplete(profile.company_name), section: 'profile' },
            { key: 'contact_person', label: 'Contact Person', isComplete: isFieldComplete(profile.contact_person), section: 'profile' },
            { key: 'phone', label: 'Phone', isComplete: isFieldComplete(profile.phone), section: 'profile' },
            { key: 'email', label: 'Email', isComplete: isFieldComplete(profile.email), section: 'profile' },
            { key: 'account_number', label: 'Account Number', isComplete: isFieldComplete(profile.account_number), section: 'profile' },
            { key: 'payment_terms', label: 'Payment Terms', isComplete: isFieldComplete(profile.payment_terms), section: 'ordering' },
            { key: 'order_minimum', label: 'Order Minimum', isComplete: isFieldComplete(profile.order_minimum), section: 'ordering' },
            { key: 'delivery_schedule', label: 'Delivery Schedule', isComplete: isFieldComplete(profile.delivery_schedule), section: 'ordering' },
            { key: 'categories', label: 'Categories Supplied', isComplete: isFieldComplete(profile.categories_supplied), section: 'scope' },
            { key: 'notes', label: 'Vendor Notes', isComplete: isFieldComplete(profile.notes), section: 'scope' },
          ]
        : [],
    [profile]
  );

  const openOrderTemplate = async () => {
    if (!profile) return;
    setOrderOpen(true);
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDelivery('');
    setOrderStatus('DRAFT');
    setOrderTotal('');
    setOrderNotes(`Generated from Supply Vendor profile for ${profile.company_name}.`);
    setOrderError(null);

    const supabase = getSupabaseBrowserClient();
    const generated = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'ORD' });
    const fallback = `ORD-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    setOrderCode((generated.data as string) || fallback);
  };

  const submitOrderTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    if (!orderCode.trim()) {
      setOrderError('Order Code is required.');
      return;
    }
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const auth = await supabase.auth.getUser();
      const tenantId = auth.data.user?.app_metadata?.tenant_id;
      const { error } = await supabase.from('supply_orders').insert({
        tenant_id: tenantId,
        order_code: orderCode.trim(),
        supplier: profile.company_name,
        order_date: orderDate,
        expected_delivery: expectedDelivery || null,
        status: orderStatus,
        total_amount: orderTotal.trim() ? Number(orderTotal) : null,
        notes: orderNotes.trim() || null,
      });
      if (error) throw error;
      toast.success('Supply order template created.');
      setOrderOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order template.';
      setOrderError(message);
      toast.error(message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!profile) return;
    setArchiveLoading(true);
    try {
      const isInactive = (profile.account_status ?? 'ACTIVE').toUpperCase() === 'INACTIVE';
      const saved = upsertSupplyVendorProfile({
        id: profile.id,
        company_name: profile.company_name,
        account_number: profile.account_number,
        contact_person: profile.contact_person,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        payment_terms: profile.payment_terms,
        order_minimum: profile.order_minimum,
        delivery_schedule: profile.delivery_schedule,
        categories_supplied: profile.categories_supplied,
        account_status: isInactive ? 'ACTIVE' : 'INACTIVE',
        notes: profile.notes,
      });

      setProfile(saved);
      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${profile.company_name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update supply vendor status');
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="space-y-4">
        <Link
          href="/vendors?tab=vendors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supply Vendors
        </Link>
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="Supply vendor not found"
          description="The requested vendor profile does not exist."
        />
      </div>
    );
  }
  const isInactive = (profile.account_status ?? 'ACTIVE').toUpperCase() === 'INACTIVE';

  return (
    <div className="space-y-6">
      <Link
        href="/vendors?tab=vendors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Supply Vendors
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{profile.company_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge color={statusColor(profile.account_status)}>{profile.account_status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
            <Badge color="gray">Last Order: {latestOrder ? formatDate(latestOrder.order_date) : 'Not Set'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setVendorFormOpen(true)}>Edit Vendor</Button>
          <Button onClick={openOrderTemplate}>
            <ShoppingCart className="h-4 w-4" />
            Place Order
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setArchiveOpen(true)}
            className={isInactive
              ? 'border-green-300 text-green-700 hover:bg-green-50'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </Button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Vendor Profile"
        items={vendorCompletenessItems}
        onNavigateToMissing={(item) => {
          setVendorFormFocus((item.section as 'profile' | 'ordering' | 'scope' | undefined) ?? 'profile');
          setVendorFormOpen(true);
        }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Company & Contact
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Company Name</dt><dd className="font-medium text-right">{label(profile.company_name)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Account Number</dt><dd className="font-medium text-right">{label(profile.account_number)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Contact Person</dt><dd className="font-medium text-right">{label(profile.contact_person)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium text-right">{label(profile.phone)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Email</dt><dd className="font-medium text-right">{label(profile.email)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Website</dt><dd className="font-medium text-right">{label(profile.website)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Ordering Details
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Payment Terms</dt><dd className="font-medium text-right">{label(profile.payment_terms)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Order Minimum</dt><dd className="font-medium text-right">{formatMoney(profile.order_minimum)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Delivery Schedule</dt><dd className="font-medium text-right">{label(profile.delivery_schedule)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Categories Supplied</dt><dd className="font-medium text-right">{profile.categories_supplied.length ? profile.categories_supplied.join(', ') : 'Not Set'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Linked Supplies</dt><dd className="font-medium text-right">{supplies.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last Order</dt><dd className="font-medium text-right">{latestOrder ? formatDate(latestOrder.order_date) : 'Not Set'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          Linked Supplies
        </h3>
        {supplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplies are currently linked to this vendor.</p>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {supplies.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
                  <TableCell>{formatMoney(row.unit_cost)}</TableCell>
                  <TableCell>
                    <Badge color={statusColor(row.supply_status)}>{row.supply_status ?? 'ACTIVE'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Order History
          </span>
        </h3>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Order Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Notes</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.order_code ?? '—'}</TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell>
                    <Badge color={statusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>{formatMoney(order.total_amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{order.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Notes
        </h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.notes || 'No notes added yet.'}</p>
      </div>

      <ActivityHistorySection
        entityType="supply_vendors"
        entityId={profile.id}
        entityCode={slug}
        notes={profile.notes}
        entityUpdatedAt={profile.updated_at}
      />

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(profile.created_at)}</p>
        <p>Updated: {formatDate(profile.updated_at)}</p>
      </div>

      <SupplyVendorForm
        open={vendorFormOpen}
        onClose={() => {
          setVendorFormOpen(false);
          setVendorFormFocus(undefined);
        }}
        initialData={profile}
        focusSection={vendorFormFocus}
        onSuccess={() => {
          setVendorFormOpen(false);
          fetchData();
        }}
      />

      <SlideOver
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Place Order"
        subtitle={`Generate supply order template for ${profile.company_name}`}
      >
        <form className="space-y-4" onSubmit={submitOrderTemplate}>
          <Input label="Order Code" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} required />
          <Input label="Supplier" value={profile.company_name} readOnly disabled />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Order Date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
            <Input label="Expected Delivery" type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
          </div>
          <Select
            label="Status"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value as 'DRAFT' | 'ORDERED' | 'SHIPPED' | 'RECEIVED' | 'CANCELED')}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ORDERED', label: 'Ordered' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'RECEIVED', label: 'Received' },
              { value: 'CANCELED', label: 'Canceled' },
            ]}
          />
          <Input label="Total Amount ($)" type="number" min="0" step="0.01" value={orderTotal} onChange={(e) => setOrderTotal(e.target.value)} />
          <Textarea label="Notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
          {orderError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {orderError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOrderOpen(false)} disabled={orderSubmitting}>Cancel</Button>
            <Button type="submit" loading={orderSubmitting}>Create Template</Button>
          </div>
        </form>
      </SlideOver>

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Supply Vendor"
        entityName={profile.company_name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        loading={archiveLoading}
      />
    </div>
  );
}
