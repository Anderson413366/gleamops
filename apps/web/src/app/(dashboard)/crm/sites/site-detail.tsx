'use client';

import { useEffect, useState } from 'react';
import { MapPin, Users, Pencil, Building2, Key, Briefcase, Package, Clock, Shield } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChipTabs,
  Skeleton,
} from '@gleamops/ui';
import type { Site, Contact } from '@gleamops/shared';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  ON_HOLD: 'yellow',
};

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'gray',
  COMPLETED: 'green',
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
  supply_id: string;
  quantity: number | null;
  supply?: { name: string; category: string | null } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
  { key: 'jobs', label: 'Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'supplies', label: 'Supplies', icon: <Package className="h-4 w-4" /> },
];

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
  const [tab, setTab] = useState('overview');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<SiteJobRow[]>([]);
  const [supplies, setSupplies] = useState<SiteSupplyRow[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!site || !open) return;
    setTab('overview');
    setLoadingRelated(true);
    const supabase = getSupabaseBrowserClient();

    Promise.all([
      supabase.from('contacts').select('*').eq('site_id', site.id).is('archived_at', null).order('name'),
      supabase.from('site_jobs').select('id, job_code, frequency, billing_amount, status').eq('site_id', site.id).is('archived_at', null).order('job_code'),
      supabase.from('site_supplies').select('id, supply_id, quantity, supply:supply_id(name, category)').eq('site_id', site.id).is('archived_at', null),
    ]).then(([contactsRes, jobsRes, suppliesRes]) => {
      if (contactsRes.data) setContacts(contactsRes.data as unknown as Contact[]);
      if (jobsRes.data) setJobs(jobsRes.data as unknown as SiteJobRow[]);
      if (suppliesRes.data) setSupplies(suppliesRes.data as unknown as SiteSupplyRow[]);
      setLoadingRelated(false);
    });
  }, [site, open]);

  if (!site) return null;

  const addr = site.address;
  const activeJobs = jobs.filter((j) => j.status === 'ACTIVE');
  const monthlyRevenue = activeJobs.reduce((sum, j) => sum + (j.billing_amount ?? 0), 0);

  return (
    <SlideOver open={open} onClose={onClose} title={site.name} subtitle={site.site_code} wide>
      <div className="space-y-4">
        {/* Client + Status + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge color={STATUS_COLORS[site.status ?? ''] ?? 'gray'}>{site.status ?? 'N/A'}</Badge>
            {site.client && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {site.client.name}
                <span className="text-xs font-mono">({site.client.client_code})</span>
              </span>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => onEdit(site)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Tabs */}
        <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
                  <p className="text-xs text-muted-foreground">Active Jobs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
                  <p className="text-xs text-muted-foreground">Contacts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                </CardContent>
              </Card>
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
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Facility Facts */}
            <Card>
              <CardHeader><CardTitle>Facility</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Square Footage</dt>
                    <dd className="font-medium">{site.square_footage ? site.square_footage.toLocaleString() + ' sq ft' : '\u2014'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Floors</dt>
                    <dd className="font-medium">{site.number_of_floors ?? '\u2014'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Employees On Site</dt>
                    <dd className="font-medium">{site.employees_on_site ?? '\u2014'}</dd>
                  </div>
                  {site.risk_level && (
                    <div>
                      <dt className="text-muted-foreground">Risk Level</dt>
                      <dd className="font-medium">{site.risk_level}</dd>
                    </div>
                  )}
                  {site.priority_level && (
                    <div>
                      <dt className="text-muted-foreground">Priority</dt>
                      <dd className="font-medium">{site.priority_level}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Access & Security */}
            {(site.alarm_code || site.alarm_system || site.entry_instructions || site.access_notes) && (
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
                  {site.alarm_system && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Alarm System</dt>
                      <dd className="text-sm">{site.alarm_system}</dd>
                    </div>
                  )}
                  {site.security_protocol && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Security Protocol</dt>
                      <dd className="text-sm">{site.security_protocol}</dd>
                    </div>
                  )}
                  {site.entry_instructions && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Entry Instructions</dt>
                      <dd className="text-sm">{site.entry_instructions}</dd>
                    </div>
                  )}
                  {site.parking_instructions && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Parking Instructions</dt>
                      <dd className="text-sm">{site.parking_instructions}</dd>
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

            {/* Service Window & Compliance */}
            {(site.earliest_start_time || site.weekend_access || site.osha_compliance_required) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Service & Compliance
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {site.earliest_start_time && (
                      <div>
                        <dt className="text-muted-foreground">Earliest Start</dt>
                        <dd className="font-medium">{site.earliest_start_time}</dd>
                      </div>
                    )}
                    {site.latest_start_time && (
                      <div>
                        <dt className="text-muted-foreground">Latest Start</dt>
                        <dd className="font-medium">{site.latest_start_time}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Weekend Access</dt>
                      <dd className="font-medium">{site.weekend_access ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">OSHA Compliance</dt>
                      <dd className="font-medium">{site.osha_compliance_required ? 'Required' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Background Check</dt>
                      <dd className="font-medium">{site.background_check_required ? 'Required' : 'No'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Facility Locations */}
            {(site.janitorial_closet_location || site.supply_storage_location || site.water_source_location || site.dumpster_location) && (
              <Card>
                <CardHeader><CardTitle>Facility Locations</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {site.janitorial_closet_location && (
                      <div>
                        <dt className="text-muted-foreground">Janitorial Closet</dt>
                        <dd className="font-medium">{site.janitorial_closet_location}</dd>
                      </div>
                    )}
                    {site.supply_storage_location && (
                      <div>
                        <dt className="text-muted-foreground">Supply Storage</dt>
                        <dd className="font-medium">{site.supply_storage_location}</dd>
                      </div>
                    )}
                    {site.water_source_location && (
                      <div>
                        <dt className="text-muted-foreground">Water Source</dt>
                        <dd className="font-medium">{site.water_source_location}</dd>
                      </div>
                    )}
                    {site.dumpster_location && (
                      <div>
                        <dt className="text-muted-foreground">Dumpster</dt>
                        <dd className="font-medium">{site.dumpster_location}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
              <p>Created: {new Date(site.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(site.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Contacts <Badge color="blue">{contacts.length}</Badge>
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
                    <li key={c.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {c.name}
                            {c.is_primary && <Badge color="green" className="ml-2">Primary</Badge>}
                          </p>
                          {c.role_title && <p className="text-xs text-muted-foreground">{c.role_title}</p>}
                        </div>
                        {c.role && <Badge color="blue">{c.role}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.email || c.mobile_phone || c.phone || '\u2014'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Jobs Tab */}
        {tab === 'jobs' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Jobs <Badge color="blue">{jobs.length}</Badge>
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
                    <li key={job.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{job.job_code}</p>
                        <p className="text-xs text-muted-foreground">{job.frequency} &middot; {formatCurrency(job.billing_amount)}</p>
                      </div>
                      <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>{job.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Supplies Tab */}
        {tab === 'supplies' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Supply Requirements <Badge color="blue">{supplies.length}</Badge>
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
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.supply?.name ?? s.supply_id}</p>
                        {s.supply?.category && <p className="text-xs text-muted-foreground">{s.supply.category}</p>}
                      </div>
                      {s.quantity != null && (
                        <span className="text-sm text-muted-foreground">Qty: {s.quantity}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SlideOver>
  );
}
