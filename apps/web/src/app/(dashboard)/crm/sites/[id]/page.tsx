'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Trash2,
  Building2,
  Key,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { SITE_STATUS_COLORS } from '@gleamops/shared';
import { SiteForm } from '@/components/forms/site-form';

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<SiteWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Related data
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);

  const fetchSite = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('sites')
      .select('*, client:client_id(name, client_code)')
      .eq('site_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const s = data as unknown as SiteWithClient;
      setSite(s);

      // Fetch related data in parallel
      const [jobsRes, equipRes] = await Promise.all([
        supabase
          .from('site_jobs')
          .select('id, status, billing_amount')
          .eq('site_id', s.id)
          .is('archived_at', null),
        supabase
          .from('equipment_assignments')
          .select('id')
          .eq('site_id', s.id)
          .is('archived_at', null),
      ]);

      const jobs = jobsRes.data ?? [];
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
      setEquipmentCount(equipRes.data?.length ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSite();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Site not found.</p>
        <Link
          href="/crm"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CRM
        </Link>
      </div>
    );
  }

  const addr = site.address;

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <MapPin className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{site.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {site.site_code}
              </span>
              <Badge color={SITE_STATUS_COLORS[site.status ?? ''] ?? 'gray'}>
                {site.status ?? 'N/A'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950">
            <Trash2 className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{activeJobCount}</p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {site.square_footage
              ? site.square_footage.toLocaleString()
              : '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Square Footage</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-xs text-muted-foreground">Monthly Revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipmentCount}</p>
          <p className="text-xs text-muted-foreground">Equipment Count</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Address & Access */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address & Access
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            {addr?.street && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Street</dt>
                <dd className="font-medium">{addr.street}</dd>
              </div>
            )}
            {addr?.city && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">City</dt>
                <dd className="font-medium">{addr.city}</dd>
              </div>
            )}
            {(addr?.state || addr?.zip) && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">State / ZIP</dt>
                <dd className="font-medium">
                  {[addr?.state, addr?.zip].filter(Boolean).join(' ')}
                </dd>
              </div>
            )}
            {site.alarm_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Alarm Code</dt>
                <dd className="font-medium font-mono">{site.alarm_code}</dd>
              </div>
            )}
            {site.alarm_system && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Alarm System</dt>
                <dd className="font-medium">{site.alarm_system}</dd>
              </div>
            )}
            {site.entry_instructions && (
              <div>
                <dt className="text-muted-foreground">Entry Instructions</dt>
                <dd className="font-medium mt-1">{site.entry_instructions}</dd>
              </div>
            )}
            {site.parking_instructions && (
              <div>
                <dt className="text-muted-foreground">Parking</dt>
                <dd className="font-medium mt-1">
                  {site.parking_instructions}
                </dd>
              </div>
            )}
            {!addr?.street && !addr?.city && !site.alarm_code && (
              <p className="text-muted-foreground">No address on file.</p>
            )}
          </dl>
        </div>

        {/* Client Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Client Info
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">
                {site.client?.name ?? '\u2014'}
              </dd>
            </div>
            {site.client?.client_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Client Code</dt>
                <dd className="font-medium font-mono">
                  {site.client.client_code}
                </dd>
              </div>
            )}
            {site.risk_level && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Risk Level</dt>
                <dd className="font-medium">{site.risk_level}</dd>
              </div>
            )}
            {site.priority_level && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium">{site.priority_level}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Service Details */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Service Details
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Square Footage</dt>
              <dd className="font-medium">
                {site.square_footage
                  ? `${site.square_footage.toLocaleString()} sq ft`
                  : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Floors</dt>
              <dd className="font-medium">
                {site.number_of_floors ?? '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Employees On Site</dt>
              <dd className="font-medium">
                {site.employees_on_site ?? '\u2014'}
              </dd>
            </div>
            {site.earliest_start_time && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Earliest Start</dt>
                <dd className="font-medium">{site.earliest_start_time}</dd>
              </div>
            )}
            {site.latest_start_time && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Latest Start</dt>
                <dd className="font-medium">{site.latest_start_time}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Weekend Access</dt>
              <dd className="font-medium">
                {site.weekend_access ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">OSHA Compliance</dt>
              <dd className="font-medium">
                {site.osha_compliance_required ? 'Required' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Background Check</dt>
              <dd className="font-medium">
                {site.background_check_required ? 'Required' : 'No'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <dl className="space-y-3 text-sm">
            {site.notes ? (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {site.notes}
              </p>
            ) : (
              <p className="text-muted-foreground">No notes.</p>
            )}
            {site.access_notes && (
              <div>
                <dt className="text-muted-foreground font-medium">
                  Access Notes
                </dt>
                <dd className="mt-1">{site.access_notes}</dd>
              </div>
            )}
            {site.security_protocol && (
              <div>
                <dt className="text-muted-foreground font-medium">
                  Security Protocol
                </dt>
                <dd className="mt-1">{site.security_protocol}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Facility Locations */}
      {(site.janitorial_closet_location ||
        site.supply_storage_location ||
        site.water_source_location ||
        site.dumpster_location) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Facility Locations
          </h3>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            {site.janitorial_closet_location && (
              <div>
                <dt className="text-muted-foreground">Janitorial Closet</dt>
                <dd className="font-medium">
                  {site.janitorial_closet_location}
                </dd>
              </div>
            )}
            {site.supply_storage_location && (
              <div>
                <dt className="text-muted-foreground">Supply Storage</dt>
                <dd className="font-medium">
                  {site.supply_storage_location}
                </dd>
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
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(site.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(site.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <SiteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={site}
        onSuccess={fetchSite}
      />
    </div>
  );
}
