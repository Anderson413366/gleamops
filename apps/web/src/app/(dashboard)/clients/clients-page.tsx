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
  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean }[]>([
    { label: 'Total Clients', value: 0 },
    { label: 'Active Clients', value: 0 },
    { label: 'Total Sites', value: 0 },
    { label: 'Pending Requests', value: 0 },
  ]);

  // Form state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Refresh keys
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchKpis = useCallback(async (activeTab: string) => {
    const supabase = getSupabaseBrowserClient();

    if (activeTab === 'contacts') {
      const [totalRes, primaryRes, emailRes, phoneRes] = await Promise.all([
        supabase.from('contacts').select('id').is('archived_at', null),
        supabase.from('contacts').select('id').is('archived_at', null).eq('is_primary', true),
        supabase.from('contacts').select('id').is('archived_at', null).not('email', 'is', null),
        supabase.from('contacts').select('id').is('archived_at', null).not('phone', 'is', null),
      ]);
      setTabKpis([
        { label: 'Total Contacts', value: totalRes.data?.length ?? 0 },
        { label: 'Primary Contacts', value: primaryRes.data?.length ?? 0 },
        { label: 'With Email', value: emailRes.data?.length ?? 0 },
        { label: 'With Phone', value: phoneRes.data?.length ?? 0 },
      ]);
    } else if (activeTab === 'requests') {
      const { data: reqData } = await supabase
        .from('alerts')
        .select('id, body')
        .eq('alert_type', 'CLIENT_CHANGE_REQUEST')
        .is('dismissed_at', null);

      let pending = 0;
      let approved = 0;
      let rejected = 0;
      for (const row of (reqData ?? []) as Array<{ body: string | null }>) {
        try {
          const parsed = row.body ? (JSON.parse(row.body) as { manager_decision?: string }) : {};
          const decision = String(parsed.manager_decision ?? 'PENDING').toUpperCase();
          if (decision === 'APPROVED') approved++;
          else if (decision === 'REJECTED') rejected++;
          else pending++;
        } catch {
          pending++;
        }
      }
      setTabKpis([
        { label: 'Open Requests', value: pending, warn: pending > 0 },
        { label: 'Approved', value: approved },
        { label: 'Rejected', value: rejected },
        { label: 'Total Requests', value: (reqData ?? []).length },
      ]);
    } else if (activeTab === 'sites') {
      const [sitesRes, activeSitesRes, clientsRes, activeClientsRes] = await Promise.all([
        supabase.from('sites').select('id').is('archived_at', null),
        supabase.from('sites').select('id').is('archived_at', null).eq('status', 'ACTIVE'),
        supabase.from('clients').select('id').is('archived_at', null),
        supabase.from('clients').select('id').is('archived_at', null).eq('status', 'ACTIVE'),
      ]);
      setTabKpis([
        { label: 'Total Sites', value: sitesRes.data?.length ?? 0 },
        { label: 'Active Sites', value: activeSitesRes.data?.length ?? 0 },
        { label: 'Total Clients', value: clientsRes.data?.length ?? 0 },
        { label: 'Active Clients', value: activeClientsRes.data?.length ?? 0 },
      ]);
    } else {
      // Default: clients tab
      const [clientsRes, activeClientsRes, sitesRes, activeSitesRes] = await Promise.all([
        supabase.from('clients').select('id').is('archived_at', null),
        supabase.from('clients').select('id').is('archived_at', null).eq('status', 'ACTIVE'),
        supabase.from('sites').select('id').is('archived_at', null),
        supabase.from('sites').select('id').is('archived_at', null).eq('status', 'ACTIVE'),
      ]);
      setTabKpis([
        { label: 'Total Clients', value: clientsRes.data?.length ?? 0 },
        { label: 'Active Clients', value: activeClientsRes.data?.length ?? 0 },
        { label: 'Total Sites', value: sitesRes.data?.length ?? 0 },
        { label: 'Active Sites', value: activeSitesRes.data?.length ?? 0 },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchKpis(tab);
  }, [tab, fetchKpis, refreshKey]);

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
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-warning' : ''}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
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
