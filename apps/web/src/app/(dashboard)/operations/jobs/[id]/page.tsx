'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Pencil,
  Archive,
  Calendar,
  DollarSign,
  ClipboardList,
  AlertTriangle,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ArchiveDialog, Badge, Skeleton } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { JOB_STATUS_COLORS } from '@gleamops/shared';
import { JobForm } from '@/components/forms/job-form';
import {
  computeJobFinancials,
  type JobFinancialResult,
} from '@/lib/utils/job-financials';
import { formatDate } from '@/lib/utils/date';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';

interface JobWithRelations extends SiteJob {
  site?: {
    site_code: string;
    name: string;
    client?: { name: string; client_code: string } | null;
  } | null;
}

interface JobStaffAssignmentRow {
  id: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  staff?: {
    id: string;
    staff_code: string;
    full_name: string;
    staff_status: string | null;
  } | null;
}

interface StaffOption {
  id: string;
  staff_code: string;
  full_name: string;
  staff_status: string | null;
}

const FREQUENCY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray' | 'purple'> = {
  DAILY: 'green',
  'NIGHTLY (5X)': 'green',
  '3X_WEEK': 'blue',
  '2X_WEEK': 'blue',
  WEEKLY: 'yellow',
  BIWEEKLY: 'yellow',
  MONTHLY: 'gray',
  QUARTERLY: 'gray',
  ANNUALLY: 'purple',
  ONE_TIME: 'purple',
};

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// formatDate imported from @/lib/utils/date

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [jobFormFocus, setJobFormFocus] = useState<'assignment' | 'schedule' | 'tasks' | undefined>(undefined);

  // Related data
  const [taskCount, setTaskCount] = useState(0);
  const [financials, setFinancials] = useState<JobFinancialResult | null>(null);
  const [assignments, setAssignments] = useState<JobStaffAssignmentRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  const fetchAssignments = async (jobId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('job_staff_assignments')
      .select(`
        id,
        role,
        start_date,
        end_date,
        staff:staff_id(id, staff_code, full_name, staff_status)
      `)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('start_date', { ascending: false });
    setAssignments((data as unknown as JobStaffAssignmentRow[]) ?? []);
  };

  const fetchJob = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('site_jobs')
      .select(
        '*, site:site_id(site_code, name, client:client_id(name, client_code))'
      )
      .eq('job_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const j = data as unknown as JobWithRelations;
      setJob(j);

      // Fetch task count
      const { count } = await supabase
        .from('job_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', j.id)
        .is('archived_at', null);
      setTaskCount(count ?? 0);

      // Fetch assignments + available staff in parallel.
      const [assignmentRes, staffRes] = await Promise.all([
        supabase
          .from('job_staff_assignments')
          .select(`
            id,
            role,
            start_date,
            end_date,
            staff:staff_id(id, staff_code, full_name, staff_status)
          `)
          .eq('job_id', j.id)
          .is('archived_at', null)
          .order('start_date', { ascending: false }),
        supabase
          .from('staff')
          .select('id, staff_code, full_name, staff_status')
          .is('archived_at', null)
          .in('staff_status', ['ACTIVE', 'ON_LEAVE'])
          .order('full_name'),
      ]);
      setAssignments((assignmentRes.data as unknown as JobStaffAssignmentRow[]) ?? []);
      setStaffOptions((staffRes.data as unknown as StaffOption[]) ?? []);

      // Compute financials
      if (j.billing_amount) {
        setFinancials(
          computeJobFinancials({ billing_amount: j.billing_amount })
        );
      } else {
        setFinancials(null);
      }
    }
    setLoading(false);
  };

  const handleAssignStaff = async () => {
    if (!job || !assignStaffId) return;
    setAssigning(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.from('job_staff_assignments').insert({
      tenant_id: job.tenant_id,
      job_id: job.id,
      staff_id: assignStaffId,
      role: assignRole || null,
      start_date: new Date().toISOString().slice(0, 10),
    });

    if (error) {
      toast.error(error.message.includes('uq_job_staff_assignment') ? 'Staff member is already assigned to this job.' : error.message);
    } else {
      toast.success('Staff assigned');
      setAssignStaffId('');
      setAssignRole('');
      await fetchAssignments(job.id);
    }
    setAssigning(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!job) return;
    setRemovingAssignmentId(assignmentId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('job_staff_assignments')
      .delete()
      .eq('id', assignmentId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Assignment removed');
      await fetchAssignments(job.id);
    }
    setRemovingAssignmentId(null);
  };

  useEffect(() => {
    fetchJob();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async (reason: string) => {
    if (!job) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('site_jobs')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: reason,
        })
        .eq('id', job.id)
        .eq('version_etag', job.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Job archived');
      router.push('/operations');
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

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Job not found.</p>
        <Link
          href="/operations"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Operations
        </Link>
      </div>
    );
  }

  const marginPct = financials
    ? `${financials.profit_margin_pct.toFixed(1)}%`
    : '\u2014';
  const startsIn = formatRelativeDate(job.start_date);
  const updatedAgo = formatRelativeDateTime(job.updated_at);
  const jobCompletenessItems: CompletenessItem[] = [
    { key: 'job_name', label: 'Job Name', isComplete: isFieldComplete(job.job_name), section: 'assignment' },
    { key: 'site', label: 'Site Assignment', isComplete: isFieldComplete(job.site_id), section: 'assignment' },
    { key: 'job_type', label: 'Job Type', isComplete: isFieldComplete(job.job_type), section: 'assignment' },
    { key: 'priority', label: 'Priority Level', isComplete: isFieldComplete(job.priority_level), section: 'assignment' },
    { key: 'frequency', label: 'Frequency', isComplete: isFieldComplete(job.frequency), section: 'schedule' },
    { key: 'schedule_days', label: 'Schedule Days', isComplete: isFieldComplete(job.schedule_days), section: 'schedule' },
    { key: 'time_window', label: 'Service Time Window', isComplete: isFieldComplete(job.start_time) && isFieldComplete(job.end_time), section: 'schedule' },
    { key: 'billing_amount', label: 'Billing Amount', isComplete: isFieldComplete(job.billing_amount), section: 'schedule' },
    { key: 'billing_period', label: 'Billing Period', isComplete: isFieldComplete(job.billing_uom), section: 'schedule' },
    { key: 'special_requirements', label: 'Special Requirements', isComplete: isFieldComplete(job.special_requirements), section: 'tasks' },
    { key: 'specifications', label: 'Specifications', isComplete: isFieldComplete(job.specifications), section: 'tasks' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/operations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Operations
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {job.job_name ?? job.job_code}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {job.job_code}
              </span>
              <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>
                {job.status}
              </Badge>
              {job.frequency && (
                <Badge
                  color={FREQUENCY_COLORS[job.frequency] ?? 'gray'}
                >
                  {job.frequency}
                </Badge>
              )}
              <Badge color="blue">{`Starts ${startsIn}`}</Badge>
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
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Job Profile"
        items={jobCompletenessItems}
        onNavigateToMissing={(item) => {
          setJobFormFocus((item.section as 'assignment' | 'schedule' | 'tasks' | undefined) ?? 'assignment');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(job.billing_amount)}
          </p>
          <p className="text-xs text-muted-foreground">Monthly Billing</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{marginPct}</p>
          <p className="text-xs text-muted-foreground">Profit Margin</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{taskCount}</p>
          <p className="text-xs text-muted-foreground">Tasks Count</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
          <p className="text-xs text-muted-foreground">Assigned Staff</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Schedule
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frequency</dt>
              <dd className="font-medium">{job.frequency ?? '\u2014'}</dd>
            </div>
            {job.schedule_days && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Schedule Days</dt>
                <dd className="font-medium">{job.schedule_days}</dd>
              </div>
            )}
            {job.start_time && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Start Time</dt>
                <dd className="font-medium">{job.start_time}</dd>
              </div>
            )}
            {job.end_time && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">End Time</dt>
                <dd className="font-medium">{job.end_time}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Start Date</dt>
              <dd className="font-medium">{formatDate(job.start_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">End Date</dt>
              <dd className="font-medium">{formatDate(job.end_date)}</dd>
            </div>
            {job.staff_needed != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Staff Needed</dt>
                <dd className="font-medium">{job.staff_needed}</dd>
              </div>
            )}
            {job.estimated_hours_per_service != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Est. Hours / Service
                </dt>
                <dd className="font-medium">
                  {job.estimated_hours_per_service}
                </dd>
              </div>
            )}
            {job.estimated_hours_per_month != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Est. Hours / Month</dt>
                <dd className="font-medium">
                  {job.estimated_hours_per_month}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Site & Client */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Site & Client
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Site</dt>
              <dd className="font-medium">
                {job.site?.name ?? '\u2014'}
                {job.site?.site_code && (
                  <span className="ml-1 text-xs text-muted-foreground font-mono">
                    ({job.site.site_code})
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">
                {job.site?.client?.name ?? '\u2014'}
                {job.site?.client?.client_code && (
                  <span className="ml-1 text-xs text-muted-foreground font-mono">
                    ({job.site.client.client_code})
                  </span>
                )}
              </dd>
            </div>
            {job.job_type && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Job Type</dt>
                <dd className="font-medium">{job.job_type}</dd>
              </div>
            )}
            {job.priority_level && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium">{job.priority_level}</dd>
              </div>
            )}
            {job.job_assigned_to && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Assigned To</dt>
                <dd className="font-medium">{job.job_assigned_to}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Billing */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Billing
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Billing Amount</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(job.billing_amount)}
              </dd>
            </div>
            {job.billing_uom && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billing UOM</dt>
                <dd className="font-medium">{job.billing_uom}</dd>
              </div>
            )}
            {financials && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Est. Profit</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(financials.profit_amount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Margin</dt>
                  <dd className="font-medium">
                    {financials.profit_margin_pct.toFixed(1)}%
                    <span className="ml-1">
                      <Badge
                        color={
                          financials.margin_tier === 'A'
                            ? 'green'
                            : financials.margin_tier === 'B'
                              ? 'yellow'
                              : financials.margin_tier === 'C'
                                ? 'orange'
                                : 'red'
                        }
                      >
                        Tier {financials.margin_tier}
                      </Badge>
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Est. Total Cost</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(financials.cost_total)}
                  </dd>
                </div>
              </>
            )}
            {job.invoice_description && (
              <div>
                <dt className="text-muted-foreground">Invoice Description</dt>
                <dd className="font-medium mt-1">
                  {job.invoice_description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quality & Notes */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Quality & Notes
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            {job.quality_score != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quality Score</dt>
                <dd className="font-medium">{job.quality_score}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last Service</dt>
              <dd className="font-medium">
                {formatDate(job.last_service_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Next Service</dt>
              <dd className="font-medium">
                {formatDate(job.next_service_date)}
              </dd>
            </div>
            {job.specifications && (
              <div>
                <dt className="text-muted-foreground">Specifications</dt>
                <dd className="mt-1 whitespace-pre-wrap">
                  {job.specifications}
                </dd>
              </div>
            )}
            {job.special_requirements && (
              <div>
                <dt className="text-muted-foreground">
                  Special Requirements
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">
                  {job.special_requirements}
                </dd>
              </div>
            )}
            {job.notes && (
              <div>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap">{job.notes}</dd>
              </div>
            )}
            {!job.specifications &&
              !job.special_requirements &&
              !job.notes &&
              job.quality_score == null && (
                <p className="text-muted-foreground">
                  No quality data or notes recorded.
                </p>
              )}
          </dl>
        </div>

        {/* Staff Assignments */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Staff Assignments
              </span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {assignments.length}
              {job.staff_needed != null ? ` / ${job.staff_needed}` : ''} assigned
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto] mb-4">
            <select
              value={assignStaffId}
              onChange={(e) => setAssignStaffId(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Select staff member...</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.staff_code})
                </option>
              ))}
            </select>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Role (optional)</option>
              <option value="LEAD">Lead</option>
              <option value="CLEANER">Cleaner</option>
              <option value="INSPECTOR">Inspector</option>
              <option value="SUPERVISOR">Supervisor</option>
            </select>
            <button
              type="button"
              onClick={handleAssignStaff}
              disabled={assigning || !assignStaffId}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {assignment.staff?.full_name ?? 'Unknown staff'}
                      {assignment.staff?.staff_code ? (
                        <span className="ml-1 text-xs text-muted-foreground font-mono">
                          ({assignment.staff.staff_code})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.role ?? 'Assigned'} • Start {formatDate(assignment.start_date)}
                      {assignment.end_date ? ` • End ${formatDate(assignment.end_date)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    disabled={removingAssignmentId === assignment.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(job.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(job.updated_at).toLocaleDateString()}</p>
      </div>

      <ActivityHistorySection
        entityType="site_jobs"
        entityId={job.id}
        entityCode={job.job_code}
        notes={job.notes}
        entityUpdatedAt={job.updated_at}
        ticketScope={{ jobIds: [job.id] }}
        inspectionScope={{ jobIds: [job.id] }}
      />

      {/* Edit Form */}
      <JobForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setJobFormFocus(undefined);
        }}
        initialData={job}
        onSuccess={fetchJob}
        focusSection={jobFormFocus}
      />

      <ArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        entityName="Job"
        loading={archiveLoading}
      />
    </div>
  );
}
