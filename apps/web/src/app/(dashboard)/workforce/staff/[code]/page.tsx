'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Briefcase,
  Wrench,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Pencil,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
  Plus,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChipTabs,
  Input,
  Select,
  Skeleton,
  SlideOver,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@gleamops/ui';
import type { Staff, StaffCertification, WorkTicket } from '@gleamops/shared';
import { StaffForm } from '@/components/forms/staff-form';
import { toast } from 'sonner';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  ON_LEAVE: 'yellow',
  INACTIVE: 'gray',
  TERMINATED: 'red',
};

interface JobAssignment {
  id: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  job?: {
    job_code: string;
    job_name: string | null;
    status: string;
    frequency: string | null;
    schedule_days?: string | null;
    site?: { name: string; client?: { name: string } | null } | null;
  } | null;
}

interface EquipmentRow {
  id: string;
  equipment_id: string;
  assigned_date: string;
  returned_date: string | null;
  equipment?: { name: string; equipment_code: string; equipment_type: string | null; condition: string | null } | null;
}

interface TicketAssignmentRow {
  id: string;
  role: string | null;
  ticket?: Pick<WorkTicket, 'ticket_code' | 'scheduled_date' | 'status'> | null;
}

interface AssignableJobOption {
  id: string;
  label: string;
}

interface AssignableEquipmentOption {
  id: string;
  label: string;
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount: number, opts?: { maxFractionDigits?: number }) {
  const maxFractionDigits = opts?.maxFractionDigits ?? 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maxFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

function formatPayRate(payRate: number | null, payType: string | null) {
  if (payRate == null) return '\u2014';

  const t = (payType ?? '').toUpperCase();
  if (t === 'SALARY') return `${formatMoney(payRate, { maxFractionDigits: 0 })}/yr`;
  if (t === 'CONTRACT') return `${formatMoney(payRate, { maxFractionDigits: 2 })} (contract)`;
  // Default to hourly if unknown
  return `${formatMoney(payRate, { maxFractionDigits: 2 })}/hr`;
}

function bgCheckBadge(backgroundCheckDate: string | null): { label: string; color: 'green' | 'yellow' | 'red'; dateLabel: string } {
  if (!backgroundCheckDate) return { label: 'Missing', color: 'red', dateLabel: 'Not set' };
  const dt = new Date(backgroundCheckDate);
  const days = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return { label: 'Needs Review', color: 'yellow', dateLabel: 'Invalid date' };
  if (days <= 365) return { label: 'Current', color: 'green', dateLabel: formatDate(backgroundCheckDate) };
  if (days <= 730) return { label: 'Review', color: 'yellow', dateLabel: formatDate(backgroundCheckDate) };
  return { label: 'Outdated', color: 'red', dateLabel: formatDate(backgroundCheckDate) };
}

function parseScheduleDays(scheduleDays: string | null | undefined): string[] {
  if (!scheduleDays) return [];
  const raw = scheduleDays
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const map: Record<string, string> = {
    mon: 'Mon',
    monday: 'Mon',
    tue: 'Tue',
    tues: 'Tue',
    tuesday: 'Tue',
    wed: 'Wed',
    wednesday: 'Wed',
    thu: 'Thu',
    thur: 'Thu',
    thurs: 'Thu',
    thursday: 'Thu',
    fri: 'Fri',
    friday: 'Fri',
    sat: 'Sat',
    saturday: 'Sat',
    sun: 'Sun',
    sunday: 'Sun',
  };
  const normalized = raw.map((r) => map[r.toLowerCase()] ?? r);
  const order: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return Array.from(new Set(normalized)).sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
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

function titleFromCode(value: string | null | undefined): string {
  if (!value) return '\u2014';
  return value
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}

function assignmentRoleLabel(role: string | null | undefined): string {
  const normalized = (role ?? '').trim().toUpperCase();
  if (normalized === 'LEAD') return 'Lead';
  if (normalized === 'SUPPORT' || normalized === 'CLEANER') return 'Support';
  return 'Support';
}

function statusBadgeColor(status: string | null | undefined): 'green' | 'yellow' | 'red' | 'gray' {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'COMPLETED') return 'green';
  if (normalized === 'ON_HOLD' || normalized === 'IN_PROGRESS' || normalized === 'PENDING') return 'yellow';
  if (normalized === 'CANCELED' || normalized === 'CANCELLED' || normalized === 'TERMINATED') return 'red';
  return 'gray';
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
  { key: 'jobs', label: 'Assigned Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" /> },
];

export default function StaffDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [certifications, setCertifications] = useState<StaffCertification[]>([]);
  const [ticketAssignments, setTicketAssignments] = useState<TicketAssignmentRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [staffFormFocus, setStaffFormFocus] = useState<'personal' | 'employment' | 'contact' | 'hr' | undefined>(undefined);
  const [supervisedTeamCount, setSupervisedTeamCount] = useState(0);
  const [assignJobOpen, setAssignJobOpen] = useState(false);
  const [assignEquipmentOpen, setAssignEquipmentOpen] = useState(false);
  const [assignableJobs, setAssignableJobs] = useState<AssignableJobOption[]>([]);
  const [assignableEquipment, setAssignableEquipment] = useState<AssignableEquipmentOption[]>([]);
  const [assignJobLoading, setAssignJobLoading] = useState(false);
  const [assignEquipmentLoading, setAssignEquipmentLoading] = useState(false);
  const [assignJobSubmitting, setAssignJobSubmitting] = useState(false);
  const [assignEquipmentSubmitting, setAssignEquipmentSubmitting] = useState(false);
  const [assignJobForm, setAssignJobForm] = useState({
    job_id: '',
    role: 'SUPPORT',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
  });
  const [assignEquipmentForm, setAssignEquipmentForm] = useState({
    equipment_id: '',
    assigned_date: new Date().toISOString().slice(0, 10),
  });

  const fetchStaff = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_code', code)
      .is('archived_at', null)
      .single();
    if (data) {
      setStaff(data as unknown as Staff);

      // Fetch related data
      Promise.all([
        supabase
          .from('job_staff_assignments')
          .select('id, role, start_date, end_date, job:job_id(job_code, job_name, status, frequency, schedule_days, site:site_id(name, client:client_id(name)))')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('start_date', { ascending: false }),
        supabase
          .from('equipment_assignments')
          .select('id, equipment_id, assigned_date, returned_date, equipment:equipment_id(name, equipment_code, equipment_type, condition)')
          .eq('staff_id', data.id)
          .is('returned_date', null)
          .is('archived_at', null)
          .order('assigned_date', { ascending: false }),
        supabase
          .from('staff_certifications')
          .select('*')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('expiry_date', { ascending: true }),
        supabase
          .from('ticket_assignments')
          .select('id, role, ticket:ticket_id(ticket_code, scheduled_date, status)')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('staff')
          .select('id', { count: 'exact', head: true })
          .eq('supervisor_id', data.id)
          .is('archived_at', null),
      ]).then(([jobsRes, equipRes, certRes, ticketRes, supervisedRes]) => {
        if (jobsRes.data) setJobs(jobsRes.data as unknown as JobAssignment[]);
        if (equipRes.data) setEquipment(equipRes.data as unknown as EquipmentRow[]);
        if (certRes.data) setCertifications(certRes.data as unknown as StaffCertification[]);
        if (ticketRes.data) setTicketAssignments(ticketRes.data as unknown as TicketAssignmentRow[]);
        setSupervisedTeamCount(supervisedRes.count ?? 0);
      });
    }
    setLoading(false);
  };

  const loadAssignableJobs = async () => {
    if (!staff) return;
    setAssignJobLoading(true);
    const supabase = getSupabaseBrowserClient();
    const assignedJobCodes = new Set((jobs ?? []).map((j) => j.job?.job_code).filter(Boolean));
    const { data } = await supabase
      .from('site_jobs')
      .select('id, job_code, job_name, site:site_id(name, client:client_id(name))')
      .eq('status', 'ACTIVE')
      .is('archived_at', null)
      .order('job_code', { ascending: true });

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      job_code: string;
      job_name: string | null;
      site?: { name?: string; client?: { name?: string } | Array<{ name?: string }> | null } | Array<{ name?: string; client?: { name?: string } | Array<{ name?: string }> | null }> | null;
    }>;

    const options = rows
      .filter((j) => !assignedJobCodes.has(j.job_code))
      .map((j) => {
        const site = Array.isArray(j.site) ? j.site[0] : j.site;
        const clientRaw = site?.client;
        const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;
        return {
          id: j.id,
          label: `${j.job_code}${j.job_name ? ` \u00B7 ${j.job_name}` : ''}${site?.name ? ` \u00B7 ${site.name}` : ''}${client?.name ? ` (${client.name})` : ''}`,
        };
      });

    setAssignableJobs(options);
    setAssignJobForm((prev) => ({ ...prev, job_id: options[0]?.id ?? '' }));
    setAssignJobLoading(false);
  };

  const loadAssignableEquipment = async () => {
    setAssignEquipmentLoading(true);
    const supabase = getSupabaseBrowserClient();
    const assignedEquipmentIds = new Set((equipment ?? []).map((e) => e.equipment_id));
    const { data } = await supabase
      .from('equipment')
      .select('id, equipment_code, name, equipment_type')
      .is('archived_at', null)
      .order('name', { ascending: true });

    const options = ((data ?? []) as Array<{ id: string; equipment_code: string; name: string; equipment_type: string | null }>)
      .filter((e) => !assignedEquipmentIds.has(e.id))
      .map((e) => ({
        id: e.id,
        label: `${e.name} \u00B7 ${e.equipment_code}${e.equipment_type ? ` \u00B7 ${titleFromCode(e.equipment_type)}` : ''}`,
      }));

    setAssignableEquipment(options);
    setAssignEquipmentForm((prev) => ({ ...prev, equipment_id: options[0]?.id ?? '' }));
    setAssignEquipmentLoading(false);
  };

  const handleAssignJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;
    if (!assignJobForm.job_id) {
      toast.error('Select a job to assign.');
      return;
    }

    setAssignJobSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const auth = await supabase.auth.getUser();
    const tenantId = auth.data.user?.app_metadata?.tenant_id;

    const { error } = await supabase.from('job_staff_assignments').insert({
      tenant_id: tenantId,
      job_id: assignJobForm.job_id,
      staff_id: staff.id,
      role: assignJobForm.role,
      start_date: assignJobForm.start_date || null,
      end_date: assignJobForm.end_date || null,
      notes: null,
    });

    setAssignJobSubmitting(false);

    if (error) {
      toast.error(error.message.includes('uq_job_staff_assignment') ? 'This staff member is already assigned to that job.' : error.message);
      return;
    }

    toast.success('Job assigned.');
    setAssignJobOpen(false);
    await fetchStaff();
  };

  const handleAssignEquipment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;
    if (!assignEquipmentForm.equipment_id) {
      toast.error('Select equipment to assign.');
      return;
    }

    setAssignEquipmentSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const auth = await supabase.auth.getUser();
    const tenantId = auth.data.user?.app_metadata?.tenant_id;

    const { error } = await supabase.from('equipment_assignments').insert({
      tenant_id: tenantId,
      equipment_id: assignEquipmentForm.equipment_id,
      staff_id: staff.id,
      site_id: null,
      assigned_date: assignEquipmentForm.assigned_date || new Date().toISOString().slice(0, 10),
      returned_date: null,
      notes: null,
    });

    setAssignEquipmentSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Equipment assigned.');
    setAssignEquipmentOpen(false);
    await fetchStaff();
  };

  const handleStatusToggle = async () => {
    if (!staff) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (staff.staff_status ?? '').toUpperCase() === 'INACTIVE' || (staff.staff_status ?? '').toUpperCase() === 'TERMINATED';
    const nextStatus = isInactive ? 'ACTIVE' : 'TERMINATED';
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          staff_status: nextStatus,
        })
        .eq('id', staff.id)
        .eq('version_etag', staff.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${staff.full_name}`);
      await fetchStaff();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Staff member not found.</p>
        <Link
          href="/workforce"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workforce
        </Link>
      </div>
    );
  }

  const activeJobCount = jobs.filter((j) => j.job?.status === 'ACTIVE').length;
  const isInactive = (staff.staff_status ?? '').toUpperCase() === 'INACTIVE' || (staff.staff_status ?? '').toUpperCase() === 'TERMINATED';
  const updatedAgo = formatRelativeDateTime(staff.updated_at);
  const bg = bgCheckBadge(staff.background_check_date ?? null);

  const activeJobs = jobs.filter((j) => j.job?.status === 'ACTIVE');
  const typicalDays = Array.from(
    new Set(activeJobs.flatMap((j) => parseScheduleDays(j.job?.schedule_days))),
  );
  const openTickets = ticketAssignments.filter((a) => {
    const s = (a.ticket?.status ?? '').toUpperCase();
    return s === 'SCHEDULED' || s === 'IN_PROGRESS';
  });
  const nextTicket = openTickets
    .map((a) => a.ticket?.scheduled_date)
    .filter(Boolean)
    .map((d) => new Date(d!))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const staffCompletenessItems: CompletenessItem[] = [
    { key: 'photo', label: 'Profile Photo', isComplete: isFieldComplete(staff.photo_url), section: 'personal' },
    { key: 'full_name', label: 'Full Name', isComplete: isFieldComplete(staff.full_name), section: 'personal' },
    { key: 'role', label: 'Role', isComplete: isFieldComplete(staff.role), section: 'personal' },
    { key: 'email', label: 'Email', isComplete: isFieldComplete(staff.email), section: 'contact' },
    { key: 'phone', label: 'Phone', isComplete: isFieldComplete(staff.phone || staff.mobile_phone), section: 'contact' },
    { key: 'address', label: 'Address', isComplete: isFieldComplete(staff.address), section: 'contact' },
    { key: 'employment_type', label: 'Employment Type', isComplete: isFieldComplete(staff.employment_type), section: 'employment' },
    { key: 'hire_date', label: 'Hire Date', isComplete: isFieldComplete(staff.hire_date), section: 'employment' },
    { key: 'pay_details', label: 'Pay Details', isComplete: isFieldComplete(staff.pay_rate) && isFieldComplete(staff.pay_type), section: 'employment' },
    { key: 'emergency_contact', label: 'Emergency Contact', isComplete: isFieldComplete(staff.emergency_contact_name) && isFieldComplete(staff.emergency_contact_phone), section: 'hr' },
    { key: 'background_check', label: 'Background Check Date', isComplete: isFieldComplete(staff.background_check_date), section: 'hr' },
    { key: 'certifications', label: 'Certifications', isComplete: isFieldComplete(staff.certifications) || certifications.length > 0, section: 'hr' },
  ];

  return (
    <div className="space-y-6">
      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      <Link
        href="/workforce"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workforce
      </Link>
      <div className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1">›</span>
        <Link href="/workforce" className="hover:text-foreground transition-colors">Workforce</Link>
        <span className="mx-1">›</span>
        <span>Staff</span>
        <span className="mx-1">›</span>
        <span className="font-mono">{staff.staff_code}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {staff.photo_url ? (
              <img src={staff.photo_url} alt={staff.full_name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{staff.full_name}</h1>
              <p className="text-sm text-muted-foreground">{staff.staff_code} &middot; {staff.role}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge color={STATUS_COLORS[staff.staff_status ?? ''] ?? 'gray'}>{staff.staff_status ?? 'N/A'}</Badge>
          <Badge color="gray">{`Updated ${updatedAgo}`}</Badge>
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
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
        title="Staff Profile"
        items={staffCompletenessItems}
        onNavigateToMissing={(item) => {
          setStaffFormFocus((item.section as 'personal' | 'employment' | 'contact' | 'hr' | undefined) ?? 'personal');
          setFormOpen(true);
        }}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Assigned Jobs</p><p className="text-xl font-semibold">{jobs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-xl font-semibold">{activeJobCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Team Supervised</p><p className="text-xl font-semibold">{supervisedTeamCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Equipment Assigned</p><p className="text-xl font-semibold">{equipment.length}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Personal */}
          <Card>
            <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {staff.preferred_name && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Preferred Name</dt>
                    <dd className="font-medium">{staff.preferred_name}</dd>
                  </div>
                )}
                {staff.email && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email</dt>
                    <dd className="font-medium">{staff.email}</dd>
                  </div>
                )}
                {staff.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</dt>
                    <dd className="font-medium">{staff.phone}</dd>
                  </div>
                )}
                {staff.mobile_phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Mobile</dt>
                    <dd className="font-medium">{staff.mobile_phone}</dd>
                  </div>
                )}
                {staff.address && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</dt>
                    <dd className="font-medium text-right">
                      {[staff.address.street, staff.address.city, staff.address.state, staff.address.zip].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Employment */}
          <Card>
          <CardHeader><CardTitle>Employment</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">{staff.role}</dd>
              </div>
              {staff.employment_type && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">{staff.employment_type}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hire Date</dt>
                <dd className="font-medium">{formatDate(staff.hire_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pay Rate</dt>
                <dd className="font-medium">{formatPayRate(staff.pay_rate ?? null, staff.pay_type ?? null)}</dd>
              </div>
              {staff.schedule_type && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Schedule</dt>
                  <dd className="font-medium">{staff.schedule_type}</dd>
                </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subcontractor</dt>
                  <dd className="font-medium">{staff.is_subcontractor ? 'Yes' : 'No'}</dd>
                </div>
            </dl>
          </CardContent>
          </Card>

          {/* Schedule & Availability */}
          <Card>
            <CardHeader><CardTitle>Schedule &amp; Availability</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Schedule Type</dt>
                  <dd className="font-medium">{staff.schedule_type ?? <span className="text-muted-foreground">Not set</span>}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Days Available</dt>
                  <dd className="font-medium text-right">
                    {typicalDays.length ? typicalDays.join(', ') : <span className="text-muted-foreground">Not tracked yet</span>}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Current Assignment Load</dt>
                  <dd className="font-medium text-right">
                    {activeJobCount} active job{activeJobCount === 1 ? '' : 's'}
                    {openTickets.length ? ` \u00B7 ${openTickets.length} open ticket${openTickets.length === 1 ? '' : 's'}` : ''}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Next Ticket</dt>
                  <dd className="font-medium">
                    {nextTicket ? nextTicket.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-muted-foreground">None scheduled</span>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* HR */}
          <Card>
            <CardHeader><CardTitle>HR Details</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Emergency Contact
                  </p>
                  <dl className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium text-right">{staff.emergency_contact_name ?? <span className="text-muted-foreground">Not set</span>}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium text-right">{staff.emergency_contact_phone ?? <span className="text-muted-foreground">Not set</span>}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Relationship</dt>
                      <dd className="font-medium text-right">{staff.emergency_contact_relationship ?? <span className="text-muted-foreground">Not set</span>}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" /> Certifications
                  </p>
                  {certifications.length ? (
                    <ul className="mt-2 space-y-2">
                      {certifications.map((c) => (
                        <li key={c.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.certification_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.expiry_date ? `Expires ${formatDate(c.expiry_date)}` : 'No expiry date'}
                              {c.issuing_authority ? ` \u00B7 ${c.issuing_authority}` : ''}
                            </p>
                          </div>
                          <Badge
                            color={
                              c.status === 'ACTIVE' ? 'green' :
                              c.status === 'PENDING' ? 'yellow' :
                              c.status === 'EXPIRED' ? 'red' :
                              'red'
                            }
                          >
                            {c.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : staff.certifications ? (
                    <p className="mt-2 text-sm">{staff.certifications}</p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No certifications yet.</p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">Background Check</dt>
                      <dd className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-medium">{bg.dateLabel}</span>
                          <Badge color={bg.color}>{bg.label}</Badge>
                        </div>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="mt-1 text-sm">
                        {staff.notes ? staff.notes : <span className="text-muted-foreground">Not set</span>}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assigned Jobs Tab */}
      {tab === 'jobs' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                Assigned Jobs <Badge color="blue">{jobs.length}</Badge>
              </span>
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setAssignJobOpen(true);
                void loadAssignableJobs();
              }}
            >
              <Plus className="h-4 w-4" />
              Assign Job
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs assigned — Assign a job to this team member.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Schedule Days</TableHead>
                    <TableHead>Role on Job</TableHead>
                    <TableHead>Status</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.job?.job_name ?? j.job?.job_code ?? '\u2014'}</TableCell>
                      <TableCell className="text-muted-foreground">{j.job?.site?.name ?? '\u2014'}</TableCell>
                      <TableCell className="text-muted-foreground">{j.job?.site?.client?.name ?? '\u2014'}</TableCell>
                      <TableCell className="text-muted-foreground">{titleFromCode(j.job?.frequency ?? null)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {parseScheduleDays(j.job?.schedule_days).length
                          ? parseScheduleDays(j.job?.schedule_days).join(', ')
                          : '\u2014'}
                      </TableCell>
                      <TableCell>{assignmentRoleLabel(j.role)}</TableCell>
                      <TableCell>
                        <Badge color={statusBadgeColor(j.job?.status)}>{titleFromCode(j.job?.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Tab */}
      {tab === 'equipment' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                Assigned Equipment <Badge color="blue">{equipment.length}</Badge>
              </span>
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setAssignEquipmentOpen(true);
                void loadAssignableEquipment();
              }}
            >
              <Plus className="h-4 w-4" />
              Assign Equipment
            </Button>
          </CardHeader>
          <CardContent>
            {equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment assigned — Check out equipment to this team member.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Date Assigned</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {equipment.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.equipment?.name ?? '\u2014'}</TableCell>
                      <TableCell className="text-muted-foreground">{titleFromCode(e.equipment?.equipment_type)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.equipment?.equipment_code ?? '\u2014'}</TableCell>
                      <TableCell>
                        <Badge color={statusBadgeColor(e.equipment?.condition)}>
                          {titleFromCode(e.equipment?.condition)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(e.assigned_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <SlideOver
        open={assignJobOpen}
        onClose={() => setAssignJobOpen(false)}
        title="Assign Job"
        subtitle="Assign an active service plan to this team member"
      >
        <form className="space-y-4" onSubmit={handleAssignJob}>
          <Select
            label="Job"
            value={assignJobForm.job_id}
            onChange={(event) => setAssignJobForm((prev) => ({ ...prev, job_id: event.target.value }))}
            options={[
              {
                value: '',
                label: assignJobLoading
                  ? 'Loading active jobs...'
                  : assignableJobs.length
                    ? 'Select a job...'
                    : 'No unassigned active jobs found',
              },
              ...assignableJobs.map((job) => ({ value: job.id, label: job.label })),
            ]}
            disabled={assignJobLoading || assignableJobs.length === 0}
            required
          />
          <Select
            label="Role on Job"
            value={assignJobForm.role}
            onChange={(event) => setAssignJobForm((prev) => ({ ...prev, role: event.target.value }))}
            options={[
              { value: 'LEAD', label: 'Lead' },
              { value: 'SUPPORT', label: 'Support' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={assignJobForm.start_date}
              onChange={(event) => setAssignJobForm((prev) => ({ ...prev, start_date: event.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              value={assignJobForm.end_date}
              onChange={(event) => setAssignJobForm((prev) => ({ ...prev, end_date: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignJobOpen(false)} disabled={assignJobSubmitting}>Cancel</Button>
            <Button type="submit" loading={assignJobSubmitting} disabled={assignableJobs.length === 0}>Assign Job</Button>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        open={assignEquipmentOpen}
        onClose={() => setAssignEquipmentOpen(false)}
        title="Assign Equipment"
        subtitle="Check out equipment to this team member"
      >
        <form className="space-y-4" onSubmit={handleAssignEquipment}>
          <Select
            label="Equipment"
            value={assignEquipmentForm.equipment_id}
            onChange={(event) => setAssignEquipmentForm((prev) => ({ ...prev, equipment_id: event.target.value }))}
            options={[
              {
                value: '',
                label: assignEquipmentLoading
                  ? 'Loading equipment...'
                  : assignableEquipment.length
                    ? 'Select equipment...'
                    : 'No available equipment found',
              },
              ...assignableEquipment.map((item) => ({ value: item.id, label: item.label })),
            ]}
            disabled={assignEquipmentLoading || assignableEquipment.length === 0}
            required
          />
          <Input
            label="Date Assigned"
            type="date"
            value={assignEquipmentForm.assigned_date}
            onChange={(event) => setAssignEquipmentForm((prev) => ({ ...prev, assigned_date: event.target.value }))}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignEquipmentOpen(false)} disabled={assignEquipmentSubmitting}>Cancel</Button>
            <Button type="submit" loading={assignEquipmentSubmitting} disabled={assignableEquipment.length === 0}>Assign Equipment</Button>
          </div>
        </form>
      </SlideOver>

      <ActivityHistorySection
        entityType="staff"
        entityId={staff.id}
        entityCode={staff.staff_code}
        notes={staff.notes}
        entityUpdatedAt={staff.updated_at}
        ticketScope={{ staffId: staff.id }}
        inspectionScope={{ staffId: staff.id }}
      />

      {/* Edit Form */}
      <StaffForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setStaffFormFocus(undefined);
        }}
        initialData={staff}
        onSuccess={fetchStaff}
        focusSection={staffFormFocus}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Staff"
        entityName={staff.full_name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && activeJobCount > 0
          ? `⚠️ This team member has ${activeJobCount} active job${activeJobCount === 1 ? '' : 's'} that may be affected.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
