'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  PauseCircle,
  PlayCircle,
  Globe,
  MapPin,
  Mail,
  Phone,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Client, Contact } from '@gleamops/shared';
import { CLIENT_STATUS_COLORS } from '@gleamops/shared';
import { ClientForm } from '@/components/forms/client-form';
import { ContactForm } from '@/components/forms/contact-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { EntityLink } from '@/components/links/entity-link';
import { formatZip } from '@/lib/utils/format-zip';
import { toast } from 'sonner';

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return 'Not Set';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderNotSet(variant: 'optional' | 'required' = 'optional') {
  return (
    <span className={variant === 'required'
      ? 'italic text-red-600 dark:text-red-300'
      : 'italic text-muted-foreground'}
    >
      Not Set
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getFaviconUrl(website: string): string {
  const host = website.replace(/^https?:\/\//i, '').split('/')[0];
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

function getContractHealth(start: string | null, end: string | null): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!start && !end) return { label: 'No Contract', color: 'gray' };
  const today = new Date();
  const endDate = end ? new Date(end) : null;

  if (endDate && Number.isFinite(endDate.getTime())) {
    const diffDays = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', color: 'red' };
    if (diffDays <= 30) return { label: 'Expiring Soon', color: 'yellow' };
  }

  return { label: 'Active', color: 'green' };
}

function formatRelativeDateTime(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

interface RelatedSiteRow {
  id: string;
  site_code: string;
  name: string;
  status: string | null;
  address: { street?: string; city?: string; state?: string } | null;
}

interface RelatedJobRow {
  id: string;
  site_id: string | null;
  job_code: string;
  job_name: string | null;
  status: string;
  frequency: string | null;
  schedule_days: string | null;
  start_time: string | null;
  end_time: string | null;
  priority_level: string | null;
  billing_amount: number | null;
  site?: {
    name: string;
    site_code: string;
  } | null;
}

interface JobTaskRow {
  id: string;
  job_id: string;
  task_name: string | null;
  task_code: string | null;
  planned_minutes: number | null;
}

function formatFrequency(value: string | null): string {
  if (!value) return 'Not Set';
  const normalized = value.toUpperCase();
  const map: Record<string, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Biweekly',
    MONTHLY: 'Monthly',
    '2X_WEEK': '2×/Week',
    '3X_WEEK': '3×/Week',
    '4X_WEEK': '4×/Week',
    '5X_WEEK': '5×/Week',
    '6X_WEEK': '6×/Week',
    AS_NEEDED: 'As Needed',
  };
  return map[normalized] ?? normalized.replace(/_/g, ' ');
}

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return 'Time window not set';
  const format = (time: string | null): string => {
    if (!time) return 'Not Set';
    const [hRaw, mRaw] = time.split(':');
    const h = Number.parseInt(hRaw ?? '0', 10);
    const m = mRaw ?? '00';
    if (!Number.isFinite(h)) return time;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m} ${ampm}`;
  };
  return `${format(start)} - ${format(end)}`;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [clientFormFocus, setClientFormFocus] = useState<'basics' | 'billing' | 'contract' | 'notes' | undefined>(undefined);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Related data counts
  const [siteCount, setSiteCount] = useState(0);
  const [activeSiteCount, setActiveSiteCount] = useState(0);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [relatedSites, setRelatedSites] = useState<RelatedSiteRow[]>([]);
  const [relatedJobs, setRelatedJobs] = useState<RelatedJobRow[]>([]);
  const [jobTasksByJob, setJobTasksByJob] = useState<Record<string, JobTaskRow[]>>({});
  const [showAllSites, setShowAllSites] = useState(false);

  const fetchClient = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('client_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const c = data as unknown as Client;
      setClient(c);

      // Fetch contacts for this client (for primary contact + contact list)
      setContactsLoading(true);
      const { data: contactRows } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', c.id)
        .is('archived_at', null)
        .order('is_primary', { ascending: false })
        .order('name');
      setContacts((contactRows ?? []) as unknown as Contact[]);
      setContactsLoading(false);

      // Fetch related counts
      const [sitesRes] = await Promise.all([
        supabase
          .from('sites')
          .select('id, site_code, name, status, address')
          .eq('client_id', c.id)
          .order('name')
          .is('archived_at', null),
      ]);

      const sites = (sitesRes.data ?? []) as unknown as RelatedSiteRow[];
      setRelatedSites(sites);
      setSiteCount(sites.length);
      const activeSites = sites.filter((s: { status?: string | null }) => (s.status ?? '').toUpperCase() === 'ACTIVE');
      setActiveSiteCount(activeSites.length);
      setSiteIds(sites.map((s: { id: string }) => s.id));

      if (sites.length > 0) {
        const siteIds = sites.map((s: { id: string }) => s.id);
        const { data: jobsData } = await supabase
          .from('site_jobs')
          .select('id, site_id, job_code, job_name, status, frequency, schedule_days, start_time, end_time, priority_level, billing_amount, site:site_id(name, site_code)')
          .in('site_id', siteIds)
          .order('job_code')
          .is('archived_at', null);

        const jobs = (jobsData ?? []) as unknown as RelatedJobRow[];
        setRelatedJobs(jobs);
        const active = jobs.filter(
          (j: { status: string }) => j.status === 'ACTIVE'
        );
        setActiveJobCount(active.length);
        setMonthlyRevenue(
          active.reduce(
            (sum: number, j: { billing_amount: number | null }) =>
              sum + (j.billing_amount ?? 0),
            0
          )
        );

        if (jobs.length > 0) {
          const jobIds = jobs.map((job) => job.id);
          const { data: taskRows } = await supabase
            .from('job_tasks')
            .select('id, job_id, task_name, task_code, planned_minutes')
            .in('job_id', jobIds)
            .is('archived_at', null)
            .order('task_name');

          const groupedTasks: Record<string, JobTaskRow[]> = {};
          for (const task of (taskRows ?? []) as unknown as JobTaskRow[]) {
            const key = task.job_id;
            if (!groupedTasks[key]) groupedTasks[key] = [];
            groupedTasks[key].push(task);
          }
          setJobTasksByJob(groupedTasks);
        } else {
          setJobTasksByJob({});
        }
      } else {
        setActiveJobCount(0);
        setMonthlyRevenue(0);
        setSiteIds([]);
        setActiveSiteCount(0);
        setRelatedJobs([]);
        setJobTasksByJob({});
      }
    } else {
      setRelatedSites([]);
      setRelatedJobs([]);
      setJobTasksByJob({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClient();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async () => {
    if (!client) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (client.status ?? '').toUpperCase() === 'INACTIVE';
    const nextStatus = isInactive ? 'ACTIVE' : 'INACTIVE';
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          status: nextStatus,
        })
        .eq('id', client.id)
        .eq('version_etag', client.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${client.name}`);
      await fetchClient();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const jobsBySiteId = useMemo(() => {
    const map: Record<string, RelatedJobRow[]> = {};
    for (const job of relatedJobs) {
      const key = job.site_id ?? '';
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(job);
    }
    return map;
  }, [relatedJobs]);

  const sortedSites = useMemo(() => (
    [...relatedSites].sort((a, b) => {
      const aActive = (jobsBySiteId[a.id] ?? []).filter((job) => job.status === 'ACTIVE').length;
      const bActive = (jobsBySiteId[b.id] ?? []).filter((job) => job.status === 'ACTIVE').length;
      if (aActive !== bActive) return bActive - aActive;
      return a.name.localeCompare(b.name);
    })
  ), [jobsBySiteId, relatedSites]);

  const visibleSites = showAllSites ? sortedSites : sortedSites.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Client not found.</p>
        <Link
          href="/crm"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CRM
        </Link>
      </div>
    );
  }

  const addr = client.billing_address;
  const legacyClient = client as Client & {
    contract_start?: string | null;
    contract_end?: string | null;
    phone?: string | null;
  };
  const contractStartDate = client.contract_start_date ?? legacyClient.contract_start ?? null;
  const contractEndDate = client.contract_end_date ?? legacyClient.contract_end ?? null;
  const legacyCompanyPhone = legacyClient.phone ?? null;
  const contractHealth = getContractHealth(contractStartDate, contractEndDate);
  const contractNeedsDates = !contractStartDate && !contractEndDate;
  const isInactive = (client.status ?? '').toUpperCase() === 'INACTIVE';
  const clientColor = client.status === 'PROSPECT'
    ? 'yellow'
    : (CLIENT_STATUS_COLORS[client.status] ?? 'gray');
  const clientHeaderTint = clientColor === 'green'
    ? 'bg-green-50/70 border-green-200 dark:bg-green-950/20 dark:border-green-900/50'
    : clientColor === 'yellow'
      ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
      : clientColor === 'red'
        ? 'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/50'
        : 'bg-muted/40 border-border';
  const updatedAgo = formatRelativeDateTime(client.updated_at);

  const primaryContact =
    contacts.find((c) => c.id === client.primary_contact_id) ??
    contacts.find((c) => c.is_primary) ??
    (contacts.length > 0 ? contacts[0] : null);

  const openAddContact = () => {
    setEditContact(null);
    setContactFormOpen(true);
  };

  const openEditContact = (c: Contact) => {
    setEditContact(c);
    setContactFormOpen(true);
  };

  const clientCompletenessItems: CompletenessItem[] = [
    { key: 'primary_contact', label: 'Primary Contact', isComplete: isFieldComplete(primaryContact?.name), section: 'basics' },
    {
      key: 'primary_phone',
      label: 'Primary Phone',
      isComplete: isFieldComplete(primaryContact?.work_phone || primaryContact?.mobile_phone || primaryContact?.phone || legacyCompanyPhone),
      section: 'basics',
    },
    { key: 'primary_email', label: 'Primary Email', isComplete: isFieldComplete(primaryContact?.email), section: 'basics' },
    { key: 'bill_to', label: 'Bill To Name', isComplete: isFieldComplete(client.bill_to_name), section: 'billing' },
    { key: 'payment_terms', label: 'Payment Terms', isComplete: isFieldComplete(client.payment_terms), section: 'billing' },
    { key: 'invoice_frequency', label: 'Invoice Frequency', isComplete: isFieldComplete(client.invoice_frequency), section: 'billing' },
    { key: 'billing_address', label: 'Billing Address', isComplete: isFieldComplete(client.billing_address), section: 'billing' },
    { key: 'tax_id', label: 'Tax ID', isComplete: isFieldComplete(client.tax_id), section: 'billing' },
    { key: 'contract_start', label: 'Contract Start Date', isComplete: isFieldComplete(contractStartDate), section: 'contract' },
    { key: 'contract_end', label: 'Contract End Date', isComplete: isFieldComplete(contractEndDate), section: 'contract' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>
      <div className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1">›</span>
        <Link href="/crm" className="hover:text-foreground transition-colors">CRM</Link>
        <span className="mx-1">›</span>
        <span>Clients</span>
        <span className="mx-1">›</span>
        <span className="font-mono">{client.client_code}</span>
      </div>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${clientHeaderTint}`}>
        <div className="flex items-center gap-4">
          {client.website ? (
            <img
              src={getFaviconUrl(client.website)}
              alt={`${client.name} logo`}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-module-accent/15 text-xl font-bold text-module-accent">
              {getInitials(client.name)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {client.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {client.client_code}
              </span>
              <Badge
                color={CLIENT_STATUS_COLORS[client.status] ?? 'gray'}
              >
                {client.status}
              </Badge>
              {client.client_since && (
                <Badge color="blue">{`Since ${formatDate(client.client_since)}`}</Badge>
              )}
              <Badge color="gray">{`Updated ${updatedAgo}`}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className={isInactive
              ? 'inline-flex items-center gap-2 rounded-lg border border-green-300 px-3.5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Client Profile"
        items={clientCompletenessItems}
        onNavigateToMissing={(item) => {
          setClientFormFocus((item.section as 'basics' | 'billing' | 'contract' | 'notes' | undefined) ?? 'basics');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{siteCount}</p>
          <p className="text-xs text-muted-foreground">Total Sites</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {activeJobCount}
          </p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-xs text-muted-foreground">Monthly Revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Contract Status</p>
            {contractNeedsDates && (
              <button
                type="button"
                onClick={() => { setClientFormFocus('contract'); setFormOpen(true); }}
                className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
              >
                Set dates
              </button>
            )}
          </div>
          <div className="mt-3">
            <Badge color={contractHealth.color} dot={false} className="px-4 py-2 text-sm font-semibold">
              {contractHealth.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Contact Info</h3>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Primary Contact */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Contact</p>
              {primaryContact ? (
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{primaryContact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[primaryContact.role_title, primaryContact.role].filter(Boolean).join(' · ') || 'Not Set'}
                    </p>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {primaryContact.email ? (
                      <a
                        href={`mailto:${primaryContact.email}`}
                        className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {primaryContact.email}
                      </a>
                    ) : (
                      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" /> {renderNotSet()}
                      </p>
                    )}
                    {(primaryContact.work_phone || primaryContact.mobile_phone || primaryContact.phone) ? (
                      <div className="space-y-1">
                        {(primaryContact.work_phone || primaryContact.phone) && (
                          <a
                            href={`tel:${(primaryContact.work_phone || primaryContact.phone) ?? ''}`}
                            className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Office</span>
                            <span>{primaryContact.work_phone || primaryContact.phone}</span>
                          </a>
                        )}
                        {primaryContact.mobile_phone && (
                          <a
                            href={`tel:${primaryContact.mobile_phone}`}
                            className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Mobile</span>
                            <span>{primaryContact.mobile_phone}</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" /> {renderNotSet()}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Preferred method: <span className="text-foreground">{primaryContact.preferred_contact_method ?? 'Not Set'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-muted-foreground">No contacts yet. Add the first person to call for this client.</p>
                  <button
                    type="button"
                    onClick={openAddContact}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Add First Contact
                  </button>
                </div>
              )}
            </div>

            {/* Company Info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</p>
              <dl className="mt-2 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </dt>
                  <dd className="font-medium text-right">
                    {client.website ? (
                      <a
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {client.website}
                      </a>
                    ) : renderNotSet()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-right">{client.client_type ?? renderNotSet()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="font-medium text-right">{client.industry ?? renderNotSet()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Billing Contact</dt>
                  <dd className="font-medium text-right">{client.bill_to_name ?? renderNotSet()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Billing Address
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Street</dt>
              <dd className="font-medium">{addr?.street ?? renderNotSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">City</dt>
              <dd className="font-medium">{addr?.city ?? renderNotSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">State</dt>
              <dd className="font-medium">{addr?.state ?? renderNotSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ZIP</dt>
              <dd className="font-medium">{formatZip(addr?.zip) || renderNotSet()}</dd>
            </div>
          </dl>
        </div>

        {/* Billing Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Billing Info</h3>
            <button
              type="button"
              onClick={() => { setClientFormFocus('billing'); setFormOpen(true); }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Edit billing →
            </button>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bill To Name</dt>
              <dd className="font-medium text-right">
                {client.bill_to_name ? client.bill_to_name : renderNotSet()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment Terms</dt>
              <dd className="font-medium text-right">
                {client.payment_terms ? client.payment_terms : renderNotSet()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Invoice Frequency</dt>
              <dd className="font-medium text-right">
                {client.invoice_frequency ? client.invoice_frequency : renderNotSet()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PO Required</dt>
              <dd className="font-medium">
                {client.po_required ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Credit Limit</dt>
              <dd className="font-medium text-right">
                {client.credit_limit != null ? formatCurrency(client.credit_limit) : '$0'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tax ID</dt>
              <dd className="font-medium text-right">
                {client.tax_id ? client.tax_id : renderNotSet()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contract Details */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Contract Details</h3>
            {(contractStartDate == null || contractEndDate == null) && (
              <button
                type="button"
                onClick={() => { setClientFormFocus('contract'); setFormOpen(true); }}
                className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
              >
                Set contract dates →
              </button>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Start Date</dt>
              <dd className="font-medium">
                {contractStartDate ? (
                  formatDate(contractStartDate)
                ) : (
                  renderNotSet('required')
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">End Date</dt>
              <dd className="font-medium">
                {contractEndDate ? (
                  formatDate(contractEndDate)
                ) : (
                  renderNotSet('required')
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Auto-Renewal</dt>
              <dd className="font-medium">
                {client.auto_renewal ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Insurance Required</dt>
              <dd className="font-medium">
                {client.insurance_required ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Insurance Expiry</dt>
              <dd className="font-medium">
                {client.insurance_expiry ? (
                  formatDate(client.insurance_expiry)
                ) : (
                  renderNotSet()
                )}
              </dd>
            </div>
            {legacyCompanyPhone && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Company Phone</dt>
                <dd className="font-medium">{legacyCompanyPhone}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Sites & Service Plans */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sites &amp; Service Plans</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeJobCount} active job{activeJobCount === 1 ? '' : 's'} across {siteCount} site{siteCount === 1 ? '' : 's'} · {formatCurrency(monthlyRevenue)}/mo total revenue
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge color="blue">{`${siteCount} site${siteCount === 1 ? '' : 's'}`}</Badge>
            <Link
              href={`/crm?tab=sites&client=${encodeURIComponent(client.client_code)}`}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View All Sites →
            </Link>
          </div>
        </div>

        {sortedSites.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
            No sites linked to this client yet.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {visibleSites.map((siteRow) => {
              const siteJobs = jobsBySiteId[siteRow.id] ?? [];
              const activeSiteJobs = siteJobs.filter((job) => job.status === 'ACTIVE');
              const siteRevenue = activeSiteJobs.reduce((sum, job) => sum + (job.billing_amount ?? 0), 0);
              return (
                <div key={siteRow.id} className="rounded-xl border border-border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        <EntityLink entityType="site" code={siteRow.site_code} name={siteRow.name} showCode={false} />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <EntityLink entityType="site" code={siteRow.site_code} name={siteRow.site_code} showCode={false} />
                        {' · '}
                        {[siteRow.address?.street, siteRow.address?.city, siteRow.address?.state].filter(Boolean).join(', ') || 'Address not set'}
                      </p>
                    </div>
                    <Badge color={(siteRow.status ?? '').toUpperCase() === 'ACTIVE' ? 'green' : 'gray'}>
                      {siteRow.status ?? 'Not Set'}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Jobs ({activeSiteJobs.length})
                    </p>
                    {activeSiteJobs.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No active jobs at this site.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {activeSiteJobs.map((job) => {
                          const tasks = jobTasksByJob[job.id] ?? [];
                          return (
                            <div key={job.id} className="rounded-lg border border-border bg-background p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    <EntityLink entityType="job" code={job.job_code} name={job.job_name ?? job.job_code} showCode={false} />
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <EntityLink entityType="job" code={job.job_code} name={job.job_code} showCode={false} />
                                    {' · '}
                                    {formatFrequency(job.frequency)}
                                    {' · '}
                                    {formatCurrency(job.billing_amount)}/mo
                                  </p>
                                </div>
                                {job.priority_level ? (
                                  <Badge
                                    color={
                                      job.priority_level === 'CRITICAL'
                                        ? 'red'
                                        : job.priority_level === 'HIGH'
                                          ? 'orange'
                                          : job.priority_level === 'LOW'
                                            ? 'gray'
                                            : 'blue'
                                    }
                                  >
                                    {job.priority_level}
                                  </Badge>
                                ) : null}
                              </div>

                              <details className="mt-3 rounded-md border border-border/70 bg-muted/20 p-3">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                  Task List ({tasks.length})
                                </summary>
                                {tasks.length === 0 ? (
                                  <p className="mt-2 text-xs italic text-muted-foreground">No tasks linked to this service plan yet.</p>
                                ) : (
                                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                                    {tasks.slice(0, 5).map((task) => (
                                      <li key={task.id} className="flex items-center justify-between gap-3">
                                        <span className="truncate">{task.task_name ?? task.task_code ?? 'Unnamed Task'}</span>
                                        <span className="shrink-0 text-muted-foreground">
                                          {task.planned_minutes != null ? `${task.planned_minutes} min` : ''}
                                        </span>
                                      </li>
                                    ))}
                                    {tasks.length > 5 && (
                                      <li className="text-muted-foreground">+{tasks.length - 5} more tasks (open service plan for full scope)</li>
                                    )}
                                  </ul>
                                )}
                              </details>

                              <p className="mt-2 text-xs text-muted-foreground">
                                Schedule: {job.schedule_days ? job.schedule_days : 'Days not set'} · {formatTimeWindow(job.start_time, job.end_time)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      Site Revenue: <span className="font-semibold text-foreground">{formatCurrency(siteRevenue)}/mo</span>
                    </p>
                  </div>
                </div>
              );
            })}

            {sortedSites.length > 5 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllSites((prev) => !prev)}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {showAllSites ? `Show Top 5 Sites` : `Show All ${sortedSites.length} Sites`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
            <Badge color="blue">{contacts.length}</Badge>
          </div>
          <button
            type="button"
            onClick={openAddContact}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Add Contact
          </button>
        </div>

        <div className="mt-4">
          {contactsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm font-medium text-foreground">No contacts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first contact so your team knows exactly who to call.</p>
              <button
                type="button"
                onClick={openAddContact}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Add Your First Contact
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        {c.is_primary && <Badge color="green">Primary</Badge>}
                        {c.preferred_contact_method && <Badge color="blue">{c.preferred_contact_method}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[c.role_title, c.role].filter(Boolean).join(' · ') || 'Not Set'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                            <Mail className="h-3.5 w-3.5" />
                            {c.email}
                          </a>
                        )}
                        {(c.work_phone || c.mobile_phone || c.phone) && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {c.mobile_phone || c.work_phone || c.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditContact(c)}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {client.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(client.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(client.updated_at).toLocaleDateString()}</p>
      </div>

      <ActivityHistorySection
        entityType="clients"
        entityId={client.id}
        entityCode={client.client_code}
        notes={client.notes}
        entityUpdatedAt={client.updated_at}
        ticketScope={siteIds.length ? { siteIds } : undefined}
        inspectionScope={siteIds.length ? { siteIds } : undefined}
      />

      {/* Edit Form */}
      <ClientForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setClientFormFocus(undefined); }}
        initialData={client}
        onSuccess={fetchClient}
        focusSection={clientFormFocus}
      />

      <ContactForm
        open={contactFormOpen}
        onClose={() => {
          setContactFormOpen(false);
          setEditContact(null);
        }}
        initialData={editContact}
        preselectedClientId={client.id}
        onSuccess={fetchClient}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Client"
        entityName={client.name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && (activeSiteCount > 0 || activeJobCount > 0)
          ? `⚠️ This client has ${activeSiteCount} active site${activeSiteCount === 1 ? '' : 's'} and ${activeJobCount} active job${activeJobCount === 1 ? '' : 's'} that may be affected.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
