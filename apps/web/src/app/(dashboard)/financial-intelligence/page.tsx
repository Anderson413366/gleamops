'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Receipt, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

interface TopItem {
  name: string;
  value: number;
}

interface FinancialIntelState {
  revenueRunRate: number;
  pipelineValue: number;
  supplySpend30d: number;
  activeStaff: number;
  laborHours30d: number;
  revenuePerStaff: number;
  teamEfficiencyIndex: number;
  sparkleScore: number;
  topClients: TopItem[];
  topSites: TopItem[];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);
}

export default function FinancialIntelligencePage() {
  const enabled = useFeatureFlag('financial_intel_v1');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialIntelState>({
    revenueRunRate: 0,
    pipelineValue: 0,
    supplySpend30d: 0,
    activeStaff: 0,
    laborHours30d: 0,
    revenuePerStaff: 0,
    teamEfficiencyIndex: 0,
    sparkleScore: 0,
    topClients: [],
    topSites: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [jobsRes, pipelineRes, supplyRes, staffRes, timeRes, inspectionsRes, ticketsRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select('billing_amount, site:site_id(name, client:client_id(name))')
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('sales_opportunities')
        .select('estimated_monthly_value')
        .is('archived_at', null),
      supabase
        .from('supply_orders')
        .select('total_amount')
        .gte('order_date', thirtyDaysAgo.slice(0, 10))
        .is('archived_at', null),
      supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE'),
      supabase
        .from('time_entries')
        .select('duration_minutes')
        .gte('start_at', thirtyDaysAgo)
        .is('archived_at', null),
      supabase
        .from('inspections')
        // inspections table uses boolean `passed` (no `pass_fail`)
        .select('status, passed')
        .is('archived_at', null),
      supabase
        .from('work_tickets')
        .select('status')
        .is('archived_at', null),
    ]);

    const jobs = (jobsRes.data ?? []) as Array<{ billing_amount: number | null; site: unknown }>;
    const revenueRunRate = jobs.reduce((sum, row) => sum + (row.billing_amount ?? 0), 0);
    const clientMap: Record<string, number> = {};
    const siteMap: Record<string, number> = {};
    for (const row of jobs) {
      const value = row.billing_amount ?? 0;
      const siteRel = firstRelation(row.site as { name?: string | null; client?: unknown } | Array<{ name?: string | null; client?: unknown }> | null);
      const clientRel = firstRelation(siteRel?.client as { name?: string | null } | Array<{ name?: string | null }> | null);
      const client = clientRel?.name ?? 'Unknown Client';
      const site = siteRel?.name ?? 'Unknown Site';
      clientMap[client] = (clientMap[client] || 0) + value;
      siteMap[site] = (siteMap[site] || 0) + value;
    }

    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const topSites = Object.entries(siteMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const pipelineValue = (pipelineRes.data ?? []).reduce((sum, row) => sum + (row.estimated_monthly_value ?? 0), 0);
    const supplySpend30d = (supplyRes.data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
    const activeStaff = staffRes.count ?? 0;
    const laborMinutes30d = (timeRes.data ?? []).reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
    const laborHours30d = laborMinutes30d / 60;

    const completedInspections = (inspectionsRes.data ?? []).filter((row) => row.status === 'COMPLETED' || row.status === 'SUBMITTED');
    const passedInspections = completedInspections.filter((row) => row.passed === true).length;
    const inspectionPassRate = completedInspections.length > 0 ? passedInspections / completedInspections.length : 0;

    const tickets = ticketsRes.data ?? [];
    const completedTickets = tickets.filter((row) => row.status === 'COMPLETED' || row.status === 'VERIFIED').length;
    const onTimeRate = tickets.length > 0 ? completedTickets / tickets.length : 0;

    const sparkleScore = Math.round((inspectionPassRate * 0.6 + onTimeRate * 0.4) * 100);
    const revenuePerStaff = activeStaff > 0 ? revenueRunRate / activeStaff : 0;
    const teamEfficiencyIndex = laborHours30d > 0 ? revenueRunRate / laborHours30d : 0;

    setData({
      revenueRunRate,
      pipelineValue,
      supplySpend30d,
      activeStaff,
      laborHours30d,
      revenuePerStaff,
      teamEfficiencyIndex,
      sparkleScore,
      topClients,
      topSites,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [enabled, fetchData]);

  if (!enabled) {
    return (
      <div className="space-y-6">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-foreground">Financial Intelligence</h1>
            <p className="mt-2 text-sm text-muted-foreground">This module is feature-flagged and currently disabled.</p>
            <p className="mt-2 text-xs text-muted-foreground">Enable with `NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1=true`.</p>
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only cross-module financial KPIs and risk indicators.</p>
        </div>
        <Badge color="blue">Feature Flag: `financial_intel_v1`</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Revenue Run Rate</p><p className="text-2xl font-semibold">{formatCurrency(data.revenueRunRate)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-2xl font-semibold">{formatCurrency(data.pipelineValue)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supply Spend (30d)</p><p className="text-2xl font-semibold">{formatCurrency(data.supplySpend30d)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Sparkle Score</p><p className="text-2xl font-semibold inline-flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" />{data.sparkleScore}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Revenue / Active Staff</p><p className="text-2xl font-semibold">{formatCurrency(data.revenuePerStaff)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Team Efficiency Index</p><p className="text-2xl font-semibold">{formatCurrency(data.teamEfficiencyIndex)}/hr</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-2xl font-semibold inline-flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{data.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Labor Hours (30d)</p><p className="text-2xl font-semibold inline-flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />{formatNumber(data.laborHours30d)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.topClients.length === 0 && <p className="text-sm text-muted-foreground">No revenue data available.</p>}
            {data.topClients.map((row) => (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{row.name}</span>
                  <span className="font-mono">{formatCurrency(row.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-module-accent" style={{ width: `${(row.value / topClientMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Top Sites by Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.topSites.length === 0 && <p className="text-sm text-muted-foreground">No site data available.</p>}
            {data.topSites.map((row) => (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{row.name}</span>
                  <span className="font-mono">{formatCurrency(row.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(row.value / topSiteMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Data Needed For Next-Level KPIs</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Track actual payroll payouts and benefits to replace estimated labor proxies.</p>
          <p>Add invoice/payment tables for true cash-flow and AR aging.</p>
          <p>Capture site square footage to unlock cost-per-square-foot profitability.</p>
        </CardContent>
      </Card>
    </div>
  );
}
