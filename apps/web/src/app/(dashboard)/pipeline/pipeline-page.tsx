'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, FileText, FileCheck, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SalesBid, SalesProposal, ProblemDetails } from '@gleamops/shared';

import ProspectsTable from './prospects/prospects-table';
import BidsTable from './bids/bids-table';
import { BidDetail } from './bids/bid-detail';
import { BidWizard } from './bids/bid-wizard';
import ProposalsTable from './proposals/proposals-table';
import { ProposalDetail } from './proposals/proposal-detail';
import { SendProposalForm } from './proposals/send-proposal-form';

interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
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
  { key: 'prospects', label: 'Prospects', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'bids', label: 'Bids', icon: <FileText className="h-4 w-4" /> },
  { key: 'proposals', label: 'Proposals', icon: <FileCheck className="h-4 w-4" /> },
];

export default function PipelinePageClient() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BidWithClient | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithRelations | null>(null);
  const [sendProposal, setSendProposal] = useState<ProposalWithRelations | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = tab === 'prospects' ? 'New Prospect' : tab === 'bids' ? 'New Bid' : '';

  const handleAdd = () => {
    if (tab === 'bids') {
      setWizardOpen(true);
    }
    // TODO: Prospect form for 'prospects' tab
  };

  const handleGenerateProposal = useCallback(async (bidId: string, bidVersionId: string) => {
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
  }, [refresh]);

  const handleMarkWon = useCallback(async (proposal: ProposalWithRelations) => {
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

  const handleConvert = useCallback(async (proposal: ProposalWithRelations, siteId: string, pricingOptionId?: string) => {
    setConverting(true);
    setConversionResult(null);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.rpc('convert_bid_to_job', {
      p_proposal_id: proposal.id,
      p_site_id: siteId,
      p_pricing_option_id: pricingOptionId || null,
      p_start_date: new Date().toISOString().split('T')[0],
    });

    setConverting(false);

    if (error) {
      // Parse Problem Details from Postgres RAISE EXCEPTION messages
      // Format: "CONVERT_001: Proposal status is DRAFT, must be WON"
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
          <p className="text-sm text-muted mt-1">Prospects, Bids, Proposals, Follow-ups</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'prospects' && <ProspectsTable key={`p-${refreshKey}`} search={search} />}
      {tab === 'bids' && <BidsTable key={`b-${refreshKey}`} search={search} onSelect={setSelectedBid} />}
      {tab === 'proposals' && <ProposalsTable key={`pr-${refreshKey}`} search={search} onSelect={setSelectedProposal} />}

      <BidDetail
        bid={selectedBid}
        open={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        onGenerateProposal={handleGenerateProposal}
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
        onClose={() => setWizardOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
