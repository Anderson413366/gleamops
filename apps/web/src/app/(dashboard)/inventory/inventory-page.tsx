'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Package, Box, MapPin, ClipboardList, ShoppingCart, BrainCircuit,
  Plus, Store,
} from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import SuppliesTable from './supplies/supplies-table';
import KitsTable from './kits/kits-table';
import SiteAssignmentsTable from './site-assignments/site-assignments-table';
import CountsTable from './counts/counts-table';
import OrdersTable from './orders/orders-table';
import ForecastingPanel from './forecasting/forecasting-panel';
import WarehousePanel from './warehouse/warehouse-panel';
import VendorsTable from '../vendors/vendor-directory/vendors-table';

const TABS = [
  { key: 'supplies', label: 'Supply Catalog', icon: <Package className="h-4 w-4" /> },
  { key: 'kits', label: 'Kits', icon: <Box className="h-4 w-4" /> },
  { key: 'site-assignments', label: 'Site Assignments', icon: <MapPin className="h-4 w-4" /> },
  { key: 'counts', label: 'Counts', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'forecasting', label: 'Forecasting', icon: <BrainCircuit className="h-4 w-4" /> },
  { key: 'warehouse', label: 'Warehouse', icon: <Box className="h-4 w-4" /> },
  { key: 'vendors', label: 'Vendors', icon: <Store className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  supplies: 'New Supply',
  kits: 'New Kit',
  counts: 'New Count',
  orders: 'New Order',
};

export default function InventoryPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((tabOption) => tabOption.key),
    defaultTab: 'supplies',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean }[]>([
    { label: 'Active Supplies', value: 0 },
    { label: 'Below Par', value: 0 },
    { label: 'Open Orders', value: 0 },
    { label: 'Pending Counts', value: 0 },
  ]);

  // autoCreate triggers
  const [autoCreateSupply, setAutoCreateSupply] = useState(false);
  const [autoCreateKit, setAutoCreateKit] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();

      if (tab === 'warehouse') {
        const [locationsRes, movementsRes, requestsRes, ordersRes] = await Promise.all([
          supabase.from('inventory_locations').select('id').is('archived_at', null),
          supabase.from('stock_movements').select('id').is('archived_at', null),
          supabase.from('supply_requests').select('id').is('archived_at', null).in('status', ['PENDING', 'APPROVED']),
          supabase.from('purchase_orders').select('id').is('archived_at', null),
        ]);
        setTabKpis([
          { label: 'Locations', value: locationsRes.data?.length ?? 0 },
          { label: 'Movements', value: movementsRes.data?.length ?? 0 },
          { label: 'Open Requests', value: requestsRes.data?.length ?? 0, warn: (requestsRes.data?.length ?? 0) > 0 },
          { label: 'Purchase Orders', value: ordersRes.data?.length ?? 0 },
        ]);
        return;
      }

      if (tab === 'counts') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const [allCountsRes, pendingRes, recentRes, detailsRes] = await Promise.all([
          supabase.from('inventory_counts').select('id').is('archived_at', null),
          supabase.from('inventory_counts').select('id').is('archived_at', null).in('status', ['DRAFT', 'IN_PROGRESS']),
          supabase.from('inventory_counts').select('id').is('archived_at', null).gte('count_date', thirtyDaysAgo),
          supabase.from('inventory_count_details').select('id').is('archived_at', null),
        ]);
        setTabKpis([
          { label: 'Total Counts', value: allCountsRes.data?.length ?? 0 },
          { label: 'Pending', value: pendingRes.data?.length ?? 0, warn: (pendingRes.data?.length ?? 0) > 0 },
          { label: 'This Month', value: recentRes.data?.length ?? 0 },
          { label: 'Items Counted', value: detailsRes.data?.length ?? 0 },
        ]);
        return;
      }

      if (tab === 'site-assignments') {
        const [assignRes, sitesRes, suppliesRes] = await Promise.all([
          supabase.from('site_supplies').select('id, site_id').is('archived_at', null),
          supabase.from('sites').select('id').is('archived_at', null),
          supabase.from('supply_catalog').select('id').is('archived_at', null),
        ]);
        const totalAssignments = assignRes.data?.length ?? 0;
        const sitesWithAssignments = new Set((assignRes.data ?? []).map((r: { site_id: string }) => r.site_id)).size;
        setTabKpis([
          { label: 'Total Assignments', value: totalAssignments },
          { label: 'Sites Assigned', value: sitesWithAssignments },
          { label: 'Total Sites', value: sitesRes.data?.length ?? 0 },
          { label: 'Catalog Supplies', value: suppliesRes.data?.length ?? 0 },
        ]);
        return;
      }

      if (tab === 'kits') {
        const [kitsRes, itemsRes, suppliesRes] = await Promise.all([
          supabase.from('supply_kits').select('id').is('archived_at', null),
          supabase.from('supply_kit_items').select('id').is('archived_at', null),
          supabase.from('supply_catalog').select('id').is('archived_at', null),
        ]);
        setTabKpis([
          { label: 'Total Kits', value: kitsRes.data?.length ?? 0 },
          { label: 'Kit Items', value: itemsRes.data?.length ?? 0 },
          { label: 'Catalog Supplies', value: suppliesRes.data?.length ?? 0 },
          { label: 'Avg Items/Kit', value: (kitsRes.data?.length ?? 0) > 0 ? ((itemsRes.data?.length ?? 0) / kitsRes.data!.length).toFixed(1) : '0' },
        ]);
        return;
      }

      const [statusRes, siteSuppliesRes, openOrdersRes, pendingCountsRes] = await Promise.all([
        supabase.from('supply_catalog').select('supply_status').is('archived_at', null),
        supabase.from('site_supplies').select('id, par_level, supply_id, site_id').is('archived_at', null).gt('par_level', 0),
        supabase.from('supply_orders').select('id').is('archived_at', null).in('status', ['ORDERED', 'SHIPPED']),
        supabase.from('inventory_counts').select('id').is('archived_at', null).in('status', ['DRAFT', 'IN_PROGRESS']),
      ]);

      const activeSupplies = (statusRes.data ?? []).filter((row) => {
        const status = (row as { supply_status?: string | null }).supply_status;
        return status == null || status.toUpperCase() === 'ACTIVE';
      }).length;

      let belowParCount = 0;
      const ssRows = (siteSuppliesRes.data ?? []) as Array<{ id: string; par_level: number; supply_id: string | null; site_id: string | null }>;
      if (ssRows.length > 0) {
        const siteIds = [...new Set(ssRows.map(r => r.site_id).filter(Boolean))] as string[];
        const countsRes = siteIds.length > 0
          ? await supabase.from('inventory_counts').select('id, site_id').is('archived_at', null).in('site_id', siteIds).order('count_date', { ascending: false })
          : { data: [] };
        const latestBySite: Record<string, string> = {};
        for (const c of (countsRes.data ?? []) as { id: string; site_id: string }[]) {
          if (!latestBySite[c.site_id]) latestBySite[c.site_id] = c.id;
        }
        const countIds = Object.values(latestBySite);
        const detailsRes = countIds.length > 0
          ? await supabase.from('inventory_count_details').select('count_id, supply_id, actual_qty').is('archived_at', null).in('count_id', countIds)
          : { data: [] };
        const qtyMap: Record<string, number> = {};
        for (const d of (detailsRes.data ?? []) as { count_id: string; supply_id: string; actual_qty: number | null }[]) {
          const siteId = Object.entries(latestBySite).find(([, cId]) => cId === d.count_id)?.[0];
          if (siteId) qtyMap[`${siteId}:${d.supply_id}`] = Number(d.actual_qty ?? 0);
        }
        for (const row of ssRows) {
          if (!row.supply_id || !row.site_id) continue;
          const qty = qtyMap[`${row.site_id}:${row.supply_id}`];
          if (qty != null && qty < row.par_level) belowParCount++;
        }
      }

      setTabKpis([
        { label: 'Active Supplies', value: activeSupplies },
        { label: 'Below Par', value: belowParCount, warn: belowParCount > 0 },
        { label: 'Open Orders', value: openOrdersRes.data?.length ?? 0 },
        { label: 'Pending Counts', value: pendingCountsRes.data?.length ?? 0 },
      ]);
    }
    fetchKpis();
  }, [tab, refreshKey]);

  const handleAdd = () => {
    if (tab === 'supplies') {
      setAutoCreateSupply(true);
    } else if (tab === 'kits') {
      setAutoCreateKit(true);
    } else {
      setFormOpen(true);
    }
  };

  const addLabel = ADD_LABELS[tab];

  const clearActionParam = useCallback((nextTab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    if (nextTab) params.set('tab', nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (!actionName) return;
    if (actionName === 'create-supply') {
      setTab('supplies');
      setAutoCreateSupply(true);
      clearActionParam('supplies');
      return;
    }
    if (actionName === 'create-kit') {
      setTab('kits');
      setAutoCreateKit(true);
      clearActionParam('kits');
      return;
    }
    if (actionName === 'create-count') {
      setTab('counts');
      setFormOpen(true);
      clearActionParam('counts');
      return;
    }
    if (actionName === 'create-order') {
      setTab('orders');
      setFormOpen(true);
      clearActionParam('orders');
    }
  }, [clearActionParam, setTab]);

  useEffect(() => {
    openQuickCreate(action);
  }, [action, openQuickCreate]);

  return (
    <div className="space-y-6">
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-destructive' : ''}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-56 sm:w-72 lg:w-80"
        />
        {addLabel && (
          <Button className="shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {tab === 'supplies' && (
        <SuppliesTable
          key={`supplies-${refreshKey}`}
          search={search}
          autoCreate={autoCreateSupply}
          onAutoCreateHandled={() => setAutoCreateSupply(false)}
        />
      )}
      {tab === 'kits' && (
        <KitsTable
          key={`kits-${refreshKey}`}
          search={search}
          autoCreate={autoCreateKit}
          onAutoCreateHandled={() => setAutoCreateKit(false)}
        />
      )}
      {tab === 'site-assignments' && (
        <SiteAssignmentsTable key={`sa-${refreshKey}`} search={search} />
      )}
      {tab === 'counts' && (
        <CountsTable
          key={`counts-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'orders' && (
        <OrdersTable
          key={`orders-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'forecasting' && (
        <ForecastingPanel
          key={`forecast-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'warehouse' && (
        <WarehousePanel
          key={`warehouse-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'vendors' && (
        <VendorsTable
          key={`vendors-${refreshKey}`}
          search={search}
        />
      )}
    </div>
  );
}
