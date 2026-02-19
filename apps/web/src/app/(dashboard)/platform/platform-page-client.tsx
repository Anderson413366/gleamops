'use client';

import { useState, useCallback, useEffect } from 'react';
import { GitBranch, BookOpen, Plug, Database, Settings, ClipboardList, Layers, Link2, Hash, Upload, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StatusRulesTable from '../admin/rules/status-rules-table';
import LookupsTable from '../admin/lookups/lookups-table';
import DataHubPanel from '../admin/data-hub/data-hub-panel';
import SequencesTable from '../admin/sequences/sequences-table';
import ImportPage from '../admin/import/import-page';
import TasksTable from '../services/tasks/tasks-table';
import ServiceConfig from '../services/services/service-config';
import ServiceTaskMapping from '../services/mapping/service-task-mapping';

const TABS = [
  { key: 'rules', label: 'Rules', icon: <GitBranch className="h-4 w-4" /> },
  { key: 'lookups', label: 'Lookups', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { key: 'data-controls', label: 'Data Controls', icon: <Database className="h-4 w-4" /> },
  { key: 'tenant-settings', label: 'Tenant Settings', icon: <Settings className="h-4 w-4" /> },
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
  { key: 'mapping', label: 'Mapping', icon: <Link2 className="h-4 w-4" /> },
  { key: 'sequences', label: 'Sequences', icon: <Hash className="h-4 w-4" /> },
  { key: 'import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  tasks: 'New Task',
  services: 'New Service',
  lookups: 'New Lookup',
};

export default function PlatformPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'rules',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [kpis, setKpis] = useState({
    activeTasks: 0,
    activeServices: 0,
    lookupRows: 0,
    transitionRules: 0,
  });

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

  const addLabel = ADD_LABELS[tab] ?? '';

  const handleAdd = () => {
    setAutoCreate(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">Rules, Lookups, Integrations, Data Controls, Tenant Settings</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Tasks</p><p className="text-xl font-semibold">{kpis.activeTasks}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Services</p><p className="text-xl font-semibold">{kpis.activeServices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Lookup Values</p><p className="text-xl font-semibold">{kpis.lookupRows}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Status Transition Rules</p><p className="text-xl font-semibold">{kpis.transitionRules}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab !== 'import' && (
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
      )}

      {tab === 'rules' && <StatusRulesTable key={`rules-${refreshKey}`} search={search} />}

      {tab === 'lookups' && (
        <LookupsTable
          key={`lookups-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}

      {tab === 'integrations' && (
        <EmptyState
          icon={<Plug className="h-10 w-10" />}
          title="Integrations"
          description="Manage third-party integrations and API connections."
          actionLabel="Checkwriters Payroll"
          onAction={() => { window.location.href = '/platform/integrations/checkwriters'; }}
          bullets={[
            'Checkwriters payroll export configuration',
            'API key management',
            'Webhook endpoints',
          ]}
        />
      )}

      {tab === 'data-controls' && <DataHubPanel key={`hub-${refreshKey}`} search={search} />}

      {tab === 'tenant-settings' && (
        <EmptyState
          icon={<Settings className="h-10 w-10" />}
          title="Tenant Settings"
          description="Configure organization-wide settings and preferences."
          bullets={[
            'Company profile and branding',
            'Default timezone and locale',
            'Notification preferences',
            'Feature toggles and permissions',
          ]}
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
      {tab === 'services' && (
        <ServiceConfig
          key={`services-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'mapping' && <ServiceTaskMapping key={`mapping-${refreshKey}`} search={search} />}
      {tab === 'sequences' && <SequencesTable key={`seq-${refreshKey}`} search={search} />}
      {tab === 'import' && <ImportPage />}
    </div>
  );
}
