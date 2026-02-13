'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Users, Pencil, Archive, Mail, Phone, Briefcase } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@gleamops/ui';
import type { Client, Site, Contact } from '@gleamops/shared';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'orange'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROSPECT: 'orange',
};

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
  COMPLETED: 'green',
};

interface SiteJobRow {
  id: string;
  job_code: string;
  frequency: string;
  billing_amount: number | null;
  status: string;
  site?: { name: string; site_code: string } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

interface ClientDetailProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientDetail({ client, open, onClose, onEdit }: ClientDetailProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<SiteJobRow[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!client || !open) return;
    setLoadingRelated(true);
    const supabase = getSupabaseBrowserClient();

    Promise.all([
      supabase
        .from('sites')
        .select('*')
        .eq('client_id', client.id)
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('contacts')
        .select('*')
        .eq('client_id', client.id)
        .is('archived_at', null)
        .order('name'),
    ]).then(([sitesRes, contactsRes]) => {
      const loadedSites = (sitesRes.data ?? []) as unknown as Site[];
      setSites(loadedSites);
      if (contactsRes.data) setContacts(contactsRes.data as unknown as Contact[]);

      // Fetch jobs for all client sites
      const siteIds = loadedSites.map((s) => s.id);
      if (siteIds.length > 0) {
        supabase
          .from('site_jobs')
          .select('id, job_code, frequency, billing_amount, status, site:site_id(name, site_code)')
          .in('site_id', siteIds)
          .is('archived_at', null)
          .order('job_code')
          .then(({ data }) => {
            if (data) setJobs(data as unknown as SiteJobRow[]);
            setLoadingRelated(false);
          });
      } else {
        setJobs([]);
        setLoadingRelated(false);
      }
    });
  }, [client, open]);

  if (!client) return null;

  const addr = client.billing_address;

  return (
    <SlideOver open={open} onClose={onClose} title={client.name} subtitle={client.client_code} wide>
      <div className="space-y-6">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={STATUS_COLORS[client.status] ?? 'gray'}>{client.status}</Badge>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(client)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        {/* Address */}
        {addr && (addr.street || addr.city) && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {addr.street && <span className="block">{addr.street}</span>}
                {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                {addr.country && <span className="block text-muted-foreground">{addr.country}</span>}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sites */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Sites
                <Badge color="blue">{sites.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sites.map((site) => (
                  <li key={site.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{site.site_code}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {site.address?.city ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Related Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Related Jobs
                <Badge color="blue">{jobs.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {jobs.map((job) => (
                  <li key={job.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{job.job_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.site?.name ?? '—'}{' '}
                          <span className="font-mono">({job.site?.site_code})</span>
                        </p>
                      </div>
                      <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>{job.status}</Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{job.frequency}</span>
                      <span>{formatCurrency(job.billing_amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Contacts
                <Badge color="blue">{contacts.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((contact) => (
                  <li key={contact.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{contact.name}</p>
                      {contact.role && <Badge color="blue">{contact.role}</Badge>}
                    </div>
                    <div className="flex gap-4 mt-1">
                      {contact.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(client.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(client.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
