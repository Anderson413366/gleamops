'use client';

/**
 * Settings module — absorbs Admin (Epic 2.4).
 * Tabs: General (user prefs), Services, Lookups, Rules, Import
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  ClipboardList,
  Layers,
  Link2,
  BookOpen,
  Hash,
  GitBranch,
  Upload,
  Database,
  FileCog,
  FileText,
  MapPin,
  Plus,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

// User preferences (the old /settings page)
import UserPreferencesPanel from './user-preferences-panel';

// Admin tabs (from admin/)
import LookupsTable from '../admin/lookups/lookups-table';
import SequencesTable from '../admin/sequences/sequences-table';
import StatusRulesTable from '../admin/rules/status-rules-table';
import ImportPage from '../admin/import/import-page';
import TasksTable from '../services/tasks/tasks-table';
import ServiceConfig from '../services/services/service-config';
import ServiceTaskMapping from '../services/mapping/service-task-mapping';
import DataHubPanel from '../admin/data-hub/data-hub-panel';

// Absorbed from Operations (Epic 1.6)
import CustomFormsBuilder from '../operations/custom-forms/custom-forms-builder';
import TemplatesTable from '../operations/inspections/templates-table';
import GeofenceTable from '../operations/geofence/geofence-table';

const TABS = [
  { key: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'mapping', label: 'Mapping', icon: <Link2 className="h-4 w-4" /> },
  { key: 'forms', label: 'Forms', icon: <FileCog className="h-4 w-4" /> },
  { key: 'templates', label: 'Templates', icon: <FileText className="h-4 w-4" /> },
  { key: 'lookups', label: 'Lookups', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'geofences', label: 'Geofences', icon: <MapPin className="h-4 w-4" /> },
  { key: 'rules', label: 'Rules', icon: <GitBranch className="h-4 w-4" /> },
  { key: 'data-hub', label: 'Data Hub', icon: <Database className="h-4 w-4" /> },
  { key: 'sequences', label: 'Sequences', icon: <Hash className="h-4 w-4" /> },
  { key: 'import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
];

export default function SettingsPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'general',
    aliases: {
      profile: 'general',
      'task-catalog': 'tasks',
    },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const [kpis, setKpis] = useState({
    activeTasks: 0,
    activeServices: 0,
    lookupRows: 0,
    transitionRules: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAdd = () => {
    setAutoCreate(true);
  };

  const addLabel =
    tab === 'tasks' ? 'New Task'
    : tab === 'services' ? 'New Service'
    : tab === 'lookups' ? 'New Lookup'
    : '';

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [tasksRes, servicesRes, lookupsRes, rulesRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('is_active', true),
        supabase.from('services').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('lookups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('status_transitions').select('id', { count: 'exact', head: true }),
      ]);

      setKpis({
        activeTasks: tasksRes.count ?? 0,
        activeServices: servicesRes.count ?? 0,
        lookupRows: lookupsRes.count ?? 0,
        transitionRules: rulesRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Preferences, services, lookups, and system configuration</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {tab !== 'general' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Tasks</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeTasks}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Services</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeServices}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Lookup Values</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.lookupRows}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Status Transition Rules</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.transitionRules}</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        {tab !== 'general' && tab !== 'import' && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab}...`}
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
        )}
      </div>

      {tab === 'general' && <UserPreferencesPanel />}
      {tab === 'services' && (
        <ServiceConfig
          key={`services-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'tasks' && (
        <TasksTable
          key={`tasks-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'mapping' && <ServiceTaskMapping key={`mapping-${refreshKey}`} search={search} />}
      {tab === 'forms' && <CustomFormsBuilder key={`forms-${refreshKey}`} search={search} />}
      {tab === 'templates' && <TemplatesTable key={`templates-${refreshKey}`} search={search} />}
      {tab === 'lookups' && (
        <LookupsTable
          key={`lookups-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'geofences' && <GeofenceTable key={`geo-${refreshKey}`} search={search} onAdd={() => {}} onSelect={() => {}} />}
      {tab === 'rules' && <StatusRulesTable key={`rules-${refreshKey}`} search={search} />}
      {tab === 'data-hub' && <DataHubPanel key={`hub-${refreshKey}`} search={search} />}
      {tab === 'sequences' && <SequencesTable key={`seq-${refreshKey}`} search={search} />}
      {tab === 'import' && <ImportPage />}
    </div>
  );
}
