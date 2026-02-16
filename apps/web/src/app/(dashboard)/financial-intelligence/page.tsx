'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Users, Receipt, Sparkles, TriangleAlert, RefreshCw, CalendarDays, ArrowRight, Layers } from 'lucide-react';
import { Skeleton, Badge, Button, ChipTabs } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../reports/_components/report-components';

interface TopItem {
  name: string;
  value: number;
}

interface FinancialIntelState {
  contractRevenueMonthly: number;
  activeContracts: number;
  revenueByFrequency: TopItem[];

  pipelineOpenMonthly: number;
  pipelineOpenCount: number;
  pipelineByStage: Record<string, { count: number; value: number }>;

  supplySpendRange: number;
  supplyOrdersRange: number;
  supplyOrdersInTransit: number;
  supplySpendSeries: number[];

  activeStaff: number;
  laborHoursRange: number;
  laborHoursSeries: number[];

  inspectionsCompleted: number;
  inspectionPassRatePct: number;
  avgInspectionScorePct: number;

  ticketsScheduled: number;
  ticketCompletionRatePct: number;

  revenuePerStaff: number;
  teamEfficiencyIndex: number;
  sparkleScore: number;
  clientDependencyPct: number;
  clientDependencyName: string | null;
  topClients: TopItem[];
  topSites: TopItem[];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);
}

const RANGE_OPTIONS = [
  { key: '7', label: '7d', days: 7 },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: '365', label: '1y', days: 365 },
] as const;

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

export default function FinancialIntelligencePage() {
  const enabled = useFeatureFlag('financial_intel_v1');
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRange = searchParams.get('range');
  const [rangeDays, setRangeDays] = useState<number>(() => {
    const match = RANGE_OPTIONS.find((o) => o.key === initialRange);
    return match?.days ?? 30;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialIntelState>({
    contractRevenueMonthly: 0,
    activeContracts: 0,
    revenueByFrequency: [],

    pipelineOpenMonthly: 0,
    pipelineOpenCount: 0,
    pipelineByStage: {},

    supplySpendRange: 0,
    supplyOrdersRange: 0,
    supplyOrdersInTransit: 0,
    supplySpendSeries: [],

    activeStaff: 0,
    laborHoursRange: 0,
    laborHoursSeries: [],

    inspectionsCompleted: 0,
    inspectionPassRatePct: 0,
    avgInspectionScorePct: 0,

    ticketsScheduled: 0,
    ticketCompletionRatePct: 0,

    revenuePerStaff: 0,
    teamEfficiencyIndex: 0,
    sparkleScore: 0,
    clientDependencyPct: 0,
    clientDependencyName: null,
    topClients: [],
    topSites: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const start = new Date();
    start.setDate(start.getDate() - rangeDays);
    const startISO = start.toISOString();
    const rangeStartDate = dateKey(start);

    // Keep dense time-series visuals readable.
    const seriesDays = Math.min(30, Math.max(7, rangeDays));
    const daily = buildDailyLabels(seriesDays);
    const seriesStart = daily[0]?.key ?? dateKey(new Date(Date.now() - 6 * 86400000));
    const seriesStartISO = `${seriesStart}T00:00:00Z`;

    const [jobsRes, pipelineRes, supplyRes, staffRes, timeRes, inspectionsRes, ticketsRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select('billing_amount, frequency, site:site_id(name, client:client_id(name))')
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('sales_opportunities')
        .select('estimated_monthly_value, stage_code, created_at')
        .is('archived_at', null)
        .gte('created_at', startISO),
      supabase
        .from('supply_orders')
        .select('order_date, status, total_amount')
        .gte('order_date', rangeStartDate)
        .is('archived_at', null),
      supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE'),
      supabase
        .from('time_entries')
        .select('start_at, duration_minutes')
        .gte('start_at', startISO)
        .is('archived_at', null),
      supabase
        .from('inspections')
        // inspections table uses boolean `passed` (no `pass_fail`)
        .select('status, passed, score_pct, created_at')
        .is('archived_at', null)
        .gte('created_at', startISO),
      supabase
        .from('work_tickets')
        .select('status, scheduled_date')
        .is('archived_at', null)
        .gte('scheduled_date', rangeStartDate),
    ]);

    const jobs = (jobsRes.data ?? []) as Array<{ billing_amount: number | null; frequency: string | null; site: unknown }>;
    const contractRevenueMonthly = jobs.reduce((sum, row) => sum + (row.billing_amount ?? 0), 0);
    const clientMap: Record<string, number> = {};
    const siteMap: Record<string, number> = {};
    const freqMap: Record<string, number> = {};
    for (const row of jobs) {
      const value = row.billing_amount ?? 0;
      const freq = row.frequency ?? 'OTHER';
      const siteRel = firstRelation(row.site as { name?: string | null; client?: unknown } | Array<{ name?: string | null; client?: unknown }> | null);
      const clientRel = firstRelation(siteRel?.client as { name?: string | null } | Array<{ name?: string | null }> | null);
      const client = clientRel?.name ?? 'Unknown Client';
      const site = siteRel?.name ?? 'Unknown Site';
      clientMap[client] = (clientMap[client] || 0) + value;
      siteMap[site] = (siteMap[site] || 0) + value;
      freqMap[freq] = (freqMap[freq] || 0) + value;
    }

    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const topSites = Object.entries(siteMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const revenueByFrequency = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const pipelineRows = (pipelineRes.data ?? []) as Array<{ estimated_monthly_value: number | null; stage_code: string | null }>;
    const pipelineByStage: Record<string, { count: number; value: number }> = {};
    for (const row of pipelineRows) {
      const stage = row.stage_code ?? 'UNKNOWN';
      if (stage === 'WON' || stage === 'LOST') continue;
      if (!pipelineByStage[stage]) pipelineByStage[stage] = { count: 0, value: 0 };
      pipelineByStage[stage].count += 1;
      pipelineByStage[stage].value += row.estimated_monthly_value ?? 0;
    }
    const pipelineOpenMonthly = Object.values(pipelineByStage).reduce((s, r) => s + r.value, 0);
    const pipelineOpenCount = Object.values(pipelineByStage).reduce((s, r) => s + r.count, 0);

    const supplyOrders = (supplyRes.data ?? []) as Array<{ order_date: string; status: string; total_amount: number | null }>;
    const supplySpendRange = supplyOrders.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
    const supplyOrdersInTransit = supplyOrders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'SHIPPED').length;

    const supplySpendByDay: Record<string, number> = {};
    for (const o of supplyOrders) {
      if (o.order_date < seriesStart) continue;
      supplySpendByDay[o.order_date] = (supplySpendByDay[o.order_date] || 0) + (o.total_amount ?? 0);
    }
    const supplySpendSeries = daily.map((d) => supplySpendByDay[d.key] || 0);

    const activeStaff = staffRes.count ?? 0;
    const timeEntries = (timeRes.data ?? []) as Array<{ start_at: string; duration_minutes: number | null }>;
    const laborMinutesRange = timeEntries.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
    const laborHoursRange = laborMinutesRange / 60;

    const laborMinutesByDay: Record<string, number> = {};
    for (const e of timeEntries) {
      if (e.start_at < seriesStartISO) continue;
      const key = dateKey(new Date(e.start_at));
      laborMinutesByDay[key] = (laborMinutesByDay[key] || 0) + (e.duration_minutes ?? 0);
    }
    const laborHoursSeries = daily.map((d) => (laborMinutesByDay[d.key] || 0) / 60);

    const inspections = (inspectionsRes.data ?? []) as Array<{ status: string; passed: boolean | null; score_pct: number | null }>;
    const completedInspections = inspections.filter((row) => row.status === 'COMPLETED' || row.status === 'SUBMITTED');
    const passedInspections = completedInspections.filter((row) => row.passed === true).length;
    const inspectionPassRatePct = completedInspections.length > 0 ? Math.round((passedInspections / completedInspections.length) * 100) : 0;
    const avgInspectionScorePct = completedInspections.length > 0
      ? Math.round(
          (completedInspections.reduce((s, row) => s + (row.score_pct ?? 0), 0) / completedInspections.length) * 10
        ) / 10
      : 0;

    const tickets = (ticketsRes.data ?? []) as Array<{ status: string }>;
    const ticketsScheduled = tickets.length;
    const completedTickets = tickets.filter((row) => row.status === 'COMPLETED' || row.status === 'VERIFIED').length;
    const ticketCompletionRatePct = ticketsScheduled > 0 ? Math.round((completedTickets / ticketsScheduled) * 100) : 0;

    // Sparkle Score is intentionally labeled as a proxy: inspection pass rate + ticket completion rate.
    const sparkleScore = Math.round((inspectionPassRatePct * 0.6 + ticketCompletionRatePct * 0.4));
    const revenuePerStaff = activeStaff > 0 ? contractRevenueMonthly / activeStaff : 0;
    // Normalize labor hours to a 30d window so "monthly revenue / labor-hour" stays comparable at any selected range.
    const laborHoursMonthlyNormalized = rangeDays > 0 ? laborHoursRange * (30 / rangeDays) : 0;
    const teamEfficiencyIndex = laborHoursMonthlyNormalized > 0 ? contractRevenueMonthly / laborHoursMonthlyNormalized : 0;

    const topClient = topClients[0] ?? null;
    const clientDependencyPct = contractRevenueMonthly > 0 && topClient ? topClient.value / contractRevenueMonthly : 0;

    setData({
      contractRevenueMonthly,
      activeContracts: jobs.length,
      revenueByFrequency,

      pipelineOpenMonthly,
      pipelineOpenCount,
      pipelineByStage,

      supplySpendRange,
      supplyOrdersRange: supplyOrders.length,
      supplyOrdersInTransit,
      supplySpendSeries,

      activeStaff,
      laborHoursRange,
      laborHoursSeries,

      inspectionsCompleted: completedInspections.length,
      inspectionPassRatePct,
      avgInspectionScorePct,

      ticketsScheduled,
      ticketCompletionRatePct,

      revenuePerStaff,
      teamEfficiencyIndex,
      sparkleScore,
      clientDependencyPct,
      clientDependencyName: topClient?.name ?? null,
      topClients,
      topSites,
    });
    setUpdatedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [rangeDays]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [enabled, fetchData]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!enabled) {
    return (
      <div className="space-y-6">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <ChartCard title="Financial Intelligence" subtitle="This module is feature-flagged and currently disabled.">
          <p className="text-sm text-muted-foreground">Enable with `NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1=true`.</p>
        </ChartCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const topClientMax = Math.max(...data.topClients.map((row) => row.value), 1);
  const topSiteMax = Math.max(...data.topSites.map((row) => row.value), 1);
  const dependencyPct = Math.round(data.clientDependencyPct * 100);
  const dependencyRisk = dependencyPct >= 25;

  return (
    <div className="space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only, cross-module KPIs, trends, and risk signals. Uses only tracked data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {updatedAt && <Badge color="gray">{`Updated ${updatedAt}`}</Badge>}
          <Badge color="blue">Feature Flag: `financial_intel_v1`</Badge>
          <Button
            variant="secondary"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Range:</span>
        </div>
        <ChipTabs
          tabs={RANGE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
          active={String(rangeDays)}
          onChange={(key) => {
            const match = RANGE_OPTIONS.find((o) => o.key === key);
            if (!match) return;
            setRangeDays(match.days);
            const params = new URLSearchParams(searchParams.toString());
            params.set('range', match.key);
            router.replace(`/financial-intelligence?${params.toString()}`);
          }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Core KPIs</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="success" label="Contract Revenue" value={formatCurrency(data.contractRevenueMonthly)} sublabel="/mo (est.)" />
          <MetricCard icon={<Layers className="h-5 w-5" />} tone="primary" label="Active Contracts" value={data.activeContracts} />
          <MetricCard icon={<Sparkles className="h-5 w-5" />} tone="warning" label="Sparkle Score" value={data.sparkleScore} sublabel="proxy" />
          <MetricCard icon={<Users className="h-5 w-5" />} tone="primary" label="Active Staff" value={data.activeStaff} />
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="accent" label={`Labor Hours (${rangeDays}d)`} value={formatNumber(data.laborHoursRange)} />
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="warning" label={`Supply Spend (${rangeDays}d)`} value={formatCurrency(data.supplySpendRange)} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Finance + Quality Signals</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="success" label="Open Pipeline" value={formatCurrency(data.pipelineOpenMonthly)} sublabel="/mo" />
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="accent" label="Pipeline Items" value={data.pipelineOpenCount} />
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="success" label="Revenue / Staff" value={formatCurrency(data.revenuePerStaff)} />
          <MetricCard icon={<Receipt className="h-5 w-5" />} tone="accent" label="Efficiency Index" value={`${formatCurrency(data.teamEfficiencyIndex)}/hr`} sublabel="normalized" />
          <MetricCard icon={<Sparkles className="h-5 w-5" />} tone="primary" label="Inspection Pass Rate" value={`${data.inspectionPassRatePct}%`} />
          <MetricCard icon={<Sparkles className="h-5 w-5" />} tone="primary" label="Avg Inspection Score" value={`${data.avgInspectionScorePct}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top Clients (Contract Revenue)" subtitle="Largest shares of active contract revenue">
          {data.topClients.length === 0 && <p className="text-sm text-muted-foreground">No revenue data available.</p>}
          <div className="space-y-3">
            {data.topClients.map((row) => (
              <BreakdownRow
                key={row.name}
                left={<span className="text-sm font-medium truncate max-w-[220px]">{row.name}</span>}
                right={<span className="font-mono text-xs">{formatCurrency(row.value)}</span>}
                pct={row.value / topClientMax}
                rightWidthClassName="w-28"
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top Sites (Contract Revenue)" subtitle="Where most contract revenue is concentrated">
          {data.topSites.length === 0 && <p className="text-sm text-muted-foreground">No site data available.</p>}
          <div className="space-y-3">
            {data.topSites.map((row) => (
              <BreakdownRow
                key={row.name}
                left={<span className="text-sm font-medium truncate max-w-[220px]">{row.name}</span>}
                right={<span className="font-mono text-xs">{formatCurrency(row.value)}</span>}
                pct={row.value / topSiteMax}
                rightWidthClassName="w-28"
              />
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Supply Spend Trend" subtitle={`Daily spend (last ${Math.min(30, Math.max(7, rangeDays))} days)`}>
          {data.supplySpendSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supply orders in range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(data.supplySpendRange)}</p>
                <p className="text-xs text-muted-foreground">{data.supplyOrdersRange} orders, {data.supplyOrdersInTransit} in transit</p>
              </div>
              <MiniBars values={data.supplySpendSeries} ariaLabel="Supply spend per day" barClassName="fill-warning/70" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Labor Hours Trend" subtitle={`Daily hours (last ${Math.min(30, Math.max(7, rangeDays))} days)`}>
          {data.laborHoursSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entries in range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums">{formatNumber(data.laborHoursRange)}</p>
                <p className="text-xs text-muted-foreground">Total labor hours in range</p>
              </div>
              <MiniBars values={data.laborHoursSeries} ariaLabel="Labor hours per day" barClassName="fill-accent/70" />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Pipeline By Stage" subtitle={`Open opportunities (created in last ${rangeDays} days)`}>
          {Object.keys(data.pipelineByStage).length === 0 ? (
            <p className="text-sm text-muted-foreground">No open pipeline items created in this range.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.pipelineByStage)
                .sort((a, b) => b[1].value - a[1].value)
                .slice(0, 6)
                .map(([stage, v]) => (
                  <BreakdownRow
                    key={stage}
                    left={
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge color={OPPORTUNITY_STAGE_COLORS[stage] ?? 'gray'}>{stage.replace(/_/g, ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">{v.count}</span>
                      </div>
                    }
                    right={<span className="font-mono text-xs">{formatCurrency(v.value)}</span>}
                    pct={data.pipelineOpenMonthly > 0 ? v.value / data.pipelineOpenMonthly : 0}
                    rightWidthClassName="w-28"
                  />
                ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue By Billing Frequency" subtitle="Active contract revenue breakdown">
          {data.revenueByFrequency.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active contracts found.</p>
          ) : (
            <div className="space-y-3">
              {data.revenueByFrequency.map((row) => (
                <BreakdownRow
                  key={row.name}
                  left={<span className="text-sm font-medium">{row.name}</span>}
                  right={<span className="font-mono text-xs">{formatCurrency(row.value)}</span>}
                  pct={data.contractRevenueMonthly > 0 ? row.value / data.contractRevenueMonthly : 0}
                  rightWidthClassName="w-28"
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Risk Signals" subtitle="Concentration and proxy health indicators">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Client Dependency Risk</p>
              <p className="text-xs text-muted-foreground">
                Warns if a single client represents 25%+ of active contract revenue (monthly est.).
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Badge color={dependencyRisk ? 'yellow' : 'green'}>
                {dependencyRisk ? 'Needs attention' : 'On track'}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground font-mono">
                {data.clientDependencyName ? `${dependencyPct}%` : '—'}
              </p>
            </div>
          </div>
          {dependencyRisk && data.clientDependencyName && (
            <div className="flex items-center gap-2 text-xs text-warning">
              <TriangleAlert className="h-4 w-4" />
              <span className="text-muted-foreground">
                {data.clientDependencyName} is {dependencyPct}% of active contract revenue.
              </span>
            </div>
          )}
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Ticket Completion (Proxy)</p>
              <p className="text-xs text-muted-foreground">Share of tickets scheduled in range that are completed/verified.</p>
            </div>
            <div className="shrink-0 text-right">
              <Badge color={data.ticketCompletionRatePct >= 80 ? 'green' : data.ticketCompletionRatePct >= 60 ? 'yellow' : 'red'}>
                {data.ticketCompletionRatePct >= 80 ? 'On track' : 'Needs attention'}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground font-mono">
                {data.ticketsScheduled > 0 ? `${data.ticketCompletionRatePct}%` : '—'}
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Quick Actions" subtitle="Jump to the source modules">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => router.push(`/reports?tab=financial&range=${rangeDays}`)}>
              Open Financial Reports
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/pipeline?range=${rangeDays}`)}>
              Review Pipeline
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => router.push('/crm')}>
              View Clients
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => router.push('/inventory')}>
              Inventory + Orders
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ChartCard>

        <ChartCard title="Data Needed For Next-Level KPIs" subtitle="What we must track to unlock true profitability">
          <p>Track actual payroll payouts and benefits to replace estimated labor proxies.</p>
          <p>Add invoice/payment tables for true cash-flow and AR aging.</p>
          <p>Capture site square footage to unlock cost-per-square-foot profitability.</p>
        </ChartCard>

        <ChartCard title="How This Works" subtitle="Scope and assumptions (read-only)">
          <p className="text-sm text-muted-foreground">
            Contract revenue is based on active jobs’ `billing_amount` and is shown as an estimated monthly run rate.
            Sparkle Score combines inspection pass rate and ticket completion rate (both proxies).
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
