'use client';

import { useState, useCallback, useEffect } from 'react';
import { Wrench, ArrowLeftRight, KeyRound, Truck, Settings2, Plus } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import EquipmentTable from '../assets/equipment/equipment-table';
import EqAssignmentsTable from '../assets/eq-assignments/eq-assignments-table';
import KeysTable from '../assets/keys/keys-table';
import VehiclesTable from '../assets/vehicles/vehicles-table';
import MaintenanceTable from '../assets/maintenance/maintenance-table';

const TABS = [
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" /> },
  { key: 'assignments', label: 'Assignments', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'keys', label: 'Keys', icon: <KeyRound className="h-4 w-4" /> },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" /> },
  { key: 'maintenance', label: 'Maintenance', icon: <Settings2 className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  equipment: 'New Equipment',
  assignments: 'New Assignment',
  keys: 'New Key',
  vehicles: 'New Vehicle',
  maintenance: 'New Maintenance',
};

export default function EquipmentPageClient() {
  const [tab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'equipment',
    aliases: {
      'eq-assignments': 'assignments',
    },
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
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Equipment Assets</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.equipment}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Vehicles</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeVehicles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Keys Requiring Attention</p>
            <p className={`text-lg font-semibold sm:text-xl leading-tight${kpis.keysAtRisk > 0 ? ' text-warning' : ' text-muted-foreground'}`}>{kpis.keysAtRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Maintenance Due (30 days)</p>
            <p className={`text-lg font-semibold sm:text-xl leading-tight${kpis.maintenanceDueSoon > 0 ? ' text-warning' : ' text-muted-foreground'}`}>{kpis.maintenanceDueSoon}</p>
          </CardContent>
        </Card>
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

      {tab === 'equipment' && (
        <EquipmentTable
          key={`equipment-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'assignments' && (
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
