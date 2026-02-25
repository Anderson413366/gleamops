'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, MapPin, Users, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import ClientsTable from './clients/clients-table';
import SitesTable from './sites/sites-table';
import ContactsTable from './contacts/contacts-table';
import { ClientForm } from '@/components/forms/client-form';
import { SiteForm } from '@/components/forms/site-form';
import { ContactForm } from '@/components/forms/contact-form';

const TABS = [
  { key: 'clients', label: 'Clients', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
];

export default function CRMPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'clients',
  });
  const [search, setSearch] = useState('');
  const [kpis, setKpis] = useState({
    clients: 0,
    activeClients: 0,
    sites: 0,
    activeSites: 0,
    contacts: 0,
  });

  // Form state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Refresh keys
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchKpis = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [clientsRes, activeClientsRes, sitesRes, activeSitesRes, contactsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('clients').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
      supabase.from('sites').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('sites').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).is('archived_at', null),
    ]);

    setKpis({
      clients: clientsRes.count ?? 0,
      activeClients: activeClientsRes.count ?? 0,
      sites: sitesRes.count ?? 0,
      activeSites: activeSitesRes.count ?? 0,
      contacts: contactsRes.count ?? 0,
    });
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis, refreshKey]);

  const clearActionParam = useCallback((nextTab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    if (nextTab) params.set('tab', nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (actionName === 'create-client') {
      setTab('clients');
      setClientFormOpen(true);
      clearActionParam('clients');
      return;
    }
    if (actionName === 'create-site') {
      setTab('sites');
      setSiteFormOpen(true);
      clearActionParam('sites');
    }
  }, [clearActionParam, setTab]);

  useEffect(() => {
    openQuickCreate(action);
  }, [action, openQuickCreate]);

  useEffect(() => {
    function handleQuickCreate(event: Event) {
      const detail = (event as CustomEvent<{ action?: string }>).detail;
      openQuickCreate(detail?.action);
    }
    window.addEventListener('gleamops:quick-create', handleQuickCreate);
    return () => window.removeEventListener('gleamops:quick-create', handleQuickCreate);
  }, [openQuickCreate]);

  const handleAdd = () => {
    if (tab === 'clients') {
      setClientFormOpen(true);
    } else if (tab === 'sites') {
      setSiteFormOpen(true);
    } else {
      setEditContact(null);
      setContactFormOpen(true);
    }
  };

  const addLabel = tab === 'clients' ? 'New Client' : tab === 'sites' ? 'New Site' : 'New Contact';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage clients, sites, and contacts</p>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.clients}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.activeClients}</p>
            <p className="text-xs text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.sites}</p>
            <p className="text-xs text-muted-foreground">Total Sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.activeSites}</p>
            <p className="text-xs text-muted-foreground">Active Sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.contacts}</p>
            <p className="text-xs text-muted-foreground">Contacts</p>
          </CardContent>
        </Card>
      </div>

      {tab === 'clients' && (
        <ClientsTable
          key={`clients-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'sites' && (
        <SitesTable
          key={`sites-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'contacts' && (
        <ContactsTable
          key={`contacts-${refreshKey}`}
          search={search}
        />
      )}

      {/* Forms */}
      <ClientForm
        open={clientFormOpen}
        onClose={() => {
          setClientFormOpen(false);
        }}
        initialData={null}
        onSuccess={refresh}
      />
      <SiteForm
        open={siteFormOpen}
        onClose={() => {
          setSiteFormOpen(false);
        }}
        initialData={null}
        onSuccess={refresh}
      />
      <ContactForm
        open={contactFormOpen}
        onClose={() => {
          setContactFormOpen(false);
          setEditContact(null);
        }}
        initialData={editContact}
        onSuccess={refresh}
      />
    </div>
  );
}
