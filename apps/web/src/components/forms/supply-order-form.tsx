'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Package2,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { assertUpdateSucceeded } from '@/hooks/use-form';
import { SlideOver, Input, Select, Textarea, Button, FormSection, Badge } from '@gleamops/ui';
import type { SupplyOrder } from '@gleamops/shared';

const EDIT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELED', label: 'Canceled' },
];

const TAX_RATE = 0.07;
const COVERAGE_WEEKS = 2;

interface SupplyOrderFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SupplyOrder | null;
  initialSiteCode?: string | null;
  onSuccess?: () => void;
}

interface SiteOption {
  id: string;
  tenant_id: string;
  name: string;
  site_code: string;
  last_count_date: string | null;
  next_count_due: string | null;
}

interface SiteSupplyAssignment {
  id: string;
  site_id: string;
  supply_id: string | null;
  name: string;
  category: string | null;
  par_level: number | null;
}

interface SupplyCatalogLite {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  unit_cost: number | null;
  preferred_vendor: string | null;
  brand: string | null;
  image_url: string | null;
  min_stock_level: number | null;
}

interface CountHeader {
  id: string;
  count_code: string;
  count_date: string;
  status: string;
}

interface CountDetail {
  count_id: string;
  supply_id: string;
  actual_qty: number | null;
}

interface UsagePair {
  monthlyEquivalent: number;
}

interface OrderLineItem {
  assignmentId: string;
  supplyId: string;
  supplyCode: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  vendor: string | null;
  brand: string | null;
  imageUrl: string | null;
  currentStock: number;
  parLevel: number;
  monthlyUsage: number;
  weeklyUsage: number;
  yearlyUsage: number;
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  suggestedQty: number;
  orderQty: number;
  lastCountDate: string | null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not Set';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function safeQty(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Number(value);
}

function dueTone(nextDue: string | null | undefined): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!nextDue) return { label: 'No due schedule', color: 'gray' };
  const due = new Date(`${nextDue}T00:00:00`);
  if (Number.isNaN(due.getTime())) return { label: 'No due schedule', color: 'gray' };
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((due.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)} day(s)`, color: 'red' };
  if (diffDays <= 7) return { label: `Due in ${diffDays} day(s)`, color: 'yellow' };
  return { label: `Due in ${diffDays} day(s)`, color: 'green' };
}

function usagePairsForSupply(countsAsc: CountHeader[], qtyByCountSupply: Record<string, number>, supplyId: string): UsagePair[] {
  const pairs: UsagePair[] = [];
  for (let i = 1; i < countsAsc.length; i += 1) {
    const older = countsAsc[i - 1];
    const newer = countsAsc[i];
    const olderQty = qtyByCountSupply[`${older.id}:${supplyId}`];
    const newerQty = qtyByCountSupply[`${newer.id}:${supplyId}`];
    if (olderQty == null || newerQty == null) continue;

    const used = Math.max(0, olderQty - newerQty);
    const olderDate = new Date(`${older.count_date}T00:00:00`);
    const newerDate = new Date(`${newer.count_date}T00:00:00`);
    const rawDays = Math.round((newerDate.getTime() - olderDate.getTime()) / (24 * 60 * 60 * 1000));
    const days = Math.max(1, rawDays);
    const monthlyEquivalent = (used / days) * 30;
    pairs.push({ monthlyEquivalent });
  }
  return pairs;
}

export function SupplyOrderForm({ open, onClose, initialData, initialSiteCode, onSuccess }: SupplyOrderFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [siteSearch, setSiteSearch] = useState('');

  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState<null | 'draft' | 'submit'>(null);

  const [orderCode, setOrderCode] = useState('');
  const [siteId, setSiteId] = useState<string>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [supplier, setSupplier] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<OrderLineItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [latestCountCode, setLatestCountCode] = useState<string | null>(null);
  const [latestCountDate, setLatestCountDate] = useState<string | null>(null);

  const [editLoading, setEditLoading] = useState(false);
  const [editSiteId, setEditSiteId] = useState('');
  const [editOrderCode, setEditOrderCode] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editOrderDate, setEditOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [editExpectedDelivery, setEditExpectedDelivery] = useState('');
  const [editStatus, setEditStatus] = useState<'DRAFT' | 'SUBMITTED' | 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RECEIVED' | 'CANCELED'>('DRAFT');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editDeliveryInstructions, setEditDeliveryInstructions] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const resetCreate = useCallback(() => {
    setCreateStep(1);
    setLoadingData(false);
    setSubmitting(null);
    setOrderCode('');
    setSiteId('');
    setOrderDate(new Date().toISOString().slice(0, 10));
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + 7);
    setExpectedDelivery(delivery.toISOString().slice(0, 10));
    setSupplier('');
    setVendorId('');
    setDeliveryInstructions('');
    setNotes('');
    setLines([]);
    setExpandedCategories([]);
    setLatestCountCode(null);
    setLatestCountDate(null);
  }, []);

  const handleClose = useCallback(() => {
    resetCreate();
    setSiteSearch('');
    setEditLoading(false);
    onClose();
  }, [onClose, resetCreate]);

  const preloadSites = useCallback(async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, tenant_id, name, site_code, last_count_date, next_count_due')
      .is('archived_at', null)
      .order('name');

    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as SiteOption[];
    setSiteOptions(rows);
  }, [supabase]);

  const preloadOrderCode = useCallback(async () => {
    if (orderCode) return;
    const { data: generatedCode } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'ORD' });
    if (generatedCode) {
      setOrderCode(String(generatedCode));
      return;
    }
    const fallback = `ORD-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    setOrderCode(fallback);
  }, [orderCode, supabase]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function initialize() {
      await preloadSites();
      if (cancelled) return;

      if (isEdit && initialData) {
        setEditSiteId(initialData.site_id ?? '');
        setEditOrderCode(initialData.order_code ?? '');
        setEditSupplier(initialData.supplier ?? '');
        setEditOrderDate(initialData.order_date ?? new Date().toISOString().slice(0, 10));
        setEditExpectedDelivery(initialData.expected_delivery ?? initialData.delivery_date_est ?? '');
        setEditStatus((initialData.status as typeof editStatus) ?? 'DRAFT');
        setEditTotalAmount(initialData.total_amount != null ? String(initialData.total_amount) : '');
        setEditDeliveryInstructions(initialData.delivery_instructions ?? '');
        setEditNotes(initialData.notes ?? '');
        return;
      }

      await preloadOrderCode();
      if (cancelled) return;

      if (initialSiteCode) {
        const matchingSite = (siteOptions.length > 0 ? siteOptions : []).find((site) => site.site_code === initialSiteCode);
        if (matchingSite) setSiteId(matchingSite.id);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [initialData, initialSiteCode, isEdit, open, preloadOrderCode, preloadSites, siteOptions]);

  useEffect(() => {
    if (!open || isEdit || !initialSiteCode || siteId) return;
    const match = siteOptions.find((site) => site.site_code === initialSiteCode);
    if (match) {
      setSiteId(match.id);
    }
  }, [initialSiteCode, isEdit, open, siteId, siteOptions]);

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return siteOptions;
    const q = siteSearch.toLowerCase();
    return siteOptions.filter((site) => (
      site.name.toLowerCase().includes(q)
      || site.site_code.toLowerCase().includes(q)
    ));
  }, [siteOptions, siteSearch]);

  const selectedSite = useMemo(
    () => siteOptions.find((site) => site.id === siteId) ?? null,
    [siteId, siteOptions]
  );

  const dueLabel = useMemo(() => dueTone(selectedSite?.next_count_due), [selectedSite?.next_count_due]);

  const groupedLines = useMemo(() => {
    const groups: Record<string, OrderLineItem[]> = {};
    for (const line of lines) {
      const key = line.category || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(line);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [lines]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.orderQty * line.unitCost), 0),
    [lines]
  );
  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const computeLineItems = useCallback(async (targetSiteId: string) => {
    setLoadingData(true);

    const [assignmentsRes, catalogRes, countsRes] = await Promise.all([
      supabase
        .from('site_supplies')
        .select('id, site_id, supply_id, name, category, par_level')
        .eq('site_id', targetSiteId)
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('supply_catalog')
        .select('id, code, name, category, unit, unit_cost, preferred_vendor, brand, image_url, min_stock_level')
        .is('archived_at', null),
      supabase
        .from('inventory_counts')
        .select('id, count_code, count_date, status')
        .eq('site_id', targetSiteId)
        .is('archived_at', null)
        .in('status', ['SUBMITTED', 'COMPLETED'])
        .order('count_date', { ascending: false }),
    ]);

    if (assignmentsRes.error) {
      setLoadingData(false);
      throw new Error(assignmentsRes.error.message);
    }
    if (catalogRes.error) {
      setLoadingData(false);
      throw new Error(catalogRes.error.message);
    }
    if (countsRes.error) {
      setLoadingData(false);
      throw new Error(countsRes.error.message);
    }

    const assignments = (assignmentsRes.data ?? []) as SiteSupplyAssignment[];
    const catalog = (catalogRes.data ?? []) as SupplyCatalogLite[];
    const countsDesc = (countsRes.data ?? []) as CountHeader[];

    const latest = countsDesc[0] ?? null;
    setLatestCountCode(latest?.count_code ?? null);
    setLatestCountDate(latest?.count_date ?? null);

    const countIds = countsDesc.map((count) => count.id);
    let details: CountDetail[] = [];
    if (countIds.length > 0) {
      const { data: detailRows, error: detailsError } = await supabase
        .from('inventory_count_details')
        .select('count_id, supply_id, actual_qty')
        .in('count_id', countIds)
        .is('archived_at', null);
      if (detailsError) {
        setLoadingData(false);
        throw new Error(detailsError.message);
      }
      details = (detailRows ?? []) as CountDetail[];
    }

    const catalogById = new Map<string, SupplyCatalogLite>();
    const catalogByName = new Map<string, SupplyCatalogLite>();
    for (const row of catalog) {
      catalogById.set(row.id, row);
      catalogByName.set(normalize(row.name), row);
    }

    const qtyByCountSupply: Record<string, number> = {};
    for (const detail of details) {
      qtyByCountSupply[`${detail.count_id}:${detail.supply_id}`] = safeQty(detail.actual_qty);
    }

    const countsAsc = [...countsDesc].sort((a, b) => (
      new Date(`${a.count_date}T00:00:00`).getTime() - new Date(`${b.count_date}T00:00:00`).getTime()
    ));

    const computed: OrderLineItem[] = [];
    for (const assignment of assignments) {
      const supply = assignment.supply_id
        ? catalogById.get(assignment.supply_id)
        : catalogByName.get(normalize(assignment.name));

      if (!supply) continue;

      const usagePairs = usagePairsForSupply(countsAsc, qtyByCountSupply, supply.id);
      const latestThree = usagePairs.slice(-3);
      const monthlyUsage = latestThree.length > 0
        ? latestThree.reduce((sum, pair) => sum + pair.monthlyEquivalent, 0) / latestThree.length
        : 0;
      const weeklyUsage = monthlyUsage / 4;
      const yearlyUsage = monthlyUsage * 12;

      const latestMonthly = usagePairs.length > 0 ? usagePairs[usagePairs.length - 1].monthlyEquivalent : 0;
      const previousMonthly = usagePairs.length > 1 ? usagePairs[usagePairs.length - 2].monthlyEquivalent : latestMonthly;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPct = 0;
      if (previousMonthly > 0) {
        trendPct = ((latestMonthly - previousMonthly) / previousMonthly) * 100;
        if (trendPct > 10) trend = 'up';
        else if (trendPct < -10) trend = 'down';
      }

      const currentStock = latest ? safeQty(qtyByCountSupply[`${latest.id}:${supply.id}`]) : 0;
      const parLevel = Number(assignment.par_level ?? supply.min_stock_level ?? 0);
      const suggestedQty = Math.max(0, Math.ceil(parLevel - currentStock + (weeklyUsage * COVERAGE_WEEKS)));

      computed.push({
        assignmentId: assignment.id,
        supplyId: supply.id,
        supplyCode: supply.code,
        name: supply.name,
        category: assignment.category ?? supply.category ?? 'Uncategorized',
        unit: supply.unit,
        unitCost: Number(supply.unit_cost ?? 0),
        vendor: supply.preferred_vendor,
        brand: supply.brand,
        imageUrl: supply.image_url,
        currentStock,
        parLevel,
        monthlyUsage,
        weeklyUsage,
        yearlyUsage,
        trend,
        trendPct,
        suggestedQty,
        orderQty: suggestedQty,
        lastCountDate: latest?.count_date ?? null,
      });
    }

    setLines(computed.sort((a, b) => a.name.localeCompare(b.name)));
    const categoryList = Array.from(new Set(computed.map((line) => line.category)));
    setExpandedCategories(categoryList.length > 0 ? [categoryList[0]] : []);

    setLoadingData(false);
  }, [supabase]);

  const handleGenerateOrderForm = async () => {
    if (!siteId) {
      toast.error('Select a site first.');
      return;
    }
    try {
      await computeLineItems(siteId);
      setCreateStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load site inventory analytics.');
    }
  };

  const setOrderQty = (assignmentId: string, nextQty: number) => {
    setLines((prev) => prev.map((line) => (
      line.assignmentId === assignmentId ? { ...line, orderQty: Math.max(0, Number.isFinite(nextQty) ? nextQty : 0) } : line
    )));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => (
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    ));
  };

  const createOrder = async (mode: 'draft' | 'submit') => {
    if (!siteId) {
      toast.error('Site is required.');
      return;
    }
    const linesToOrder = lines.filter((line) => line.orderQty > 0);
    if (linesToOrder.length === 0) {
      toast.error('Set at least one item quantity above 0.');
      return;
    }

    const selectedSiteOption = siteOptions.find((site) => site.id === siteId);
    const tenantId = selectedSiteOption?.tenant_id ?? (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id ?? null;
    if (!tenantId) {
      toast.error('Unable to determine tenant for this order.');
      return;
    }

    setSubmitting(mode);
    try {
      const vendorCounts = new Map<string, number>();
      for (const line of linesToOrder) {
        const key = line.vendor?.trim();
        if (!key) continue;
        vendorCounts.set(key, (vendorCounts.get(key) ?? 0) + 1);
      }
      const dominantVendor = Array.from(vendorCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Mixed Vendors';
      const selectedSupplier = supplier.trim() || dominantVendor;
      const selectedVendorId = vendorId.trim() || slugify(selectedSupplier);

      const orderPayload = {
        tenant_id: tenantId,
        order_code: orderCode.trim(),
        site_id: siteId,
        supplier: selectedSupplier,
        vendor_id: selectedVendorId,
        order_date: orderDate,
        expected_delivery: expectedDelivery || null,
        delivery_date_est: expectedDelivery || null,
        status: mode === 'draft' ? 'DRAFT' : 'SUBMITTED',
        total_amount: Number(total.toFixed(2)),
        delivery_instructions: deliveryInstructions.trim() || null,
        notes: notes.trim() || null,
        submitted_at: mode === 'submit' ? new Date().toISOString() : null,
      };

      let insertRes = await supabase
        .from('supply_orders')
        .insert(orderPayload)
        .select('id, order_code')
        .single();

      // Backward compatibility with environments that do not yet support SUBMITTED.
      if (insertRes.error && mode === 'submit' && insertRes.error.message.toLowerCase().includes('status')) {
        insertRes = await supabase
          .from('supply_orders')
          .insert({
            ...orderPayload,
            status: 'ORDERED',
            submitted_at: null,
          })
          .select('id, order_code')
          .single();
      }

      if (insertRes.error) throw insertRes.error;

      const createdOrderId = String(insertRes.data.id);
      const createdOrderCode = String(insertRes.data.order_code);

      const itemRows = linesToOrder.map((line) => ({
        tenant_id: tenantId,
        order_id: createdOrderId,
        supply_id: line.supplyId,
        quantity_ordered: line.orderQty,
        unit_price: Number(line.unitCost.toFixed(2)),
        line_total: Number((line.orderQty * line.unitCost).toFixed(2)),
        notes: `Suggested ${line.suggestedQty}, par ${line.parLevel}, stock ${line.currentStock}`,
      }));

      const { error: itemError } = await supabase.from('supply_order_items').insert(itemRows);
      if (itemError) throw itemError;

      if (mode === 'draft') {
        toast.success(`Draft saved. Order #${createdOrderCode}`);
      } else {
        toast.success(`Order submitted! Order #${createdOrderCode}`);
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create supply order.');
    } finally {
      setSubmitting(null);
    }
  };

  const saveEdit = async () => {
    if (!initialData) return;
    if (!editOrderCode.trim()) {
      toast.error('Order code is required.');
      return;
    }

    setEditLoading(true);
    try {
      const result = await supabase
        .from('supply_orders')
        .update({
          order_code: editOrderCode.trim(),
          site_id: editSiteId || null,
          supplier: editSupplier.trim() || null,
          order_date: editOrderDate,
          expected_delivery: editExpectedDelivery || null,
          delivery_date_est: editExpectedDelivery || null,
          status: editStatus,
          total_amount: editTotalAmount.trim() ? Number(editTotalAmount) : null,
          delivery_instructions: editDeliveryInstructions.trim() || null,
          notes: editNotes.trim() || null,
        })
        .eq('id', initialData.id)
        .eq('version_etag', initialData.version_etag)
        .select();

      assertUpdateSucceeded(result);
      toast.success('Order updated.');
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update order.');
    } finally {
      setEditLoading(false);
    }
  };

  const renderTrend = (line: OrderLineItem) => {
    if (line.trend === 'up') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-300">
          <TrendingUp className="h-3.5 w-3.5" />
          +{line.trendPct.toFixed(0)}% vs prior period
        </span>
      );
    }
    if (line.trend === 'down') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-300">
          <TrendingDown className="h-3.5 w-3.5" />
          {line.trendPct.toFixed(0)}% vs prior period
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">Trend stable</span>;
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Supply Order' : 'New Supply Order'}
      subtitle={isEdit ? initialData?.order_code : undefined}
      wide
    >
      {isEdit ? (
        <div className="space-y-8">
          <FormSection title="Order Details" icon={<ShoppingCart className="h-4 w-4" />}>
            <Input label="Order Code" value={editOrderCode} onChange={(e) => setEditOrderCode(e.target.value)} required />
            <Select
              label="Site"
              value={editSiteId}
              onChange={(e) => setEditSiteId(e.target.value)}
              options={[{ value: '', label: 'Not Set' }, ...siteOptions.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` }))]}
            />
            <Input label="Supplier" value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} placeholder="Vendor or supplier" />
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
              options={EDIT_STATUS_OPTIONS}
            />
          </FormSection>

          <FormSection title="Dates & Totals" icon={<CalendarDays className="h-4 w-4" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Order Date" type="date" value={editOrderDate} onChange={(e) => setEditOrderDate(e.target.value)} required />
              <Input label="Delivery Date" type="date" value={editExpectedDelivery} onChange={(e) => setEditExpectedDelivery(e.target.value)} />
            </div>
            <Input label="Total Amount ($)" type="number" value={editTotalAmount} onChange={(e) => setEditTotalAmount(e.target.value)} />
            <Textarea label="Delivery Instructions" value={editDeliveryInstructions} onChange={(e) => setEditDeliveryInstructions(e.target.value)} />
            <Textarea label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </FormSection>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="button" loading={editLoading} onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className={`rounded-full px-3 py-1 font-semibold ${createStep === 1 ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground'}`}>Step 1 · Select Site</div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <div className={`rounded-full px-3 py-1 font-semibold ${createStep === 2 ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground'}`}>Step 2 · Build Order</div>
            </div>
          </div>

          {createStep === 1 ? (
            <>
              <FormSection title="Site & Order Setup" icon={<ClipboardList className="h-4 w-4" />} description="Select a site and load inventory usage analytics from the latest counts.">
                <Input label="Order Code" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} required />
                <Input label="Search Site" value={siteSearch} onChange={(e) => setSiteSearch(e.target.value)} placeholder="Search by site name or code..." />
                <Select
                  label="Site"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  options={[
                    { value: '', label: 'Select site...' },
                    ...filteredSites.map((site) => {
                      const due = dueTone(site.next_count_due);
                      const suffix = due.color === 'red' ? ' · OVERDUE' : due.color === 'yellow' ? ' · DUE SOON' : '';
                      return {
                        value: site.id,
                        label: `${site.name} (${site.site_code}) · Last: ${formatDate(site.last_count_date)}${suffix}`,
                      };
                    }),
                  ]}
                  required
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Order Date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
                  <Input label="Estimated Delivery" type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
                </div>
              </FormSection>

              {selectedSite ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-semibold text-foreground">{selectedSite.name} ({selectedSite.site_code})</p>
                  <p className="mt-1 text-muted-foreground">Last count: {formatDate(selectedSite.last_count_date)}</p>
                  <p className="mt-2">
                    <Badge color={dueLabel.color}>{dueLabel.label}</Badge>
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="button" loading={loadingData} onClick={handleGenerateOrderForm}>Load Last Count & Generate Form</Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">New Supply Order — {selectedSite?.name ?? 'Site'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Site: {selectedSite?.name ?? 'Not Set'}
                      {selectedSite?.site_code ? ` (${selectedSite.site_code})` : ''}
                      {' · '}Last Count: {formatDate(latestCountDate)}
                      {latestCountCode ? ` (${latestCountCode})` : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Order Date: {formatDate(orderDate)} · Delivery: {formatDate(expectedDelivery || null)}
                    </p>
                  </div>
                  <Badge color={dueLabel.color}>{dueLabel.label}</Badge>
                </div>
              </div>

              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No assigned supplies were found for this site. Add supplies in Site Assignments first.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedLines.map(([category, categoryLines]) => {
                    const expanded = expandedCategories.includes(category);
                    return (
                      <div key={category} className="rounded-xl border border-border bg-card">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left"
                        >
                          <span className="text-sm font-semibold text-foreground">{category} ({categoryLines.length})</span>
                          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {expanded ? (
                          <div className="space-y-3 border-t border-border px-4 py-4">
                            {categoryLines.map((line) => (
                              <div key={line.assignmentId} className="rounded-xl border border-border bg-card p-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                                    {line.imageUrl ? (
                                      <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <Package2 className="h-6 w-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{line.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {line.supplyCode} · Unit: {line.unit} · Vendor: {line.vendor ?? 'Not Set'} · {formatMoney(line.unitCost)}/{line.unit.toLowerCase()}
                                    </p>
                                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                      <p className="text-muted-foreground">Current Stock: <span className="font-medium text-foreground">{line.currentStock} {line.unit.toLowerCase()}</span></p>
                                      <p className="text-muted-foreground">Par Level: <span className="font-medium text-foreground">{line.parLevel} {line.unit.toLowerCase()}</span></p>
                                      <p className="text-muted-foreground">Monthly: <span className="font-medium text-foreground">{line.monthlyUsage.toFixed(1)}</span></p>
                                      <p className="text-muted-foreground">Weekly: <span className="font-medium text-foreground">{line.weeklyUsage.toFixed(1)}</span></p>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                      <p className="text-muted-foreground">Yearly: <span className="font-medium text-foreground">{line.yearlyUsage.toFixed(1)}</span></p>
                                      <p>{renderTrend(line)}</p>
                                    </div>
                                    <div className="mt-2 rounded-md bg-module-accent/10 px-3 py-2 text-xs text-foreground">
                                      <span className="font-semibold">Suggested Order:</span> {line.suggestedQty} {line.unit.toLowerCase()} (par level + 2 weeks usage coverage)
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-end gap-3">
                                  <div className="min-w-[200px] flex-1">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Quantity</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={line.orderQty}
                                      onChange={(event) => setOrderQty(line.assignmentId, Number(event.target.value))}
                                      className="h-12 w-full rounded-lg border border-border bg-background px-3 text-lg"
                                    />
                                  </div>
                                  <div className="min-w-[140px]">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Total</p>
                                    <p className="mt-1 font-semibold text-foreground">{formatMoney(line.orderQty * line.unitCost)}</p>
                                  </div>
                                  <Button type="button" variant="secondary" onClick={() => setOrderQty(line.assignmentId, line.suggestedQty)}>
                                    <Sparkles className="h-4 w-4" />
                                    Use Suggested
                                  </Button>
                                  <Button type="button" variant="secondary" onClick={() => setOrderQty(line.assignmentId, 0)}>
                                    Skip This Item
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Order Summary</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {lines.filter((line) => line.orderQty > 0).length} items · Subtotal: {formatMoney(subtotal)} · Tax: {formatMoney(tax)} · Total: {formatMoney(total)}
                </p>
              </div>

              <FormSection title="Delivery & Notes" icon={<CheckCircle2 className="h-4 w-4" />}>
                <Input label="Supplier (optional override)" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Auto-detected from selected line items" />
                <Input label="Vendor ID (optional)" value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="Optional external vendor/account id" />
                <Textarea label="Delivery Instructions" value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} />
                <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormSection>

              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p>Suggested quantities are derived from par levels and recent count deltas. You can override any quantity before saving/submitting.</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="secondary" onClick={() => setCreateStep(1)}>Back</Button>
                <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button type="button" variant="secondary" loading={submitting === 'draft'} onClick={() => void createOrder('draft')}>Save as Draft</Button>
                <Button type="button" loading={submitting === 'submit'} onClick={() => void createOrder('submit')}>Submit Order to Vendor</Button>
              </div>
            </>
          )}
        </div>
      )}
    </SlideOver>
  );
}
