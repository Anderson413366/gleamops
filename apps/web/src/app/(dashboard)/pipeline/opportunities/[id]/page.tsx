'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  PauseCircle,
  Pencil,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import { OPPORTUNITY_STAGE_COLORS, BID_STATUS_COLORS } from '@gleamops/shared';
import type { SalesOpportunity } from '@gleamops/shared';
import { OpportunityForm } from '@/components/forms/opportunity-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';

interface OpportunityWithRelations extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
  client?: { name: string; client_code: string } | null;
  probability_pct?: number | null;
  competitor_notes?: string | null;
  notes?: string | null;
}

interface BidRow {
  id: string;
  bid_code: string;
  status: string;
  bid_monthly_price: number | null;
  total_sqft: number | null;
  created_at: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysOpen(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function probabilityLabel(value: number | null | undefined) {
  if (value == null) return '\u2014';
  return `${value}%`;
}

function weightedMonthlyValue(value: number | null, probability: number | null | undefined) {
  if (value == null || probability == null) return null;
  return (value * probability) / 100;
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<OpportunityWithRelations | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchOpportunity = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const opportunityCode = decodeURIComponent(id);

    const { data } = await supabase
      .from('sales_opportunities')
      .select('*, prospect:prospect_id(company_name, prospect_code), client:client_id(name, client_code)')
      .eq('opportunity_code', opportunityCode)
      .is('archived_at', null)
      .single();

    if (!data) {
      setOpportunity(null);
      setBids([]);
      setLoading(false);
      return;
    }

    const opp = data as unknown as OpportunityWithRelations;
    setOpportunity(opp);

    const { data: bidsData } = await supabase
      .from('sales_bids')
      .select('id, bid_code, status, bid_monthly_price, total_sqft, created_at')
      .eq('opportunity_id', opp.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    setBids((bidsData ?? []) as unknown as BidRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOpportunity();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async () => {
    if (!opportunity) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sales_opportunities')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: 'Deactivated from opportunity detail',
        })
        .eq('id', opportunity.id)
        .eq('version_etag', opportunity.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Opportunity archived');
      router.push('/pipeline?tab=opportunities');
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const totals = useMemo(() => {
    const totalBidValue = bids.reduce((sum, bid) => sum + (bid.bid_monthly_price ?? 0), 0);
    const weighted = weightedMonthlyValue(opportunity?.estimated_monthly_value ?? null, opportunity?.probability_pct);
    return { totalBidValue, weighted };
  }, [bids, opportunity?.estimated_monthly_value, opportunity?.probability_pct]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Opportunity not found.</p>
        <Link
          href="/pipeline?tab=opportunities"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pipeline
        </Link>
      </div>
    );
  }

  const completenessItems: CompletenessItem[] = [
    { key: 'name', label: 'Opportunity Name', isComplete: isFieldComplete(opportunity.name), section: 'details' },
    { key: 'stage_code', label: 'Stage', isComplete: isFieldComplete(opportunity.stage_code), section: 'details' },
    { key: 'prospect_or_client', label: 'Prospect or Client', isComplete: isFieldComplete(opportunity.prospect?.company_name) || isFieldComplete(opportunity.client?.name), section: 'details' },
    { key: 'estimated_monthly_value', label: 'Estimated Monthly Value', isComplete: isFieldComplete(opportunity.estimated_monthly_value), section: 'financial' },
    { key: 'probability_pct', label: 'Probability', isComplete: isFieldComplete(opportunity.probability_pct), section: 'financial' },
    { key: 'expected_close_date', label: 'Target Close Date', isComplete: isFieldComplete(opportunity.expected_close_date), section: 'financial' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(opportunity.notes), section: 'notes' },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/pipeline?tab=opportunities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            <Target className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{opportunity.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{opportunity.opportunity_code}</span>
              <Badge color={OPPORTUNITY_STAGE_COLORS[opportunity.stage_code] ?? 'gray'}>
                {opportunity.stage_code.replace(/_/g, ' ')}
              </Badge>
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900/40"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Opportunity Profile"
        items={completenessItems}
        onNavigateToMissing={() => setFormOpen(true)}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(opportunity.estimated_monthly_value)}</p>
          <p className="text-xs text-muted-foreground">Estimated Monthly Value</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{probabilityLabel(opportunity.probability_pct)}</p>
          <p className="text-xs text-muted-foreground">Close Probability</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.weighted)}</p>
          <p className="text-xs text-muted-foreground">Weighted Pipeline Value</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{daysOpen(opportunity.created_at)}</p>
          <p className="text-xs text-muted-foreground">Days Open</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Opportunity Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Stage</dt>
              <dd className="font-medium">
                <Badge color={OPPORTUNITY_STAGE_COLORS[opportunity.stage_code] ?? 'gray'}>
                  {opportunity.stage_code.replace(/_/g, ' ')}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Prospect</dt>
              <dd className="font-medium">
                {opportunity.prospect ? (
                  <Link
                    href={`/pipeline/prospects/${encodeURIComponent(opportunity.prospect.prospect_code)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {opportunity.prospect.company_name} ({opportunity.prospect.prospect_code})
                  </Link>
                ) : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">
                {opportunity.client ? (
                  <Link
                    href={`/crm/clients/${encodeURIComponent(opportunity.client.client_code)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {opportunity.client.name} ({opportunity.client.client_code})
                  </Link>
                ) : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Target Close Date</dt>
              <dd className="font-medium">{formatDate(opportunity.expected_close_date)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Financial Snapshot</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground inline-flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Monthly Value</dt>
              <dd className="font-medium">{formatCurrency(opportunity.estimated_monthly_value)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Annual Value</dt>
              <dd className="font-medium">{formatCurrency(opportunity.estimated_monthly_value != null ? opportunity.estimated_monthly_value * 12 : null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Probability</dt>
              <dd className="font-medium">{probabilityLabel(opportunity.probability_pct)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Weighted Value</dt>
              <dd className="font-medium">{formatCurrency(totals.weighted)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Related Bids</dt>
              <dd className="font-medium">{bids.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Related Bids</h3>
        {bids.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bids linked to this opportunity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {bids.map((bid) => (
              <li key={bid.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">
                      <Link
                        href={`/pipeline/bids/${encodeURIComponent(bid.bid_code)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {bid.bid_code}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(bid.created_at)}
                      {bid.total_sqft ? ` \u2022 ${new Intl.NumberFormat('en-US').format(bid.total_sqft)} sqft` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(bid.bid_monthly_price)}</p>
                    <Badge color={BID_STATUS_COLORS[bid.status] ?? 'gray'}>{bid.status}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {bids.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Total bid value: {formatCurrency(totals.totalBidValue)}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opportunity.notes ?? 'No notes recorded.'}</p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(opportunity.created_at)}</p>
        <p>Updated: {formatDate(opportunity.updated_at)}</p>
      </div>

      <ActivityHistorySection
        entityType="sales_opportunities"
        entityId={opportunity.id}
        entityCode={opportunity.opportunity_code}
        notes={opportunity.notes ?? null}
        entityUpdatedAt={opportunity.updated_at}
      />

      <OpportunityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={opportunity}
        onSuccess={async () => {
          setFormOpen(false);
          await fetchOpportunity();
        }}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { void handleArchive(); }}
        entityLabel="Opportunity"
        entityName={opportunity.name}
        mode="deactivate"
        warning={bids.length > 0 ? `This opportunity has ${bids.length} related bid${bids.length === 1 ? '' : 's'} that may be affected.` : null}
        loading={archiveLoading}
      />
    </div>
  );
}
