'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CirclePlus, ShoppingCart, SquarePen, Store } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Badge, Button, Input, Select, SlideOver, Textarea, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { SupplyVendorForm } from '@/components/forms/supply-vendor-form';
import {
  findVendorProfileByName,
  getSupplyVendorProfiles,
  slugifyVendorName,
  type SupplyVendorProfile,
} from '@/lib/vendors/supply-vendor-profiles';

interface SupplyRow {
  preferred_vendor: string | null;
  category: string | null;
}

interface OrderRow {
  supplier: string | null;
  order_date: string;
}

interface VendorRow {
  id: string;
  name: string;
  supplyCount: number;
  categories: string[];
  lastOrder: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  profile: SupplyVendorProfile | null;
}

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(status: 'ACTIVE' | 'INACTIVE'): 'green' | 'gray' {
  return status === 'ACTIVE' ? 'green' : 'gray';
}

export default function VendorsTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<SupplyVendorProfile | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderVendor, setOrderVendor] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [orderStatus, setOrderStatus] = useState<'DRAFT' | 'ORDERED' | 'SHIPPED' | 'RECEIVED' | 'CANCELED'>('DRAFT');
  const [orderTotal, setOrderTotal] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [suppliesRes, ordersRes] = await Promise.all([
      supabase
        .from('supply_catalog')
        .select('preferred_vendor, category')
        .is('archived_at', null)
        .not('preferred_vendor', 'is', null),
      supabase
        .from('supply_orders')
        .select('supplier, order_date')
        .is('archived_at', null),
    ]);

    const supplies = (suppliesRes.data ?? []) as SupplyRow[];
    const orders = (ordersRes.data ?? []) as OrderRow[];
    const profiles = getSupplyVendorProfiles();

    const byKey = new Map<string, {
      name: string;
      id: string;
      supplyCount: number;
      categories: Set<string>;
      lastOrder: string | null;
      profile: SupplyVendorProfile | null;
      accountStatus: 'ACTIVE' | 'INACTIVE';
    }>();

    const upsert = (name: string) => {
      const key = normalizeName(name);
      if (!key) return null;
      const existing = byKey.get(key);
      if (existing) return existing;
      const profile = findVendorProfileByName(name);
      const created = {
        name: profile?.company_name ?? name.trim(),
        id: profile?.id ?? slugifyVendorName(name),
        supplyCount: 0,
        categories: new Set<string>(),
        lastOrder: null as string | null,
        profile,
        accountStatus: profile?.account_status ?? 'ACTIVE',
      };
      byKey.set(key, created);
      return created;
    };

    for (const row of supplies) {
      const vendor = row.preferred_vendor?.trim();
      if (!vendor) continue;
      const slot = upsert(vendor);
      if (!slot) continue;
      slot.supplyCount += 1;
      if (row.category) slot.categories.add(row.category);
    }

    for (const row of orders) {
      const vendor = row.supplier?.trim();
      if (!vendor) continue;
      const slot = upsert(vendor);
      if (!slot) continue;
      if (!slot.lastOrder || new Date(row.order_date).getTime() > new Date(slot.lastOrder).getTime()) {
        slot.lastOrder = row.order_date;
      }
    }

    for (const profile of profiles) {
      const slot = upsert(profile.company_name);
      if (!slot) continue;
      slot.profile = profile;
      slot.id = profile.id;
      slot.name = profile.company_name;
      slot.accountStatus = profile.account_status;
      for (const category of profile.categories_supplied) {
        slot.categories.add(category);
      }
    }

    const aggregated: VendorRow[] = Array.from(byKey.values())
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        supplyCount: entry.supplyCount,
        categories: Array.from(entry.categories).sort(),
        lastOrder: entry.lastOrder,
        accountStatus: entry.accountStatus,
        profile: entry.profile,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setRows(aggregated);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!formOpen) return;
    setEditProfile(null);
    setVendorFormOpen(true);
    onFormClose?.();
  }, [formOpen, onFormClose]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.categories.some((c) => c.toLowerCase().includes(q)) ||
      (r.profile?.contact_person ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc',
  );
  const sortedRows = sorted as unknown as VendorRow[];
  const pag = usePagination(sortedRows, 25);

  const openOrderTemplate = async (vendorName: string) => {
    setOrderVendor(vendorName);
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDelivery('');
    setOrderStatus('DRAFT');
    setOrderTotal('');
    setOrderNotes(`Generated from Supply Vendor profile for ${vendorName}.`);
    setOrderError(null);
    setOrderOpen(true);

    const supabase = getSupabaseBrowserClient();
    const generated = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'ORD' });
    const fallback = `ORD-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    setOrderCode((generated.data as string) || fallback);
  };

  const submitOrderTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderCode.trim()) {
      setOrderError('Order Code is required.');
      return;
    }
    if (!orderDate) {
      setOrderError('Order Date is required.');
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
        supplier: orderVendor,
        order_date: orderDate,
        expected_delivery: expectedDelivery || null,
        status: orderStatus,
        total_amount: orderTotal.trim() ? Number(orderTotal) : null,
        notes: orderNotes.trim() || null,
      });
      if (error) throw error;
      toast.success('Supply order template created.');
      setOrderOpen(false);
      onRefresh?.();
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order template.';
      setOrderError(message);
      toast.error(message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <EmptyState
            icon={<Store className="h-12 w-12" />}
            title="No supply vendors found"
            description={search ? 'Try a different search term.' : 'Add your first supply vendor profile to start centralizing purchasing details.'}
          />
          {!search && (
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setEditProfile(null);
                  setVendorFormOpen(true);
                }}
              >
                <CirclePlus className="h-4 w-4" />
                New Supply Vendor
              </Button>
            </div>
          )}
        </div>
        <SupplyVendorForm
          open={vendorFormOpen}
          onClose={() => setVendorFormOpen(false)}
          initialData={editProfile}
          onSuccess={() => {
            setVendorFormOpen(false);
            fetchData();
            onRefresh?.();
          }}
        />
      </>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Vendor Name</TableHead>
            <TableHead sortable sorted={sortKey === 'supplyCount' && sortDir} onSort={() => onSort('supplyCount')}>Supplies</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead sortable sorted={sortKey === 'lastOrder' && sortDir} onSort={() => onSort('lastOrder')}>Last Order</TableHead>
            <TableHead sortable sorted={sortKey === 'accountStatus' && sortDir} onSort={() => onSort('accountStatus')}>Account Status</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              className={cn('cursor-pointer')}
              onClick={() => router.push(`/vendors/supply-vendors/${row.id}`)}
            >
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="font-mono text-xs">{row.supplyCount}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {row.categories.length > 0 ? row.categories.join(', ') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.lastOrder)}</TableCell>
              <TableCell>
                <Badge color={statusColor(row.accountStatus)}>
                  {row.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openOrderTemplate(row.name);
                    }}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Place Order
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEditProfile(row.profile ?? {
                        id: row.id,
                        company_name: row.name,
                        account_number: null,
                        contact_person: null,
                        phone: null,
                        email: null,
                        website: null,
                        payment_terms: null,
                        order_minimum: null,
                        delivery_schedule: null,
                        categories_supplied: row.categories,
                        account_status: row.accountStatus,
                        notes: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                      setVendorFormOpen(true);
                    }}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        totalItems={pag.totalItems}
        pageSize={pag.pageSize}
        hasNext={pag.hasNext}
        hasPrev={pag.hasPrev}
        onNext={pag.nextPage}
        onPrev={pag.prevPage}
      />

      <SupplyVendorForm
        open={vendorFormOpen}
        onClose={() => setVendorFormOpen(false)}
        initialData={editProfile}
        onSuccess={() => {
          setVendorFormOpen(false);
          fetchData();
          onRefresh?.();
        }}
      />

      <SlideOver
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Place Order"
        subtitle={`Generate supply order template for ${orderVendor}`}
      >
        <form className="space-y-4" onSubmit={submitOrderTemplate}>
          <Input label="Order Code" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} required />
          <Input label="Supplier" value={orderVendor} readOnly disabled />
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
          <Input
            label="Total Amount ($)"
            type="number"
            min="0"
            step="0.01"
            value={orderTotal}
            onChange={(e) => setOrderTotal(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />
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
    </div>
  );
}
