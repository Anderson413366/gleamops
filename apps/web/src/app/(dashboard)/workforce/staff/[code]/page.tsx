'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User,
  Briefcase,
  Clock,
  Wrench,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Pencil,
  AlertTriangle,
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
import type { Staff } from '@gleamops/shared';
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
  job?: { job_code: string; job_name: string | null; status: string } | null;
}

interface EquipmentRow {
  id: string;
  assigned_date: string;
  equipment?: { name: string; equipment_code: string; condition: string | null } | null;
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const [formOpen, setFormOpen] = useState(false);

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
          .select('id, role, start_date, end_date, job:job_id(job_code, job_name, status)')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('start_date', { ascending: false }),
        supabase
          .from('equipment_assignments')
          .select('id, assigned_date, equipment:equipment_id(name, equipment_code, condition)')
          .eq('staff_id', data.id)
          .is('archived_at', null)
          .order('assigned_date', { ascending: false }),
      ]).then(([jobsRes, equipRes]) => {
        if (jobsRes.data) setJobs(jobsRes.data as unknown as JobAssignment[]);
        if (equipRes.data) setEquipment(equipRes.data as unknown as EquipmentRow[]);
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
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
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
                {staff.pay_rate != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pay Rate</dt>
                    <dd className="font-medium">${staff.pay_rate}/hr</dd>
                  </div>
                )}
                {staff.pay_type && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pay Type</dt>
                    <dd className="font-medium">{staff.pay_type}</dd>
                  </div>
                )}
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

          {/* Emergency Contact */}
          {staff.emergency_contact_name && (
            <Card>
              <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{staff.emergency_contact_name}</dd>
                  </div>
                  {staff.emergency_contact_phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium">{staff.emergency_contact_phone}</dd>
                    </div>
                  )}
                  {staff.emergency_contact_relationship && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Relationship</dt>
                      <dd className="font-medium">{staff.emergency_contact_relationship}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* HR */}
          <Card>
            <CardHeader><CardTitle>HR Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {staff.certifications && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Certifications</dt>
                    <dd className="font-medium">{staff.certifications}</dd>
                  </div>
                )}
                {staff.background_check_date && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Background Check</dt>
                    <dd className="font-medium">{formatDate(staff.background_check_date)}</dd>
                  </div>
                )}
                {staff.notes && (
                  <div>
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="mt-1">{staff.notes}</dd>
                  </div>
                )}
              </dl>
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
