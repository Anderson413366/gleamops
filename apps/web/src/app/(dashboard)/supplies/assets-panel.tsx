'use client';

import { useState, useEffect } from 'react';
import { Wrench, ArrowLeftRight, KeyRound, Truck, Settings2, Plus } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import EquipmentTable from '../assets/equipment/equipment-table';
import EqAssignmentsTable from '../assets/eq-assignments/eq-assignments-table';
import KeysTable from '../assets/keys/keys-table';
import VehiclesTable from '../assets/vehicles/vehicles-table';
import MaintenanceTable from '../assets/maintenance/maintenance-table';

const SUBTABS = [
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-3.5 w-3.5" /> },
  { key: 'eq-assignments', label: 'Assignments', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
  { key: 'keys', label: 'Keys', icon: <KeyRound className="h-3.5 w-3.5" /> },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-3.5 w-3.5" /> },
  { key: 'maintenance', label: 'Maintenance', icon: <Settings2 className="h-3.5 w-3.5" /> },
];

const ADD_LABELS: Record<string, string> = {
  equipment: 'New Equipment',
  'eq-assignments': 'New Assignment',
  keys: 'New Key',
  vehicles: 'New Vehicle',
  maintenance: 'New Record',
};

interface AssetsPanelProps {
  search: string;
  refreshKey: number;
  onRefresh: () => void;
}

export default function AssetsPanel({ search, refreshKey, onRefresh }: AssetsPanelProps) {
  const [subTab, setSubTab] = useState('equipment');
  const [formOpen, setFormOpen] = useState(false);
  const [kpis, setKpis] = useState({
    equipment: 0,
    activeVehicles: 0,
    keysAtRisk: 0,
    maintenanceDueSoon: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      const [equipmentRes, vehiclesRes, keysRes, maintenanceRes] = await Promise.all([
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
        keysAtRisk: keysRes.count ?? 0,
        maintenanceDueSoon: maintenanceRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  const addLabel = ADD_LABELS[subTab];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {SUBTABS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSubTab(st.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                subTab === st.key
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {st.icon}
              {st.label}
            </button>
          ))}
        </div>
        {addLabel && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Equipment</p><p className="text-lg font-semibold">{kpis.equipment}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active Vehicles</p><p className="text-lg font-semibold">{kpis.activeVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Keys at Risk</p><p className="text-lg font-semibold text-warning">{kpis.keysAtRisk}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Maint. Due (30d)</p><p className="text-lg font-semibold text-warning">{kpis.maintenanceDueSoon}</p></CardContent></Card>
      </div>

      {subTab === 'equipment' && (
        <EquipmentTable key={`eq-${refreshKey}`} search={search} formOpen={formOpen} onFormClose={() => setFormOpen(false)} onRefresh={onRefresh} />
      )}
      {subTab === 'eq-assignments' && (
        <EqAssignmentsTable key={`eqa-${refreshKey}`} search={search} formOpen={formOpen} onFormClose={() => setFormOpen(false)} onRefresh={onRefresh} />
      )}
      {subTab === 'keys' && (
        <KeysTable key={`keys-${refreshKey}`} search={search} formOpen={formOpen} onFormClose={() => setFormOpen(false)} onRefresh={onRefresh} />
      )}
      {subTab === 'vehicles' && (
        <VehiclesTable key={`veh-${refreshKey}`} search={search} formOpen={formOpen} onFormClose={() => setFormOpen(false)} onRefresh={onRefresh} />
      )}
      {subTab === 'maintenance' && (
        <MaintenanceTable key={`maint-${refreshKey}`} search={search} formOpen={formOpen} onFormClose={() => setFormOpen(false)} onRefresh={onRefresh} />
      )}
    </div>
  );
}
