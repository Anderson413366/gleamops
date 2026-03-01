'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, Layers, Link2, BookOpen, Plus } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TasksTable from '../services/tasks/tasks-table';
import ServiceConfig from '../services/services/service-config';
import ServiceTaskMapping from '../services/mapping/service-task-mapping';
import ScopeLibraryBrowser from '../services/scope-library/scope-library-browser';

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
  { key: 'mapping', label: 'Mapping', icon: <Link2 className="h-4 w-4" /> },
  { key: 'scope-library', label: 'Scope Library', icon: <BookOpen className="h-4 w-4" /> },
];

export default function CatalogPageClient() {
  const [tab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'tasks',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const [kpisLoaded, setKpisLoaded] = useState(false);
  const [kpis, setKpis] = useState({
    activeTasks: 0,
    activeServices: 0,
    mappedTasks: 0,
    unmappedActiveTasks: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAdd = () => {
    setAutoCreate(true);
  };

  const addLabel = tab === 'tasks' ? 'New Task' : tab === 'services' ? 'New Service' : '';
  const showAddButton = tab === 'tasks' || tab === 'services';

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [tasksRes, servicesRes, mappingsRes, tasksForMappingRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('is_active', true),
        supabase.from('services').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('is_active', true),
        supabase.from('service_tasks').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('tasks').select('id').is('archived_at', null).eq('is_active', true),
      ]);

      const activeTaskIds = new Set((tasksForMappingRes.data ?? []).map((row) => row.id));
      let mappedTaskIds = new Set<string>();
      if (activeTaskIds.size > 0) {
        const { data: mappedTaskRows } = await supabase
          .from('service_tasks')
          .select('task_id')
          .in('task_id', Array.from(activeTaskIds))
          .is('archived_at', null);
        mappedTaskIds = new Set((mappedTaskRows ?? []).map((row) => row.task_id));
      }

      setKpis({
        activeTasks: tasksRes.count ?? 0,
        activeServices: servicesRes.count ?? 0,
        mappedTasks: mappingsRes.count ?? 0,
        unmappedActiveTasks: Math.max(activeTaskIds.size - mappedTaskIds.size, 0),
      });
      setKpisLoaded(true);
    }
    fetchKpis();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Tasks</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoaded ? kpis.activeTasks : '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Services</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoaded ? kpis.activeServices : '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Task-Service Mappings</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpisLoaded ? kpis.mappedTasks : '—'}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Unmapped Active Tasks</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpisLoaded ? kpis.unmappedActiveTasks : '—'}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-56 sm:w-72 lg:w-80"
        />
        {showAddButton && (
          <Button className="shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

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
        <ServiceTaskMapping
          key={`mapping-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'scope-library' && (
        <ScopeLibraryBrowser search={search} />
      )}
    </div>
  );
}
