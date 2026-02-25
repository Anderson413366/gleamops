'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Target, FileText, Send, Plus, Zap, BarChart3, Calculator } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import type {
  SalesProspect,
  SalesOpportunity,
} from '@gleamops/shared';

import ProspectsTable from './prospects/prospects-table';
import OpportunitiesTable from './opportunities/opportunities-table';
import BidsTable from './bids/bids-table';
import { BidWizard } from './bids/bid-wizard';
import { ExpressBid } from './bids/express-bid';
import ProposalsTable from './proposals/proposals-table';

import PipelineAnalytics from './analytics/pipeline-analytics';
import { SalesKpiBar } from './sales-kpi-bar';
import { ProspectForm } from '@/components/forms/prospect-form';
import { OpportunityForm } from '@/components/forms/opportunity-form';
import { useSyncedTab } from '@/hooks/use-synced-tab';

interface OpportunityWithRelations extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
  client?: { name: string; client_code: string } | null;
}

const TABS = [
  { key: 'prospects', label: 'Prospects', icon: <Users className="h-4 w-4" /> },
  { key: 'opportunities', label: 'Opportunities', icon: <Target className="h-4 w-4" /> },
  { key: 'bids', label: 'Bids', icon: <FileText className="h-4 w-4" /> },
  { key: 'proposals', label: 'Proposals', icon: <Send className="h-4 w-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function PipelinePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'prospects',
  });
  const [search, setSearch] = useState('');

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

  const clearActionParam = useCallback((nextTab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    if (nextTab) params.set('tab', nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (actionName === 'create-prospect') {
      setTab('prospects');
      setEditProspect(null);
      setProspectFormOpen(true);
      clearActionParam('prospects');
      return;
    }
    if (actionName === 'create-opportunity') {
      setTab('opportunities');
      setEditOpportunity(null);
      setOpportunityFormOpen(true);
      clearActionParam('opportunities');
      return;
    }
    if (actionName === 'create-bid') {
      setTab('bids');
      setWizardOpen(true);
      clearActionParam('bids');
    }
  }, [clearActionParam, setTab]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage prospects, opportunities, bids, and proposals</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pipeline/supply-calculator"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border shadow-sm transition-all hover:bg-muted hover:shadow-md"
          >
            <Calculator className="h-4 w-4" />
            Supply Calculator
          </Link>
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

      <SalesKpiBar stats={pipelineStats} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-full lg:w-80"
        />
      </div>

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
          onCreateNew={() => setWizardOpen(true)}
        />
      )}
      {tab === 'proposals' && (
        <ProposalsTable
          key={`proposals-${refreshKey}`}
          search={search}
          onGoToBids={() => setTab('bids')}
        />
      )}
      {tab === 'analytics' && (
        <PipelineAnalytics key={`analytics-${refreshKey}`} />
      )}

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
