'use client';

import { useState } from 'react';
import { Building2, MapPin, Users, Layers } from 'lucide-react';
import { ChipTabs, SearchInput, EmptyState } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import ClientsTable from '../crm/clients/clients-table';
import SitesTable from '../crm/sites/sites-table';
import ContactsTable from '../crm/contacts/contacts-table';

const TABS = [
  { key: 'clients', label: 'Clients', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
  { key: 'service-context', label: 'Service Context', icon: <Layers className="h-4 w-4" /> },
];

export default function CustomersPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'clients',
  });
  const [search, setSearch] = useState('');
  const [refreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customers And Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clients, Sites, Contacts, Service Context
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'clients' && <ClientsTable key={`c-${refreshKey}`} search={search} />}
      {tab === 'sites' && <SitesTable key={`s-${refreshKey}`} search={search} />}
      {tab === 'contacts' && <ContactsTable key={`ct-${refreshKey}`} search={search} />}
      {tab === 'service-context' && (
        <EmptyState
          icon={<Layers className="h-10 w-10" />}
          title="Service Context"
          description="View the full service DNA for each client and site — contracts, service plans, tasks, and quality history."
          bullets={[
            'Service plans linked to each site',
            'Active contracts with renewal dates',
            'Quality scores and inspection history',
            'Task specifications and frequencies',
          ]}
        />
      )}
    </div>
  );
}
