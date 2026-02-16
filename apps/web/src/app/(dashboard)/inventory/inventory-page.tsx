'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Package, Box, MapPin, ClipboardList, ShoppingCart,
  Plus, Sparkles,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import SuppliesTable from './supplies/supplies-table';
import KitsTable from './kits/kits-table';
import SiteAssignmentsTable from './site-assignments/site-assignments-table';
import CountsTable from './counts/counts-table';
import OrdersTable from './orders/orders-table';

const TABS = [
  { key: 'supplies', label: 'Supply Catalog', icon: <Package className="h-4 w-4" /> },
  { key: 'kits', label: 'Kits', icon: <Box className="h-4 w-4" /> },
  { key: 'site-assignments', label: 'Site Assignments', icon: <MapPin className="h-4 w-4" /> },
  { key: 'counts', label: 'Counts', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  supplies: 'New Supply',
  kits: 'New Kit',
  counts: 'New Count',
  orders: 'New Order',
};

export default function InventoryPageClient() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [simpleView, setSimpleView] = useState(false);
  const visibleTabs = useMemo(() => {
    if (!simpleView) return TABS;
    return TABS.filter((tabOption) => ['supplies', 'orders', 'counts'].includes(tabOption.key));
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
    replenishmentWatch: 0,
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
      const [statusRes, replenishmentRes, openOrdersRes, pendingCountsRes] = await Promise.all([
        supabase.from('supply_catalog').select('supply_status').is('archived_at', null),
        supabase.from('supply_catalog').select('id', { count: 'exact', head: true }).is('archived_at', null).not('min_stock_level', 'is', null),
        supabase.from('supply_orders').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['ORDERED', 'SHIPPED']),
        supabase.from('inventory_counts').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['DRAFT', 'IN_PROGRESS']),
      ]);

      const activeSupplies = (statusRes.data ?? []).filter((row) => {
        const status = (row as { supply_status?: string | null }).supply_status;
        return status == null || status.toUpperCase() === 'ACTIVE';
      }).length;

      setKpis({
        activeSupplies,
        replenishmentWatch: replenishmentRes.count ?? 0,
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

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (!actionName) return;
    if (actionName === 'create-supply') {
      setTab('supplies');
      setAutoCreateSupply(true);
      return;
    }
    if (actionName === 'create-kit') {
      setTab('kits');
      setAutoCreateKit(true);
      return;
    }
    if (actionName === 'create-count') {
      setTab('counts');
      setFormOpen(true);
      return;
    }
    if (actionName === 'create-order') {
      setTab('orders');
      setFormOpen(true);
    }
  }, [setTab]);

  useEffect(() => {
    openQuickCreate(action);
  }, [action, openQuickCreate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Supplies, kits, site assignments, counts, and orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={simpleView ? 'primary' : 'secondary'}
            onClick={() => setSimpleView((value) => !value)}
          >
            <Sparkles className="h-4 w-4" />
            {simpleView ? 'Simple View On' : 'Simple View'}
          </Button>
          {addLabel && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Supplies</p><p className="text-xl font-semibold">{kpis.activeSupplies}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Replenishment Watch</p><p className="text-xl font-semibold text-warning">{kpis.replenishmentWatch}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Orders</p><p className="text-xl font-semibold">{kpis.openOrders}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Counts</p><p className="text-xl font-semibold">{kpis.pendingCounts}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={visibleTabs} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={simpleView ? 'Search core inventory...' : `Search ${tab}...`} />

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
    </div>
  );
}
