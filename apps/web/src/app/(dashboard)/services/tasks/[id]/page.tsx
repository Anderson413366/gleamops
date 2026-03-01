'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Gauge,
  Layers,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Task } from '@gleamops/shared';
import { TaskForm } from '@/components/forms/task-form';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';

interface JobUsageRow {
  job?: {
    id: string;
    job_code: string;
    job_name: string | null;
    status: string;
    frequency: string | null;
    billing_amount: number | null;
    site?: { name: string; site_code: string } | null;
  } | null;
}

const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'purple' | 'orange' | 'gray'> = {
  RESTROOM: 'blue',
  FLOOR_CARE: 'green',
  GENERAL: 'gray',
  SPECIALTY: 'purple',
  EXTERIOR: 'orange',
};

const PRIORITY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray'> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const UNIT_LABELS: Record<string, string> = {
  SQFT_1000: 'per 1,000 sqft',
  EACH: 'Each',
  LINEAR_FT: 'Linear Ft',
  HOUR: 'Hour',
};

function formatCategory(val: string | null) {
  if (!val) return '\u2014';
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const isOperationsTaskCatalog = from === 'operations' || pathname.startsWith('/operations/task-catalog');
  const backHref = isOperationsTaskCatalog ? '/admin?tab=task-catalog' : '/services';
  const backLabel = isOperationsTaskCatalog ? 'Back to Task Catalog' : 'Back to Services Library';
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [taskFormFocus, setTaskFormFocus] = useState<'basics' | 'classification' | 'production' | 'descriptions' | 'status' | undefined>(undefined);
  const [serviceCount, setServiceCount] = useState(0);
  const [jobUsage, setJobUsage] = useState<JobUsageRow[]>([]);

  const fetchTask = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('task_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const t = data as unknown as Task;
      setTask(t);

      // Count how many services use this task
      const { count } = await supabase
        .from('service_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', t.id)
        .is('archived_at', null);
      setServiceCount(count ?? 0);

      const { data: jobsData } = await supabase
        .from('job_tasks')
        .select('job:site_jobs!job_tasks_job_id_fkey(id, job_code, job_name, status, frequency, billing_amount, site:sites!site_jobs_site_id_fkey(name, site_code))')
        .eq('task_id', t.id)
        .is('archived_at', null);

      const uniqueJobs = new Map<string, JobUsageRow['job']>();
      for (const row of (jobsData as JobUsageRow[] | null) ?? []) {
        if (row.job?.id) uniqueJobs.set(row.job.id, row.job);
      }
      setJobUsage(Array.from(uniqueJobs.values()).map((job) => ({ job })));
    }
    setLoading(false);
  };

  const handleStatusToggle = async () => {
    if (!task) return;
    setStatusLoading(true);
    const supabase = getSupabaseBrowserClient();
    const nextIsActive = !task.is_active;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_active: nextIsActive,
        })
        .eq('id', task.id)
        .eq('version_etag', task.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(nextIsActive ? 'Task reactivated' : 'Task deactivated');
      await fetchTask();
    } finally {
      setStatusLoading(false);
      setStatusModalOpen(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Task not found.</p>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      </div>
    );
  }

  const productionRateDisplay =
    task.production_rate ??
    (task.production_rate_sqft_per_hour != null
      ? `${task.production_rate_sqft_per_hour.toLocaleString()} ${task.unit_code === 'SQFT_1000' ? 'Per Thousand Sq. Ft.' : 'Each'}`
      : '\u2014');

  const taskCompletenessItems: CompletenessItem[] = [
    { key: 'name', label: 'Task Name', isComplete: isFieldComplete(task.name), section: 'basics' },
    { key: 'unit_code', label: 'Unit', isComplete: isFieldComplete(task.unit_code), section: 'basics' },
    { key: 'category', label: 'Category', isComplete: isFieldComplete(task.category), section: 'classification' },
    { key: 'priority', label: 'Priority Level', isComplete: isFieldComplete(task.priority_level), section: 'classification' },
    { key: 'production_rate', label: 'Production Rate', isComplete: isFieldComplete(task.production_rate_sqft_per_hour), section: 'production' },
    { key: 'default_minutes', label: 'Default Minutes', isComplete: isFieldComplete(task.default_minutes), section: 'production' },
    { key: 'spec_description', label: 'Spec Description', isComplete: isFieldComplete(task.spec_description), section: 'descriptions' },
    { key: 'work_description', label: 'Work Description', isComplete: isFieldComplete(task.work_description), section: 'descriptions' },
    { key: 'tools_materials', label: 'Tools & Materials', isComplete: isFieldComplete(task.tools_materials), section: 'descriptions' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(task.notes), section: 'status' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {task.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {task.task_code}
              </span>
              <Badge color={task.is_active ? 'green' : 'red'}>
                {task.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge color="gray">{`Updated ${formatRelativeDateTime(task.updated_at)}`}</Badge>
              {task.category && (
                <Badge color={CATEGORY_COLORS[task.category] ?? 'gray'}>
                  {formatCategory(task.category)}
                </Badge>
              )}
              {task.priority_level && (
                <Badge color={PRIORITY_COLORS[task.priority_level] ?? 'gray'}>
                  {task.priority_level}
                </Badge>
              )}
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
          <button
            onClick={() => setStatusModalOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              task.is_active
                ? 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900/40'
                : 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-950/30'
            }`}
          >
            {task.is_active ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {task.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Task Profile"
        items={taskCompletenessItems}
        onNavigateToMissing={(item) => {
          setTaskFormFocus((item.section as 'basics' | 'classification' | 'production' | 'descriptions' | 'status' | undefined) ?? 'basics');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{formatCategory(task.category)}</p>
          <p className="text-xs text-muted-foreground">Category</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{task.priority_level ?? '\u2014'}</p>
          <p className="text-xs text-muted-foreground">Priority</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {task.default_minutes != null ? `${task.default_minutes} min` : '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Est. Minutes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{productionRateDisplay}</p>
          <p className="text-xs text-muted-foreground">Production Rate</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Classification */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Classification
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium">{formatCategory(task.category)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subcategory</dt>
              <dd className="font-medium">{formatCategory(task.subcategory)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Area Type</dt>
              <dd className="font-medium">{task.area_type ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Floor Type</dt>
              <dd className="font-medium">{task.floor_type ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Priority Level</dt>
              <dd className="font-medium">{task.priority_level ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Task Type</dt>
              <dd className="font-medium">{task.task_type ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Position</dt>
              <dd className="font-medium">{task.position ?? '\u2014'}</dd>
            </div>
          </dl>
        </div>

        {/* Production & Time */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Production & Time
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Production Rate</dt>
              <dd className="font-medium">
                {task.production_rate_sqft_per_hour != null
                  ? `${task.production_rate_sqft_per_hour.toLocaleString()} sqft/hr`
                  : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unit</dt>
              <dd className="font-medium">
                {UNIT_LABELS[task.unit_code] ?? task.unit_code}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Default Minutes</dt>
              <dd className="font-medium">
                {task.default_minutes != null ? `${task.default_minutes} min` : '\u2014'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Descriptions */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Description & Instructions
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            {task.description && (
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">
                  {task.description}
                </dd>
              </div>
            )}
            {task.spec_description && (
              <div>
                <dt className="text-muted-foreground">Spec Description</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">
                  {task.spec_description}
                </dd>
              </div>
            )}
            {task.work_description && (
              <div>
                <dt className="text-muted-foreground">Work Description</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">
                  {task.work_description}
                </dd>
              </div>
            )}
            {task.instructions && (
              <div>
                <dt className="text-muted-foreground">Step-by-Step Instructions</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">
                  {task.instructions}
                </dd>
              </div>
            )}
            {!task.description && !task.spec_description && !task.work_description && !task.instructions && (
              <p className="text-muted-foreground">No descriptions recorded.</p>
            )}
          </dl>
        </div>

        {/* Tools & Notes */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Tools & Notes
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tools & Materials</dt>
              <dd className="font-medium">{task.tools_materials ?? '\u2014'}</dd>
            </div>
            {task.notes && (
              <div>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">
                  {task.notes}
                </dd>
              </div>
            )}
            {!task.tools_materials && !task.notes && (
              <p className="text-muted-foreground">No tools or notes recorded.</p>
            )}
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Usage in Jobs ({jobUsage.length})
          </span>
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          This task is used in {jobUsage.length} active job scope{jobUsage.length === 1 ? '' : 's'} and {serviceCount} service template{serviceCount === 1 ? '' : 's'}.
        </p>
        {jobUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs currently reference this task.</p>
        ) : (
          <ul className="divide-y divide-border">
            {jobUsage.map((item, index) => (
              <li key={`${item.job?.id ?? 'job'}-${index}`} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  {item.job?.job_code ? (
                    <Link
                      href={`/operations/jobs/${encodeURIComponent(item.job.job_code)}`}
                      className="truncate text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {item.job.job_name ?? item.job.job_code} ({item.job.job_code})
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">Unknown Job</p>
                  )}
                  {item.job?.site?.site_code && (
                    <p className="text-xs text-muted-foreground">
                      {item.job.site.name ?? item.job.site.site_code} ({item.job.site.site_code})
                      {item.job.frequency ? ` · ${item.job.frequency.replace(/_/g, ' ')}` : ''}
                      {item.job.billing_amount != null ? ` · $${Math.round(item.job.billing_amount).toLocaleString()}/mo` : ''}
                    </p>
                  )}
                </div>
                {item.job?.status && (
                  <Badge color={item.job.status === 'ACTIVE' ? 'green' : 'gray'}>
                    {item.job.status}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(task.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(task.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setTaskFormFocus(undefined);
        }}
        initialData={task}
        onSuccess={fetchTask}
        focusSection={taskFormFocus}
      />

      <StatusToggleDialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={handleStatusToggle}
        loading={statusLoading}
        entityLabel="Task"
        entityName={task.name}
        mode={task.is_active ? 'deactivate' : 'reactivate'}
        warning={task.is_active && serviceCount > 0
          ? `This task is currently linked to ${serviceCount} active service plan${serviceCount === 1 ? '' : 's'} that may be affected.`
          : null}
      />
    </div>
  );
}
