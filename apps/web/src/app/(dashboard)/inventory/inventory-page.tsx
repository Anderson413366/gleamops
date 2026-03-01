'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Package, Box, MapPin, ClipboardList, ShoppingCart, BrainCircuit,
  Plus, Sparkles, Store,
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
  const [simpleView, setSimpleView] = useState(false);
  const visibleTabs = useMemo(() => {
    if (!simpleView) return TABS;
    return TABS.filter((tabOption) => ['supplies', 'orders', 'counts', 'forecasting', 'warehouse'].includes(tabOption.key));
  }, [simpleView]);
  const [tab, setTab] = useSyncedTab({
    tabKeys: visibleTabs.map((tabOption) => tabOption.key),
    defaultTab: 'supplies',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const [kpis, setKpis] = useState({
    activeSupplies: 0,
    belowPar: 0,
    openOrders: 0,
    pendingCounts: 0,
  });

  // autoCreate triggers
  const [autoCreateSupply, setAutoCreateSupply] = useState(false);
  const [autoCreateKit, setAutoCreateKit] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gleamops-inventory-simple-view') === 'true';
    setSimpleView(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem('gleamops-inventory-simple-view', String(simpleView));
  }, [simpleView]);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [statusRes, siteSuppliesRes, openOrdersRes, pendingCountsRes] = await Promise.all([
        supabase.from('supply_catalog').select('supply_status').is('archived_at', null),
        supabase.from('site_supplies').select('id, par_level, supply_id, site_id').is('archived_at', null).gt('par_level', 0),
        supabase.from('supply_orders').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['ORDERED', 'SHIPPED']),
        supabase.from('inventory_counts').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['DRAFT', 'IN_PROGRESS']),
      ]);

      const activeSupplies = (statusRes.data ?? []).filter((row) => {
        const status = (row as { supply_status?: string | null }).supply_status;
        return status == null || status.toUpperCase() === 'ACTIVE';
      }).length;

      // Count below-par items using latest count data
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

      setKpis({
        activeSupplies,
        belowPar: belowParCount,
        openOrders: openOrdersRes.count ?? 0,
        pendingCounts: pendingCountsRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

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
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Supplies</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeSupplies}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Below Par</p><p className={`text-lg font-semibold sm:text-xl leading-tight ${kpis.belowPar > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{kpis.belowPar}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Orders</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.openOrders}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Counts</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.pendingCounts}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={simpleView ? 'Search core inventory...' : `Search ${tab}...`}
          className="w-56 sm:w-72 lg:w-80"
        />
        <Button
          variant="secondary"
          className="shrink-0"
          onClick={() => setSimpleView((value) => !value)}
        >
          <Sparkles className="h-4 w-4" />
          {simpleView ? 'Simple View On' : 'Simple View'}
        </Button>
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
