'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, MapPin, Users, Handshake, Plus, MessageSquareWarning } from 'lucide-react';
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

// Partners tab — re-use Vendors components
import SubcontractorsTable from '../vendors/subcontractors/subcontractors-table';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';
import VendorsTable from '../vendors/vendor-directory/vendors-table';
import ChangeRequestsTable from './change-requests/change-requests-table';

const TABS = [
  { key: 'clients', label: 'Clients', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
  { key: 'requests', label: 'Requests', icon: <MessageSquareWarning className="h-4 w-4" /> },
  { key: 'partners', label: 'Partners', icon: <Handshake className="h-4 w-4" /> },
];

type PartnerFilter = 'all' | 'subcontractors' | 'vendors';

export default function ClientsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'clients',
    aliases: {
      subcontractors: 'partners',
      'supply-vendors': 'partners',
    },
  });
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState<PartnerFilter>('all');
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
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
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
    } else if (tab === 'partners') {
      if (partnerFilter === 'vendors') {
        setVendorFormOpen(true);
      } else {
        setSubFormOpen(true);
      }
    }
  };

  const addLabel =
    tab === 'clients'
      ? 'Add Client'
      : tab === 'sites'
        ? 'Add Site'
      : tab === 'contacts'
          ? 'Add Contact'
          : tab === 'requests'
            ? ''
          : tab === 'partners'
            ? partnerFilter === 'vendors'
              ? 'Add Vendor'
              : 'Add Partner'
            : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clients, sites, contacts, and partners
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{kpis.pendingRequests}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>
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
      {tab === 'partners' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={partnerFilter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPartnerFilter('all')}
            >
              All
            </Button>
            <Button
              variant={partnerFilter === 'subcontractors' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPartnerFilter('subcontractors')}
            >
              Subcontractors
            </Button>
            <Button
              variant={partnerFilter === 'vendors' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPartnerFilter('vendors')}
            >
              Supply Vendors
            </Button>
          </div>
          {(partnerFilter === 'all' || partnerFilter === 'subcontractors') && (
            <div>
              {partnerFilter === 'all' && (
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Subcontractors</h3>
              )}
              <SubcontractorsTable key={`sub-${refreshKey}`} search={search} />
            </div>
          )}
          {(partnerFilter === 'all' || partnerFilter === 'vendors') && (
            <div>
              {partnerFilter === 'all' && (
                <h3 className="text-sm font-medium text-muted-foreground mb-2 mt-6">Supply Vendors</h3>
              )}
              <VendorsTable
                key={`vendors-${refreshKey}`}
                search={search}
                formOpen={vendorFormOpen}
                onFormClose={() => setVendorFormOpen(false)}
                onRefresh={refresh}
              />
            </div>
          )}
        </div>
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
      <SubcontractorForm
        open={subFormOpen}
        onClose={() => setSubFormOpen(false)}
        initialData={null}
        onSuccess={refresh}
      />
    </div>
  );
}
