'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Pencil,
  PauseCircle,
  PlayCircle,
  Calendar,
  DollarSign,
  ClipboardList,
  AlertTriangle,
  UserPlus,
  X,
  ListChecks,
  GripVertical,
  Clock3,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton, SlideOver, Button } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { JOB_STATUS_COLORS } from '@gleamops/shared';
import { JobForm } from '@/components/forms/job-form';
import {
  computeJobFinancials,
  type JobFinancialResult,
} from '@/lib/utils/job-financials';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { EntityLink } from '@/components/links/entity-link';

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

interface TaskCatalogRow {
  id: string;
  task_code: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  priority_level: string | null;
  default_minutes: number | null;
  is_active: boolean | null;
}

interface JobTaskWithCatalogRow {
  id: string;
  task_id: string | null;
  task_code: string | null;
  task_name: string | null;
  sequence_order: number | null;
  is_required: boolean;
  wait_after: boolean;
  estimated_minutes: number | null;
  custom_minutes: number | null;
  planned_minutes: number | null;
  notes: string | null;
  status: string | null;
  task?: TaskCatalogRow | null;
}

interface JobLogRow {
  id: string;
  log_date: string | null;
  event_type: string | null;
  severity: string | null;
  message: string | null;
  status: string | null;
}

interface AssignedTaskDraft {
  tempId: string;
  taskId: string | null;
  taskCode: string;
  taskName: string;
  category: string | null;
  isRequired: boolean;
  waitAfter: boolean;
  estimatedMinutes: number;
  notes: string | null;
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

const LOG_SEVERITY_COLORS: Record<string, 'red' | 'orange' | 'yellow' | 'gray'> = {
  CRITICAL: 'red',
  MAJOR: 'orange',
  MINOR: 'yellow',
};

const LOG_STATUS_COLORS: Record<string, 'red' | 'yellow' | 'green' | 'gray'> = {
  OPEN: 'red',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  '2X_WEEK': '2×/Week',
  '3X_WEEK': '3×/Week',
  '4X_WEEK': '4×/Week',
  '5X_WEEK': '5×/Week',
  '6X_WEEK': '6×/Week',
};

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateText(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
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

function notSet(required = false) {
  return (
    <span className={required ? 'italic text-red-600 dark:text-red-300' : 'italic text-muted-foreground'}>
      Not Set
    </span>
  );
}

function formatDateSafe(value: string | null | undefined, required = false) {
  const formatted = formatDateText(value);
  return formatted ?? notSet(required);
}

function frequencyLabel(value: string | null | undefined) {
  if (!value) return null;
  return FREQUENCY_LABELS[value] ?? value.replace(/_/g, ' ');
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

function formatHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 1 : 2)} h`;
}

function formatCategoryLabel(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [jobFormFocus, setJobFormFocus] = useState<'assignment' | 'schedule' | 'tasks' | undefined>(undefined);
  const [manageTasksOpen, setManageTasksOpen] = useState(false);
  const [manageTasksSaving, setManageTasksSaving] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Related data
  const [taskCount, setTaskCount] = useState(0);
  const [jobTasks, setJobTasks] = useState<JobTaskWithCatalogRow[]>([]);
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogRow[]>([]);
  const [taskDraft, setTaskDraft] = useState<AssignedTaskDraft[]>([]);
  const [financials, setFinancials] = useState<JobFinancialResult | null>(null);
  const [assignments, setAssignments] = useState<JobStaffAssignmentRow[]>([]);
  const [jobLogs, setJobLogs] = useState<JobLogRow[]>([]);
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

  const fetchTaskCatalog = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('id, task_code, name, category, subcategory, priority_level, default_minutes, is_active')
      .is('archived_at', null)
      .eq('is_active', true)
      .order('name');
    if (error) {
      toast.error(error.message);
      return;
    }
    setTaskCatalog((data as TaskCatalogRow[]) ?? []);
  };

  const fetchJobLogs = async (jobId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('job_logs')
      .select('id, log_date, event_type, severity, message, status')
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('log_date', { ascending: false })
      .limit(30);

    if (error) {
      toast.error(error.message);
      setJobLogs([]);
      return;
    }

    setJobLogs((data as JobLogRow[]) ?? []);
  };

  const fetchJobTasks = async (jobId: string) => {
    const supabase = getSupabaseBrowserClient();

    const nextStateFromRows = (rows: JobTaskWithCatalogRow[]) => {
      const ordered = [...rows].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
      setJobTasks(ordered);
      setTaskCount(ordered.length);
    };

    const primary = await supabase
      .from('job_tasks')
      .select('id, task_id, task_code, task_name, sequence_order, is_required, wait_after, estimated_minutes, custom_minutes, planned_minutes, notes, status, task:task_id(id, task_code, name, category, subcategory, priority_level, default_minutes, is_active)')
      .eq('job_id', jobId)
      .is('archived_at', null);

    if (!primary.error) {
      nextStateFromRows((primary.data as unknown as JobTaskWithCatalogRow[]) ?? []);
      return;
    }

    // Backward-compatible fallback for environments that have not applied new task columns yet.
    const fallback = await supabase
      .from('job_tasks')
      .select('id, task_id, task_code, task_name, is_required, planned_minutes, notes, status, task:task_id(id, task_code, name, category, subcategory, priority_level, default_minutes, is_active)')
      .eq('job_id', jobId)
      .is('archived_at', null);

    if (fallback.error) {
      toast.error(fallback.error.message);
      setJobTasks([]);
      setTaskCount(0);
      return;
    }

    const rows = ((fallback.data as unknown as JobTaskWithCatalogRow[]) ?? []).map((row, index) => ({
      ...row,
      sequence_order: row.sequence_order ?? index + 1,
      estimated_minutes: row.estimated_minutes ?? row.custom_minutes ?? row.planned_minutes,
      custom_minutes: row.custom_minutes ?? row.estimated_minutes ?? row.planned_minutes,
      wait_after: row.wait_after ?? false,
    }));
    nextStateFromRows(rows);
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
      await Promise.all([fetchJobTasks(j.id), fetchTaskCatalog(), fetchJobLogs(j.id)]);

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
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('job_staff_assignments')
      .update({
        archived_at: new Date().toISOString(),
        archived_by: authData.user?.id ?? null,
        archive_reason: 'Assignment removed from service plan detail page',
      })
      .eq('id', assignmentId)
      .is('archived_at', null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Assignment removed');
      await fetchAssignments(job.id);
    }
    setRemovingAssignmentId(null);
  };

  const openManageTasks = () => {
    const draft = jobTasks.map((task, index) => ({
      tempId: task.id || `${task.task_id ?? 'legacy'}-${index}`,
      taskId: task.task_id ?? null,
      taskCode: task.task?.task_code ?? task.task_code ?? 'TASK',
      taskName: task.task?.name ?? task.task_name ?? 'Unnamed Task',
      category: task.task?.category ?? null,
      isRequired: task.is_required ?? true,
      waitAfter: task.wait_after ?? false,
      estimatedMinutes: Number(task.estimated_minutes ?? task.planned_minutes ?? task.task?.default_minutes ?? 1),
      notes: task.notes ?? null,
    }));
    setTaskDraft(draft);
    setTaskSearch('');
      setTaskCategoryFilter('all');
      setExpandedCategories({});
      setManageTasksOpen(true);
  };

  const handleAddCatalogTask = (task: TaskCatalogRow) => {
    setTaskDraft((prev) => {
      const existing = prev.find((item) => item.taskId === task.id);
      if (existing) return prev;
      return [
        ...prev,
        {
          tempId: `${task.id}-${Date.now()}`,
          taskId: task.id,
          taskCode: task.task_code,
          taskName: task.name,
          category: task.category,
          isRequired: true,
          waitAfter: false,
          estimatedMinutes: Number(task.default_minutes ?? 10),
          notes: null,
        },
      ];
    });
  };

  const handleSaveTaskPlan = async () => {
    if (!job) return;
    setManageTasksSaving(true);
    const supabase = getSupabaseBrowserClient();

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const { error: archiveError } = await supabase
        .from('job_tasks')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: userId,
          archive_reason: 'Replaced via Manage Tasks',
        })
        .eq('job_id', job.id)
        .is('archived_at', null);

      if (archiveError) {
        toast.error(archiveError.message);
        return;
      }

      if (taskDraft.length > 0) {
        const insertRows = taskDraft.map((task, index) => ({
          tenant_id: job.tenant_id,
          job_id: job.id,
          task_id: task.taskId,
          task_code: task.taskCode,
          task_name: task.taskName,
          sequence_order: index + 1,
          is_required: task.isRequired,
          wait_after: task.waitAfter,
          estimated_minutes: Math.max(0, Number(task.estimatedMinutes || 0)),
          custom_minutes: Math.max(0, Number(task.estimatedMinutes || 0)),
          planned_minutes: Math.max(0, Math.round(Number(task.estimatedMinutes || 0))),
          status: 'ACTIVE',
          notes: task.notes,
        }));

        const { error: insertError } = await supabase.from('job_tasks').insert(insertRows);
        if (insertError) {
          toast.error(insertError.message);
          return;
        }
      }

      toast.success('Job task scope updated');
      setManageTasksOpen(false);
      await fetchJobTasks(job.id);
    } finally {
      setManageTasksSaving(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async () => {
    if (!job) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const normalizedStatus = (job.status ?? '').toUpperCase();
    const isInactive = normalizedStatus === 'ON_HOLD' || normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED';
    const nextStatus = isInactive ? 'ACTIVE' : 'ON_HOLD';
    try {
      const { error } = await supabase
        .from('site_jobs')
        .update({
          status: nextStatus,
        })
        .eq('id', job.id)
        .eq('version_etag', job.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${job.job_code}`);
      await fetchJob();
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
        <p className="text-lg text-muted-foreground">Service plan not found.</p>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Service Plans
        </Link>
      </div>
    );
  }

  const marginPct = financials
    ? `${financials.profit_margin_pct.toFixed(1)}%`
    : 'Not Set';
  const startsIn = formatRelativeDate(job.start_date);
  const updatedAgo = formatRelativeDateTime(job.updated_at);
  const isInactive = ['ON_HOLD', 'CANCELED', 'CANCELLED'].includes((job.status ?? '').toUpperCase());
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
  const taskCategories = Array.from(
    new Set(taskCatalog.map((task) => task.category?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));
  const filteredCatalogTasks = taskCatalog.filter((task) => {
    if (taskCategoryFilter !== 'all' && (task.category ?? 'Uncategorized') !== taskCategoryFilter) return false;
    if (!taskSearch.trim()) return true;
    const q = taskSearch.trim().toLowerCase();
    return (
      task.name.toLowerCase().includes(q) ||
      task.task_code.toLowerCase().includes(q) ||
      (task.category ?? '').toLowerCase().includes(q) ||
      (task.subcategory ?? '').toLowerCase().includes(q)
    );
  });
  const groupedCatalogTasks = filteredCatalogTasks.reduce<Record<string, TaskCatalogRow[]>>((acc, task) => {
    const key = task.category ?? 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});
  const catalogCategoryOrder = Object.keys(groupedCatalogTasks).sort((a, b) => a.localeCompare(b));
  const totalTaskMinutes = jobTasks.reduce(
    (sum, row) =>
      sum + Number(row.custom_minutes ?? row.estimated_minutes ?? row.planned_minutes ?? row.task?.default_minutes ?? 0),
    0
  );
  const estimatedHoursPerService = totalTaskMinutes > 0
    ? Number((totalTaskMinutes / 60).toFixed(2))
    : (job.estimated_hours_per_service ?? null);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Service Plans
      </Link>
      <div className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1">›</span>
        <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
        <span className="mx-1">›</span>
        <span>Service Plans</span>
        <span className="mx-1">›</span>
        <span className="font-mono">{job.job_code}</span>
      </div>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {job.job_name ? `Service Plan — ${job.job_name}` : `Service Plan ${job.job_code}`}
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
                  {frequencyLabel(job.frequency)}
                </Badge>
              )}
              {startsIn && <Badge color="blue">{`Starts ${startsIn}`}</Badge>}
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
        title="Service Plan Profile"
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
              <dd className="font-medium">{frequencyLabel(job.frequency) ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Schedule Days</dt>
              <dd className="font-medium">{job.schedule_days ?? notSet(true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Start Time</dt>
              <dd className="font-medium">{job.start_time ?? notSet(true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">End Time</dt>
              <dd className="font-medium">{job.end_time ?? notSet(true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Start Date</dt>
              <dd className="font-medium">{formatDateSafe(job.start_date, true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">End Date</dt>
              <dd className="font-medium">{formatDateSafe(job.end_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Staff Needed</dt>
              <dd className="font-medium">{job.staff_needed ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Est. Hours / Service
              </dt>
              <dd className="font-medium">
                {estimatedHoursPerService != null ? estimatedHoursPerService : notSet()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Est. Hours / Month</dt>
              <dd className="font-medium">
                {job.estimated_hours_per_month ?? notSet()}
              </dd>
            </div>
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
                {job.site?.site_code
                  ? <EntityLink entityType="site" code={job.site.site_code} name={job.site.name ?? job.site.site_code} />
                  : notSet(true)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">
                {job.site?.client?.client_code
                  ? <EntityLink entityType="client" code={job.site.client.client_code} name={job.site.client.name ?? job.site.client.client_code} />
                  : notSet(true)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Job Type</dt>
              <dd className="font-medium">{job.job_type ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="font-medium">{job.priority_level ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd className="font-medium">{job.job_assigned_to ?? notSet()}</dd>
            </div>
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
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Billing UOM</dt>
              <dd className="font-medium">{job.billing_uom ?? notSet(true)}</dd>
            </div>
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
            <div>
              <dt className="text-muted-foreground">Invoice Description</dt>
              <dd className="font-medium mt-1">
                {job.invoice_description ?? notSet()}
              </dd>
            </div>
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
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quality Score</dt>
              <dd className="font-medium">{job.quality_score ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last Service</dt>
              <dd className="font-medium">
                {formatDateSafe(job.last_service_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Next Service</dt>
              <dd className="font-medium">
                {formatDateSafe(job.next_service_date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Specifications</dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {job.specifications ?? notSet()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Special Requirements
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {job.special_requirements ?? notSet()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">{job.notes ?? notSet()}</dd>
            </div>
          </dl>
        </div>

        {/* Job Tasks (Scope of Work) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              <span className="inline-flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Job Tasks ({taskCount})
              </span>
            </h3>
            <button
              type="button"
              onClick={openManageTasks}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Manage Tasks
            </button>
          </div>

          {jobTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks configured for this service plan yet. Click <span className="font-medium">Manage Tasks</span> to assign scope of work.
            </p>
          ) : (
            <ul className="space-y-3">
              {jobTasks.map((task) => {
                const taskName = task.task?.name ?? task.task_name ?? 'Unnamed Task';
                const taskCode = task.task?.task_code ?? task.task_code ?? 'TASK';
                const minutes = Number(task.custom_minutes ?? task.estimated_minutes ?? task.planned_minutes ?? task.task?.default_minutes ?? 0);
                return (
                  <li key={task.id} className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                    <p className="text-[15px] font-semibold text-foreground">{taskName}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {taskCode} · {minutes > 0 ? `${minutes} min` : 'Not Set'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {task.is_required && <Badge color="blue">Required</Badge>}
                      {task.wait_after && <Badge color="gray">WAIT</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>Total Estimated Time: {Number(totalTaskMinutes.toFixed(2))} minutes</span>
            <span>·</span>
            <span>Est. Hours / Service: {formatHoursFromMinutes(totalTaskMinutes)}</span>
          </div>
        </div>

        {/* Job Log */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Job Log ({jobLogs.length})
            </span>
          </h3>

          {jobLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job log entries recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {jobLogs.map((log) => (
                <li key={log.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{log.event_type ?? 'Log Entry'}</p>
                      {log.message ? <p className="mt-0.5 text-xs text-muted-foreground">{log.message}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateText(log.log_date) ?? 'Unknown date'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={LOG_SEVERITY_COLORS[(log.severity ?? '').toUpperCase()] ?? 'gray'}>
                        {log.severity ?? 'n/a'}
                      </Badge>
                      <Badge color={LOG_STATUS_COLORS[(log.status ?? '').toUpperCase()] ?? 'gray'}>
                        {log.status ?? 'n/a'}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
                      {assignment.staff?.staff_code
                        ? <EntityLink entityType="staff" code={assignment.staff.staff_code} name={assignment.staff.full_name ?? assignment.staff.staff_code} />
                        : (assignment.staff?.full_name ?? 'Unknown staff')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.role ?? 'Assigned'} • Start {formatDateSafe(assignment.start_date)}
                      {assignment.end_date ? ` • End ${formatDateText(assignment.end_date) ?? 'Not Set'}` : ''}
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

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Service Plan"
        entityName={job.job_name || job.job_code}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && assignments.length > 0
          ? `⚠️ This service plan has ${assignments.length} assigned staff member${assignments.length === 1 ? '' : 's'} that may be affected.`
          : null}
        loading={archiveLoading}
      />

      <SlideOver
        open={manageTasksOpen}
        onClose={() => setManageTasksOpen(false)}
        title="Manage Tasks"
        subtitle={job.job_name ?? job.job_code}
        wide
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Drag tasks from top to bottom to set sequence order. Configure required, wait, and estimated minutes for each scope item.
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Available Task Catalog</h3>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
                <input
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Search task name or code"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-0 focus:border-module-accent"
                />
                <select
                  value={taskCategoryFilter}
                  onChange={(event) => setTaskCategoryFilter(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-0 focus:border-module-accent"
                >
                  <option value="all">All Categories</option>
                  {taskCategories.map((category) => (
                    <option key={category} value={category}>{formatCategoryLabel(category)}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {catalogCategoryOrder.map((category) => {
                  const categoryTasks = groupedCatalogTasks[category];
                  const isExpanded = expandedCategories[category] ?? true;
                  return (
                    <div key={category} className="rounded-lg border border-border bg-background">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                        onClick={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [category]: !(prev[category] ?? true),
                          }))
                        }
                      >
                        <span className="text-sm font-medium text-foreground">
                          {formatCategoryLabel(category)} ({categoryTasks.length})
                        </span>
                        <span className="text-xs text-muted-foreground">{isExpanded ? 'Hide' : 'Show'}</span>
                      </button>
                      {isExpanded && (
                        <div className="space-y-2 border-t border-border px-3 py-2">
                          {categoryTasks.map((task) => {
                            const isAssigned = taskDraft.some((assigned) => assigned.taskId === task.id);
                            return (
                              <div key={task.id} className="rounded-lg border border-border bg-card p-3">
                                <p className="text-sm font-medium text-foreground">{task.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {task.task_code}
                                  {task.subcategory ? ` · ${formatCategoryLabel(task.subcategory)}` : ''}
                                </p>
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleAddCatalogTask(task)}
                                    disabled={isAssigned}
                                  >
                                    {isAssigned ? 'Assigned' : '+ Add'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredCatalogTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tasks match your filters.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Assigned Scope of Work</h3>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {taskDraft.map((task, index) => (
                  <div
                    key={task.tempId}
                    draggable
                    onDragStart={() => setDraggedTaskIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedTaskIndex == null || draggedTaskIndex === index) return;
                      setTaskDraft((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(draggedTaskIndex, 1);
                        next.splice(index, 0, moved);
                        return next;
                      });
                      setDraggedTaskIndex(null);
                    }}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{task.taskName}</p>
                        <p className="text-xs text-muted-foreground">{task.taskCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTaskDraft((prev) => prev.filter((row) => row.tempId !== task.tempId))}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={task.isRequired}
                          onChange={(event) =>
                            setTaskDraft((prev) =>
                              prev.map((row) =>
                                row.tempId === task.tempId ? { ...row, isRequired: event.target.checked } : row
                              )
                            )
                          }
                        />
                        Required
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={task.waitAfter}
                          onChange={(event) =>
                            setTaskDraft((prev) =>
                              prev.map((row) =>
                                row.tempId === task.tempId ? { ...row, waitAfter: event.target.checked } : row
                              )
                            )
                          }
                        />
                        WAIT
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={task.estimatedMinutes}
                        onChange={(event) =>
                          setTaskDraft((prev) =>
                            prev.map((row) =>
                              row.tempId === task.tempId
                                ? { ...row, estimatedMinutes: Number(event.target.value || 0) }
                                : row
                            )
                          )
                        }
                        className="h-9 rounded-lg border border-border bg-background px-3 text-xs"
                        placeholder="Minutes"
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                ))}
                {taskDraft.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setManageTasksOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={manageTasksSaving} onClick={handleSaveTaskPlan}>
              Save Task Plan
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
