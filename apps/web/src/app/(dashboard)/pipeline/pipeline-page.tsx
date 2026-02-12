'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, FileText, FileCheck, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SalesBid, SalesProposal } from '@gleamops/shared';

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

  const handleConvert = useCallback(async (proposal: ProposalWithRelations) => {
    const supabase = getSupabaseBrowserClient();
    const bid = proposal.bid_version?.bid;
    if (!bid) return;

    // Get user for converted_by
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get bid details for site_id and tenant_id
    const { data: bidRecord } = await supabase
      .from('sales_bids')
      .select('tenant_id, client_id, bid_monthly_price, client:client_id(id)')
      .eq('bid_code', bid.bid_code)
      .single();
    if (!bidRecord) return;

    // Get a site for this client (use the first active site)
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('client_id', bidRecord.client_id)
      .is('archived_at', null)
      .limit(1)
      .single();
    if (!site) return;

    // Get next codes
    const [jobCodeRes, tktPrefixReady] = await Promise.all([
      supabase.rpc('next_code', { p_prefix: 'JOB' }),
      Promise.resolve(true),
    ]);
    const jobCode = jobCodeRes.data ?? `JOB-${Date.now()}`;

    // Create conversion record
    const { data: conversion } = await supabase
      .from('sales_bid_conversions')
      .insert({
        tenant_id: bidRecord.tenant_id,
        bid_version_id: proposal.bid_version_id,
        conversion_mode: 'FULL',
        is_dry_run: false,
        converted_by: user.id,
      })
      .select()
      .single();
    if (!conversion) return;

    // Create site_job
    const startDate = new Date();
    const { data: siteJob } = await supabase
      .from('site_jobs')
      .insert({
        tenant_id: bidRecord.tenant_id,
        job_code: jobCode,
        site_id: site.id,
        source_bid_id: bidRecord.client_id, // link to bid
        source_conversion_id: conversion.id,
        billing_amount: bidRecord.bid_monthly_price,
        frequency: 'WEEKLY',
        start_date: startDate.toISOString().split('T')[0],
        status: 'ACTIVE',
      })
      .select()
      .single();
    if (!siteJob) return;

    // Link conversion to site_job
    await supabase
      .from('sales_bid_conversions')
      .update({ site_job_id: siteJob.id })
      .eq('id', conversion.id);

    // Create recurrence rule (Mon-Fri, starting today)
    await supabase
      .from('recurrence_rules')
      .insert({
        tenant_id: bidRecord.tenant_id,
        site_job_id: siteJob.id,
        days_of_week: [1, 2, 3, 4, 5],
        start_date: startDate.toISOString().split('T')[0],
      });

    // Generate initial work tickets (next 4 weeks)
    const tickets = [];
    for (let week = 0; week < 4; week++) {
      for (const dow of [1, 2, 3, 4, 5]) { // Mon-Fri
        const d = new Date(startDate);
        d.setDate(d.getDate() + (week * 7) + ((dow - d.getDay() + 7) % 7));
        if (d < startDate) d.setDate(d.getDate() + 7);
        const dateStr = d.toISOString().split('T')[0];

        const tktCodeRes = await supabase.rpc('next_code', { p_prefix: 'TKT' });
        tickets.push({
          tenant_id: bidRecord.tenant_id,
          ticket_code: tktCodeRes.data ?? `TKT-${Date.now()}-${tickets.length}`,
          job_id: siteJob.id,
          site_id: site.id,
          scheduled_date: dateStr,
          status: 'SCHEDULED',
        });
      }
    }

    // Deduplicate by date (unique constraint: job_id + scheduled_date)
    const seen = new Set<string>();
    const uniqueTickets = tickets.filter((t) => {
      if (seen.has(t.scheduled_date)) return false;
      seen.add(t.scheduled_date);
      return true;
    });

    if (uniqueTickets.length > 0) {
      await supabase.from('work_tickets').insert(uniqueTickets);
    }

    // Log conversion events
    await supabase.from('sales_conversion_events').insert([
      { tenant_id: bidRecord.tenant_id, conversion_id: conversion.id, step: 'CREATE_JOB', status: 'SUCCESS', entity_type: 'site_job', entity_id: siteJob.id },
      { tenant_id: bidRecord.tenant_id, conversion_id: conversion.id, step: 'CREATE_RECURRENCE', status: 'SUCCESS', entity_type: 'recurrence_rule' },
      { tenant_id: bidRecord.tenant_id, conversion_id: conversion.id, step: 'GENERATE_TICKETS', status: 'SUCCESS', detail: { count: uniqueTickets.length } },
      { tenant_id: bidRecord.tenant_id, conversion_id: conversion.id, step: 'COMPLETE', status: 'SUCCESS' },
    ]);

    setSelectedProposal(null);
    refresh();
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
        onClose={() => setSelectedProposal(null)}
        onSend={(p) => {
          setSelectedProposal(null);
          setSendProposal(p);
        }}
        onMarkWon={handleMarkWon}
        onConvert={handleConvert}
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
