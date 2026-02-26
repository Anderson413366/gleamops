'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, CheckCircle2, Pencil, RefreshCw, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { PeriodicTask, PeriodicTaskDetail as PeriodicTaskDetailType } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PeriodicTaskForm } from '@/components/forms/periodic-task-form';

interface PeriodicTaskDetailProps {
  periodicCode: string;
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'PAUSED':
      return 'yellow';
    case 'ARCHIVED':
      return 'gray';
    default:
      return 'gray';
  }
}

export function PeriodicTaskDetail({ periodicCode }: PeriodicTaskDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [periodicTask, setPeriodicTask] = useState<PeriodicTaskDetailType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operations/periodic-tasks/${encodeURIComponent(periodicCode)}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load periodic task.');
      }
      setPeriodicTask(body.data as PeriodicTaskDetailType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load periodic task.');
    } finally {
      setLoading(false);
    }
  }, [periodicCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const daysUntilDue = useMemo(() => {
    if (!periodicTask) return null;
    const today = new Date();
    const due = new Date(`${periodicTask.next_due_date}T00:00:00.000Z`);
    const ms = due.getTime() - new Date(today.toISOString().slice(0, 10)).getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [periodicTask]);

  const complete = async () => {
    if (!periodicTask) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/periodic-tasks/${encodeURIComponent(periodicTask.periodic_code)}/complete`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to complete periodic task.');
      }
      toast.success('Periodic task completed.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete periodic task.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!periodicTask) return;
    const confirmed = window.confirm('Archive this periodic task?');
    if (!confirmed) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/operations/periodic-tasks/${encodeURIComponent(periodicTask.periodic_code)}/archive`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ reason: 'Archived from periodic task detail page' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to archive periodic task.');
      }
      toast.success('Periodic task archived.');
      router.push('/operations?tab=periodic');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive periodic task.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">Loading periodic task...</CardContent>
        </Card>
      </div>
    );
  }

  if (!periodicTask) {
    return (
      <div className="space-y-4">
        <Link href="/operations?tab=periodic" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Operations
        </Link>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">Periodic task not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/operations?tab=periodic" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Operations
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
              <RefreshCw className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{periodicTask.periodic_code}</h1>
              <p className="text-sm text-muted-foreground">
                {periodicTask.site_job?.site?.name ?? periodicTask.site_job?.site?.site_code ?? periodicTask.site_job?.job_code ?? 'Unknown site'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={statusColor(periodicTask.status)}>{periodicTask.status}</Badge>
            <Badge color="blue">{periodicTask.frequency}</Badge>
            {periodicTask.is_overdue ? <Badge color="red">OVERDUE</Badge> : null}
            {!periodicTask.is_overdue && periodicTask.is_due_soon ? <Badge color="yellow">DUE SOON</Badge> : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Task Type</p><p className="text-sm font-semibold text-foreground">{periodicTask.task_type.replaceAll('_', ' ')}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Next Due</p><p className="text-sm font-semibold text-foreground">{new Date(`${periodicTask.next_due_date}T00:00:00.000Z`).toLocaleDateString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Days Until Due</p><p className="text-sm font-semibold text-foreground">{daysUntilDue == null ? 'N/A' : daysUntilDue}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Last Done</p><p className="text-sm font-semibold text-foreground">{periodicTask.last_completed_at ? new Date(periodicTask.last_completed_at).toLocaleString() : 'Never'}</p></CardContent></Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Task Settings</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Frequency</dt><dd className="font-medium text-foreground">{periodicTask.frequency}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Custom interval</dt><dd className="font-medium text-foreground">{periodicTask.custom_interval_days ?? 'N/A'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Auto-add to route</dt><dd className="font-medium text-foreground">{periodicTask.auto_add_to_route ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Evidence required</dt><dd className="font-medium text-foreground">{periodicTask.evidence_required ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Preferred Staff</dt><dd className="font-medium text-foreground">{periodicTask.preferred_staff?.full_name ?? periodicTask.preferred_staff?.staff_code ?? 'Unassigned'}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{periodicTask.notes ?? 'No notes provided.'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Completion History</CardTitle></CardHeader>
        <CardContent>
          {periodicTask.completion_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completion history found yet.</p>
          ) : (
            <div className="space-y-2">
              {periodicTask.completion_history.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.completed_at).toLocaleString()} - Route {item.route_id} ({new Date(item.route_date).toLocaleDateString()})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.site_name ?? item.site_code ?? 'Unknown site'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setFormOpen(true)} variant="secondary" disabled={saving}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button onClick={() => void complete()} disabled={saving || periodicTask.status !== 'ACTIVE'}>
            <CheckCircle2 className="h-4 w-4" />
            Mark Complete
          </Button>
          <Button onClick={() => void archive()} variant="secondary" disabled={saving || periodicTask.status === 'ARCHIVED'}>
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </CardContent>
      </Card>

      <PeriodicTaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={periodicTask as PeriodicTask}
        onSuccess={async () => {
          setFormOpen(false);
          await load();
        }}
      />
    </div>
  );
}
