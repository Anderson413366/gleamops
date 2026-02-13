'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Package, Box, MapPin, ClipboardList, ShoppingCart,
  Wrench, ArrowLeftRight, KeyRound, Truck, Settings2, HardHat,
  Plus,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

// Existing supply/inventory tabs
import SuppliesTable from './supplies/supplies-table';
import KitsTable from './kits/kits-table';
import SiteAssignmentsTable from './site-assignments/site-assignments-table';
import CountsTable from './counts/counts-table';
import OrdersTable from './orders/orders-table';

// Imported from /assets/ subdirectories
import EquipmentTable from '../assets/equipment/equipment-table';
import EqAssignmentsTable from '../assets/eq-assignments/eq-assignments-table';
import KeysTable from '../assets/keys/keys-table';
import VehiclesTable from '../assets/vehicles/vehicles-table';
import MaintenanceTable from '../assets/maintenance/maintenance-table';

// Imported from /subcontractors/
import SubcontractorsTable from '../subcontractors/directory/subcontractors-table';

const TABS = [
  { key: 'supplies', label: 'Supply Catalog', icon: <Package className="h-4 w-4" /> },
  { key: 'kits', label: 'Kits', icon: <Box className="h-4 w-4" /> },
  { key: 'site-assignments', label: 'Site Assignments', icon: <MapPin className="h-4 w-4" /> },
  { key: 'counts', label: 'Counts', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" /> },
  { key: 'eq-assignments', label: 'Eq. Assignments', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'keys', label: 'Keys', icon: <KeyRound className="h-4 w-4" /> },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" /> },
  { key: 'maintenance', label: 'Maintenance', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  supplies: 'New Supply',
  kits: 'New Kit',
  keys: 'New Key',
  vehicles: 'New Vehicle',
  subcontractors: 'New Subcontractor',
};

export default function InventoryPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // autoCreate triggers
  const [autoCreateSupply, setAutoCreateSupply] = useState(false);
  const [autoCreateKit, setAutoCreateKit] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory & Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">Supplies, kits, equipment, keys, vehicles, and subcontractors</p>
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
        <CountsTable key={`counts-${refreshKey}`} search={search} />
      )}
      {tab === 'orders' && (
        <OrdersTable key={`orders-${refreshKey}`} search={search} />
      )}
      {tab === 'equipment' && (
        <EquipmentTable key={`equip-${refreshKey}`} search={search} />
      )}
      {tab === 'eq-assignments' && (
        <EqAssignmentsTable key={`eqa-${refreshKey}`} search={search} />
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
          key={`veh-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'maintenance' && (
        <MaintenanceTable key={`maint-${refreshKey}`} search={search} />
      )}
      {tab === 'subcontractors' && (
        <SubcontractorsTable key={`sub-${refreshKey}`} search={search} />
      )}
    </div>
  );
}
