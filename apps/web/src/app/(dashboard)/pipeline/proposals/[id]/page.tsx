'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  Pencil,
  Send,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Skeleton } from '@gleamops/ui';
import { PROPOSAL_STATUS_COLORS } from '@gleamops/shared';
import type {
  SalesProposal,
  SalesProposalPricingOption,
  SalesProposalSend,
} from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { SendProposalForm } from '../send-proposal-form';
import {
  ProfileCompletenessCard,
  isFieldComplete,
  type CompletenessItem,
} from '@/components/detail/profile-completeness-card';

interface ProposalWithRelations extends SalesProposal {
  bid_version?: {
    bid?: {
      bid_code: string;
      client?: { name: string; client_code: string } | null;
      service?: { name: string } | null;
      client_id?: string | null;
    } | null;
  } | null;
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

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalWithRelations | null>(null);
  const [options, setOptions] = useState<SalesProposalPricingOption[]>([]);
  const [sends, setSends] = useState<SalesProposalSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [markingWon, setMarkingWon] = useState(false);

  const fetchProposal = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const proposalCode = decodeURIComponent(id);

    const { data } = await supabase
      .from('sales_proposals')
      .select(`
        *,
        bid_version:sales_bid_versions!sales_proposals_bid_version_id_fkey(
          bid:bid_id(
            bid_code,
            client_id,
            client:client_id(name, client_code),
            service:service_id(name)
          )
        )
      `)
      .eq('proposal_code', proposalCode)
      .is('archived_at', null)
      .single();

    if (!data) {
      setProposal(null);
      setOptions([]);
      setSends([]);
      setLoading(false);
      return;
    }

    const proposalRow = data as unknown as ProposalWithRelations;
    setProposal(proposalRow);

    const [optionsRes, sendsRes] = await Promise.all([
      supabase
        .from('sales_proposal_pricing_options')
        .select('*')
        .eq('proposal_id', proposalRow.id)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('sales_proposal_sends')
        .select('*')
        .eq('proposal_id', proposalRow.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
    ]);

    setOptions((optionsRes.data ?? []) as unknown as SalesProposalPricingOption[]);
    setSends((sendsRes.data ?? []) as unknown as SalesProposalSend[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProposal();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommendedOption = useMemo(
    () => options.find((option) => option.is_recommended) ?? options[0] ?? null,
    [options]
  );

  const completenessItems: CompletenessItem[] = useMemo(() => {
    if (!proposal) return [];
    return [
      { key: 'status', label: 'Proposal Status', isComplete: isFieldComplete(proposal.status), section: 'details' },
      { key: 'bid', label: 'Bid Reference', isComplete: isFieldComplete(proposal.bid_version?.bid?.bid_code), section: 'details' },
      { key: 'pricing_options', label: 'Pricing Options', isComplete: options.length > 0, section: 'pricing' },
      { key: 'recommended_price', label: 'Recommended Price', isComplete: isFieldComplete(recommendedOption?.monthly_price), section: 'pricing' },
      { key: 'valid_until', label: 'Valid Until', isComplete: isFieldComplete(proposal.valid_until), section: 'details' },
      { key: 'sent_history', label: 'Send History', isComplete: sends.length > 0, section: 'delivery' },
      { key: 'pdf', label: 'Generated PDF', isComplete: isFieldComplete(proposal.pdf_generated_at), section: 'delivery' },
    ];
  }, [proposal, options.length, recommendedOption?.monthly_price, sends.length]);

  const handleMarkWon = async () => {
    if (!proposal) return;
    setMarkingWon(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('sales_proposals')
      .update({ status: 'WON' })
      .eq('id', proposal.id)
      .eq('version_etag', proposal.version_etag);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Proposal marked as won');
      await fetchProposal();
    }
    setMarkingWon(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Proposal not found.</p>
        <Link
          href="/pipeline?tab=proposals"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>
    );
  }

  const bid = proposal.bid_version?.bid;
  const canSend = proposal.status === 'GENERATED' || proposal.status === 'DRAFT';
  const canMarkWon = proposal.status === 'SENT' || proposal.status === 'DELIVERED' || proposal.status === 'OPENED';

  return (
    <div className="space-y-6">
      <Link
        href="/pipeline?tab=proposals"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <Mail className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{proposal.proposal_code}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge color={PROPOSAL_STATUS_COLORS[proposal.status] ?? 'gray'}>{proposal.status}</Badge>
              {bid?.bid_code ? (
                <Link
                  href={`/pipeline/bids/${encodeURIComponent(bid.bid_code)}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {bid.bid_code}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            disabled={!canSend}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
          <button
            type="button"
            disabled={!canMarkWon || markingWon}
            onClick={handleMarkWon}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trophy className="h-3.5 w-3.5" />
            Mark Won
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      <ProfileCompletenessCard title="Proposal Profile" items={completenessItems} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(recommendedOption?.monthly_price ?? null)}</p>
          <p className="text-xs text-muted-foreground">Recommended Price</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{options.length}</p>
          <p className="text-xs text-muted-foreground">Pricing Options</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{sends.length}</p>
          <p className="text-xs text-muted-foreground">Send Attempts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatDate(proposal.valid_until)}</p>
          <p className="text-xs text-muted-foreground">Valid Until</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Proposal Context</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bid</dt>
              <dd className="font-medium">
                {bid?.bid_code ? (
                  <Link
                    href={`/pipeline/bids/${encodeURIComponent(bid.bid_code)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {bid.bid_code}
                  </Link>
                ) : (
                  'Not Set'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium">
                {bid?.client?.client_code ? (
                  <Link
                    href={`/clients/${encodeURIComponent(bid.client.client_code)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {bid.client.name} ({bid.client.client_code})
                  </Link>
                ) : (
                  'Not Set'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-medium">{bid?.service?.name ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">PDF Generated</dt>
              <dd className="font-medium">{formatDate(proposal.pdf_generated_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Pricing Options</h3>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pricing options yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {options.map((option) => (
                <li key={option.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(option.monthly_price)}</p>
                    {option.is_recommended ? (
                      <Badge color="green">Recommended</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Send Timeline</h3>
        {sends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sends recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sends.map((sendRow) => (
              <li key={sendRow.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{sendRow.recipient_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {sendRow.recipient_name ?? 'Unknown recipient'} · Sent {formatDate(sendRow.sent_at ?? sendRow.created_at)}
                    </p>
                  </div>
                  <Badge color={PROPOSAL_STATUS_COLORS[sendRow.status] ?? 'gray'}>{sendRow.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Created: {formatDate(proposal.created_at)}</p>
        <p>Updated: {formatDate(proposal.updated_at)}</p>
      </div>

      <ActivityHistorySection
        entityType="sales_proposals"
        entityId={proposal.id}
        entityCode={proposal.proposal_code}
        notes={proposal.notes ?? null}
        entityUpdatedAt={proposal.updated_at}
      />

      <SendProposalForm
        proposal={proposal}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSuccess={fetchProposal}
      />
    </div>
  );
}
