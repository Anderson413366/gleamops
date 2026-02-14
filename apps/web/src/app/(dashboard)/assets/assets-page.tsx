'use client';

import { useState, useCallback } from 'react';
import { Wrench, ArrowLeftRight, KeyRound, Truck, Settings2, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

import EquipmentTable from './equipment/equipment-table';
import EqAssignmentsTable from './eq-assignments/eq-assignments-table';
import KeysTable from './keys/keys-table';
import VehiclesTable from './vehicles/vehicles-table';
import MaintenanceTable from './maintenance/maintenance-table';

const TABS = [
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" /> },
  { key: 'eq-assignments', label: 'Eq. Assignments', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'keys', label: 'Keys', icon: <KeyRound className="h-4 w-4" /> },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" /> },
  { key: 'maintenance', label: 'Maintenance', icon: <Settings2 className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  equipment: 'New Equipment',
  'eq-assignments': 'New Assignment',
  keys: 'New Key',
  vehicles: 'New Vehicle',
  maintenance: 'New Maintenance Record',
};

export default function AssetsPageClient() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = ADD_LABELS[tab];

  const handleAdd = () => {
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">Equipment, keys, vehicles, and maintenance</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'equipment' && (
        <EquipmentTable
          key={`equipment-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'eq-assignments' && (
        <EqAssignmentsTable
          key={`eq-assignments-${refreshKey}`}
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
      {tab === 'vehicles' && (
        <VehiclesTable
          key={`vehicles-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'maintenance' && (
        <MaintenanceTable
          key={`maintenance-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
