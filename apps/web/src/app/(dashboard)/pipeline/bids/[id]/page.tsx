'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock3,
  DollarSign,
  FileText,
  Pencil,
  Ruler,
} from 'lucide-react';
import { Badge, Skeleton } from '@gleamops/ui';
import { BID_STATUS_COLORS, PROPOSAL_STATUS_COLORS } from '@gleamops/shared';
import type {
  SalesBid,
  SalesBidPricingResult,
  SalesBidVersion,
  SalesBidWorkloadResult,
} from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { BidWizard } from '../bid-wizard';
import {
  ProfileCompletenessCard,
  isFieldComplete,
  type CompletenessItem,
} from '@/components/detail/profile-completeness-card';

interface BidWithRelations extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
  opportunity?: { opportunity_code: string; name: string } | null;
}

interface ProposalRow {
  id: string;
  proposal_code: string;
  status: string;
  created_at: string;
  valid_until: string | null;
}

function formatCurrency(value: number | null) {
  if (value == null) return 'Not Set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Not Set';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bid, setBid] = useState<BidWithRelations | null>(null);
  const [versions, setVersions] = useState<SalesBidVersion[]>([]);
  const [workload, setWorkload] = useState<SalesBidWorkloadResult | null>(null);
  const [pricing, setPricing] = useState<SalesBidPricingResult | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchBid = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const bidCode = decodeURIComponent(id);

    const { data } = await supabase
      .from('sales_bids')
      .select(
        '*, client:client_id!sales_bids_client_id_fkey(name, client_code), service:service_id(name), opportunity:opportunity_id!sales_bids_opportunity_id_fkey(opportunity_code, name)'
      )
      .eq('bid_code', bidCode)
      .is('archived_at', null)
      .single();

    if (!data) {
      setBid(null);
      setVersions([]);
      setWorkload(null);
      setPricing(null);
      setProposals([]);
      setLoading(false);
      return;
    }

    const bidRow = data as unknown as BidWithRelations;
    setBid(bidRow);

    const { data: versionRows } = await supabase
      .from('sales_bid_versions')
      .select('*')
      .eq('bid_id', bidRow.id)
      .is('archived_at', null)
      .order('version_number', { ascending: false });
    const typedVersions = (versionRows ?? []) as unknown as SalesBidVersion[];
    setVersions(typedVersions);

    if (typedVersions.length > 0) {
      const latestVersionId = typedVersions[0].id;
      const [workloadRes, pricingRes, proposalsRes] = await Promise.all([
        supabase
          .from('sales_bid_workload_results')
          .select('*')
          .eq('bid_version_id', latestVersionId)
          .single(),
        supabase
          .from('sales_bid_pricing_results')
          .select('*')
          .eq('bid_version_id', latestVersionId)
          .single(),
        supabase
          .from('sales_proposals')
          .select('id, proposal_code, status, created_at, valid_until')
          .in('bid_version_id', typedVersions.map((row) => row.id))
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
      ]);

      setWorkload((workloadRes.data ?? null) as SalesBidWorkloadResult | null);
      setPricing((pricingRes.data ?? null) as SalesBidPricingResult | null);
      setProposals((proposalsRes.data ?? []) as ProposalRow[]);
    } else {
      setWorkload(null);
      setPricing(null);
      setProposals([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBid();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const completenessItems: CompletenessItem[] = useMemo(() => {
    if (!bid) return [];
    return [
      { key: 'client', label: 'Client', isComplete: isFieldComplete(bid.client?.name), section: 'basics' },
      { key: 'service', label: 'Service', isComplete: isFieldComplete(bid.service?.name), section: 'basics' },
      { key: 'status', label: 'Status', isComplete: isFieldComplete(bid.status), section: 'basics' },
      { key: 'total_sqft', label: 'Square Footage', isComplete: isFieldComplete(bid.total_sqft), section: 'scope' },
      { key: 'target_margin', label: 'Target Margin', isComplete: isFieldComplete(bid.target_margin_percent), section: 'pricing' },
      { key: 'monthly_price', label: 'Monthly Price', isComplete: isFieldComplete(bid.bid_monthly_price), section: 'pricing' },
      { key: 'workload', label: 'Workload Estimate', isComplete: isFieldComplete(workload?.monthly_hours), section: 'scope' },
      { key: 'pricing', label: 'Pricing Model', isComplete: isFieldComplete(pricing?.pricing_method), section: 'pricing' },
    ];
  }, [bid, workload?.monthly_hours, pricing?.pricing_method]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Bid not found.</p>
        <Link
          href="/pipeline?tab=bids"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/pipeline?tab=bids"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{bid.bid_code}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge color={BID_STATUS_COLORS[bid.status] ?? 'gray'}>{bid.status}</Badge>
              {bid.client?.client_code ? (
                <Link
                  href={`/clients/${encodeURIComponent(bid.client.client_code)}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {bid.client.name} ({bid.client.client_code})
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <ProfileCompletenessCard
        title="Bid Profile"
        items={completenessItems}
        onNavigateToMissing={() => setEditOpen(true)}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{bid.total_sqft?.toLocaleString() ?? '0'}</p>
          <p className="text-xs text-muted-foreground">Square Feet</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(pricing?.recommended_price ?? bid.bid_monthly_price)}</p>
          <p className="text-xs text-muted-foreground">Monthly Price</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{workload?.monthly_hours?.toFixed(1) ?? '0.0'}</p>
          <p className="text-xs text-muted-foreground">Monthly Hours</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{proposals.length}</p>
          <p className="text-xs text-muted-foreground">Related Proposals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Bid Context</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> Client</dt>
              <dd className="font-medium">{bid.client?.name ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-medium">{bid.service?.name ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Opportunity</dt>
              <dd className="font-medium">
                {bid.opportunity?.opportunity_code ? (
                  <Link
                    href={`/pipeline/opportunities/${encodeURIComponent(bid.opportunity.opportunity_code)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {bid.opportunity.name} ({bid.opportunity.opportunity_code})
                  </Link>
                ) : (
                  'Not Set'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Ruler className="h-3.5 w-3.5" /> Total Sq Ft</dt>
              <dd className="font-medium">{bid.total_sqft?.toLocaleString() ?? 'Not Set'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Workload & Pricing</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Hours per Visit</dt>
              <dd className="font-medium">{workload?.hours_per_visit?.toFixed(1) ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Cleaners Needed</dt>
              <dd className="font-medium">{workload?.cleaners_needed ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Target Margin</dt>
              <dd className="font-medium">
                {bid.target_margin_percent != null ? `${bid.target_margin_percent}%` : 'Not Set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Recommended</dt>
              <dd className="font-medium">{formatCurrency(pricing?.recommended_price ?? null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Effective Margin</dt>
              <dd className="font-medium">
                {pricing?.effective_margin_pct != null ? `${pricing.effective_margin_pct.toFixed(1)}%` : 'Not Set'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Versions</h3>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bid versions found.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-medium">Version {version.version_number}</span>
                <span className="text-xs text-muted-foreground">
                  {version.is_sent_snapshot ? 'Sent Snapshot' : 'Working Draft'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Related Proposals</h3>
        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No proposals generated from this bid yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/pipeline/proposals/${encodeURIComponent(proposal.proposal_code)}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {proposal.proposal_code}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(proposal.created_at)} · Valid until {formatDate(proposal.valid_until)}
                    </p>
                  </div>
                  <Badge color={PROPOSAL_STATUS_COLORS[proposal.status] ?? 'gray'}>{proposal.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Created: {formatDate(bid.created_at)}</p>
        <p>Updated: {formatDate(bid.updated_at)}</p>
      </div>

      <ActivityHistorySection
        entityType="sales_bids"
        entityId={bid.id}
        entityCode={bid.bid_code}
        notes={null}
        entityUpdatedAt={bid.updated_at}
      />

      <BidWizard
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchBid}
        editBidId={bid.id}
      />
    </div>
  );
}
