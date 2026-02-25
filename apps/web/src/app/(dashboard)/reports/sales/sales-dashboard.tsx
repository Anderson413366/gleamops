'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Send, Target, BarChart3, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Badge, Button } from '@gleamops/ui';
import { BID_STATUS_COLORS, PROPOSAL_STATUS_COLORS, OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../_components/report-components';

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
  openCount: number;
  openValue: number;
}

interface ProposalStats {
  total: number;
  sentLast30: number;
  byStatus: Record<string, number>;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyLabels(days: number) {
  const out: { key: string; label: string }[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ key: dateKey(d), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
  }
  return out;
}

export default function SalesDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineStats>({ totalOpportunities: 0, totalValue: 0, byStage: {} });
  const [bidStats, setBidStats] = useState<BidStats>({ total: 0, byStatus: {}, wonCount: 0, lostCount: 0, openCount: 0, openValue: 0 });
  const [proposalStats, setProposalStats] = useState<ProposalStats>({ total: 0, sentLast30: 0, byStatus: {} });
  const [proposalSendSeries, setProposalSendSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const start = new Date(Date.now() - props.rangeDays * 86400000);
    const startISO = start.toISOString();

    const [oppsRes, bidsRes, proposalsRes, sentRes] = await Promise.all([
      supabase
        .from('sales_opportunities')
        .select('id, stage_code, estimated_monthly_value, created_at')
        .is('archived_at', null),
      supabase
        .from('sales_bids')
        .select('id, status, bid_monthly_price, created_at')
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id, status')
        .is('archived_at', null),
      supabase
        .from('sales_proposal_sends')
        .select('created_at', { count: 'exact' })
        .gte('created_at', startISO)
        .is('archived_at', null),
    ]);

    // Pipeline
    if (oppsRes.data) {
      const byStage: Record<string, { count: number; value: number }> = {};
      let totalValue = 0;
      let activeCount = 0;
      for (const o of oppsRes.data) {
        const isClosed = o.stage_code === 'WON' || o.stage_code === 'LOST';
        const val = o.estimated_monthly_value || 0;
        if (!isClosed) {
          totalValue += val;
          activeCount++;
        }
        if (!byStage[o.stage_code]) byStage[o.stage_code] = { count: 0, value: 0 };
        byStage[o.stage_code].count++;
        byStage[o.stage_code].value += val;
      }
      setPipeline({ totalOpportunities: activeCount, totalValue, byStage });
    }

    // Bids
    if (bidsRes.data) {
      const byStatus: Record<string, number> = {};
      let wonCount = 0;
      let lostCount = 0;
      let openValue = 0;
      let openCount = 0;
      for (const b of bidsRes.data) {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        if (b.status === 'WON') wonCount++;
        if (b.status === 'LOST') lostCount++;
        if (b.status !== 'WON' && b.status !== 'LOST') {
          openCount++;
          openValue += b.bid_monthly_price || 0;
        }
      }
      setBidStats({ total: bidsRes.data.length, byStatus, wonCount, lostCount, openCount, openValue });
    }

    // Proposals
    if (proposalsRes.data) {
      const byStatus: Record<string, number> = {};
      for (const p of proposalsRes.data) {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      }
      const countsByDay: Record<string, number> = {};
      for (const s of (sentRes.data ?? []) as unknown as { created_at: string }[]) {
        const key = dateKey(new Date(s.created_at));
        countsByDay[key] = (countsByDay[key] || 0) + 1;
      }
      const labels = buildDailyLabels(Math.min(14, Math.max(7, props.rangeDays)));
      setProposalSendSeries(labels.map((d) => countsByDay[d.key] || 0));

      setProposalStats({
        total: proposalsRes.data.length,
        sentLast30: sentRes.count || 0,
        byStatus,
      });
    }

    setLoading(false);
  }, [props.rangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchData(); }, [props.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
          label="Pipeline Value"
          value={formatCurrency(pipeline.totalValue)}
          sublabel="/month"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="primary"
          label="Active Opportunities"
          value={pipeline.totalOpportunities}
        />
        <MetricCard
          icon={<Send className="h-5 w-5" />}
          tone="accent"
          label={`Proposals Sent (${props.rangeDays}d)`}
          value={proposalStats.sentLast30}
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          tone="warning"
          label="Win Rate"
          value={`${winRate}%`}
          helper={`${bidStats.wonCount}W / ${bidStats.lostCount}L`}
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          tone="primary"
          label="Open Bids"
          value={bidStats.openCount}
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          tone="accent"
          label="Open Bid Value"
          value={formatCurrency(bidStats.openValue)}
          sublabel="/month"
        />
      </div>

      {/* Pipeline + Bids + Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Pipeline by Stage"
          subtitle="Count and monthly value by opportunity stage."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/pipeline')}>
              View Pipeline <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {Object.keys(pipeline.byStage).length === 0 ? (
            <p className="text-sm text-muted-foreground">No opportunities yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(pipeline.byStage).map(([stage, { count, value }]) => (
                <BreakdownRow
                  key={stage}
                  left={<Badge color={OPPORTUNITY_STAGE_COLORS[stage] ?? 'gray'}>{stage.replace(/_/g, ' ')}</Badge>}
                  right={
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{count}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(value)}/mo</p>
                    </div>
                  }
                  pct={pipeline.totalValue > 0 ? value / pipeline.totalValue : 0}
                  rightWidthClassName="w-20"
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Proposals Sent Trend" subtitle={`Sends per day (last ${Math.min(14, Math.max(7, props.rangeDays))} days)`}>
          {proposalSendSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proposal sends recorded in this range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums sm:text-2xl leading-tight">{proposalSendSeries.reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-muted-foreground">Total sends in range</p>
              </div>
              <MiniBars values={proposalSendSeries} barClassName="fill-accent/60" ariaLabel="Proposal sends per day" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Bids and Proposals" subtitle="Status distributions across active work.">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Bids by Status</p>
              {Object.keys(bidStats.byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">No bids yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(bidStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge color={BID_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Proposals by Status</p>
              {Object.keys(proposalStats.byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">No proposals yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(proposalStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge color={PROPOSAL_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
