'use client';

import { useState } from 'react';
import { Package, ShoppingCart, Box, Wrench, Truck } from 'lucide-react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
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

export default function SuppliesPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'supplies',
  });
  const [search, setSearch] = useState('');
  const [refreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supplies And Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Supplies, Orders, Kits, Assets, Vendors
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'supplies' && <SuppliesTable key={`s-${refreshKey}`} search={search} />}
      {tab === 'orders' && <OrdersTable key={`o-${refreshKey}`} search={search} />}
      {tab === 'kits' && <KitsTable key={`k-${refreshKey}`} search={search} />}
      {tab === 'assets' && <EquipmentTable key={`a-${refreshKey}`} search={search} />}
      {tab === 'vendors' && <VendorsTable key={`v-${refreshKey}`} search={search} />}
    </div>
  );
}
