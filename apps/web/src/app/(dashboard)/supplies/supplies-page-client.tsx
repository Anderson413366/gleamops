'use client';

import { useState, useCallback, useEffect } from 'react';
import { Package, ShoppingCart, Box, Wrench, Truck, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import SuppliesTable from '../inventory/supplies/supplies-table';
import OrdersTable from '../inventory/orders/orders-table';
import KitsTable from '../inventory/kits/kits-table';
import EquipmentTable from '../assets/equipment/equipment-table';
import VendorsTable from '../vendors/vendor-directory/vendors-table';

const TABS = [
  { key: 'supplies', label: 'Supplies', icon: <Package className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'kits', label: 'Kits', icon: <Box className="h-4 w-4" /> },
  { key: 'assets', label: 'Assets', icon: <Wrench className="h-4 w-4" /> },
  { key: 'vendors', label: 'Vendors', icon: <Truck className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  supplies: 'New Supply',
  kits: 'New Kit',
  orders: 'New Order',
};

export default function SuppliesPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'supplies',
    aliases: { 'supply-catalog': 'supplies', warehouse: 'supplies' },
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
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [assetFormOpen, setAssetFormOpen] = useState(false);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [statusRes, openOrdersRes, pendingCountsRes] = await Promise.all([
        supabase.from('supply_catalog').select('supply_status').is('archived_at', null),
        supabase.from('supply_orders').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['ORDERED', 'SHIPPED']),
        supabase.from('inventory_counts').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['DRAFT', 'IN_PROGRESS']),
      ]);

      const activeSupplies = (statusRes.data ?? []).filter((row) => {
        const status = (row as { supply_status?: string | null }).supply_status;
        return status == null || status.toUpperCase() === 'ACTIVE';
      }).length;

      setKpis({
        activeSupplies,
        belowPar: 0,
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
    } else if (tab === 'orders') {
      setFormOpen(true);
    } else if (tab === 'assets') {
      setAssetFormOpen(true);
    } else if (tab === 'vendors') {
      setVendorFormOpen(true);
    }
  };

  const addLabel = ADD_LABELS[tab] ?? (tab === 'assets' ? 'New Equipment' : tab === 'vendors' ? 'New Vendor' : '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplies And Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">Supplies, Orders, Kits, Assets, Vendors</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Supplies</p><p className="text-xl font-semibold">{kpis.activeSupplies}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Below Par</p><p className={`text-xl font-semibold ${kpis.belowPar > 0 ? 'text-destructive' : ''}`}>{kpis.belowPar}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Orders</p><p className="text-xl font-semibold">{kpis.openOrders}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Counts</p><p className="text-xl font-semibold">{kpis.pendingCounts}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'supplies' && (
        <SuppliesTable
          key={`supplies-${refreshKey}`}
          search={search}
          autoCreate={autoCreateSupply}
          onAutoCreateHandled={() => setAutoCreateSupply(false)}
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
      {tab === 'kits' && (
        <KitsTable
          key={`kits-${refreshKey}`}
          search={search}
          autoCreate={autoCreateKit}
          onAutoCreateHandled={() => setAutoCreateKit(false)}
        />
      )}
      {tab === 'assets' && (
        <EquipmentTable
          key={`assets-${refreshKey}`}
          search={search}
          formOpen={assetFormOpen}
          onFormClose={() => setAssetFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'vendors' && (
        <VendorsTable
          key={`vendors-${refreshKey}`}
          search={search}
          formOpen={vendorFormOpen}
          onFormClose={() => setVendorFormOpen(false)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
