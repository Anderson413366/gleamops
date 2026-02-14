'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, MapPin, Users, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';

import ClientsTable from './clients/clients-table';
import SitesTable from './sites/sites-table';
import ContactsTable from './contacts/contacts-table';
import { ContactDetail } from './contacts/contact-detail';
import { ClientForm } from '@/components/forms/client-form';
import { SiteForm } from '@/components/forms/site-form';
import { ContactForm } from '@/components/forms/contact-form';

const TABS = [
  { key: 'clients', label: 'Clients', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
];

export default function CRMPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');

  // Detail drawer state (contacts still use drawer)
  const [selectedContact, setSelectedContact] = useState<(Contact & { client?: { name: string; client_code: string } | null; site?: { name: string; site_code: string } | null }) | null>(null);

  // Form state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Refresh keys
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

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
          onSelect={(c) => setSelectedContact(c)}
        />
      )}

      {/* Detail Drawer (contacts only) */}
      <ContactDetail
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={(c) => {
          setSelectedContact(null);
          setEditContact(c);
          setContactFormOpen(true);
        }}
      />

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
