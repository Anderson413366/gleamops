'use client';

import { useState, useCallback } from 'react';
import { Package, Box, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

import SuppliesTable from './supplies/supplies-table';
import KitsTable from './kits/kits-table';

const TABS = [
  { key: 'supplies', label: 'Supply Catalog', icon: <Package className="h-4 w-4" /> },
  { key: 'kits', label: 'Kits', icon: <Box className="h-4 w-4" /> },
];

export default function InventoryPageClient() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');

  // Form state (managed inside each table via SlideOver)
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // autoCreate triggers
  const [autoCreateSupply, setAutoCreateSupply] = useState(false);
  const [autoCreateKit, setAutoCreateKit] = useState(false);

  const handleAdd = () => {
    if (tab === 'supplies') {
      setAutoCreateSupply(true);
    } else {
      setAutoCreateKit(true);
    }
  };

  const addLabel = tab === 'supplies' ? 'New Supply' : 'New Kit';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage supplies and kits</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
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
      {tab === 'kits' && (
        <KitsTable
          key={`kits-${refreshKey}`}
          search={search}
          autoCreate={autoCreateKit}
          onAutoCreateHandled={() => setAutoCreateKit(false)}
        />
      )}
    </div>
  );
}
