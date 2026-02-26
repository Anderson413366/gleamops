'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Pencil,
  PauseCircle,
  PlayCircle,
  Wrench,
  Building2,
  Shield,
  AlertTriangle,
  KeyRound,
  Warehouse,
  Users,
  ExternalLink,
  ClipboardList,
  Package,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isExternalHttpUrl } from '@/lib/url';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Site, Contact, Staff, KeyInventory } from '@gleamops/shared';
import { SITE_STATUS_COLORS } from '@gleamops/shared';
import { SiteForm } from '@/components/forms/site-form';
import { InventoryCountForm } from '@/components/forms/inventory-count-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { EntityLink } from '@/components/links/entity-link';
import { toast } from 'sonner';

interface SiteWithClient extends Site {
  // Legacy/alias fields kept for older environments so detail pages still populate.
  floors?: number | null;
  priority?: string | null;
  earliest_start?: string | null;
  latest_start?: string | null;
  janitorial_closet?: string | null;
  supply_storage?: string | null;
  water_source?: string | null;
  dumpster?: string | null;
  osha_compliance?: boolean | null;
  background_check?: boolean | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_email?: string | null;
  emergency_contact_phone?: string | null;
  site_supervisor_name?: string | null;
  site_supervisor_email?: string | null;
  site_supervisor_phone?: string | null;
  client?: { name: string; client_code: string } | null;
  primary_contact?: Pick<Contact, 'name' | 'role' | 'role_title' | 'email' | 'phone' | 'mobile_phone' | 'work_phone' | 'preferred_contact_method' | 'photo_url'> | null;
  emergency_contact?: Pick<Contact, 'name' | 'role' | 'role_title' | 'email' | 'phone' | 'mobile_phone' | 'work_phone' | 'preferred_contact_method' | 'photo_url'> | null;
  supervisor?: Pick<Staff, 'full_name' | 'staff_code' | 'email' | 'phone' | 'mobile_phone' | 'photo_url'> | null;
}

interface RelatedSiteJobRow {
  id: string;
  job_code: string;
  job_name: string | null;
  status: string;
  frequency: string | null;
  schedule_days: string | null;
  start_time: string | null;
  end_time: string | null;
  job_assigned_to: string | null;
  billing_amount: number | null;
  priority_level: string | null;
}

interface JobTaskRow {
  id: string;
  job_id: string;
  task_name: string | null;
  task_code: string | null;
  planned_minutes: number | null;
  status: string | null;
}

interface JobStaffAssignmentRow {
  id: string;
  job_id: string;
  staff?: {
    full_name: string;
    staff_code: string;
  } | null;
}

interface SiteSupplyRow {
  id: string;
  name: string;
  category: string | null;
  sds_url: string | null;
  notes: string | null;
}

interface SupplyLookupRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  preferred_vendor: string | null;
}

interface CountSummary {
  id: string;
  count_code: string;
  count_date: string;
  status: string;
  counted_by: string | null;
  counted_by_name?: string | null;
  submitted_at?: string | null;
  public_token?: string | null;
}

interface CountDetailSummary {
  id: string;
  count_id: string;
  supply_id: string;
  actual_qty: number | null;
}

interface RelatedEquipmentRow {
  id: string;
  equipment_code: string;
  name: string;
  equipment_type: string | null;
  condition: string | null;
  staff?: { full_name: string; staff_code: string } | null;
}

interface SiteFieldRequestRow {
  id: string;
  title: string;
  severity: string | null;
  body: string | null;
  created_at: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function parseBody(body: string | null | undefined): Record<string, unknown> {
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function requestSeverityColor(severity: string | null): 'red' | 'yellow' | 'blue' | 'gray' {
  if (severity === 'CRITICAL') return 'red';
  if (severity === 'WARNING') return 'yellow';
  if (severity === 'INFO') return 'blue';
  return 'gray';
}

function requestTypeLabel(value: unknown): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'Request';
  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function detailValueLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not Set';
  if (Array.isArray(value)) {
    const values = value.map((entry) => String(entry).trim()).filter(Boolean);
    return values.length ? values.join(', ') : 'Not Set';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function notSet(v: unknown): ReactNode {
  if (v == null) return <span className="italic text-muted-foreground">Not Set</span>;
  if (typeof v === 'string' && v.trim() === '') return <span className="italic text-muted-foreground">Not Set</span>;
  return String(v);
}

function parseLegacySiteNotes(notes: string | null | undefined): {
  contractType: string | null;
  geofenceCenter: string | null;
  geofenceRadius: string | null;
} {
  if (!notes) return { contractType: null, geofenceCenter: null, geofenceRadius: null };
  const read = (label: string): string | null => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = notes.match(new RegExp(`${escaped}:\\s*([^\\n\\r]+)`, 'i'));
    const raw = match?.[1]?.trim() ?? null;
    if (!raw) return null;
    if (raw === '—' || raw === '-') return null;
    return raw;
  };
  return {
    contractType: read('Contract Type'),
    geofenceCenter: read('Geofence center'),
    geofenceRadius: read('Geofence radius'),
  };
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
  const [site, setSite] = useState<SiteWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [countFormOpen, setCountFormOpen] = useState(false);
  const [siteFormFocus, setSiteFormFocus] = useState<'basics' | 'address' | 'access' | 'service' | 'facility' | 'notes' | undefined>(undefined);

  // Related data
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [keys, setKeys] = useState<KeyInventory[]>([]);
  const [relatedJobs, setRelatedJobs] = useState<RelatedSiteJobRow[]>([]);
  const [relatedEquipment, setRelatedEquipment] = useState<RelatedEquipmentRow[]>([]);
  const [fieldRequests, setFieldRequests] = useState<SiteFieldRequestRow[]>([]);
  const [jobTasksByJob, setJobTasksByJob] = useState<Record<string, JobTaskRow[]>>({});
  const [jobStaffByJob, setJobStaffByJob] = useState<Record<string, JobStaffAssignmentRow[]>>({});
  const [expandedJobs, setExpandedJobs] = useState<string[]>([]);
  const [siteSupplies, setSiteSupplies] = useState<SiteSupplyRow[]>([]);
  const [supplyCategoryFilter, setSupplyCategoryFilter] = useState('all');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState('all');
  const [supplyVendorFilter, setSupplyVendorFilter] = useState('all');
  const [latestCount, setLatestCount] = useState<CountSummary | null>(null);
  const [latestCountedByName, setLatestCountedByName] = useState<string | null>(null);
  const [supplyLookupByName, setSupplyLookupByName] = useState<Record<string, SupplyLookupRow>>({});
  const [supplyLookupById, setSupplyLookupById] = useState<Record<string, SupplyLookupRow>>({});
  const [latestCountQtyBySupplyId, setLatestCountQtyBySupplyId] = useState<Record<string, number>>({});
  const [countHistory, setCountHistory] = useState<CountSummary[]>([]);
  const [countDetailsByCountId, setCountDetailsByCountId] = useState<Record<string, CountDetailSummary[]>>({});
  const [expandedCountIds, setExpandedCountIds] = useState<string[]>([]);

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
      const [jobsRes, equipRes, keysRes, siteSuppliesRes, countHistoryRes, supplyCatalogRes, fieldRequestsRes] = await Promise.all([
        supabase
          .from('site_jobs')
          .select('id, job_code, job_name, status, frequency, schedule_days, start_time, end_time, job_assigned_to, billing_amount, priority_level')
          .eq('site_id', s.id)
          .order('job_code'),
        supabase
          .from('equipment')
          .select('id, equipment_code, name, equipment_type, condition, staff:assigned_to(full_name, staff_code)')
          .eq('site_id', s.id)
          .is('archived_at', null),
        supabase
          .from('key_inventory')
          .select('id, key_code, site_id, key_type, label, total_count, assigned_to, status, notes, tenant_id, created_at, updated_at, archived_at, archived_by, archive_reason, version_etag')
          .eq('site_id', s.id)
          .is('archived_at', null)
          .order('key_code'),
        supabase
          .from('site_supplies')
          .select('id, name, category, sds_url, notes')
          .eq('site_id', s.id)
          .is('archived_at', null)
          .order('category')
          .order('name'),
        supabase
          .from('inventory_counts')
          .select('id, count_code, count_date, status, counted_by, counted_by_name, submitted_at, public_token')
          .eq('site_id', s.id)
          .is('archived_at', null)
          .order('count_date', { ascending: false })
          .limit(5),
        supabase
          .from('supply_catalog')
          .select('id, code, name, category, unit, preferred_vendor')
          .is('archived_at', null),
        supabase
          .from('alerts')
          .select('id, title, severity, body, created_at')
          .eq('alert_type', 'FIELD_REQUEST')
          .eq('entity_type', 'site')
          .eq('entity_id', s.id)
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      const jobs = (jobsRes.data ?? []) as unknown as RelatedSiteJobRow[];
      setRelatedJobs(jobs);
      setExpandedJobs(jobs.length > 0 ? [jobs[0].id] : []);
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
      const equipment = (equipRes.data ?? []) as unknown as RelatedEquipmentRow[];
      setRelatedEquipment(equipment);
      setEquipmentCount(equipment.length);
      setFieldRequests((fieldRequestsRes.data ?? []) as unknown as SiteFieldRequestRow[]);
      setKeys((keysRes.data as unknown as KeyInventory[]) ?? []);
      setSiteSupplies((siteSuppliesRes.data as unknown as SiteSupplyRow[]) ?? []);
      const lookupByName: Record<string, SupplyLookupRow> = {};
      const lookupById: Record<string, SupplyLookupRow> = {};
      for (const supply of ((supplyCatalogRes.data ?? []) as unknown as SupplyLookupRow[])) {
        lookupByName[supply.name.trim().toLowerCase()] = supply;
        lookupById[supply.id] = supply;
      }
      setSupplyLookupByName(lookupByName);
      setSupplyLookupById(lookupById);

      const history = ((countHistoryRes.data ?? []) as CountSummary[]) ?? [];
      setCountHistory(history);
      setExpandedCountIds(history.length > 0 ? [history[0].id] : []);
      const latest = (history[0] ?? null) as CountSummary | null;
      setLatestCount(latest);
      if (latest?.counted_by) {
        const { data: counter } = await supabase
          .from('staff')
          .select('full_name')
          .eq('id', latest.counted_by)
          .is('archived_at', null)
          .maybeSingle();
        setLatestCountedByName((counter as { full_name?: string } | null)?.full_name ?? null);
      } else if (latest?.counted_by_name) {
        setLatestCountedByName(latest.counted_by_name);
      } else {
        setLatestCountedByName(null);
      }

      if (history.length > 0) {
        const countIds = history.map((count) => count.id);
        const { data: countDetailRows } = await supabase
          .from('inventory_count_details')
          .select('id, count_id, supply_id, actual_qty')
          .in('count_id', countIds)
          .is('archived_at', null);

        const groupedCountDetails: Record<string, CountDetailSummary[]> = {};
        const qtyBySupplyId: Record<string, number> = {};
        for (const detail of ((countDetailRows ?? []) as unknown as CountDetailSummary[])) {
          if (!groupedCountDetails[detail.count_id]) groupedCountDetails[detail.count_id] = [];
          groupedCountDetails[detail.count_id].push(detail);
          if (latest && detail.count_id === latest.id) {
            qtyBySupplyId[detail.supply_id] = Number(detail.actual_qty ?? 0);
          }
        }
        setCountDetailsByCountId(groupedCountDetails);
        setLatestCountQtyBySupplyId(qtyBySupplyId);
      } else {
        setCountDetailsByCountId({});
        setLatestCountQtyBySupplyId({});
      }

      if (jobs.length > 0) {
        const jobIds = jobs.map((job) => job.id);
        const [taskRowsRes, assignmentRowsRes] = await Promise.all([
          supabase
            .from('job_tasks')
            .select('id, job_id, task_name, task_code, planned_minutes, status')
            .in('job_id', jobIds)
            .is('archived_at', null)
            .order('task_name'),
          supabase
            .from('job_staff_assignments')
            .select('id, job_id, staff:staff_id(full_name, staff_code)')
            .in('job_id', jobIds)
            .is('archived_at', null),
        ]);

        const groupedTasks: Record<string, JobTaskRow[]> = {};
        for (const task of (taskRowsRes.data ?? []) as unknown as JobTaskRow[]) {
          if (!groupedTasks[task.job_id]) groupedTasks[task.job_id] = [];
          groupedTasks[task.job_id].push(task);
        }
        setJobTasksByJob(groupedTasks);

        const groupedStaff: Record<string, JobStaffAssignmentRow[]> = {};
        for (const assignment of (assignmentRowsRes.data ?? []) as unknown as JobStaffAssignmentRow[]) {
          if (!groupedStaff[assignment.job_id]) groupedStaff[assignment.job_id] = [];
          groupedStaff[assignment.job_id].push(assignment);
        }
        setJobStaffByJob(groupedStaff);
      } else {
        setJobTasksByJob({});
        setJobStaffByJob({});
      }
    } else {
      setRelatedJobs([]);
      setRelatedEquipment([]);
      setFieldRequests([]);
      setSiteSupplies([]);
      setLatestCount(null);
      setLatestCountedByName(null);
      setSupplyLookupByName({});
      setSupplyLookupById({});
      setLatestCountQtyBySupplyId({});
      setCountHistory([]);
      setCountDetailsByCountId({});
      setExpandedCountIds([]);
      setJobTasksByJob({});
      setJobStaffByJob({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSite();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async () => {
    if (!site) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (site.status ?? '').toUpperCase() === 'INACTIVE';
    const nextStatus = isInactive ? 'ACTIVE' : 'INACTIVE';
    try {
      const { error } = await supabase
        .from('sites')
        .update({
          status: nextStatus,
          status_date: new Date().toISOString(),
        })
        .eq('id', site.id)
        .eq('version_etag', site.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${site.name}`);
      await fetchSite();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const activeServicePlans = useMemo(
    () => relatedJobs.filter((job) => job.status === 'ACTIVE'),
    [relatedJobs]
  );
  const assignedStaffCount = useMemo(() => {
    const assigned = new Set<string>();
    for (const job of activeServicePlans) {
      const staff = jobStaffByJob[job.id] ?? [];
      for (const row of staff) {
        const key = row.staff?.staff_code ?? row.staff?.full_name ?? null;
        if (key) assigned.add(key);
      }
    }
    return assigned.size;
  }, [activeServicePlans, jobStaffByJob]);

  const supplyCategories = useMemo(() => {
    const values = new Set<string>();
    for (const supply of siteSupplies) {
      const matchedSupply = supplyLookupByName[supply.name.trim().toLowerCase()];
      const category = supply.category ?? matchedSupply?.category ?? null;
      if (category) values.add(category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [siteSupplies, supplyLookupByName]);

  const supplyTypes = useMemo(() => {
    const values = new Set<string>();
    for (const supply of siteSupplies) {
      const matchedSupply = supplyLookupByName[supply.name.trim().toLowerCase()];
      if (matchedSupply?.unit) values.add(matchedSupply.unit);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [siteSupplies, supplyLookupByName]);

  const supplyVendors = useMemo(() => {
    const values = new Set<string>();
    for (const supply of siteSupplies) {
      const matchedSupply = supplyLookupByName[supply.name.trim().toLowerCase()];
      if (matchedSupply?.preferred_vendor) values.add(matchedSupply.preferred_vendor);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [siteSupplies, supplyLookupByName]);

  const filteredSupplies = useMemo(() => {
    return siteSupplies.filter((supply) => {
      const matchedSupply = supplyLookupByName[supply.name.trim().toLowerCase()];
      const category = supply.category ?? matchedSupply?.category ?? null;
      const type = matchedSupply?.unit ?? null;
      const vendor = matchedSupply?.preferred_vendor ?? null;
      if (supplyCategoryFilter !== 'all' && category !== supplyCategoryFilter) return false;
      if (supplyTypeFilter !== 'all' && type !== supplyTypeFilter) return false;
      if (supplyVendorFilter !== 'all' && vendor !== supplyVendorFilter) return false;
      return true;
    });
  }, [siteSupplies, supplyCategoryFilter, supplyLookupByName, supplyTypeFilter, supplyVendorFilter]);

  const groupedSupplies = useMemo(() => {
    const map: Record<string, SiteSupplyRow[]> = {};
    for (const supply of filteredSupplies) {
      const category = supply.category ?? 'Uncategorized';
      if (!map[category]) map[category] = [];
      map[category].push(supply);
    }
    return map;
  }, [filteredSupplies]);

  const nextCountDueDate = site?.next_count_due
    ? new Date(`${site.next_count_due}T00:00:00`)
    : latestCount
      ? new Date(new Date(latestCount.count_date).getTime() + (30 * 24 * 60 * 60 * 1000))
      : null;
  const dueLabel = nextCountDueDate
    ? (() => {
      const now = new Date();
      const diffMs = nextCountDueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays < 0) return { text: `Count overdue! Last count: ${formatDate(site?.last_count_date ?? latestCount?.count_date ?? null)} (${Math.abs(diffDays)} day(s) ago)`, color: 'red' as const };
      if (diffDays <= 7) return { text: `Count due soon: ${formatDate(nextCountDueDate.toISOString())} (in ${diffDays} day(s))`, color: 'yellow' as const };
      return { text: `Next count due: ${formatDate(nextCountDueDate.toISOString())} (in ${diffDays} day(s))`, color: 'green' as const };
    })()
    : null;

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs((prev) => (prev.includes(jobId) ? prev.filter((idValue) => idValue !== jobId) : [...prev, jobId]));
  };

  const toggleCountExpanded = (countId: string) => {
    setExpandedCountIds((prev) => (prev.includes(countId) ? prev.filter((idValue) => idValue !== countId) : [...prev, countId]));
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
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CRM
        </Link>
      </div>
    );
  }

  const addr = site.address;
  const isInactive = (site.status ?? '').toUpperCase() === 'INACTIVE';
  const mapsUrl = mapsSearchUrl(addr);
  const heroMapUrl = site.photo_url ? null : osmStaticMapUrl(site.geofence_center_lat, site.geofence_center_lng);
  const parsedLegacy = parseLegacySiteNotes(site.notes);
  const updatedAgo = formatRelativeDateTime(site.updated_at);
  const geofenceCenterLabel =
    site.geofence_center_lat != null && site.geofence_center_lng != null
      ? `${site.geofence_center_lat}, ${site.geofence_center_lng}`
      : (parsedLegacy.geofenceCenter ?? null);
  const geofenceRadiusLabel =
    site.geofence_radius_meters != null
      ? `${site.geofence_radius_meters} m`
      : (parsedLegacy.geofenceRadius ?? null);
  const earliestStartTime = site.earliest_start_time ?? site.earliest_start ?? null;
  const latestStartTime = site.latest_start_time ?? site.latest_start ?? null;
  const janitorialCloset = site.janitorial_closet_location ?? site.janitorial_closet ?? null;
  const supplyStorage = site.supply_storage_location ?? site.supply_storage ?? null;
  const waterSource = site.water_source_location ?? site.water_source ?? null;
  const dumpsterLocation = site.dumpster_location ?? site.dumpster ?? null;
  const floors = site.number_of_floors ?? site.floors ?? null;
  const priorityLevel = site.priority_level ?? site.priority ?? null;
  const oshaComplianceRequired = site.osha_compliance_required || site.osha_compliance === true;
  const backgroundCheckRequired = site.background_check_required || site.background_check === true;
  const primaryContactName = site.primary_contact?.name ?? site.primary_contact_name ?? null;
  const primaryContactEmail = site.primary_contact?.email ?? site.primary_contact_email ?? null;
  const primaryContactPhone = site.primary_contact?.mobile_phone || site.primary_contact?.work_phone || site.primary_contact?.phone || site.primary_contact_phone || null;
  const copyPublicCountLink = async (token: string | null | undefined) => {
    if (!token) {
      toast.error('Public count link is not available for this record.');
      return;
    }
    if (typeof window === 'undefined') return;
    const publicUrl = `${window.location.origin}/count/${token}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Public count link copied to clipboard.');
    } catch {
      toast.error('Could not copy link. Please copy it manually.');
    }
  };
  const emergencyContactName = site.emergency_contact?.name ?? site.emergency_contact_name ?? null;
  const emergencyContactEmail = site.emergency_contact?.email ?? site.emergency_contact_email ?? null;
  const emergencyContactPhone = site.emergency_contact?.mobile_phone || site.emergency_contact?.work_phone || site.emergency_contact?.phone || site.emergency_contact_phone || null;
  const supervisorName = site.supervisor?.full_name ?? site.site_supervisor_name ?? null;
  const supervisorEmail = site.supervisor?.email ?? site.site_supervisor_email ?? null;
  const supervisorPhone = site.supervisor?.mobile_phone || site.supervisor?.phone || site.site_supervisor_phone || null;
  const siteCompletenessItems: CompletenessItem[] = [
    { key: 'photo', label: 'Site Photo', isComplete: isFieldComplete(site.photo_url), section: 'basics' },
    { key: 'address', label: 'Address', isComplete: isFieldComplete(site.address), section: 'address' },
    { key: 'square_footage', label: 'Square Footage', isComplete: isFieldComplete(site.square_footage), section: 'address' },
    { key: 'alarm_code', label: 'Alarm Code', isComplete: isFieldComplete(site.alarm_code), section: 'access' },
    { key: 'security_protocol', label: 'Security Protocol', isComplete: isFieldComplete(site.security_protocol), section: 'access' },
    { key: 'entry_instructions', label: 'Entry Instructions', isComplete: isFieldComplete(site.entry_instructions), section: 'access' },
    { key: 'service_window', label: 'Service Time Window', isComplete: isFieldComplete(earliestStartTime) && isFieldComplete(latestStartTime), section: 'service' },
    { key: 'janitorial_closet', label: 'Janitorial Closet Location', isComplete: isFieldComplete(janitorialCloset), section: 'facility' },
    { key: 'dumpster', label: 'Dumpster Location', isComplete: isFieldComplete(dumpsterLocation), section: 'facility' },
    { key: 'risk_priority', label: 'Risk & Priority', isComplete: isFieldComplete(site.risk_level) && isFieldComplete(priorityLevel), section: 'facility' },
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
        <span>Sites</span>
        <span className="mx-1">›</span>
        <span className="font-mono">{site.site_code}</span>
      </div>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

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
              <Badge color="gray">{`Updated ${updatedAgo}`}</Badge>
              {site.client?.name && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <EntityLink entityType="client" code={site.client.client_code} name={site.client.name} showCode={false} />
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
              className={isInactive
                ? 'inline-flex items-center gap-2 rounded-lg border border-green-300 bg-background/80 px-3.5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors'
                : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-background/80 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors'}
            >
              {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
              {isInactive ? 'Reactivate' : 'Deactivate'}
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
            {site.square_footage != null
              ? site.square_footage.toLocaleString()
              : 'Not Set'}
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
                <p className="text-sm font-semibold text-foreground">{primaryContactName ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{[site.primary_contact?.role_title, site.primary_contact?.role].filter(Boolean).join(' · ') || 'Not Set'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{primaryContactEmail ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{primaryContactPhone ?? 'Not Set'}</span></p>
                  <p>Preferred: <span className="text-foreground">{site.primary_contact?.preferred_contact_method ?? 'Not Set'}</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{emergencyContactName ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{[site.emergency_contact?.role_title, site.emergency_contact?.role].filter(Boolean).join(' · ') || 'Not Set'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{emergencyContactEmail ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{emergencyContactPhone ?? 'Not Set'}</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site Supervisor</p>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{supervisorName ?? 'Not Set'}</p>
                <p className="text-xs text-muted-foreground">{site.supervisor?.staff_code ? `Staff ${site.supervisor.staff_code}` : 'Not Set'}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Email: <span className="text-foreground">{supervisorEmail ?? 'Not Set'}</span></p>
                  <p>Phone: <span className="text-foreground">{supervisorPhone ?? 'Not Set'}</span></p>
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
              <dd className="font-medium text-right">{formatTime(earliestStartTime)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Latest Start</dt>
              <dd className="font-medium text-right">{formatTime(latestStartTime)}</dd>
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
              <dt className="text-muted-foreground">Alarm Company</dt>
              <dd className="font-medium text-right">{notSet(site.alarm_company)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alarm Code</dt>
              <dd className="font-medium font-mono text-right">{site.alarm_code ? site.alarm_code : notSet(null)}</dd>
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
              <dd className="font-medium">{janitorialCloset ? janitorialCloset : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supply Storage</dt>
              <dd className="font-medium">{supplyStorage ? supplyStorage : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Water Source</dt>
              <dd className="font-medium">{waterSource ? waterSource : <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dumpster</dt>
              <dd className="font-medium">{dumpsterLocation ? dumpsterLocation : <span className="text-muted-foreground">Not Set</span>}</dd>
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
              <dd className="font-medium text-right">{site.square_footage != null ? `${site.square_footage.toLocaleString()} sq ft` : notSet(null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Floors</dt>
              <dd className="font-medium text-right">{floors ?? <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Employees On Site</dt>
              <dd className="font-medium text-right">{site.employees_on_site ?? <span className="text-muted-foreground">Not Set</span>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">OSHA Compliance</dt>
              <dd className="font-medium text-right">{oshaComplianceRequired ? 'Required' : 'No'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Background Check</dt>
              <dd className="font-medium text-right">{backgroundCheckRequired ? 'Required' : 'No'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service Start Date</dt>
              <dd className="font-medium text-right">{site.service_start_date ? formatDate(site.service_start_date) : notSet(null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Business Hours</dt>
              <dd className="font-medium text-right">
                {site.business_hours_start || site.business_hours_end
                  ? `${formatTime(site.business_hours_start)} - ${formatTime(site.business_hours_end)}`
                  : notSet(null)}
              </dd>
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
                {priorityLevel ? (
                  <Badge color={PRIORITY_BADGE[priorityLevel] ?? 'gray'} dot={false} className="px-3 py-1">
                    {priorityLevel}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not Set</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Status Date</dt>
              <dd className="font-medium text-right">{site.status_date ? formatDate(site.status_date) : notSet(null)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Status Reason</dt>
              <dd className="font-medium text-right">{site.status_reason ? site.status_reason : notSet(null)}</dd>
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
              <p className="italic text-muted-foreground">Not Set</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
            <p>
              Contract Type: <span className="font-mono">{parsedLegacy.contractType ?? 'Not Set'}</span>
            </p>
            <p>
              Geofence center: <span className="font-mono">{geofenceCenterLabel ?? 'Not Set'}</span>
            </p>
            <p>
              Geofence radius: <span className="font-mono">{geofenceRadiusLabel ?? 'Not Set'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Service Plans & Scope of Work */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Service Plans &amp; Scope of Work
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <Link
              href={`/jobs?tab=tickets&site=${encodeURIComponent(site.site_code)}&action=create-job`}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              + Assign Job
            </Link>
            <Badge color="blue">{`${activeServicePlans.length} active`}</Badge>
          </div>
        </div>

        {activeServicePlans.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No active jobs at this site. Click &quot;+ Assign Job&quot; to create one.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeServicePlans.map((job) => {
              const tasks = jobTasksByJob[job.id] ?? [];
              const jobStaff = jobStaffByJob[job.id] ?? [];
              const isExpanded = expandedJobs.includes(job.id);
              const totalMinutes = tasks.reduce((sum, task) => sum + (task.planned_minutes ?? 0), 0);
              const estHours = totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)} hrs/service` : 'Not Set';
              return (
                <div key={job.id} className="rounded-lg border border-border bg-muted/10 p-4">
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {jobStaff.length > 0 ? (
                          <span>
                            Assigned staff:{' '}
                            {jobStaff.map((assignment, index) => (
                              <span key={assignment.id}>
                                {index > 0 ? ', ' : null}
                                {assignment.staff?.staff_code ? (
                                  <EntityLink
                                    entityType="staff"
                                    code={assignment.staff.staff_code}
                                    name={assignment.staff.full_name}
                                    showCode={false}
                                  />
                                ) : (
                                  assignment.staff?.full_name ?? 'Unknown'
                                )}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span>Assigned to: {job.job_assigned_to || 'Not Set'}</span>
                        )}
                        {' · '}Priority: {job.priority_level ?? 'Standard'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Schedule: {job.schedule_days || 'Days not set'} · {formatTime(job.start_time)} - {formatTime(job.end_time)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Est. Time: {estHours}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={SITE_STATUS_COLORS[job.status] ?? 'gray'}>{job.status}</Badge>
                      {job.priority_level ? (
                        <Badge color={PRIORITY_BADGE[job.priority_level] ?? 'gray'}>{job.priority_level}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleJobExpanded(job.id)}
                    className="mt-3 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {isExpanded ? `Hide Task List (${tasks.length})` : `Show Task List (${tasks.length})`}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 rounded-md border border-border bg-background p-3">
                      {tasks.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground">No task list defined for this service plan yet.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {tasks.slice(0, 5).map((task) => (
                            <li key={task.id} className="flex items-center justify-between gap-3">
                              <span>{task.task_name ?? task.task_code ?? 'Unnamed Task'}</span>
                              <span className="text-muted-foreground">
                                {task.planned_minutes != null ? `${task.planned_minutes} min` : ''}
                              </span>
                            </li>
                          ))}
                          {tasks.length > 5 && (
                            <li className="text-muted-foreground">+{tasks.length - 5} more tasks in this scope.</li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-3 border-t border-border/70 pt-2">
                    <EntityLink entityType="job" code={job.job_code} name="View Job Details →" showCode={false} />
                  </div>
                </div>
              );
            })}
            <p className="text-sm font-medium text-foreground">
              Total Site Revenue: {formatCurrency(
                activeServicePlans.reduce((sum, job) => sum + (job.billing_amount ?? 0), 0)
              )}/mo
            </p>
          </div>
        )}
      </div>

      {/* Assigned Supplies & Inventory */}
      <div id="assigned-supplies-section" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Assigned Supplies ({siteSupplies.length})
            </span>
          </h3>
          <Link
            href={`/inventory?tab=site-assignments&site=${encodeURIComponent(site.site_code)}`}
            className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            + Add Supply
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="supply-category-filter" className="text-xs text-muted-foreground">Category</label>
          <select
            id="supply-category-filter"
            value={supplyCategoryFilter}
            onChange={(event) => setSupplyCategoryFilter(event.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs"
          >
            <option value="all">All Categories</option>
            {supplyCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <label htmlFor="supply-type-filter" className="text-xs text-muted-foreground">Type</label>
          <select
            id="supply-type-filter"
            value={supplyTypeFilter}
            onChange={(event) => setSupplyTypeFilter(event.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs"
          >
            <option value="all">All Types</option>
            {supplyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <label htmlFor="supply-vendor-filter" className="text-xs text-muted-foreground">Vendor</label>
          <select
            id="supply-vendor-filter"
            value={supplyVendorFilter}
            onChange={(event) => setSupplyVendorFilter(event.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs"
          >
            <option value="all">All Vendors</option>
            {supplyVendors.map((vendor) => (
              <option key={vendor} value={vendor}>{vendor}</option>
            ))}
          </select>
        </div>

        {filteredSupplies.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No supplies assigned for the selected filter.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(groupedSupplies).map(([category, supplies]) => (
              <div key={category} className="rounded-lg border border-border bg-muted/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category} ({supplies.length})
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Supply</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Vendor</th>
                        <th className="py-2 pr-3 font-medium">SDS</th>
                        <th className="py-2 font-medium">Last Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplies.map((supply) => (
                        <tr key={supply.id} className="border-b border-border/50">
                          {(() => {
                            const matchedSupply = supplyLookupByName[supply.name.trim().toLowerCase()];
                            const qty = matchedSupply ? latestCountQtyBySupplyId[matchedSupply.id] : undefined;
                            return (
                              <>
                          <td className="py-2 pr-3 font-medium">
                            {matchedSupply ? (
                              <Link
                                href={`/inventory/supplies/${encodeURIComponent(matchedSupply.code)}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {supply.name}
                              </Link>
                            ) : (
                              <Link
                                href={`/inventory?tab=supplies&search=${encodeURIComponent(supply.name)}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {supply.name}
                              </Link>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {matchedSupply?.unit ?? 'Not Set'}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {matchedSupply?.preferred_vendor ?? 'Not Set'}
                          </td>
                          <td className="py-2 pr-3">
                            {isExternalHttpUrl(supply.sds_url) ? (
                              <a href={supply.sds_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                                View SDS
                              </a>
                            ) : supply.sds_url ? (
                              <span className="text-muted-foreground" title={supply.sds_url}>On File</span>
                            ) : (
                              <span className="text-muted-foreground">Not Set</span>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {latestCount
                              ? (qty != null ? `${qty} ${matchedSupply?.unit ?? 'units'} (${formatDate(latestCount.count_date)})` : `Not Counted (${formatDate(latestCount.count_date)})`)
                              : 'Not Counted'}
                          </td>
                              </>
                            );
                          })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium text-foreground">
            Last Inventory Count: {latestCount ? formatDate(latestCount.count_date) : 'No counts yet'}
          </p>
          <p className="mt-1 text-muted-foreground">
            Counted by: {latestCountedByName ?? latestCount?.counted_by_name ?? 'Not Set'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {dueLabel ? (
              <span className="inline-flex items-center gap-2">
                <Badge color={dueLabel.color}>{dueLabel.text}</Badge>
              </span>
            ) : (
              'Next Due: Not Set'
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/inventory?tab=counts&site=${encodeURIComponent(site.site_code)}`}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              View Full Count
            </Link>
            <button
              type="button"
              onClick={() => setCountFormOpen(true)}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Start New Count
            </button>
            <button
              type="button"
              onClick={() => setCountFormOpen(true)}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Generate Count URL
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground">Inventory Count History</h4>
          {countHistory.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No counts recorded yet for this site.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {countHistory.map((count, index) => {
                const expanded = expandedCountIds.includes(count.id);
                const details = countDetailsByCountId[count.id] ?? [];
                return (
                  <div key={count.id} className="rounded-lg border border-border bg-muted/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {index === 0 ? 'Latest: ' : ''}{count.count_code} — {formatDate(count.count_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Counted by: {count.counted_by_name ?? (index === 0 ? latestCountedByName : null) ?? 'Not Set'} · Status: {count.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCountExpanded(count.id)}
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {expanded ? 'Hide Details' : 'View Details'}
                        </button>
                        <Link
                          href={`/inventory/counts/${encodeURIComponent(count.count_code)}`}
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Full Count Report
                        </Link>
                        <button
                          type="button"
                          onClick={() => copyPublicCountLink(count.public_token)}
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="mt-3 rounded-md border border-border bg-background p-3">
                        {details.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No line items for this count.</p>
                        ) : (
                          <ul className="space-y-1.5 text-xs">
                            {details.map((detail) => {
                              const supply = supplyLookupById[detail.supply_id];
                              return (
                                <li key={detail.id} className="flex items-center justify-between gap-3">
                                  <span className="text-foreground">
                                    {supply?.code ? (
                                      <Link
                                        href={`/inventory/supplies/${encodeURIComponent(supply.code)}`}
                                        className="text-blue-600 hover:underline dark:text-blue-400"
                                      >
                                        {supply.name}
                                      </Link>
                                    ) : (supply?.name ?? 'Unknown Supply')}
                                  </span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {detail.actual_qty != null ? `${detail.actual_qty} ${supply?.unit ?? 'units'}` : 'Not Counted'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Related Equipment */}
      <div id="related-equipment-section" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Related Equipment</h3>
        {relatedEquipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">No equipment linked to this site.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Assigned To</th>
                  <th className="py-2 font-medium">Condition</th>
                </tr>
              </thead>
              <tbody>
                {relatedEquipment.slice(0, 8).map((equip) => (
                  <tr key={equip.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-mono text-xs">
                      <EntityLink entityType="equipment" code={equip.equipment_code} name={equip.equipment_code} showCode={false} />
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      <EntityLink entityType="equipment" code={equip.equipment_code} name={equip.name} showCode={false} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{equip.equipment_type ?? 'Not Set'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {equip.staff?.staff_code
                        ? <EntityLink entityType="staff" code={equip.staff.staff_code} name={equip.staff.full_name} showCode={false} />
                        : (equip.staff?.full_name ?? 'Not Set')}
                    </td>
                    <td className="py-2">
                      {equip.condition ? <Badge color="gray">{equip.condition.replace(/_/g, ' ')}</Badge> : <span className="italic text-muted-foreground">Not Set</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Field Requests */}
      <div id="field-requests-section" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Field Requests</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pending specialist requests submitted from schedule forms and QR links for this site.
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Open Command Center
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {fieldRequests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No pending field requests for this site.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {fieldRequests.map((request) => {
              const parsed = parseBody(request.body);
              const details = parsed.details && typeof parsed.details === 'object' && !Array.isArray(parsed.details)
                ? parsed.details as Record<string, unknown>
                : {};
              const detailEntries = Object.entries(details).slice(0, 4);

              return (
                <div key={request.id} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{request.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge color={requestSeverityColor(request.severity)}>
                        {(request.severity ?? 'INFO').toUpperCase()}
                      </Badge>
                      <Badge color="gray">{requestTypeLabel(parsed.request_type)}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(parsed.submitted_by ?? 'Field Staff')} · {formatRelativeDateTime(request.created_at)}
                  </p>

                  {detailEntries.length > 0 ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {detailEntries.map(([key, value]) => (
                        <div key={`${request.id}:${key}`} className="rounded-md border border-border/60 bg-background px-2 py-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {requestTypeLabel(key.replace(/_/g, '-'))}
                          </p>
                          <p className="text-xs text-foreground">{detailValueLabel(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned Resources */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Assigned Resources</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link
            href={`/inventory?tab=site-assignments&site=${encodeURIComponent(site.site_code)}`}
            className="rounded-lg border border-border bg-muted/10 p-4 text-center transition-colors hover:bg-muted"
          >
            <Package className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{siteSupplies.length}</p>
            <p className="text-xs text-muted-foreground">Supplies</p>
            <p className="mt-1 text-xs font-medium text-blue-600 hover:underline">View</p>
          </Link>

          <Link
            href={`/assets?tab=equipment&site=${encodeURIComponent(site.site_code)}`}
            className="rounded-lg border border-border bg-muted/10 p-4 text-center transition-colors hover:bg-muted"
          >
            <Wrench className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{equipmentCount}</p>
            <p className="text-xs text-muted-foreground">Equipment</p>
            <p className="mt-1 text-xs font-medium text-blue-600 hover:underline">View</p>
          </Link>

          <Link
            href={`/assets?tab=keys&site=${encodeURIComponent(site.site_code)}`}
            className="rounded-lg border border-border bg-muted/10 p-4 text-center transition-colors hover:bg-muted"
          >
            <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{keys.length}</p>
            <p className="text-xs text-muted-foreground">Keys</p>
            <p className="mt-1 text-xs font-medium text-blue-600 hover:underline">View</p>
          </Link>

          <Link
            href={`/jobs?tab=tickets&site=${encodeURIComponent(site.site_code)}`}
            className="rounded-lg border border-border bg-muted/10 p-4 text-center transition-colors hover:bg-muted"
          >
            <Users className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{assignedStaffCount}</p>
            <p className="text-xs text-muted-foreground">Staff</p>
            <p className="mt-1 text-xs font-medium text-blue-600 hover:underline">View</p>
          </Link>
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

      <InventoryCountForm
        open={countFormOpen}
        onClose={() => setCountFormOpen(false)}
        initialData={null}
        initialSiteId={site.id}
        onSuccess={fetchSite}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Site"
        entityName={site.name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && activeJobCount > 0
          ? `⚠️ This site has ${activeJobCount} active job${activeJobCount === 1 ? '' : 's'} that may be affected.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
