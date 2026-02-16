'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User,
  Briefcase,
  Wrench,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
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
  Skeleton,
} from '@gleamops/ui';
import type { Staff, StaffCertification, WorkTicket } from '@gleamops/shared';
import { StaffForm } from '@/components/forms/staff-form';

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
  job?: { job_code: string; job_name: string | null; status: string; schedule_days?: string | null } | null;
}

interface EquipmentRow {
  id: string;
  assigned_date: string;
  equipment?: { name: string; equipment_code: string; condition: string | null } | null;
}

interface TicketAssignmentRow {
  id: string;
  role: string | null;
  ticket?: Pick<WorkTicket, 'ticket_code' | 'scheduled_date' | 'status'> | null;
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

const TABS = [
  { key: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
  { key: 'jobs', label: 'Assigned Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" /> },
];

export default function StaffDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [certifications, setCertifications] = useState<StaffCertification[]>([]);
  const [ticketAssignments, setTicketAssignments] = useState<TicketAssignmentRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [supervisedTeamCount, setSupervisedTeamCount] = useState(0);

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
          .select('id, role, start_date, end_date, job:job_id(job_code, job_name, status, schedule_days)')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('start_date', { ascending: false }),
        supabase
          .from('equipment_assignments')
          .select('id, assigned_date, equipment:equipment_id(name, equipment_code, condition)')
          .eq('staff_id', data.id)
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
        <Button variant="secondary" onClick={() => router.push('/workforce')}>
          <ArrowLeft className="h-4 w-4" /> Back to Workforce
        </Button>
      </div>
    );
  }

  const activeJobCount = jobs.filter((j) => j.job?.status === 'ACTIVE').length;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => router.push('/workforce')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
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
        </div>
      </div>

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
                <dt className="text-muted-foreground">Pay</dt>
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
                    {nextTicket ? nextTicket.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-muted-foreground">\u2014</span>}
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
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                Assigned Jobs <Badge color="blue">{jobs.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No job assignments.</p>
            ) : (
              <ul className="divide-y divide-border">
                {jobs.map((j) => (
                  <li key={j.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{j.job?.job_name ?? j.job?.job_code ?? '\u2014'}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.job?.job_code} {j.role && `\u00B7 ${j.role}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(j.start_date)} \u2013 {formatDate(j.end_date)}
                      </p>
                    </div>
                    <Badge color={j.job?.status === 'ACTIVE' ? 'green' : 'gray'}>{j.job?.status ?? '\u2014'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Equipment Tab */}
      {tab === 'equipment' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                Assigned Equipment <Badge color="blue">{equipment.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment assigned.</p>
            ) : (
              <ul className="divide-y divide-border">
                {equipment.map((e) => (
                  <li key={e.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{e.equipment?.name ?? '\u2014'}</p>
                      <p className="text-xs text-muted-foreground">{e.equipment?.equipment_code} &middot; Assigned: {formatDate(e.assigned_date)}</p>
                    </div>
                    {e.equipment?.condition && (
                      <Badge color={e.equipment.condition === 'GOOD' ? 'green' : e.equipment.condition === 'FAIR' ? 'yellow' : 'red'}>
                        {e.equipment.condition}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <StaffForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={staff}
        onSuccess={fetchStaff}
      />
    </div>
  );
}
