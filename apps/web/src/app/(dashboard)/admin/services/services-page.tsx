'use client';

import { useState, useCallback } from 'react';
import { ClipboardList, Layers, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

import TasksTable from './tasks/tasks-table';
import ServiceConfig from './services/service-config';

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'services', label: 'Services', icon: <Layers className="h-4 w-4" /> },
];

export default function ServicesPageClient() {
  const [tab, setTab] = useState(TABS[0].key);
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
          <p className="text-sm text-muted mt-1">Define tasks and build service templates</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

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
