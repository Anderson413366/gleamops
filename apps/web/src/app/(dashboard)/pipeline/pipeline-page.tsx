'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calculator, Plus } from 'lucide-react';
import { Button, SearchInput } from '@gleamops/ui';
import type { SalesProspect, SalesOpportunity } from '@gleamops/shared';

import { BidWizard } from './bids/bid-wizard';
import { ExpressBid } from './bids/express-bid';
import { SalesKpiBar } from './sales-kpi-bar';
import { UnifiedSalesPage } from './unified-sales-page';
import LegacyPipelinePageClient from './pipeline-page-legacy';
import { ProspectsSection } from './sections/prospects-section';
import { OpportunitiesSection } from './sections/opportunities-section';
import { BidsSection } from './sections/bids-section';
import { ProposalsSection } from './sections/proposals-section';
import { AnalyticsSection } from './sections/analytics-section';
import { ProspectForm } from '@/components/forms/prospect-form';
import { OpportunityForm } from '@/components/forms/opportunity-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

interface OpportunityWithRelations extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
  client?: { name: string; client_code: string } | null;
}

function UnifiedPipelinePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const [search, setSearch] = useState('');

  // Form state
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [editProspect, setEditProspect] = useState<SalesProspect | null>(null);
  const [opportunityFormOpen, setOpportunityFormOpen] = useState(false);
  const [editOpportunity, setEditOpportunity] = useState<OpportunityWithRelations | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editBidId, setEditBidId] = useState<string | null>(null);
  const [expressOpen, setExpressOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [pipelineStats, setPipelineStats] = useState({
    pipelineValue: '$0k',
    activeBids: 0,
    staleDeals: 0,
    emailProblems: 0,
    proposalsSent30d: 0,
    winRate: '0%',
  });

  const [sectionCounts, setSectionCounts] = useState({
    prospects: 0,
    opportunities: 0,
    bids: 0,
    proposals: 0,
  });
  const standaloneCalculatorEnabled = useFeatureFlag('standalone_calculator');

  useEffect(() => {
    const fetchStats = async () => {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();

      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        pipelineRes,
        activeBidsRes,
        staleRes,
        emailRes,
        sentRes,
        wonRes,
        totalRes,
        bidsTotalRes,
        proposalsTotalRes,
      ] = await Promise.all([
        supabase
          .from('sales_opportunities')
          .select('estimated_monthly_value')
          .not('stage_code', 'in', '("WON","LOST")')
          .is('archived_at', null),
        supabase
          .from('sales_bids')
          .select('id', { count: 'exact', head: true })
          .in('status', ['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW'])
          .is('archived_at', null),
        supabase
          .from('sales_opportunities')
          .select('id', { count: 'exact', head: true })
          .not('stage_code', 'in', '("WON","LOST")')
          .lt('updated_at', fourteenDaysAgo)
          .is('archived_at', null),
        supabase
          .from('sales_proposal_sends')
          .select('id', { count: 'exact', head: true })
          .in('status', ['BOUNCED', 'FAILED']),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo)
          .in('status', ['SENT', 'VIEWED', 'SIGNED', 'WON'])
          .is('archived_at', null),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'WON')
          .is('archived_at', null),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null),
        supabase
          .from('sales_bids')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null),
        supabase
          .from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null),
      ]);

      const pipelineSum = (pipelineRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).estimated_monthly_value) || 0),
        0,
      );

      const totalProposals = totalRes.count ?? 0;
      const wonCount = wonRes.count ?? 0;
      setPipelineStats({
        pipelineValue: `$${(pipelineSum / 1000).toFixed(1)}k`,
        activeBids: activeBidsRes.count ?? 0,
        staleDeals: staleRes.count ?? 0,
        emailProblems: emailRes.count ?? 0,
        proposalsSent30d: sentRes.count ?? 0,
        winRate: totalProposals > 0 ? `${Math.round((wonCount / totalProposals) * 100)}%` : '0%',
      });

      setSectionCounts((prev) => ({
        ...prev,
        bids: bidsTotalRes.count ?? 0,
        proposals: proposalsTotalRes.count ?? 0,
      }));
    };

    fetchStats();
  }, [refreshKey]);

  const clearActionParam = useCallback((nextAction?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    if (nextAction) params.set('action', nextAction);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (actionName === 'create-prospect') {
      setEditProspect(null);
      setProspectFormOpen(true);
      clearActionParam();
      return;
    }

    if (actionName === 'create-opportunity') {
      setEditOpportunity(null);
      setOpportunityFormOpen(true);
      clearActionParam();
      return;
    }

    if (actionName === 'create-bid') {
      setWizardOpen(true);
      clearActionParam();
      return;
    }

    if (actionName === 'create-express-bid') {
      setExpressOpen(true);
      clearActionParam();
    }
  }, [clearActionParam]);

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

  return (
    <>
      <UnifiedSalesPage
        actions={(
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search pipeline..."
              className="w-full lg:w-72"
            />
            {standaloneCalculatorEnabled ? (
              <Link
                href="/pipeline/calculator"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border shadow-sm transition-all hover:bg-muted hover:shadow-md"
              >
                <Calculator className="h-4 w-4" />
                Sales Calculator
              </Link>
            ) : null}
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
            <Button
              onClick={() => {
                setEditProspect(null);
                setProspectFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Prospect
            </Button>
          </>
        )}
        kpiBar={<SalesKpiBar stats={pipelineStats} />}
        sections={[
          {
            id: 'prospects',
            title: 'Prospects',
            description: 'Active leads and first-touch opportunities.',
            tone: 'blue',
            count: sectionCounts.prospects,
            content: (
              <ProspectsSection
                key={`prospects-section-${refreshKey}`}
                globalSearch={search}
                onCreate={() => {
                  setEditProspect(null);
                  setProspectFormOpen(true);
                }}
                onCountChange={(count) => setSectionCounts((prev) => ({ ...prev, prospects: count }))}
              />
            ),
          },
          {
            id: 'opportunities',
            title: 'Opportunities',
            description: 'Qualified opportunities advancing through sales stages.',
            tone: 'blue',
            count: sectionCounts.opportunities,
            content: (
              <OpportunitiesSection
                key={`opportunities-section-${refreshKey}`}
                globalSearch={search}
                onCreate={() => {
                  setEditOpportunity(null);
                  setOpportunityFormOpen(true);
                }}
                onCountChange={(count) => setSectionCounts((prev) => ({ ...prev, opportunities: count }))}
              />
            ),
          },
        {
          id: 'bids-pricing',
          title: 'Bids & Pricing',
          description: 'Active bids with pricing controls and estimate workflows.',
          tone: 'green',
          count: sectionCounts.bids,
          content: (
            <BidsSection
              key={`bids-${refreshKey}`}
              globalSearch={search}
              onCreateNew={() => setWizardOpen(true)}
              onExpressBid={() => setExpressOpen(true)}
              onCountChange={(count) => setSectionCounts((prev) => ({ ...prev, bids: count }))}
            />
          ),
        },
        {
          id: 'proposals',
          title: 'Proposals',
          description: 'Proposal delivery, tracking, and close outcomes.',
          tone: 'pink',
          count: sectionCounts.proposals,
          content: (
            <ProposalsSection
              key={`proposals-${refreshKey}`}
              globalSearch={search}
              onGoToBids={() => setWizardOpen(true)}
              refreshToken={refreshKey}
              onCountChange={(count) => setSectionCounts((prev) => ({ ...prev, proposals: count }))}
            />
          ),
        },
        {
          id: 'analytics',
          title: 'Analytics',
          description: 'Win-rate, revenue, and conversion visibility.',
          tone: 'neutral',
          content: <AnalyticsSection refreshToken={refreshKey} />,
        },
      ]}
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
    </>
  );
}

export default function PipelinePageClient() {
  const unifiedSalesEnabled = useFeatureFlag('unified_sales');

  if (!unifiedSalesEnabled) {
    return <LegacyPipelinePageClient />;
  }

  return <UnifiedPipelinePageClient />;
}
