'use client';

import { useState, useCallback } from 'react';
import { Truck, KeyRound, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

import VehiclesTable from './vehicles/vehicles-table';
import KeysTable from './keys/keys-table';

const TABS = [
  { key: 'vehicles', label: 'Vehicle Registry', icon: <Truck className="h-4 w-4" /> },
  { key: 'keys', label: 'Key Log', icon: <KeyRound className="h-4 w-4" /> },
];

export default function AssetsPageClient() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = tab === 'vehicles' ? 'New Vehicle' : 'New Key';

  const handleAdd = () => {
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted mt-1">Vehicle Registry, Key Log</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'vehicles' && (
        <VehiclesTable
          key={`vehicles-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'keys' && (
        <KeysTable
          key={`keys-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
