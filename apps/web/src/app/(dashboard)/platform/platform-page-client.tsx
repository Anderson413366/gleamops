'use client';

import { useState } from 'react';
import { GitBranch, BookOpen, Plug, Database, Settings } from 'lucide-react';
import { ChipTabs, SearchInput, EmptyState } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StatusRulesTable from '../admin/rules/status-rules-table';
import LookupsTable from '../admin/lookups/lookups-table';
import DataHubPanel from '../admin/data-hub/data-hub-panel';

const TABS = [
  { key: 'rules', label: 'Rules', icon: <GitBranch className="h-4 w-4" /> },
  { key: 'lookups', label: 'Lookups', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { key: 'data-controls', label: 'Data Controls', icon: <Database className="h-4 w-4" /> },
  { key: 'tenant-settings', label: 'Tenant Settings', icon: <Settings className="h-4 w-4" /> },
];

export default function PlatformPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'rules',
  });
  const [search, setSearch] = useState('');
  const [refreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rules, Lookups, Integrations, Data Controls, Tenant Settings
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'rules' && <StatusRulesTable key={`r-${refreshKey}`} search={search} />}
      {tab === 'lookups' && <LookupsTable key={`l-${refreshKey}`} search={search} />}

      {tab === 'integrations' && (
        <EmptyState
          icon={<Plug className="h-10 w-10" />}
          title="Integrations"
          description="Manage third-party integrations and API connections."
          actionLabel="Checkwriters Payroll"
          onAction={() => {
            window.location.href = '/platform/integrations/checkwriters';
          }}
          bullets={[
            'Checkwriters payroll export configuration',
            'API key management',
            'Webhook endpoints',
          ]}
        />
      )}

      {tab === 'data-controls' && <DataHubPanel key={`d-${refreshKey}`} search={search} />}

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
    </div>
  );
}
