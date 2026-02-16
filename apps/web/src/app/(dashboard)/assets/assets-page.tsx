'use client';

import { useState, useCallback, useEffect } from 'react';
import { Wrench, ArrowLeftRight, KeyRound, Truck, Settings2, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

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
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'equipment',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [kpis, setKpis] = useState({
    equipment: 0,
    activeVehicles: 0,
    keysAtRisk: 0,
    maintenanceDueSoon: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = ADD_LABELS[tab];

  const handleAdd = () => {
    setFormOpen(true);
  };

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      const [equipmentRes, vehiclesRes, keysRiskRes, maintenanceRes] = await Promise.all([
        supabase.from('equipment').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
        supabase.from('key_inventory').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['LOST', 'ASSIGNED']),
        supabase
          .from('vehicle_maintenance')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .gte('next_service_date', today.toISOString().slice(0, 10))
          .lte('next_service_date', in30Days.toISOString().slice(0, 10)),
      ]);

      setKpis({
        equipment: equipmentRes.count ?? 0,
        activeVehicles: vehiclesRes.count ?? 0,
        keysAtRisk: keysRiskRes.count ?? 0,
        maintenanceDueSoon: maintenanceRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Equipment Assets</p><p className="text-xl font-semibold">{kpis.equipment}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Vehicles</p><p className="text-xl font-semibold">{kpis.activeVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Keys Requiring Attention</p><p className="text-xl font-semibold text-warning">{kpis.keysAtRisk}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Maintenance Due in 30 Days</p><p className="text-xl font-semibold text-warning">{kpis.maintenanceDueSoon}</p></CardContent></Card>
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
