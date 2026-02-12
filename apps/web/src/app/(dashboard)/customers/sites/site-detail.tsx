'use client';

import { useEffect, useState } from 'react';
import { MapPin, Users, Pencil, Building2, Key, Shield } from 'lucide-react';
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
import type { Site, Contact } from '@gleamops/shared';

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SiteDetailProps {
  site: SiteWithClient | null;
  open: boolean;
  onClose: () => void;
  onEdit: (site: Site) => void;
}

export function SiteDetail({ site, open, onClose, onEdit }: SiteDetailProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!site || !open) return;
    setLoadingRelated(true);
    const supabase = getSupabaseBrowserClient();

    supabase
      .from('contacts')
      .select('*')
      .eq('site_id', site.id)
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        if (data) setContacts(data as unknown as Contact[]);
        setLoadingRelated(false);
      });
  }, [site, open]);

  if (!site) return null;

  const addr = site.address;

  return (
    <SlideOver open={open} onClose={onClose} title={site.name} subtitle={site.site_code} wide>
      <div className="space-y-6">
        {/* Client + Actions */}
        <div className="flex items-center justify-between">
          {site.client && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Building2 className="h-4 w-4" />
              {site.client.name}
              <span className="text-xs font-mono">({site.client.client_code})</span>
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => onEdit(site)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Address */}
        {addr && (addr.street || addr.city) && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted" />
                  Address
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {addr.street && <span className="block">{addr.street}</span>}
                {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                {addr.country && <span className="block text-muted">{addr.country}</span>}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Specs */}
        <Card>
          <CardHeader>
            <CardTitle>Specs</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Square Footage</dt>
                <dd className="font-medium">
                  {site.square_footage ? site.square_footage.toLocaleString() + ' sq ft' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Geofence Radius</dt>
                <dd className="font-medium">
                  {site.geofence_radius_meters ? site.geofence_radius_meters + ' m' : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Access & Security */}
        {(site.alarm_code || site.access_notes) && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted" />
                  Access & Security
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {site.alarm_code && (
                <div>
                  <dt className="text-xs text-muted">Alarm Code</dt>
                  <dd className="text-sm font-mono">{site.alarm_code}</dd>
                </div>
              )}
              {site.access_notes && (
                <div>
                  <dt className="text-xs text-muted">Access Notes</dt>
                  <dd className="text-sm">{site.access_notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-muted" />
                Contacts
                <Badge color="blue">{contacts.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <Skeleton className="h-8 w-full" />
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted">No contacts linked to this site.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.email || c.phone || '—'}</p>
                    </div>
                    {c.role && <Badge color="blue">{c.role}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(site.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(site.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
