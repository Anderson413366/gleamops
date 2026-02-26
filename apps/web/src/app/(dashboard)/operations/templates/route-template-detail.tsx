'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Car, ClipboardCheck, MapPin, Plus, Route, UserRound, Archive, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { RouteTemplate, RouteTemplateStop, RouteTemplateTask } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RouteTemplateForm } from '@/components/forms/route-template-form';
import { RouteTemplateStopForm } from '@/components/forms/route-template-stop-form';
import { RouteTemplateTaskForm } from '@/components/forms/route-template-task-form';

interface TemplateDetail extends RouteTemplate {
  assigned_staff?: { full_name?: string | null; staff_code?: string | null } | null;
  default_vehicle?: { name?: string | null; vehicle_code?: string | null } | null;
  stops: Array<RouteTemplateStop & {
    site_job?: {
      job_code?: string | null;
      site?: { name?: string | null; site_code?: string | null } | null;
    } | null;
    tasks: RouteTemplateTask[];
  }>;
}

interface RouteTemplateDetailProps {
  templateId: string;
  onBack: () => void;
  onRefresh?: () => void;
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function RouteTemplateDetail({ templateId, onBack, onRefresh }: RouteTemplateDetailProps) {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [stopFormOpen, setStopFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editStop, setEditStop] = useState<RouteTemplateStop | null>(null);
  const [editTask, setEditTask] = useState<RouteTemplateTask | null>(null);
  const [taskStopId, setTaskStopId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/operations/route-templates/${templateId}`, { headers, cache: 'no-store' });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load template detail.');
      }

      setTemplate(body.data as TemplateDetail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load template detail.');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const stops = template?.stops ?? [];
    const tasks = stops.flatMap((stop) => stop.tasks ?? []);

    return {
      stopCount: stops.length,
      taskCount: tasks.length,
      evidenceCount: tasks.filter((task) => task.evidence_required).length,
      deliveryCount: tasks.filter((task) => task.task_type === 'DELIVER_PICKUP').length,
    };
  }, [template]);

  const handleArchive = async () => {
    if (!template) return;

    const confirmed = window.confirm('Archive this route template? This will archive its stops and tasks.');
    if (!confirmed) return;

    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/operations/route-templates/${template.id}/archive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'Archived from Operations Route Templates detail' }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? body?.title ?? 'Failed to archive route template.');
      }

      toast.success('Route template archived.');
      onRefresh?.();
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive route template.');
    }
  };

  const handleFormSuccess = async () => {
    onRefresh?.();
    await load();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">Loading route template...</CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">Route template unavailable.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-all duration-200 ease-in-out hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Route Templates
      </button>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Route className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-foreground">{template.label}</p>
                <p className="text-sm text-muted-foreground">{template.template_code}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge color={template.is_active ? 'green' : 'gray'}>{template.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
              <Badge color="blue">{template.weekday}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditTemplateOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit Template
            </Button>
            <Button variant="secondary" className="border-red-200 text-red-600 hover:text-red-700" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Stops</p><p className="text-xl font-semibold text-foreground">{stats.stopCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tasks</p><p className="text-xl font-semibold text-foreground">{stats.taskCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Evidence Required</p><p className="text-xl font-semibold text-foreground">{stats.evidenceCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Delivery Tasks</p><p className="text-xl font-semibold text-foreground">{stats.deliveryCount}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Weekday</dt><dd className="font-medium text-foreground">{template.weekday}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Assigned Staff</dt><dd className="font-medium text-foreground">{template.assigned_staff?.full_name ?? template.assigned_staff?.staff_code ?? 'Unassigned'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Default Vehicle</dt><dd className="font-medium text-foreground">{template.default_vehicle?.name ?? template.default_vehicle?.vehicle_code ?? 'None'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Key Box</dt><dd className="font-medium text-foreground">{template.default_key_box ?? 'Not set'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status</dt><dd className="font-medium text-foreground">{template.is_active ? 'Active' : 'Inactive'}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{template.notes ?? 'No notes added.'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Stops and Tasks</CardTitle>
            <Button onClick={() => { setEditStop(null); setStopFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add Stop
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stops yet. Add your first stop.</p>
          ) : template.stops.map((stop) => (
            <Card key={stop.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Stop {stop.stop_order}</p>
                    <p className="text-xs text-muted-foreground">
                      {stop.site_job?.job_code ?? 'Unknown job'}
                      {stop.site_job?.site?.name ? ` - ${stop.site_job.site.name}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditStop(stop);
                        setStopFormOpen(true);
                      }}
                    >
                      Edit Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setTaskStopId(stop.id);
                        setEditTask(null);
                        setTaskFormOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{stop.site_job?.site?.site_code ?? 'Site not set'}</span>
                  <span>Window: {stop.access_window_start ?? '--:--'} to {stop.access_window_end ?? '--:--'}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {stop.notes ? (
                  <p className="text-sm text-foreground">{stop.notes}</p>
                ) : null}

                {stop.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks at this stop.</p>
                ) : (
                  <div className="space-y-2">
                    {stop.tasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-foreground">
                              {task.description_override ?? task.description_key ?? task.task_type.replaceAll('_', ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color="gray">#{task.task_order}</Badge>
                            {task.evidence_required ? <Badge color="orange">PHOTO</Badge> : null}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setTaskStopId(stop.id);
                                setEditTask(task);
                                setTaskFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <RouteTemplateForm
        open={editTemplateOpen}
        onClose={() => setEditTemplateOpen(false)}
        initialData={template}
        onSuccess={handleFormSuccess}
      />

      <RouteTemplateStopForm
        open={stopFormOpen}
        onClose={() => {
          setStopFormOpen(false);
          setEditStop(null);
        }}
        templateId={template.id}
        initialData={editStop}
        onSuccess={handleFormSuccess}
      />

      <RouteTemplateTaskForm
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditTask(null);
        }}
        templateStopId={taskStopId}
        initialData={editTask}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
