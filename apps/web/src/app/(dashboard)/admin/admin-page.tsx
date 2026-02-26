'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen,
  Hash,
  GitBranch,
  Upload,
  Database,
  MapPin,
  Plus,
  BriefcaseBusiness,
  CalendarClock,
  ShieldCheck,
  Boxes,
  MonitorSmartphone,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import LookupsTable from './lookups/lookups-table';
import SequencesTable from './sequences/sequences-table';
import StatusRulesTable from './rules/status-rules-table';
import ImportPage from './import/import-page';
import DataHubPanel from './data-hub/data-hub-panel';
import GeofenceTable from '../operations/geofence/geofence-table';
import PositionTypesTable from './positions/position-types-table';
import ScheduleSettings from './schedule-settings';
import ClockInSettings from './clock-in-settings';
import InventorySettings from './inventory-settings';
import PortalSettings from './portal-settings';

const TABS = [
  { key: 'lookups', label: 'Lookups', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'position-types', label: 'Position Types', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'schedule-settings', label: 'Schedule Settings', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'clock-in-settings', label: 'Clock-In Settings', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'inventory-settings', label: 'Inventory Settings', icon: <Boxes className="h-4 w-4" /> },
  { key: 'portal-settings', label: 'Portal Settings', icon: <MonitorSmartphone className="h-4 w-4" /> },
  { key: 'geofences', label: 'Geofences', icon: <MapPin className="h-4 w-4" /> },
  { key: 'data-hub', label: 'Data Hub', icon: <Database className="h-4 w-4" /> },
  { key: 'sequences', label: 'Sequences', icon: <Hash className="h-4 w-4" /> },
  { key: 'rules', label: 'Status Rules', icon: <GitBranch className="h-4 w-4" /> },
  { key: 'import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
];

export default function AdminPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'lookups',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const [kpis, setKpis] = useState({
    lookupRows: 0,
    geofences: 0,
    templates: 0,
    transitionRules: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAdd = () => {
    setAutoCreate(true);
  };

  const addLabel = tab === 'lookups' ? 'New Lookup' : '';
  const searchEnabledTabs = new Set(['lookups', 'position-types', 'geofences', 'data-hub', 'sequences', 'rules']);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [lookupsRes, geofencesRes, templatesRes, rulesRes] = await Promise.all([
        supabase.from('lookups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('geofences').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('inspection_templates').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('status_transitions').select('id', { count: 'exact', head: true }),
      ]);

      setKpis({
        lookupRows: lookupsRes.count ?? 0,
        geofences: geofencesRes.count ?? 0,
        templates: templatesRes.count ?? 0,
        transitionRules: rulesRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System configuration center for scheduling, workforce, geofencing, inventory, and portal controls.
          </p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Lookup Values</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.lookupRows}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Geofences</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.geofences}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Templates</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.templates}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Status Transition Rules</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.transitionRules}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        {searchEnabledTabs.has(tab) && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab}...`}
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
        )}
      </div>

      {tab === 'lookups' && (
        <LookupsTable
          key={`lookups-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'position-types' && <PositionTypesTable key={`position-types-${refreshKey}`} search={search} />}
      {tab === 'schedule-settings' && <ScheduleSettings />}
      {tab === 'clock-in-settings' && <ClockInSettings />}
      {tab === 'inventory-settings' && <InventorySettings />}
      {tab === 'portal-settings' && <PortalSettings />}
      {tab === 'geofences' && (
        <GeofenceTable
          key={`geo-${refreshKey}`}
          search={search}
          onAdd={() => {}}
          onSelect={() => {}}
        />
      )}
      {tab === 'data-hub' && (
        <DataHubPanel
          key={`hub-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'sequences' && <SequencesTable key={`seq-${refreshKey}`} search={search} />}
      {tab === 'rules' && <StatusRulesTable key={`rules-${refreshKey}`} search={search} />}
      {tab === 'import' && <ImportPage />}
    </div>
  );
}
