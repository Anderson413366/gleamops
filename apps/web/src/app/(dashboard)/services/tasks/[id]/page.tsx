'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  Archive,
  AlertTriangle,
  Gauge,
  Layers,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ArchiveDialog, Badge, Skeleton } from '@gleamops/ui';
import type { Task } from '@gleamops/shared';
import { TaskForm } from '@/components/forms/task-form';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';

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
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [taskFormFocus, setTaskFormFocus] = useState<'basics' | 'classification' | 'production' | 'descriptions' | 'status' | undefined>(undefined);
  const [serviceCount, setServiceCount] = useState(0);

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
    }
    setLoading(false);
  };

  const handleArchive = async (reason: string) => {
    if (!task) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('tasks')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: reason,
        })
        .eq('id', task.id)
        .eq('version_etag', task.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Task archived');
      router.push('/services');
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
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
          href="/services"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Services Library
        </Link>
      </div>
    );
  }

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
        href="/services"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Services Library
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
            onClick={() => setArchiveOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
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
          <p className="text-2xl font-bold text-foreground">
            {task.production_rate_sqft_per_hour != null
              ? `${task.production_rate_sqft_per_hour.toLocaleString()}`
              : '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Prod. Rate (sqft/hr)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {UNIT_LABELS[task.unit_code] ?? task.unit_code}
          </p>
          <p className="text-xs text-muted-foreground">Unit of Measure</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {task.default_minutes != null ? `${task.default_minutes} min` : '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Default Minutes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{serviceCount}</p>
          <p className="text-xs text-muted-foreground">Used in Services</p>
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
              Descriptions
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
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
            {!task.spec_description && !task.work_description && (
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

      <ArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        entityName="Task"
        loading={archiveLoading}
      />
    </div>
  );
}
