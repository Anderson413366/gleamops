'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  Pencil,
  PauseCircle,
  PlayCircle,
  Phone,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StatusColor, Subcontractor, SubcontractorJobAssignment } from '@gleamops/shared';
import { SUBCONTRACTOR_STATUS_COLORS } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';
import { EntityLink } from '@/components/links/entity-link';
import { Badge, Button, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@gleamops/ui';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatUpdatedAgo(value: string | null | undefined): string {
  if (!value) return 'Updated recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Updated recently';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated 1 day ago';
  return `Updated ${diffDays} days ago`;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function titleCase(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(status: string | null | undefined): StatusColor {
  const normalized = (status ?? '').toUpperCase();
  return SUBCONTRACTOR_STATUS_COLORS[normalized] ?? 'gray';
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/g).filter(Boolean);
  if (parts.length === 0) return 'SC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function splitServices(value: string | null | undefined): string[] {
  if (!value) return [];
  return Array.from(new Set(
    value
      .split(/[,;|]/g)
      .map((item) => item.trim())
      .filter(Boolean)
  ));
}

function expiryMeta(value: string | null | undefined): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!value) return { label: 'Not Set', color: 'gray' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: 'Not Set', color: 'gray' };
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${formatDate(value)} (Expired)`, color: 'red' };
  if (diffDays <= 30) return { label: `${formatDate(value)} (Expiring Soon)`, color: 'yellow' };
  return { label: formatDate(value), color: 'green' };
}

function complianceSummary(subcontractor: Subcontractor): { label: string; color: 'green' | 'yellow' | 'red' } {
  const license = expiryMeta(subcontractor.license_expiry);
  const insurance = expiryMeta(subcontractor.insurance_expiry);
  const w9Good = !!subcontractor.w9_on_file;
  const hasCritical = license.color === 'red' || insurance.color === 'red' || !w9Good;
  const hasWarning = license.color === 'yellow' || insurance.color === 'yellow';
  if (hasCritical) return { label: 'Needs Attention', color: 'red' };
  if (hasWarning) return { label: 'Monitor', color: 'yellow' };
  return { label: 'Compliant', color: 'green' };
}

export default function SubcontractorDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
  const [jobs, setJobs] = useState<SubcontractorJobAssignment[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('subcontractor_code', code)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      setSubcontractor(null);
      setJobs([]);
      setLoading(false);
      return;
    }

    const record = data as unknown as Subcontractor;
    setSubcontractor(record);

    const { data: jobRows } = await supabase
      .from('v_subcontractor_job_assignments')
      .select('*')
      .eq('subcontractor_id', record.id)
      .order('start_date', { ascending: false });

    setJobs((jobRows ?? []) as unknown as SubcontractorJobAssignment[]);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusToggle = async () => {
    if (!subcontractor) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (subcontractor.status ?? '').toUpperCase() === 'INACTIVE';
    const nextStatus = isInactive ? 'ACTIVE' : 'INACTIVE';
    try {
      const { error } = await supabase
        .from('subcontractors')
        .update({
          status: nextStatus,
        })
        .eq('id', subcontractor.id)
        .eq('version_etag', subcontractor.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${subcontractor.company_name}`);
      await fetchData();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const servicesSource = (subcontractor?.services_provided
    ?? ((subcontractor as (Subcontractor & { services?: string | null }) | null)?.services)
    ?? null);
  const services = useMemo(() => splitServices(servicesSource), [servicesSource]);
  const totalRevenue = useMemo(
    () => jobs.reduce((sum, row) => sum + (row.billing_rate ?? 0), 0),
    [jobs]
  );
  const activeJobs = useMemo(
    () => jobs.filter((row) => ['ACTIVE', 'IN_PROGRESS'].includes((row.status ?? '').toUpperCase())).length,
    [jobs]
  );
  const ratedRows = useMemo(
    () => jobs.filter((row) => row.performance_score != null),
    [jobs]
  );
  const avgPerformance = useMemo(
    () => ratedRows.length > 0
      ? ratedRows.reduce((sum, row) => sum + (row.performance_score ?? 0), 0) / ratedRows.length
      : null,
    [ratedRows]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subcontractor) {
    return (
      <div className="space-y-4">
        <Link
          href="/vendors?tab=subcontractors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Subcontractor not found"
          description="The requested subcontractor record does not exist."
        />
      </div>
    );
  }

  const compliance = complianceSummary(subcontractor);
  const license = expiryMeta(subcontractor.license_expiry);
  const insurance = expiryMeta(subcontractor.insurance_expiry);
  const isInactive = (subcontractor.status ?? '').toUpperCase() === 'INACTIVE';
  const normalizedStatus = (subcontractor.status ?? 'ACTIVE').toUpperCase();
  const profileItems: CompletenessItem[] = [
    { key: 'company_name', label: 'Company Name', isComplete: isFieldComplete(subcontractor.company_name) },
    { key: 'contact_name', label: 'Contact Name', isComplete: isFieldComplete(subcontractor.contact_name) },
    { key: 'email', label: 'Email', isComplete: isFieldComplete(subcontractor.email) },
    { key: 'business_phone', label: 'Business Phone', isComplete: isFieldComplete(subcontractor.business_phone || subcontractor.phone) },
    { key: 'mobile_phone', label: 'Mobile Phone', isComplete: isFieldComplete(subcontractor.mobile_phone) },
    { key: 'services_provided', label: 'Services Offered', isComplete: isFieldComplete(servicesSource) },
    { key: 'hourly_rate', label: 'Hourly Rate', isComplete: isFieldComplete(subcontractor.hourly_rate) },
    { key: 'w9_on_file', label: 'W-9 On File', isComplete: subcontractor.w9_on_file === true },
    { key: 'license_number', label: 'License Number', isComplete: isFieldComplete(subcontractor.license_number) },
    { key: 'license_expiry', label: 'License Expiry', isComplete: isFieldComplete(subcontractor.license_expiry) },
    { key: 'insurance_expiry', label: 'Insurance Expiry', isComplete: isFieldComplete(subcontractor.insurance_expiry) },
    { key: 'payment_terms', label: 'Payment Terms', isComplete: isFieldComplete(subcontractor.payment_terms) },
    { key: 'tax_id', label: 'Tax ID', isComplete: isFieldComplete(subcontractor.tax_id) },
    { key: 'address', label: 'Business Address', isComplete: isFieldComplete(subcontractor.address) },
  ];

  const address = subcontractor.address;
  const yearsInSystem = Math.max(
    0,
    Math.floor((Date.now() - new Date(subcontractor.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365))
  );

  return (
    <div className="space-y-6">
      <Link
        href="/vendors?tab=subcontractors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendors
      </Link>

      <nav className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/vendors" className="hover:text-foreground">Vendors</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Subcontractors</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono text-foreground">{subcontractor.subcontractor_code}</span>
      </nav>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-module-accent/15 text-xl font-bold text-module-accent">
            {getInitials(subcontractor.company_name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{subcontractor.company_name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">{subcontractor.subcontractor_code}</span>
              <Badge color={statusTone(normalizedStatus)}>{`● ${normalizedStatus}`}</Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatUpdatedAgo(subcontractor.updated_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setArchiveOpen(true)}
            className={isInactive
              ? 'border-green-300 text-green-700 hover:bg-green-50'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </Button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Subcontractor Profile"
        items={profileItems}
        onNavigateToMissing={() => setFormOpen(true)}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{activeJobs}</p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatMoney(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{avgPerformance == null ? 'Not Set' : `${avgPerformance.toFixed(1)} / 5`}</p>
          <p className="text-xs text-muted-foreground">Performance Score</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Compliance Status</p>
            <Badge color={compliance.color}>{compliance.label}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            W-9 {subcontractor.w9_on_file ? 'on file' : 'missing'} · License {license.color === 'red' ? 'expired' : 'tracked'} · Insurance {insurance.color === 'red' ? 'expired' : 'tracked'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contact Info
              </span>
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Contact Name</dt>
                <dd className="font-medium text-right">{subcontractor.contact_name ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Role / Title</dt>
                <dd className="font-medium text-right">{subcontractor.contact_title ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-right">
                  {subcontractor.email ? (
                    <a href={`mailto:${subcontractor.email}`} className="inline-flex items-center gap-1 hover:underline">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {subcontractor.email}
                    </a>
                  ) : 'Not Set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Business Phone</dt>
                <dd className="font-medium text-right">
                  {subcontractor.business_phone || subcontractor.phone ? (
                    <a href={`tel:${subcontractor.business_phone ?? subcontractor.phone ?? ''}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {subcontractor.business_phone ?? subcontractor.phone}
                    </a>
                  ) : 'Not Set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd className="font-medium text-right">
                  {subcontractor.mobile_phone ? (
                    <a href={`tel:${subcontractor.mobile_phone}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {subcontractor.mobile_phone}
                    </a>
                  ) : 'Not Set'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Services &amp; Rates
              </span>
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Services Offered</dt>
                {services.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {services.map((service) => (
                      <span key={service} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        {service}
                      </span>
                    ))}
                  </div>
                ) : (
                  <dd className="mt-1 font-medium">Not Set</dd>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Hourly Rate</dt>
                <dd className="font-medium text-right">{formatMoney(subcontractor.hourly_rate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Service Areas</dt>
                <dd className="font-medium text-right">
                  {address?.city || address?.state
                    ? [address.city, address.state].filter(Boolean).join(', ')
                    : 'Not Set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Payment Terms</dt>
                <dd className="font-medium text-right">{subcontractor.payment_terms ?? 'Not Set'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Compliance &amp; Documentation
              </span>
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">W-9 Status</dt>
                <dd className="font-medium text-right inline-flex items-center gap-1">
                  {subcontractor.w9_on_file ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  {subcontractor.w9_on_file ? 'On File' : 'Missing'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">License #</dt>
                <dd className="font-medium text-right">{subcontractor.license_number ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">License Expiry</dt>
                <dd className="font-medium text-right">
                  <Badge color={license.color}>{license.label}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Insurance Certificate</dt>
                <dd className="font-medium text-right">
                  {subcontractor.insurance_policy_number ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      On File
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Not Set
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Insurance Company</dt>
                <dd className="font-medium text-right">{subcontractor.insurance_company ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Policy Number</dt>
                <dd className="font-medium text-right">{subcontractor.insurance_policy_number ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Insurance Expiry</dt>
                <dd className="font-medium text-right">
                  <Badge color={insurance.color}>{insurance.label}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Background Check</dt>
                <dd className="font-medium text-right text-muted-foreground">Not Tracked</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Business Info
              </span>
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium text-right">
                  {address ? (
                    <span className="inline-flex items-start gap-1">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {[address.street, address.city, address.state, address.zip].filter(Boolean).join(', ') || 'Not Set'}
                      </span>
                    </span>
                  ) : 'Not Set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Website</dt>
                <dd className="font-medium text-right">
                  {subcontractor.website ? (
                    <a href={subcontractor.website} target="_blank" rel="noreferrer" className="hover:underline">
                      {subcontractor.website}
                    </a>
                  ) : 'Not Set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tax ID</dt>
                <dd className="font-medium text-right">{subcontractor.tax_id ?? 'Not Set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Years in Business</dt>
                <dd className="font-medium text-right">{yearsInSystem > 0 ? `${yearsInSystem}+ years in system` : 'Not Set'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Assigned Jobs
          </span>
        </h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs assigned to this subcontractor yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Job</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Last Service</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono text-xs">
                        <EntityLink entityType="job" code={job.job_code} name={job.job_code} showCode={false} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <EntityLink entityType="job" code={job.job_code} name={job.job_name ?? job.job_code} showCode={false} />
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <EntityLink entityType="site" code={job.site_code} name={job.site_name} showCode={false} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <EntityLink entityType="client" code={job.client_code} name={job.client_name} showCode={false} />
                  </TableCell>
                  <TableCell>
                    <Badge color={statusTone(job.status)}>{titleCase(job.status)}</Badge>
                  </TableCell>
                  <TableCell>{formatMoney(job.billing_rate)}</TableCell>
                  <TableCell>
                    {job.performance_score == null ? (
                      <span className="text-muted-foreground">Not Set</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {job.performance_score.toFixed(1)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(job.last_service_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Notes</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{subcontractor.notes || 'No notes added yet.'}</p>
      </div>

      <ActivityHistorySection
        entityType="subcontractors"
        entityId={subcontractor.id}
        entityCode={subcontractor.subcontractor_code}
        notes={subcontractor.notes}
        entityUpdatedAt={subcontractor.updated_at}
        ticketScope={{ jobIds: Array.from(new Set(jobs.map((job) => job.site_job_id).filter(Boolean))) }}
      />

      <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Created: {formatDateTime(subcontractor.created_at)}</p>
        <p>Updated: {formatDateTime(subcontractor.updated_at)}</p>
      </div>

      <SubcontractorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={subcontractor}
        onSuccess={fetchData}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Subcontractor"
        entityName={subcontractor.company_name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && activeJobs > 0
          ? `⚠️ This subcontractor has ${activeJobs} active job${activeJobs === 1 ? '' : 's'} that may be affected.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
