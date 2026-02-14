'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { JOB_STATUS_COLORS } from '@gleamops/shared';
import { JobForm } from '@/components/forms/job-form';
import {
  computeJobFinancials,
  type JobFinancialResult,
} from '@/lib/utils/job-financials';

interface JobWithRelations extends SiteJob {
  site?: {
    site_code: string;
    name: string;
    client?: { name: string; client_code: string } | null;
  } | null;
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

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Related data
  const [taskCount, setTaskCount] = useState(0);
  const [financials, setFinancials] = useState<JobFinancialResult | null>(null);

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

  useEffect(() => {
    fetchJob();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950">
            <Trash2 className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

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
          <p className="text-2xl font-bold text-foreground">
            {formatDate(job.last_service_date)}
          </p>
          <p className="text-xs text-muted-foreground">Last Inspection</p>
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
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(job.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(job.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <JobForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={job}
        onSuccess={fetchJob}
      />
    </div>
  );
}
