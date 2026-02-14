'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Clock, Trophy, DollarSign } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
} from '@gleamops/ui';

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface StageVelocity {
  stage: string;
  avgDays: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function PipelineAnalytics() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [velocity, setVelocity] = useState<StageVelocity[]>([]);
  const [winRate, setWinRate] = useState<number | null>(null);
  const [pipelineRevenue, setPipelineRevenue] = useState(0);
  const [wonRevenue, setWonRevenue] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const fetchAnalytics = async () => {
      setLoading(true);

      // Fetch all data in parallel
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

      const [
        prospectsRes,
        opportunitiesRes,
        bidsRes,
        proposalsRes,
        wonProposalsRes,
        lostProposalsRes,
        activeOppsRes,
        wonOppsRes,
      ] = await Promise.all([
        // Total prospects
        supabase.from('sales_prospects').select('id', { count: 'exact', head: true }).is('archived_at', null),
        // Active opportunities (not won/lost)
        supabase.from('sales_opportunities')
          .select('id, stage_code, estimated_monthly_value, created_at, updated_at')
          .is('archived_at', null),
        // All bids
        supabase.from('sales_bids').select('id, status', { count: 'exact', head: true }),
        // All proposals
        supabase.from('sales_proposals').select('id, status', { count: 'exact', head: true }),
        // Won proposals in last 90 days
        supabase.from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'WON')
          .gte('updated_at', ninetyDaysAgo),
        // Lost proposals in last 90 days
        supabase.from('sales_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'LOST')
          .gte('updated_at', ninetyDaysAgo),
        // Active opportunities (pipeline value)
        supabase.from('sales_opportunities')
          .select('estimated_monthly_value')
          .not('stage_code', 'in', '("WON","LOST")')
          .is('archived_at', null),
        // Won opportunities (won revenue)
        supabase.from('sales_opportunities')
          .select('estimated_monthly_value')
          .eq('stage_code', 'WON')
          .is('archived_at', null),
      ]);

      // Build funnel
      const funnelData: FunnelStage[] = [
        { label: 'Prospects', count: prospectsRes.count ?? 0, color: 'bg-blue-500' },
        { label: 'Opportunities', count: (opportunitiesRes.data ?? []).length, color: 'bg-indigo-500' },
        { label: 'Bids', count: bidsRes.count ?? 0, color: 'bg-purple-500' },
        { label: 'Proposals', count: proposalsRes.count ?? 0, color: 'bg-pink-500' },
        { label: 'Won', count: wonProposalsRes.count ?? 0, color: 'bg-green-500' },
      ];
      setFunnel(funnelData);

      // Win rate (last 90 days)
      const won = wonProposalsRes.count ?? 0;
      const lost = lostProposalsRes.count ?? 0;
      const total = won + lost;
      setWinRate(total > 0 ? (won / total) * 100 : null);

      // Pipeline revenue (sum of active opp values)
      const pipelineSum = (activeOppsRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).estimated_monthly_value) || 0), 0
      );
      setPipelineRevenue(pipelineSum);

      // Won revenue
      const wonSum = (wonOppsRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).estimated_monthly_value) || 0), 0
      );
      setWonRevenue(wonSum);
      setAvgDealSize(won > 0 ? wonSum / won : 0);

      // Stage velocity: avg days per opportunity stage
      const opps = opportunitiesRes.data ?? [];
      const stageGroups: Record<string, number[]> = {};
      for (const opp of opps) {
        const o = opp as Record<string, unknown>;
        const stage = o.stage_code as string;
        const created = new Date(o.created_at as string).getTime();
        const updated = new Date(o.updated_at as string).getTime();
        const days = (updated - created) / 86400000;
        if (!stageGroups[stage]) stageGroups[stage] = [];
        stageGroups[stage].push(days);
      }

      const stageOrder = ['QUALIFYING', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
      const velocityData: StageVelocity[] = stageOrder
        .filter((s) => stageGroups[s] && stageGroups[s].length > 0)
        .map((s) => {
          const days = stageGroups[s];
          const avg = days.reduce((a, b) => a + b, 0) / days.length;
          return { stage: s.replace(/_/g, ' '), avgDays: Math.round(avg) };
        });
      setVelocity(velocityData);

      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Conversion Funnel
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnel.map((stage, i) => {
              const widthPct = Math.max(5, (stage.count / maxCount) * 100);
              const dropoff = i > 0 && funnel[i - 1].count > 0
                ? ((1 - stage.count / funnel[i - 1].count) * 100).toFixed(0)
                : null;

              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="w-28 text-sm font-medium text-right shrink-0">{stage.label}</div>
                  <div className="flex-1 relative">
                    <div
                      className={`h-8 rounded-md ${stage.color} flex items-center px-3`}
                      style={{ width: `${widthPct}%`, minWidth: '60px' }}
                    >
                      <span className="text-xs font-bold text-white">{stage.count}</span>
                    </div>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    {dropoff !== null && (
                      <span className="text-xs text-muted-foreground">-{dropoff}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-warning" />
              <p className="text-xs text-muted-foreground">Win Rate (90d)</p>
            </div>
            <p className="text-2xl font-bold">
              {winRate !== null ? `${winRate.toFixed(0)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
            </div>
            <p className="text-2xl font-bold">{fmt(pipelineRevenue)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Won Revenue</p>
            </div>
            <p className="text-2xl font-bold">{fmt(wonRevenue)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Deal Size</p>
            </div>
            <p className="text-2xl font-bold">{avgDealSize > 0 ? fmt(avgDealSize) : 'N/A'}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Velocity */}
      {velocity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Average Days per Stage
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {velocity.map((v) => (
                <div key={v.stage} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{v.stage.toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 rounded-full bg-primary/30"
                      style={{ width: `${Math.min(200, v.avgDays * 3)}px` }}
                    />
                    <span className="text-sm font-bold w-16 text-right">{v.avgDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
