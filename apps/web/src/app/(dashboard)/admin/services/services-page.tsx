'use client';

import { useState, useCallback } from 'react';
import { ClipboardList, Layers, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TasksTable from './tasks/tasks-table';
import ServiceConfig from './services/service-config';

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
];

export default function ServicesPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'tasks',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAdd = () => {
    setAutoCreate(true);
  };

  const addLabel = tab === 'tasks' ? 'New Task' : 'New Service';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service DNA</h1>
          <p className="text-sm text-muted-foreground mt-1">Define tasks and build service templates</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-full lg:w-80"
        />
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
    </div>
  );
}
