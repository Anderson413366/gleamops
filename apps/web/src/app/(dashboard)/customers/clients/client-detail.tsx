'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Users, Pencil, Archive, Mail, Phone } from 'lucide-react';
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

interface ClientDetailProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientDetail({ client, open, onClose, onEdit }: ClientDetailProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
      if (sitesRes.data) setSites(sitesRes.data as unknown as Site[]);
      if (contactsRes.data) setContacts(contactsRes.data as unknown as Contact[]);
      setLoadingRelated(false);
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
