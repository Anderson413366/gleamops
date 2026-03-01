'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Users, Pencil, Mail, Phone, Briefcase, FileText, Clock } from 'lucide-react';
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
import type { Client, Site, Contact } from '@gleamops/shared';
import { CLIENT_STATUS_COLORS, JOB_STATUS_COLORS } from '@gleamops/shared';
import { formatZip } from '@/lib/utils/format-zip';

interface SiteJobRow {
  id: string;
  job_code: string;
  frequency: string;
  billing_amount: number | null;
  status: string;
  site?: { name: string; site_code: string } | null;
}

interface LogRow {
  id: string;
  log_date: string;
  event_type: string;
  severity: string;
  message: string | null;
  status: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
  { key: 'sites', label: 'Sites', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
  { key: 'jobs', label: 'Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'logs', label: 'Logs', icon: <FileText className="h-4 w-4" /> },
];

interface ClientDetailProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientDetail({ client, open, onClose, onEdit }: ClientDetailProps) {
  const [tab, setTab] = useState('overview');
  const [sites, setSites] = useState<Site[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<SiteJobRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!client || !open) return;
    setTab('overview');
    setLoadingRelated(true);
    const supabase = getSupabaseBrowserClient();

    Promise.all([
      supabase.from('sites').select('*').eq('client_id', client.id).is('archived_at', null).order('name'),
      supabase.from('contacts').select('*').eq('client_id', client.id).is('archived_at', null).order('name'),
    ]).then(([sitesRes, contactsRes]) => {
      const loadedSites = (sitesRes.data ?? []) as unknown as Site[];
      setSites(loadedSites);
      if (contactsRes.data) setContacts(contactsRes.data as unknown as Contact[]);

      const siteIds = loadedSites.map((s) => s.id);
      if (siteIds.length > 0) {
        Promise.all([
          supabase
            .from('site_jobs')
            .select('id, job_code, frequency, billing_amount, status, site:site_id!site_jobs_site_id_fkey(name, site_code)')
            .in('site_id', siteIds)
            .is('archived_at', null)
            .order('job_code'),
          supabase
            .from('job_logs')
            .select('id, log_date, event_type, severity, message, status')
            .in('site_id', siteIds)
            .is('archived_at', null)
            .order('log_date', { ascending: false })
            .limit(50),
        ]).then(([jobsRes, logsRes]) => {
          if (jobsRes.data) setJobs(jobsRes.data as unknown as SiteJobRow[]);
          if (logsRes.data) setLogs(logsRes.data as unknown as LogRow[]);
          setLoadingRelated(false);
        });
      } else {
        setJobs([]);
        setLogs([]);
        setLoadingRelated(false);
      }
    });
  }, [client, open]);

  if (!client) return null;

  const addr = client.billing_address;
  const activeJobs = jobs.filter((j) => j.status === 'ACTIVE');
  const monthlyRevenue = activeJobs.reduce((sum, j) => sum + (j.billing_amount ?? 0), 0);

  return (
    <SlideOver open={open} onClose={onClose} title={client.name} subtitle={client.client_code} wide>
      <div className="space-y-4">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={CLIENT_STATUS_COLORS[client.status] ?? 'gray'}>{client.status}</Badge>
          <Button variant="secondary" size="sm" onClick={() => onEdit(client)}>
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
                  <p className="text-2xl font-bold text-foreground">{sites.length}</p>
                  <p className="text-xs text-muted-foreground">Sites</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
                  <p className="text-xs text-muted-foreground">Active Jobs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Client Details */}
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {client.client_type && (
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-medium">{client.client_type}</dd>
                    </div>
                  )}
                  {client.industry && (
                    <div>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd className="font-medium">{client.industry}</dd>
                    </div>
                  )}
                  {client.website && (
                    <div>
                      <dt className="text-muted-foreground">Website</dt>
                      <dd className="font-medium">{client.website}</dd>
                    </div>
                  )}
                  {client.payment_terms && (
                    <div>
                      <dt className="text-muted-foreground">Payment Terms</dt>
                      <dd className="font-medium">{client.payment_terms}</dd>
                    </div>
                  )}
                  {client.invoice_frequency && (
                    <div>
                      <dt className="text-muted-foreground">Invoice Frequency</dt>
                      <dd className="font-medium">{client.invoice_frequency}</dd>
                    </div>
                  )}
                  {client.credit_limit != null && (
                    <div>
                      <dt className="text-muted-foreground">Credit Limit</dt>
                      <dd className="font-medium">{formatCurrency(client.credit_limit)}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Billing Address */}
            {addr && (addr.street || addr.city) && (
              <Card>
                <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">
                    {addr.street && <span className="block">{addr.street}</span>}
                    {[addr.city, addr.state, formatZip(addr.zip)].filter(Boolean).join(', ')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contract Info */}
            {(client.contract_start_date || client.contract_end_date) && (
              <Card>
                <CardHeader><CardTitle>Contract</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {client.contract_start_date && (
                      <div>
                        <dt className="text-muted-foreground">Start</dt>
                        <dd className="font-medium">{client.contract_start_date}</dd>
                      </div>
                    )}
                    {client.contract_end_date && (
                      <div>
                        <dt className="text-muted-foreground">End</dt>
                        <dd className="font-medium">{client.contract_end_date}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Auto-Renewal</dt>
                      <dd className="font-medium">{client.auto_renewal ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Insurance Required</dt>
                      <dd className="font-medium">{client.insurance_required ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
              <p>Created: {new Date(client.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(client.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Sites Tab */}
        {tab === 'sites' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Sites <Badge color="blue">{sites.length}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRelated ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sites yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {sites.map((site) => (
                    <li key={site.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{site.name}</p>
                          <p className="text-xs text-muted-foreground">{site.site_code}</p>
                        </div>
                        <Badge color={CLIENT_STATUS_COLORS[site.status ?? ''] ?? 'gray'}>{site.status ?? 'N/A'}</Badge>
                      </div>
                      {site.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[site.address.street, site.address.city, site.address.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {site.square_footage && (
                        <p className="text-xs text-muted-foreground">{site.square_footage.toLocaleString()} sq ft</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {contacts.map((contact) => (
                    <li key={contact.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {contact.name}
                            {contact.is_primary && <Badge color="green" className="ml-2">Primary</Badge>}
                          </p>
                          {contact.role_title && <p className="text-xs text-muted-foreground">{contact.role_title}</p>}
                        </div>
                        {contact.role && <Badge color="blue">{contact.role}</Badge>}
                      </div>
                      <div className="flex gap-4 mt-1">
                        {contact.email && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        {(contact.phone || contact.mobile_phone) && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contact.mobile_phone || contact.phone}
                          </span>
                        )}
                      </div>
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
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {jobs.map((job) => (
                    <li key={job.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{job.job_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.site?.name ?? '\u2014'} ({job.site?.site_code})
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
        )}

        {/* Logs Tab */}
        {tab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Recent Logs <Badge color="blue">{logs.length}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRelated ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((log) => (
                    <li key={log.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.event_type}</p>
                          <p className="text-xs text-muted-foreground">{log.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={log.severity === 'CRITICAL' ? 'red' : log.severity === 'MAJOR' ? 'orange' : 'gray'}>{log.severity}</Badge>
                          <Badge color={log.status === 'OPEN' ? 'red' : log.status === 'RESOLVED' ? 'green' : 'yellow'}>{log.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.log_date}
                      </p>
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
