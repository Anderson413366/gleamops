'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Send, Target } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';
import { BID_STATUS_COLORS, PROPOSAL_STATUS_COLORS, OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';

interface PipelineStats {
  totalOpportunities: number;
  totalValue: number;
  byStage: Record<string, { count: number; value: number }>;
}

interface BidStats {
  total: number;
  byStatus: Record<string, number>;
  wonCount: number;
  lostCount: number;
}

interface ProposalStats {
  total: number;
  sentLast30: number;
  byStatus: Record<string, number>;
}

export default function SalesDashboard() {
  const [pipeline, setPipeline] = useState<PipelineStats>({ totalOpportunities: 0, totalValue: 0, byStage: {} });
  const [bidStats, setBidStats] = useState<BidStats>({ total: 0, byStatus: {}, wonCount: 0, lostCount: 0 });
  const [proposalStats, setProposalStats] = useState<ProposalStats>({ total: 0, sentLast30: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [oppsRes, bidsRes, proposalsRes, sentRes] = await Promise.all([
      supabase
        .from('sales_opportunities')
        .select('id, stage_code, estimated_monthly_value')
        .is('archived_at', null),
      supabase
        .from('sales_bids')
        .select('id, status')
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id, status')
        .is('archived_at', null),
      supabase
        .from('sales_proposal_sends')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo)
        .is('archived_at', null),
    ]);

    // Pipeline
    if (oppsRes.data) {
      const byStage: Record<string, { count: number; value: number }> = {};
      let totalValue = 0;
      for (const o of oppsRes.data) {
        const val = o.estimated_monthly_value || 0;
        totalValue += val;
        if (!byStage[o.stage_code]) byStage[o.stage_code] = { count: 0, value: 0 };
        byStage[o.stage_code].count++;
        byStage[o.stage_code].value += val;
      }
      setPipeline({ totalOpportunities: oppsRes.data.length, totalValue, byStage });
    }

    // Bids
    if (bidsRes.data) {
      const byStatus: Record<string, number> = {};
      let wonCount = 0;
      let lostCount = 0;
      for (const b of bidsRes.data) {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        if (b.status === 'WON') wonCount++;
        if (b.status === 'LOST') lostCount++;
      }
      setBidStats({ total: bidsRes.data.length, byStatus, wonCount, lostCount });
    }

    // Proposals
    if (proposalsRes.data) {
      const byStatus: Record<string, number> = {};
      for (const p of proposalsRes.data) {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      }
      setProposalStats({
        total: proposalsRes.data.length,
        sentLast30: sentRes.count || 0,
        byStatus,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  const winRate = bidStats.total > 0
    ? Math.round((bidStats.wonCount / (bidStats.wonCount + bidStats.lostCount || 1)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(pipeline.totalValue)}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold">{pipeline.totalOpportunities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Send className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Proposals Sent (30d)</p>
                <p className="text-2xl font-bold">{proposalStats.sentLast30}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">{bidStats.wonCount}W / {bidStats.lostCount}L</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline + Bids + Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pipeline.byStage).length === 0 ? (
              <p className="text-sm text-muted-foreground">No opportunities yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(pipeline.byStage).map(([stage, { count, value }]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <Badge color={OPPORTUNITY_STAGE_COLORS[stage] ?? 'gray'}>{stage.replace(/_/g, ' ')}</Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{count}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(value)}/mo</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bids by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(bidStats.byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No bids yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(bidStats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge color={BID_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(proposalStats.byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No proposals yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(proposalStats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge color={PROPOSAL_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
