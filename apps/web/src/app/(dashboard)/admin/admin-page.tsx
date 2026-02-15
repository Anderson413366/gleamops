'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Hash, GitBranch, Upload, ClipboardList, Layers, Link2, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Existing admin tabs
import LookupsTable from './lookups/lookups-table';
import SequencesTable from './sequences/sequences-table';
import StatusRulesTable from './rules/status-rules-table';
import ImportPage from './import/import-page';

// Imported from /services/ subdirectories
import TasksTable from '../services/tasks/tasks-table';
import ServiceConfig from '../services/services/service-config';
import ServiceTaskMapping from '../services/mapping/service-task-mapping';

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
  { key: 'mapping', label: 'Mapping', icon: <Link2 className="h-4 w-4" /> },
  { key: 'lookups', label: 'Lookups', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'sequences', label: 'Sequences', icon: <Hash className="h-4 w-4" /> },
  { key: 'rules', label: 'Status Rules', icon: <GitBranch className="h-4 w-4" /> },
  { key: 'import', label: 'Import', icon: <Upload className="h-4 w-4" /> },
];

export default function AdminPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
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
        supabase.from('services').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('is_active', true),
        supabase.from('lookups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('status_transitions').select('id', { count: 'exact', head: true }).is('archived_at', null),
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
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Services, tasks, lookups, and system configuration</p>
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
      {tab === 'mapping' && (
        <ServiceTaskMapping key={`mapping-${refreshKey}`} search={search} />
      )}
      {tab === 'lookups' && (
        <LookupsTable
          key={`lookups-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'sequences' && <SequencesTable key={`seq-${refreshKey}`} search={search} />}
      {tab === 'rules' && <StatusRulesTable key={`rules-${refreshKey}`} search={search} />}
      {tab === 'import' && <ImportPage />}
    </div>
  );
}
