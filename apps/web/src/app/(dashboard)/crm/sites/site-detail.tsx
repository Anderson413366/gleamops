'use client';

import { useEffect, useState } from 'react';
import { MapPin, Users, Pencil, Building2, Key, Shield, Briefcase, Package, Wrench } from 'lucide-react';
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

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
  COMPLETED: 'green',
};

const CONDITION_COLORS: Record<string, 'green' | 'yellow' | 'orange' | 'red'> = {
  GOOD: 'green',
  FAIR: 'yellow',
  POOR: 'orange',
  OUT_OF_SERVICE: 'red',
};

interface SiteJobRow {
  id: string;
  job_code: string;
  frequency: string;
  billing_amount: number | null;
  status: string;
}

interface SiteSupplyRow {
  id: string;
  name: string;
  category: string | null;
}

interface EquipmentRow {
  id: string;
  name: string;
  equipment_type: string | null;
  condition: string | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

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
  const [jobs, setJobs] = useState<SiteJobRow[]>([]);
  const [supplies, setSupplies] = useState<SiteSupplyRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!site || !open) return;
    setLoadingRelated(true);
    const supabase = getSupabaseBrowserClient();

    Promise.all([
      supabase.from('contacts').select('*').eq('site_id', site.id).is('archived_at', null).order('name'),
      supabase.from('site_jobs').select('id, job_code, frequency, billing_amount, status').eq('site_id', site.id).is('archived_at', null).order('job_code'),
      supabase.from('site_supplies').select('id, name, category').eq('site_id', site.id).is('archived_at', null).order('name'),
      supabase.from('equipment').select('id, name, equipment_type, condition').eq('site_id', site.id).is('archived_at', null).order('name'),
    ]).then(([contactsRes, jobsRes, suppliesRes, equipRes]) => {
      if (contactsRes.data) setContacts(contactsRes.data as unknown as Contact[]);
      if (jobsRes.data) setJobs(jobsRes.data as unknown as SiteJobRow[]);
      if (suppliesRes.data) setSupplies(suppliesRes.data as unknown as SiteSupplyRow[]);
      if (equipRes.data) setEquipment(equipRes.data as unknown as EquipmentRow[]);
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
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
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
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </span>
              </CardTitle>
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

        {/* Specs */}
        <Card>
          <CardHeader>
            <CardTitle>Specs</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Square Footage</dt>
                <dd className="font-medium">
                  {site.square_footage ? site.square_footage.toLocaleString() + ' sq ft' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Geofence Radius</dt>
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
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Access & Security
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {site.alarm_code && (
                <div>
                  <dt className="text-xs text-muted-foreground">Alarm Code</dt>
                  <dd className="text-sm font-mono">{site.alarm_code}</dd>
                </div>
              )}
              {site.access_notes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Access Notes</dt>
                  <dd className="text-sm">{site.access_notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              <Skeleton className="h-8 w-full" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs linked to this site.</p>
            ) : (
              <ul className="divide-y divide-border">
                {jobs.map((job) => (
                  <li key={job.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{job.job_code}</p>
                      <p className="text-xs text-muted-foreground">{job.frequency} · {formatCurrency(job.billing_amount)}</p>
                    </div>
                    <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>{job.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Related Supplies */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Related Supplies
                <Badge color="blue">{supplies.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <Skeleton className="h-8 w-full" />
            ) : supplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No supplies assigned to this site.</p>
            ) : (
              <ul className="divide-y divide-border">
                {supplies.map((s) => (
                  <li key={s.id} className="py-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.category && <Badge color="blue">{s.category}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Related Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Related Equipment
                <Badge color="blue">{equipment.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelated ? (
              <Skeleton className="h-8 w-full" />
            ) : equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment assigned to this site.</p>
            ) : (
              <ul className="divide-y divide-border">
                {equipment.map((eq) => (
                  <li key={eq.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{eq.name}</p>
                      {eq.equipment_type && <p className="text-xs text-muted-foreground">{eq.equipment_type}</p>}
                    </div>
                    {eq.condition && <Badge color={CONDITION_COLORS[eq.condition] ?? 'gray'}>{eq.condition}</Badge>}
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
              <Skeleton className="h-8 w-full" />
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts linked to this site.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email || c.phone || '—'}</p>
                    </div>
                    {c.role && <Badge color="blue">{c.role}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(site.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(site.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
