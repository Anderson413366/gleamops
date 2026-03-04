'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, ClipboardList, Users, Package, ArrowRight,
  DollarSign, TrendingUp, BarChart3, ShieldCheck,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Button, Skeleton } from '@gleamops/ui';
import { MetricCard, ChartCard, BreakdownRow } from '../_components/report-components';

interface OverviewData {
  // Financials
  monthlyRevenue: number;
  activeJobs: number;
  annualProjection: number;
  topClients: { name: string; revenue: number }[];
  // Operations
  openTickets: number;
  ticketsToday: number;
  ticketsByStatus: Record<string, number>;
  // Workforce
  activeStaff: number;
  staffByRole: Record<string, number>;
  // Inventory
  activeSupplies: number;
  suppliesByCategory: Record<string, number>;
  // Pipeline
  pipelineValue: number;
  activeOpportunities: number;
  // Compliance
  passRate: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function OverviewDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [data, setData] = useState<OverviewData>({
    monthlyRevenue: 0, activeJobs: 0, annualProjection: 0, topClients: [],
    openTickets: 0, ticketsToday: 0, ticketsByStatus: {},
    activeStaff: 0, staffByRole: {},
    activeSupplies: 0, suppliesByCategory: {},
    pipelineValue: 0, activeOpportunities: 0,
    passRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [jobsRes, ticketsRes, todayTicketsRes, staffRes, suppliesRes, oppsRes, inspectionsRes] = await Promise.all([
      supabase.from('site_jobs').select('billing_amount, frequency, site:site_id(client:client_id(name))').eq('status', 'ACTIVE').is('archived_at', null),
      supabase.from('work_tickets').select('status').is('archived_at', null).in('status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
      supabase.from('work_tickets').select('id').is('archived_at', null).eq('scheduled_date', today),
      supabase.from('staff').select('role, status').is('archived_at', null).eq('status', 'ACTIVE'),
      supabase.from('supply_catalog').select('category').is('archived_at', null),
      supabase.from('sales_opportunities').select('estimated_monthly_value, stage_code').is('archived_at', null),
      supabase.from('inspections').select('status, passed').is('archived_at', null),
    ]);

    // Revenue + Top Clients
    let monthlyRevenue = 0;
    const clientRevMap: Record<string, number> = {};
    for (const j of (jobsRes.data ?? []) as unknown as { billing_amount: number | null; site: { client: { name: string } | null } | null }[]) {
      const amt = j.billing_amount || 0;
      monthlyRevenue += amt;
      const clientName = j.site?.client?.name || 'Unknown';
      clientRevMap[clientName] = (clientRevMap[clientName] || 0) + amt;
    }
    const topClients = Object.entries(clientRevMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    // Tickets by status
    const ticketsByStatus: Record<string, number> = {};
    for (const t of (ticketsRes.data ?? []) as { status: string }[]) {
      ticketsByStatus[t.status] = (ticketsByStatus[t.status] || 0) + 1;
    }
    const openTickets = (ticketsByStatus['SCHEDULED'] ?? 0) + (ticketsByStatus['IN_PROGRESS'] ?? 0);

    // Staff by role
    const staffByRole: Record<string, number> = {};
    for (const s of (staffRes.data ?? []) as { role: string }[]) {
      const role = s.role || 'Other';
      staffByRole[role] = (staffByRole[role] || 0) + 1;
    }

    // Supplies by category
    const suppliesByCategory: Record<string, number> = {};
    for (const s of (suppliesRes.data ?? []) as { category: string | null }[]) {
      const cat = s.category || 'Uncategorized';
      suppliesByCategory[cat] = (suppliesByCategory[cat] || 0) + 1;
    }

    // Pipeline
    const activeOpps = (oppsRes.data ?? []).filter((o: { stage_code: string }) => o.stage_code !== 'WON' && o.stage_code !== 'LOST');
    const pipelineValue = activeOpps.reduce((sum: number, o: { estimated_monthly_value: number | null }) => sum + (o.estimated_monthly_value ?? 0), 0);

    // Compliance pass rate
    const completed = (inspectionsRes.data ?? []).filter((i: { status: string }) => i.status === 'COMPLETED' || i.status === 'SUBMITTED');
    const passed = completed.filter((i: { passed: boolean | null }) => i.passed === true).length;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    setData({
      monthlyRevenue,
      activeJobs: (jobsRes.data ?? []).length,
      annualProjection: monthlyRevenue * 12,
      topClients,
      openTickets,
      ticketsToday: todayTicketsRes.data?.length ?? 0,
      ticketsByStatus,
      activeStaff: (staffRes.data ?? []).length,
      staffByRole,
      activeSupplies: (suppliesRes.data ?? []).length,
      suppliesByCategory,
      pipelineValue,
      activeOpportunities: activeOpps.length,
      passRate,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchData(); }, [props.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
        </div>
      </div>
    );
  }

  const totalTickets = Object.values(data.ticketsByStatus).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <MetricCard icon={<DollarSign className="h-5 w-5" />} tone="success" label="Monthly Revenue" value={formatCurrency(data.monthlyRevenue)} />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} tone="warning" label="Annual Projection" value={formatCurrency(data.annualProjection)} />
        <MetricCard icon={<BarChart3 className="h-5 w-5" />} tone="primary" label="Open Tickets" value={data.openTickets} sublabel={`${data.ticketsToday} today`} />
        <MetricCard icon={<Building2 className="h-5 w-5" />} tone="accent" label="Pipeline Value" value={formatCurrency(data.pipelineValue)} sublabel={`${data.activeOpportunities} opps`} />
        <MetricCard icon={<Users className="h-5 w-5" />} tone="primary" label="Active Staff" value={data.activeStaff} />
        <MetricCard icon={<Package className="h-5 w-5" />} tone="muted" label="Supply Items" value={data.activeSupplies} />
        <MetricCard icon={<ClipboardList className="h-5 w-5" />} tone="primary" label="Active Jobs" value={data.activeJobs} />
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} tone={data.passRate >= 80 ? 'success' : data.passRate > 0 ? 'warning' : 'muted'} label="Inspection Pass" value={`${data.passRate}%`} />
      </div>

      {/* Dashboard Cards — 2×2 Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Clients by Revenue */}
        <ChartCard
          title="Top Clients by Revenue"
          subtitle="Monthly revenue from active service plans."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/clients')}>
              View Clients <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {data.topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topClients.map((client) => (
                <BreakdownRow
                  key={client.name}
                  left={<span className="text-sm font-medium truncate max-w-[200px]">{client.name}</span>}
                  right={<span className="tabular-nums">{formatCurrency(client.revenue)}</span>}
                  pct={data.monthlyRevenue > 0 ? client.revenue / data.monthlyRevenue : 0}
                  rightWidthClassName="w-20"
                />
              ))}
            </div>
          )}
        </ChartCard>

        {/* Ticket Status Breakdown */}
        <ChartCard
          title="Ticket Status"
          subtitle="Current work ticket distribution."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/jobs?tab=tickets')}>
              View Jobs <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {totalTickets === 0 ? (
            <p className="text-sm text-muted-foreground">No ticket data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.ticketsByStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <BreakdownRow
                    key={status}
                    left={
                      <Badge color={status === 'COMPLETED' ? 'green' : status === 'SCHEDULED' ? 'blue' : status === 'IN_PROGRESS' ? 'yellow' : 'gray'}>
                        {status.replace('_', ' ')}
                      </Badge>
                    }
                    right={<span className="tabular-nums">{count}</span>}
                    pct={totalTickets > 0 ? count / totalTickets : 0}
                    rightWidthClassName="w-10"
                  />
                ))}
            </div>
          )}
        </ChartCard>

        {/* Staff by Role */}
        <ChartCard
          title="Staff by Role"
          subtitle="Active staff distribution across positions."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/team?tab=staff')}>
              View Team <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {data.activeStaff === 0 ? (
            <p className="text-sm text-muted-foreground">No staff data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.staffByRole)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([role, count]) => (
                  <BreakdownRow
                    key={role}
                    left={<span className="text-sm font-medium">{role}</span>}
                    right={<span className="tabular-nums">{count}</span>}
                    pct={data.activeStaff > 0 ? count / data.activeStaff : 0}
                    rightWidthClassName="w-10"
                  />
                ))}
            </div>
          )}
        </ChartCard>

        {/* Supplies by Category */}
        <ChartCard
          title="Supplies by Category"
          subtitle="Catalog items grouped by product category."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/inventory?tab=supplies')}>
              View Inventory <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {data.activeSupplies === 0 ? (
            <p className="text-sm text-muted-foreground">No supply data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.suppliesByCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([category, count]) => (
                  <BreakdownRow
                    key={category}
                    left={<span className="text-sm font-medium truncate max-w-[200px]">{category}</span>}
                    right={<span className="tabular-nums">{count}</span>}
                    pct={data.activeSupplies > 0 ? count / data.activeSupplies : 0}
                    rightWidthClassName="w-10"
                  />
                ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
