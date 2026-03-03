'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, MapPin, Users, Plus, MessageSquareWarning } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import ClientsTable from '../crm/clients/clients-table';
import SitesTable from '../crm/sites/sites-table';
import ContactsTable from '../crm/contacts/contacts-table';
import { ClientForm } from '@/components/forms/client-form';
import { SiteForm } from '@/components/forms/site-form';
import { ContactForm } from '@/components/forms/contact-form';

import ChangeRequestsTable from './change-requests/change-requests-table';

const TABS = [
  { key: 'clients', label: 'Clients', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
  { key: 'requests', label: 'Requests', icon: <MessageSquareWarning className="h-4 w-4" /> },
];

export default function ClientsPageClient() {
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
    pendingRequests: 0,
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
    const [clientsRes, activeClientsRes, sitesRes, activeSitesRes, contactsRes, requestsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('clients').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
      supabase.from('sites').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('sites').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'ACTIVE'),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase
        .from('alerts')
        .select('id, body')
        .eq('alert_type', 'CLIENT_CHANGE_REQUEST')
        .is('dismissed_at', null),
    ]);

    const pendingRequests = ((requestsRes.data ?? []) as Array<{ body: string | null }>).filter((row) => {
      if (!row.body) return true;
      try {
        const parsed = JSON.parse(row.body) as { manager_decision?: string };
        const decision = String(parsed.manager_decision ?? 'PENDING').toUpperCase();
        return decision !== 'APPROVED' && decision !== 'REJECTED';
      } catch {
        return true;
      }
    }).length;

    setKpis({
      clients: clientsRes.count ?? 0,
      activeClients: activeClientsRes.count ?? 0,
      sites: sitesRes.count ?? 0,
      activeSites: activeSitesRes.count ?? 0,
      contacts: contactsRes.count ?? 0,
      pendingRequests,
    });
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis, refreshKey]);

  const clearActionParam = useCallback(
    (nextTab?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('action')) return;
      params.delete('action');
      if (nextTab) params.set('tab', nextTab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openQuickCreate = useCallback(
    (actionName: string | null | undefined) => {
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
    },
    [clearActionParam, setTab],
  );

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
    } else if (tab === 'contacts') {
      setEditContact(null);
      setContactFormOpen(true);
    }
  };

  const addLabel =
    tab === 'clients'
      ? 'Add Client'
      : tab === 'sites'
        ? 'Add Site'
        : '';

  return (
    <div className="space-y-6">
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Clients</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.clients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Clients</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Sites</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.sites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending Requests</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.pendingRequests}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-56 sm:w-72 lg:w-80"
        />
        {addLabel && (
          <Button className="shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {tab === 'clients' && (
        <ClientsTable key={`clients-${refreshKey}`} search={search} />
      )}
      {tab === 'sites' && (
        <SitesTable key={`sites-${refreshKey}`} search={search} />
      )}
      {tab === 'contacts' && (
        <ContactsTable key={`contacts-${refreshKey}`} search={search} />
      )}
      {tab === 'requests' && (
        <ChangeRequestsTable key={`requests-${refreshKey}`} search={search} />
      )}
      {/* Forms */}
      <ClientForm
        open={clientFormOpen}
        onClose={() => setClientFormOpen(false)}
        initialData={null}
        onSuccess={refresh}
      />
      <SiteForm
        open={siteFormOpen}
        onClose={() => setSiteFormOpen(false)}
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
