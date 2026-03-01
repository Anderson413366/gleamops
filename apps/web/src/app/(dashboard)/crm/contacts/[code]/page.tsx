'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Mail, MapPin, Pencil, Phone, Star, UserRound } from 'lucide-react';
import { Badge, Skeleton } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Contact } from '@gleamops/shared';
import { ContactForm } from '@/components/forms/contact-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';

interface ContactWithParent extends Contact {
  client?: { name: string; client_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not Set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not Set';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(value: string | null | undefined) {
  if (!value) return 'Unknown';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 'Unknown';
  const diffMinutes = Math.floor((Date.now() - target.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function valueOrNotSet(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : 'Not Set';
}

export default function ContactDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [contact, setContact] = useState<ContactWithParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchContact = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('contacts')
      .select('*, client:clients!contacts_client_id_fkey(name, client_code), site:site_id(name, site_code)')
      .eq('contact_code', code)
      .is('archived_at', null)
      .single();

    setContact((data as ContactWithParent | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void fetchContact();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const completenessItems = useMemo<CompletenessItem[]>(() => {
    if (!contact) return [];
    return [
      { key: 'first_name', label: 'First Name', isComplete: isFieldComplete(contact.first_name), section: 'identity' },
      { key: 'last_name', label: 'Last Name', isComplete: isFieldComplete(contact.last_name), section: 'identity' },
      { key: 'contact_type', label: 'Contact Type', isComplete: isFieldComplete(contact.contact_type), section: 'identity' },
      { key: 'role_title', label: 'Role Title', isComplete: isFieldComplete(contact.role_title), section: 'identity' },
      { key: 'email', label: 'Email', isComplete: isFieldComplete(contact.email), section: 'contact' },
      { key: 'phone', label: 'Phone', isComplete: isFieldComplete(contact.mobile_phone ?? contact.work_phone ?? contact.phone), section: 'contact' },
      { key: 'preferred_contact_method', label: 'Preferred Contact Method', isComplete: isFieldComplete(contact.preferred_contact_method), section: 'contact' },
      { key: 'client_or_site', label: 'Linked Client/Site', isComplete: isFieldComplete(contact.client_id) || isFieldComplete(contact.site_id), section: 'linked' },
    ];
  }, [contact]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold text-foreground">Contact not found.</p>
        <Link
          href="/clients?tab=contacts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/clients?tab=contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      <nav className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/clients" className="hover:text-foreground transition-colors">Clients</Link>
        <span className="mx-1.5">/</span>
        <Link href="/clients?tab=contacts" className="hover:text-foreground transition-colors">Contacts</Link>
        <span className="mx-1.5">/</span>
        <span className="font-mono text-foreground">{contact.contact_code}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
            <UserRound className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{contact.contact_code}</span>
              {contact.contact_type ? <Badge color="blue">{contact.contact_type}</Badge> : null}
              {contact.role ? <Badge color="gray">{contact.role}</Badge> : null}
              {contact.is_primary ? (
                <Badge color="yellow">
                  <Star className="mr-1 h-3 w-3 fill-current" />
                  Primary
                </Badge>
              ) : null}
              <Badge color="gray">{`Updated ${formatRelative(contact.updated_at)}`}</Badge>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <ProfileCompletenessCard
        title="Contact Profile"
        items={completenessItems}
        onNavigateToMissing={() => setFormOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Contact Info
            </span>
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span>{' '}
              {contact.email ? <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline dark:text-blue-400">{contact.email}</a> : <span className="italic text-muted-foreground">Not Set</span>}
            </p>
            <p><span className="text-muted-foreground">Mobile:</span>{' '}
              {contact.mobile_phone ? <a href={`tel:${contact.mobile_phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{contact.mobile_phone}</a> : <span className="italic text-muted-foreground">Not Set</span>}
            </p>
            <p><span className="text-muted-foreground">Work Phone:</span>{' '}
              {contact.work_phone ? <a href={`tel:${contact.work_phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{contact.work_phone}</a> : <span className="italic text-muted-foreground">Not Set</span>}
            </p>
            <p><span className="text-muted-foreground">Preferred Method:</span>{' '}
              <span>{valueOrNotSet(contact.preferred_contact_method)}</span>
            </p>
            <p><span className="text-muted-foreground">Preferred Language:</span>{' '}
              <span>{valueOrNotSet(contact.preferred_language)}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Linked Records
            </span>
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Client:</span>{' '}
              {contact.client ? (
                <Link href={`/clients/${encodeURIComponent(contact.client.client_code)}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {contact.client.name} ({contact.client.client_code})
                </Link>
              ) : <span className="italic text-muted-foreground">Not Set</span>}
            </p>
            <p>
              <span className="text-muted-foreground">Site:</span>{' '}
              {contact.site ? (
                <Link href={`/clients/sites/${encodeURIComponent(contact.site.site_code)}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {contact.site.name} ({contact.site.site_code})
                </Link>
              ) : <span className="italic text-muted-foreground">Not Set</span>}
            </p>
            <p><span className="text-muted-foreground">Company:</span> <span>{valueOrNotSet(contact.company_name)}</span></p>
            <p><span className="text-muted-foreground">Role/Title:</span> <span>{valueOrNotSet(contact.role_title)}</span></p>
            <p>
              <span className="text-muted-foreground">Timezone:</span>{' '}
              <span>{valueOrNotSet(contact.timezone)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Primary Contact:</span>{' '}
              <span>{contact.is_primary ? 'Yes' : 'No'}</span>
            </p>
            {contact.site ? (
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Linked to site operations
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Notes
          </span>
        </h3>
        <p className="text-sm text-foreground">{contact.notes?.trim() ? contact.notes : 'Not Set'}</p>
      </div>

      <ActivityHistorySection
        entityType="contacts"
        entityId={contact.id}
        entityCode={contact.contact_code}
        notes={contact.notes}
        entityUpdatedAt={contact.updated_at}
      />

      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        Created: {formatDate(contact.created_at)} | Updated: {formatDate(contact.updated_at)}
      </div>

      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={contact}
        onSuccess={async () => {
          setFormOpen(false);
          await fetchContact();
        }}
      />
    </div>
  );
}

