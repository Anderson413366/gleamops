'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Target, FileText, Send, Plus, Zap, BarChart3 } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type {
  SalesProspect,
  SalesOpportunity,
  SalesBid,
  SalesProposal,
} from '@gleamops/shared';

import ProspectsTable from './prospects/prospects-table';
import OpportunitiesTable from './opportunities/opportunities-table';
import BidsTable from './bids/bids-table';
import { BidDetail } from './bids/bid-detail';
import { BidWizard } from './bids/bid-wizard';
import { ExpressBid } from './bids/express-bid';
import ProposalsTable from './proposals/proposals-table';
import { ProposalDetail } from './proposals/proposal-detail';
import { SendProposalForm } from './proposals/send-proposal-form';

import PipelineAnalytics from './analytics/pipeline-analytics';
import { ProspectForm } from '@/components/forms/prospect-form';
import { OpportunityForm } from '@/components/forms/opportunity-form';
import { useSyncedTab } from '@/hooks/use-synced-tab';

// Extended types with joined relations
interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
}

interface OpportunityWithRelations extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
  client?: { name: string; client_code: string } | null;
}

interface ProposalWithRelations extends SalesProposal {
  bid_version?: {
    bid?: {
      bid_code: string;
      client?: { name: string } | null;
      client_id?: string;
      service?: { name: string } | null;
      total_sqft?: number | null;
      bid_monthly_price?: number | null;
    } | null;
  } | null;
}

const TABS = [
  { key: 'prospects', label: 'Prospects', icon: <Users className="h-4 w-4" /> },
  { key: 'opportunities', label: 'Opportunities', icon: <Target className="h-4 w-4" /> },
  { key: 'bids', label: 'Bids', icon: <FileText className="h-4 w-4" /> },
  { key: 'proposals', label: 'Proposals', icon: <Send className="h-4 w-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function PipelinePageClient() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'prospects',
  });
  const [search, setSearch] = useState('');

  // Detail drawer state
  const [selectedBid, setSelectedBid] = useState<BidWithClient | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithRelations | null>(null);
  const [sendProposal, setSendProposal] = useState<ProposalWithRelations | null>(null);

  // Form state
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [editProspect, setEditProspect] = useState<SalesProspect | null>(null);
  const [opportunityFormOpen, setOpportunityFormOpen] = useState(false);
  const [editOpportunity, setEditOpportunity] = useState<OpportunityWithRelations | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editBidId, setEditBidId] = useState<string | null>(null);
  const [expressOpen, setExpressOpen] = useState(false);

  // Refresh keys
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Conversion state
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{
    success: boolean;
    job_code?: string;
    tickets_created?: number;
    error?: string;
    errorCode?: string;
    idempotent?: boolean;
  } | null>(null);

  // Pipeline overview stats
  const [pipelineStats, setPipelineStats] = useState({
    pipelineValue: '$0k',
    activeBids: 0,
    staleDeals: 0,
    emailProblems: 0,
    proposalsSent30d: 0,
    winRate: '0%',
  });

  // Fetch pipeline stats on mount and when refreshKey changes
  useEffect(() => {
    const fetchStats = async () => {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();

      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [pipelineRes, bidsRes, staleRes, emailRes, sentRes, wonRes, totalRes] = await Promise.all([
        // Pipeline value
        supabase
          .from('sales_opportunities')
          .select('estimated_monthly_value')
          .not('stage_code', 'in', '("WON","LOST")')
          .is('archived_at', null),
        // Active bids
        supabase
          .from('sales_bids')
          .select('id', { count: 'exact', head: true })
          .in('status', ['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW']),
        // Stale deals (opportunities not updated in 14 days)
        supabase
          .from('sales_opportunities')
          .select('id', { count: 'exact', head: true })
          .not('stage_code', 'in', '("WON","LOST")')
          .lt('updated_at', fourteenDaysAgo)
          .is('archived_at', null),
        // Email problems (bounced/failed sends)
        supabase
          .from('sales_proposal_sends')
          .select('id', { count: 'exact', head: true })
          .in('status', ['BOUNCED', 'FAILED']),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo)
          .in('status', ['SENT', 'VIEWED', 'SIGNED', 'WON']),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'WON'),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true }),
      ]);

      const pipelineSum = (pipelineRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).estimated_monthly_value) || 0),
        0,
      );

      const totalProposals = totalRes.count ?? 0;
      const wonCount = wonRes.count ?? 0;
      setPipelineStats({
        pipelineValue: `$${(pipelineSum / 1000).toFixed(1)}k`,
        activeBids: bidsRes.count ?? 0,
        staleDeals: staleRes.count ?? 0,
        emailProblems: emailRes.count ?? 0,
        proposalsSent30d: sentRes.count ?? 0,
        winRate: totalProposals > 0 ? `${Math.round((wonCount / totalProposals) * 100)}%` : '0%',
      });
    };

    fetchStats();
  }, [refreshKey]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (actionName === 'create-prospect') {
      setTab('prospects');
      setEditProspect(null);
      setProspectFormOpen(true);
      return;
    }
    if (actionName === 'create-opportunity') {
      setTab('opportunities');
      setEditOpportunity(null);
      setOpportunityFormOpen(true);
      return;
    }
    if (actionName === 'create-bid') {
      setTab('bids');
      setWizardOpen(true);
    }
  }, [setTab]);

  useEffect(() => {
    openQuickCreate(action);
  }, [action, openQuickCreate]);

  useEffect(() => {
    function handleQuickCreate(event: Event) {
      const detail = (event as CustomEvent<{ action?: string }>).detail;
      openQuickCreate(detail?.action);
    }
    window.addEventListener('gleamops:quick-create', handleQuickCreate);
    return () => window.removeEventListener('gleamops:quick-create', handleQuickCreate);
  }, [openQuickCreate]);

  const handleAdd = () => {
    if (tab === 'prospects') {
      setEditProspect(null);
      setProspectFormOpen(true);
    } else if (tab === 'opportunities') {
      setEditOpportunity(null);
      setOpportunityFormOpen(true);
    } else if (tab === 'bids') {
      setWizardOpen(true);
    }
    // Proposals are generated from bids, no direct "New Proposal" button
  };

  const addLabel =
    tab === 'prospects'
      ? 'New Prospect'
      : tab === 'opportunities'
        ? 'New Opportunity'
        : tab === 'bids'
          ? 'New Bid'
          : '';

  const handleGenerateProposal = useCallback(async (bidId: string, bidVersionId: string) => {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();

    // Get next proposal code
    const { data: seq } = await supabase.rpc('next_code', { p_prefix: 'PRP' });
    const proposalCode = seq ?? `PRP-${Date.now()}`;

    // Get tenant_id from the bid
    const { data: bid } = await supabase
      .from('sales_bids')
      .select('tenant_id, bid_monthly_price')
      .eq('id', bidId)
      .single();
    if (!bid) return;

    // Create proposal
    const { data: proposal, error } = await supabase
      .from('sales_proposals')
      .insert({
        tenant_id: bid.tenant_id,
        proposal_code: proposalCode,
        bid_version_id: bidVersionId,
        status: 'GENERATED',
      })
      .select()
      .single();

    if (error || !proposal) return;

    // Create default pricing options (Good / Better / Best)
    const basePrice = bid.bid_monthly_price ?? 0;
    if (basePrice > 0) {
      await supabase.from('sales_proposal_pricing_options').insert([
        { tenant_id: bid.tenant_id, proposal_id: proposal.id, label: 'Good', monthly_price: Math.round(basePrice * 0.85), is_recommended: false, sort_order: 0 },
        { tenant_id: bid.tenant_id, proposal_id: proposal.id, label: 'Better', monthly_price: basePrice, is_recommended: true, sort_order: 1 },
        { tenant_id: bid.tenant_id, proposal_id: proposal.id, label: 'Best', monthly_price: Math.round(basePrice * 1.2), is_recommended: false, sort_order: 2 },
      ]);
    }

    // Close bid detail, switch to proposals tab, refresh
    setSelectedBid(null);
    setTab('proposals');
    refresh();
  }, [refresh, setTab]);

  const handleMarkWon = useCallback(async (proposal: ProposalWithRelations) => {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('sales_proposals')
      .update({ status: 'WON' })
      .eq('id', proposal.id);

    // Stop any active follow-up sequences
    await supabase
      .from('sales_followup_sequences')
      .update({ status: 'STOPPED', stop_reason: 'WON' })
      .eq('proposal_id', proposal.id)
      .eq('status', 'ACTIVE');

    setSelectedProposal(null);
    refresh();
  }, [refresh]);

  const handleConvert = useCallback(async (proposal: ProposalWithRelations, siteId: string, pricingOptionId?: string) => {
    setConverting(true);
    setConversionResult(null);
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.rpc('convert_bid_to_job', {
      p_proposal_id: proposal.id,
      p_site_id: siteId,
      p_pricing_option_id: pricingOptionId || null,
      p_start_date: new Date().toISOString().split('T')[0],
    });

    setConverting(false);

    if (error) {
      const msg = error.message || 'Conversion failed';
      const codeMatch = msg.match(/^(CONVERT_\w+):\s*(.+)$/);
      setConversionResult({
        success: false,
        error: codeMatch ? codeMatch[2] : msg,
        errorCode: codeMatch ? codeMatch[1] : undefined,
      });
      return;
    }

    const result = data as {
      conversion_id: string;
      site_job_id: string;
      job_code: string;
      tickets_created: number;
      idempotent: boolean;
    };

    setConversionResult({
      success: true,
      job_code: result.job_code,
      tickets_created: result.tickets_created,
      idempotent: result.idempotent,
    });

    // Close after short delay to show success
    setTimeout(() => {
      setSelectedProposal(null);
      setConversionResult(null);
      refresh();
    }, 2000);
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage prospects, opportunities, bids, and proposals</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pipeline/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border shadow-sm transition-all hover:bg-muted hover:shadow-md"
          >
            Sales Admin
          </Link>
          {tab === 'bids' && (
            <Button variant="secondary" onClick={() => setExpressOpen(true)}>
              <Zap className="h-4 w-4" />
              Express Bid
            </Button>
          )}
          {addLabel && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Overview Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-xl font-bold text-foreground">{pipelineStats.pipelineValue}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Bids</p><p className="text-xl font-bold text-foreground">{pipelineStats.activeBids}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Stale Deals (14d)</p><p className="text-xl font-bold text-warning">{pipelineStats.staleDeals}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Email Issues</p><p className="text-xl font-bold text-destructive">{pipelineStats.emailProblems}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Proposals Sent (30d)</p><p className="text-xl font-bold text-foreground">{pipelineStats.proposalsSent30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Win Rate</p><p className="text-xl font-bold text-success">{pipelineStats.winRate}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'prospects' && (
        <ProspectsTable
          key={`prospects-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'opportunities' && (
        <OpportunitiesTable
          key={`opportunities-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'bids' && (
        <BidsTable
          key={`bids-${refreshKey}`}
          search={search}
          onSelect={setSelectedBid}
          onCreateNew={() => setWizardOpen(true)}
        />
      )}
      {tab === 'proposals' && (
        <ProposalsTable
          key={`proposals-${refreshKey}`}
          search={search}
          onSelect={setSelectedProposal}
          onGoToBids={() => setTab('bids')}
        />
      )}
      {tab === 'analytics' && (
        <PipelineAnalytics key={`analytics-${refreshKey}`} />
      )}

      {/* Detail Drawers */}
      <BidDetail
        bid={selectedBid}
        open={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        onGenerateProposal={handleGenerateProposal}
        onEdit={(bidId) => {
          setSelectedBid(null);
          setEditBidId(bidId);
          setWizardOpen(true);
        }}
      />

      <ProposalDetail
        proposal={selectedProposal}
        open={!!selectedProposal}
        onClose={() => { setSelectedProposal(null); setConversionResult(null); }}
        onSend={(p) => {
          setSelectedProposal(null);
          setSendProposal(p);
        }}
        onMarkWon={handleMarkWon}
        onConvert={handleConvert}
        converting={converting}
        conversionResult={conversionResult}
      />

      <SendProposalForm
        proposal={sendProposal}
        open={!!sendProposal}
        onClose={() => setSendProposal(null)}
        onSuccess={refresh}
      />

      <BidWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditBidId(null); }}
        onSuccess={refresh}
        editBidId={editBidId}
      />

      <ExpressBid
        open={expressOpen}
        onClose={() => setExpressOpen(false)}
        onSuccess={refresh}
      />

      {/* Forms */}
      <ProspectForm
        open={prospectFormOpen}
        onClose={() => {
          setProspectFormOpen(false);
          setEditProspect(null);
        }}
        initialData={editProspect}
        onSuccess={refresh}
      />

      <OpportunityForm
        open={opportunityFormOpen}
        onClose={() => {
          setOpportunityFormOpen(false);
          setEditOpportunity(null);
        }}
        initialData={editOpportunity}
        onSuccess={refresh}
      />
    </div>
  );
}
