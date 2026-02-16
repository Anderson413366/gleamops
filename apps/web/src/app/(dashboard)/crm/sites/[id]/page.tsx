'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Archive,
  Building2,
  Shield,
  AlertTriangle,
  KeyRound,
  Warehouse,
  Users,
  ExternalLink,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ArchiveDialog, Badge, Skeleton } from '@gleamops/ui';
import type { Site, Contact, Staff, KeyInventory } from '@gleamops/shared';
import { SITE_STATUS_COLORS } from '@gleamops/shared';
import { SiteForm } from '@/components/forms/site-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { toast } from 'sonner';

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
  primary_contact?: Pick<Contact, 'name' | 'role' | 'role_title' | 'email' | 'phone' | 'mobile_phone' | 'work_phone' | 'preferred_contact_method' | 'photo_url'> | null;
  emergency_contact?: Pick<Contact, 'name' | 'role' | 'role_title' | 'email' | 'phone' | 'mobile_phone' | 'work_phone' | 'preferred_contact_method' | 'photo_url'> | null;
  supervisor?: Pick<Staff, 'full_name' | 'staff_code' | 'email' | 'phone' | 'mobile_phone' | 'photo_url'> | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTime(t: string | null): string {
  if (!t) return 'Not Set';
  const parts = t.split(':');
  const h = Number.parseInt(parts[0] ?? '0', 10);
  const m = parts[1] ?? '00';
  if (!Number.isFinite(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

function notSet(v: unknown): ReactNode {
  if (v == null) return <span className="text-muted-foreground">Not Set</span>;
  if (typeof v === 'string' && v.trim() === '') return <span className="text-muted-foreground">Not Set</span>;
  return String(v);
}

function mapsSearchUrl(addr: { street?: string; city?: string; state?: string; zip?: string; country?: string } | null): string | null {
  if (!addr) return null;
  const q = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ');
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function osmStaticMapUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  // Free static map service; used only as a fallback when there is no photo_url.
  const center = `${lat},${lng}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=16&size=960x420&maptype=mapnik&markers=${center},red-pushpin`;
}

const PRIORITY_BADGE: Record<string, 'red' | 'orange' | 'blue' | 'gray' | 'yellow'> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  STANDARD: 'blue',
  LOW: 'gray',
};

const RISK_BADGE: Record<string, 'red' | 'orange' | 'blue' | 'gray' | 'yellow'> = {
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'gray',
  CRITICAL: 'red',
};

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<SiteWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [siteFormFocus, setSiteFormFocus] = useState<'basics' | 'address' | 'access' | 'service' | 'facility' | 'notes' | undefined>(undefined);

  // Related data
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [keys, setKeys] = useState<KeyInventory[]>([]);

  const fetchSite = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('sites')
      .select(`
        *,
        client:client_id(name, client_code),
        primary_contact:primary_contact_id(name, role, role_title, email, phone, mobile_phone, work_phone, preferred_contact_method, photo_url),
        emergency_contact:emergency_contact_id(name, role, role_title, email, phone, mobile_phone, work_phone, preferred_contact_method, photo_url),
        supervisor:supervisor_id(full_name, staff_code, email, phone, mobile_phone, photo_url)
      `)
      .eq('site_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const s = data as unknown as SiteWithClient;
      setSite(s);

      // Fetch related data in parallel
      const [jobsRes, equipRes, keysRes] = await Promise.all([
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
        supabase
          .from('key_inventory')
          .select('id, key_code, site_id, key_type, label, total_count, assigned_to, status, notes, tenant_id, created_at, updated_at, archived_at, archived_by, archive_reason, version_etag')
          .eq('site_id', s.id)
          .is('archived_at', null)
          .order('key_code'),
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
      setKeys((keysRes.data as unknown as KeyInventory[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSite();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async (reason: string) => {
    if (!site) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sites')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: reason,
        })
        .eq('id', site.id)
        .eq('version_etag', site.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Site archived');
      router.push('/crm?tab=sites');
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

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
  const mapsUrl = mapsSearchUrl(addr);
  const heroMapUrl = site.photo_url ? null : osmStaticMapUrl(site.geofence_center_lat, site.geofence_center_lng);
  const siteCompletenessItems: CompletenessItem[] = [
    { key: 'photo', label: 'Site Photo', isComplete: isFieldComplete(site.photo_url), section: 'basics' },
    { key: 'address', label: 'Address', isComplete: isFieldComplete(site.address), section: 'address' },
    { key: 'square_footage', label: 'Square Footage', isComplete: isFieldComplete(site.square_footage), section: 'address' },
    { key: 'alarm_code', label: 'Alarm Code', isComplete: isFieldComplete(site.alarm_code), section: 'access' },
    { key: 'security_protocol', label: 'Security Protocol', isComplete: isFieldComplete(site.security_protocol), section: 'access' },
    { key: 'entry_instructions', label: 'Entry Instructions', isComplete: isFieldComplete(site.entry_instructions), section: 'access' },
    { key: 'service_window', label: 'Service Time Window', isComplete: isFieldComplete(site.earliest_start_time) && isFieldComplete(site.latest_start_time), section: 'service' },
    { key: 'janitorial_closet', label: 'Janitorial Closet Location', isComplete: isFieldComplete(site.janitorial_closet_location), section: 'facility' },
    { key: 'dumpster', label: 'Dumpster Location', isComplete: isFieldComplete(site.dumpster_location), section: 'facility' },
    { key: 'risk_priority', label: 'Risk & Priority', isComplete: isFieldComplete(site.risk_level) && isFieldComplete(site.priority_level), section: 'facility' },
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

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {site.photo_url ? (
          <img
            src={site.photo_url}
            alt={`${site.name} photo`}
            className="h-44 w-full object-cover sm:h-56"
          />
        ) : heroMapUrl ? (
          <img
            src={heroMapUrl}
            alt={`${site.name} map`}
            className="h-44 w-full object-cover sm:h-56"
          />
        ) : (
          <div className="h-44 w-full sm:h-56 bg-gradient-to-br from-muted via-muted/60 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground truncate">{site.name}</h1>
              <Badge color={SITE_STATUS_COLORS[site.status ?? ''] ?? 'gray'}>
                {site.status ?? 'N/A'}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">{site.site_code}</span>
              {site.client?.name && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {site.client.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-background/80 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      {/* (Header moved into hero) */}

      <ProfileCompletenessCard
        title="Site Profile"
        items={siteCompletenessItems}
        onNavigateToMissing={(item) => {
          setSiteFormFocus((item.section as 'basics' | 'address' | 'access' | 'service' | 'facility' | 'notes' | undefined) ?? 'basics');
          setFormOpen(true);
        }}
      />

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
        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Address
              </span>
            </h3>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Maps
              </a>
            )}
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Street</dt>
              <dd className="font-medium text-right">{notSet(addr?.street)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">City</dt>
              <dd className="font-medium text-right">{notSet(addr?.city)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">State / ZIP</dt>
              <dd className="font-medium text-right">{notSet([addr?.state, addr?.zip].filter(Boolean).join(' '))}</dd>
            </div>
          </dl>
        </div>

        {/* Contacts */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Contact
            </span>
          </h3>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Contact</p>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{site.primary_contact?.name ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{[site.primary_contact?.role_title, site.primary_contact?.role].filter(Boolean).join(' · ') || '\u2014'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{site.primary_contact?.email ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{site.primary_contact?.mobile_phone || site.primary_contact?.work_phone || site.primary_contact?.phone || 'Not Set'}</span></p>
                  <p>Preferred: <span className="text-foreground">{site.primary_contact?.preferred_contact_method ?? 'Not Set'}</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{site.emergency_contact?.name ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{[site.emergency_contact?.role_title, site.emergency_contact?.role].filter(Boolean).join(' · ') || '\u2014'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{site.emergency_contact?.email ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{site.emergency_contact?.mobile_phone || site.emergency_contact?.work_phone || site.emergency_contact?.phone || 'Not Set'}</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site Supervisor</p>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{site.supervisor?.full_name ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{site.supervisor?.staff_code ? `Staff ${site.supervisor.staff_code}` : '\u2014'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{site.supervisor?.email ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{site.supervisor?.mobile_phone || site.supervisor?.phone || 'Not Set'}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access & Security */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Access & Security
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Earliest Start</dt>
              <dd className="font-medium text-right">{formatTime(site.earliest_start_time)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Latest Start</dt>
              <dd className="font-medium text-right">{formatTime(site.latest_start_time)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Weekend Access</dt>
              <dd className="font-medium">
                {site.weekend_access ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alarm System</dt>
              <dd className="font-medium text-right">{notSet(site.alarm_system)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alarm Code</dt>
              <dd className="font-medium font-mono text-right">{site.alarm_code ? site.alarm_code : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Security Protocol</dt>
              <dd className="font-medium text-right">{notSet(site.security_protocol)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entry Instructions</dt>
              <dd className="mt-1 font-medium">{site.entry_instructions ? site.entry_instructions : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Parking Instructions</dt>
              <dd className="mt-1 font-medium">{site.parking_instructions ? site.parking_instructions : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Access Notes</dt>
              <dd className="mt-1 font-medium">{site.access_notes ? site.access_notes : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>

            <div className="pt-3 border-t border-border">
              <dt className="text-muted-foreground">Keys On File</dt>
              {keys.length === 0 ? (
                <dd className="mt-1 text-muted-foreground">No keys linked to this site.</dd>
              ) : (
                <dd className="mt-2 space-y-2">
                  {keys.slice(0, 5).map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{k.label || k.key_code}</p>
                        <p className="text-xs text-muted-foreground font-mono">{k.key_code}</p>
                      </div>
                      <Badge color={k.status === 'LOST' ? 'red' : k.status === 'ASSIGNED' ? 'orange' : 'blue'}>
                        {k.status}
                      </Badge>
                    </div>
                  ))}
                  {keys.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{keys.length - 5} more</p>
                  )}
                </dd>
              )}
            </div>
          </dl>
        </div>

        {/* Facility Details */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              Facility Details
            </span>
          </h3>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Janitorial Closet</dt>
              <dd className="font-medium">{site.janitorial_closet_location ? site.janitorial_closet_location : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supply Storage</dt>
              <dd className="font-medium">{site.supply_storage_location ? site.supply_storage_location : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Water Source</dt>
              <dd className="font-medium">{site.water_source_location ? site.water_source_location : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dumpster</dt>
              <dd className="font-medium">{site.dumpster_location ? site.dumpster_location : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Service / Compliance + Risk / Priority + Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Service & Compliance
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Square Footage</dt>
              <dd className="font-medium text-right">{site.square_footage ? `${site.square_footage.toLocaleString()} sq ft` : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Floors</dt>
              <dd className="font-medium text-right">{site.number_of_floors ?? <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Employees On Site</dt>
              <dd className="font-medium text-right">{site.employees_on_site ?? <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">OSHA Compliance</dt>
              <dd className="font-medium text-right">{site.osha_compliance_required ? 'Required' : 'No'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Background Check</dt>
              <dd className="font-medium text-right">{site.background_check_required ? 'Required' : 'No'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Risk & Priority
            </span>
          </h3>
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Risk Level</dt>
              <dd className="font-medium text-right">
                {site.risk_level ? (
                  <Badge color={RISK_BADGE[site.risk_level] ?? 'gray'} dot={false} className="px-3 py-1">
                    {site.risk_level}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not Set</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Priority Level</dt>
              <dd className="font-medium text-right">
                {site.priority_level ? (
                  <Badge color={PRIORITY_BADGE[site.priority_level] ?? 'gray'} dot={false} className="px-3 py-1">
                    {site.priority_level}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not Set</span>
                )}
              </dd>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Critical = Red, High = Orange, Standard/Medium = Blue, Low = Gray
              </p>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <div className="text-sm">
            {site.notes ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{site.notes}</p>
            ) : (
              <p className="text-muted-foreground">No notes.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
            <p>
              Geofence center: <span className="font-mono">{site.geofence_center_lat ?? '—'}</span>, <span className="font-mono">{site.geofence_center_lng ?? '—'}</span>
            </p>
            <p>
              Geofence radius: <span className="font-mono">{site.geofence_radius_meters ?? 50}</span> m
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(site.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(site.updated_at).toLocaleDateString()}</p>
      </div>

      <ActivityHistorySection
        entityType="sites"
        entityId={site.id}
        entityCode={site.site_code}
        notes={site.notes}
        entityUpdatedAt={site.updated_at}
        ticketScope={{ siteIds: [site.id] }}
        inspectionScope={{ siteIds: [site.id] }}
      />

      {/* Edit Form */}
      <SiteForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSiteFormFocus(undefined);
        }}
        initialData={site}
        onSuccess={fetchSite}
        focusSection={siteFormFocus}
      />

      <ArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        entityName="Site"
        loading={archiveLoading}
      />
    </div>
  );
}
