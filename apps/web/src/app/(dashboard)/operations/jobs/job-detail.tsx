'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  AlertTriangle,
  Calendar,
  DollarSign,
  CheckCircle2,
  Circle,
  ListChecks,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChipTabs,
  Skeleton,
} from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { computeJobFinancials, type JobFinancialResult } from '@/lib/utils/job-financials';

/* ---------- colour maps ---------- */

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'gray',
  COMPLETED: 'green',
};

const SEVERITY_COLORS: Record<string, 'red' | 'orange' | 'yellow'> = {
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

const TIER_COLORS: Record<string, 'green' | 'yellow' | 'orange' | 'red'> = {
  A: 'green',
  B: 'yellow',
  C: 'orange',
  D: 'red',
};

/* ---------- helper types ---------- */

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface JobTaskRow {
  id: string;
  task_id: string;
  sequence_order: number;
  is_required: boolean;
  estimated_minutes: number | null;
  status: string;
  task?: { name: string; task_code: string } | null;
}

interface LogRow {
  id: string;
  log_date: string;
  event_type: string;
  severity: string;
  message: string | null;
  status: string;
}

/* ---------- helpers ---------- */

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) {
    const dateOnly = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return dateOnly.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'tasks', label: 'Tasks', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'logs', label: 'Logs', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'financials', label: 'Financials', icon: <DollarSign className="h-4 w-4" /> },
];

/* ---------- component ---------- */

interface JobDetailProps {
  job: JobWithRelations | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (job: SiteJob) => void;
}

export function JobDetail({ job, open, onClose, onEdit }: JobDetailProps) {
  const [tab, setTab] = useState('overview');
  const [tasks, setTasks] = useState<JobTaskRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [financials, setFinancials] = useState<JobFinancialResult | null>(null);

  useEffect(() => {
    if (!job || !open) return;
    setTab('overview');
    const supabase = getSupabaseBrowserClient();

    // Fetch job tasks
    setLoadingTasks(true);
    supabase
      .from('job_tasks')
      .select('id, task_id, sequence_order, is_required, estimated_minutes, status, task:tasks!job_tasks_task_id_fkey(name, task_code)')
      .eq('job_id', job.id)
      .is('archived_at', null)
      .order('sequence_order')
      .then(({ data }) => {
        setTasks((data as unknown as JobTaskRow[]) ?? []);
        setLoadingTasks(false);
      });

    // Fetch job logs
    setLoadingLogs(true);
    supabase
      .from('job_logs')
      .select('id, log_date, event_type, severity, message, status')
      .eq('job_id', job.id)
      .is('archived_at', null)
      .order('log_date', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setLogs((data as unknown as LogRow[]) ?? []);
        setLoadingLogs(false);
      });

    // Compute financials
    if (job.billing_amount) {
      setFinancials(computeJobFinancials({ billing_amount: job.billing_amount }));
    } else {
      setFinancials(null);
    }
  }, [job, open]);

  // Generate tasks from service
  const handleGenerateTasks = async () => {
    if (!job?.service_id) {
      toast.error('No service linked to this job');
      return;
    }
    setGenerating(true);
    const supabase = getSupabaseBrowserClient();

    // Fetch service tasks
    const { data: serviceTasks, error: fetchErr } = await supabase
      .from('service_tasks')
      .select('task_id, sequence_order, is_required, estimated_minutes, quality_weight, priority_level')
      .eq('service_id', job.service_id)
      .order('sequence_order');

    if (fetchErr || !serviceTasks?.length) {
      toast.error(fetchErr?.message ?? 'No tasks found for this service');
      setGenerating(false);
      return;
    }

    // Delete existing tasks if re-generating
    if (tasks.length > 0) {
      await supabase.from('job_tasks').delete().eq('job_id', job.id);
    }

    const tenantId = (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id;
    const insertRows = serviceTasks.map((st) => ({
      job_id: job.id,
      task_id: st.task_id,
      sequence_order: st.sequence_order,
      is_required: st.is_required,
      estimated_minutes: st.estimated_minutes,
      status: 'PENDING',
      tenant_id: tenantId,
    }));

    const { error: insertErr } = await supabase.from('job_tasks').insert(insertRows);
    if (insertErr) {
      toast.error(insertErr.message);
    } else {
      toast.success(`Generated ${insertRows.length} tasks from service`);
      // Reload tasks
      const { data } = await supabase
        .from('job_tasks')
        .select('id, task_id, sequence_order, is_required, estimated_minutes, status, task:tasks!job_tasks_task_id_fkey(name, task_code)')
        .eq('job_id', job.id)
        .is('archived_at', null)
        .order('sequence_order');
      setTasks((data as unknown as JobTaskRow[]) ?? []);
    }
    setGenerating(false);
  };

  if (!job) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={job.job_code} subtitle={job.job_name ?? job.site?.name ?? 'Job'} wide>
      <div className="space-y-4">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={JOB_STATUS_COLORS[job.status] ?? 'gray'}>{job.status}</Badge>
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={() => onEdit(job)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {/* Tabs */}
        <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Site</dt>
                    <dd className="font-medium">{job.site?.name ?? '\u2014'} <span className="text-xs text-muted-foreground font-mono">{job.site?.site_code}</span></dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Client</dt>
                    <dd className="font-medium">{job.site?.client?.name ?? '\u2014'}</dd>
                  </div>
                  {job.job_type && (
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-medium">{job.job_type}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Frequency</dt>
                    <dd className="font-medium">{job.frequency ?? '\u2014'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Billing</dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(job.billing_amount)}</dd>
                  </div>
                  {job.billing_uom && (
                    <div>
                      <dt className="text-muted-foreground">Billing UOM</dt>
                      <dd className="font-medium">{job.billing_uom}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Start</dt>
                    <dd className="font-medium">{formatDate(job.start_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> End</dt>
                    <dd className="font-medium">{formatDate(job.end_date)}</dd>
                  </div>
                  {job.staff_needed && (
                    <div>
                      <dt className="text-muted-foreground">Staff Needed</dt>
                      <dd className="font-medium">{job.staff_needed}</dd>
                    </div>
                  )}
                  {job.schedule_days && (
                    <div>
                      <dt className="text-muted-foreground">Schedule Days</dt>
                      <dd className="font-medium">{job.schedule_days}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {(job.specifications || job.special_requirements || job.notes) && (
              <Card>
                <CardHeader><CardTitle>Specs & Notes</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {job.specifications && <div><dt className="text-xs text-muted-foreground">Specifications</dt><dd className="mt-1 whitespace-pre-wrap">{job.specifications}</dd></div>}
                  {job.special_requirements && <div><dt className="text-xs text-muted-foreground">Special Requirements</dt><dd className="mt-1 whitespace-pre-wrap">{job.special_requirements}</dd></div>}
                  {job.notes && <div><dt className="text-xs text-muted-foreground">Notes</dt><dd className="mt-1 whitespace-pre-wrap">{job.notes}</dd></div>}
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
              <p>Created: {new Date(job.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(job.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Job Tasks ({tasks.length})</h3>
              {job.service_id && (
                <Button variant="secondary" size="sm" onClick={handleGenerateTasks} loading={generating}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {tasks.length > 0 ? 'Re-generate' : 'Generate from Service'}
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="pt-4">
                {loadingTasks ? (
                  <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks configured. {job.service_id ? 'Click "Generate from Service" to auto-create tasks.' : 'Link a service to enable task generation.'}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {tasks.map((t) => (
                      <li key={t.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {t.status === 'COMPLETED' ? (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{t.task?.name ?? t.task_id}</p>
                            <p className="text-xs text-muted-foreground">
                              #{t.sequence_order} &middot; {t.task?.task_code}
                              {t.estimated_minutes && ` \u00B7 ${t.estimated_minutes} min`}
                              {t.is_required && ' \u00B7 Required'}
                            </p>
                          </div>
                        </div>
                        <Badge color={t.status === 'COMPLETED' ? 'green' : t.status === 'IN_PROGRESS' ? 'yellow' : 'gray'}>{t.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logs Tab */}
        {tab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  Job Logs <Badge color="blue">{logs.length}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((log) => (
                    <li key={log.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{log.event_type}</p>
                          {log.message && <p className="text-xs text-muted-foreground">{log.message}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={SEVERITY_COLORS[log.severity] ?? 'gray'}>{log.severity}</Badge>
                          <Badge color={LOG_STATUS_COLORS[log.status] ?? 'gray'}>{log.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(log.log_date)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financials Tab */}
        {tab === 'financials' && (
          <div className="space-y-4">
            {!financials ? (
              <p className="text-sm text-muted-foreground">No billing amount set for this job.</p>
            ) : (
              <>
                {/* Margin Tier */}
                <div className="flex items-center gap-3">
                  <Badge color={TIER_COLORS[financials.margin_tier] ?? 'gray'}>
                    Tier {financials.margin_tier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {financials.profit_margin_pct.toFixed(1)}% margin
                  </span>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(financials.billing_amount)}</p>
                      <p className="text-xs text-muted-foreground">Billing Amount</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(financials.profit_amount)}</p>
                      <p className="text-xs text-muted-foreground">Profit</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(financials.cost_total)}</p>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(financials.suggested_sub_mo)}</p>
                      <p className="text-xs text-muted-foreground">Suggested Sub Cost</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Subcontractor</dt>
                        <dd className="font-medium tabular-nums">{formatCurrency(financials.cost_subcontractor)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Internal Labor</dt>
                        <dd className="font-medium tabular-nums">{formatCurrency(financials.cost_internal_labor)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Supplies (est. 5%)</dt>
                        <dd className="font-medium tabular-nums">{formatCurrency(financials.cost_supplies)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Equipment</dt>
                        <dd className="font-medium tabular-nums">{formatCurrency(financials.cost_equipment)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <dt className="font-semibold">Total Cost</dt>
                        <dd className="font-bold tabular-nums">{formatCurrency(financials.cost_total)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </SlideOver>
  );
}
