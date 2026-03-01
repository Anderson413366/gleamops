'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Shield, Users, Package, RefreshCw, CalendarDays } from 'lucide-react';
import { ChipTabs, Button, Badge, cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import OpsDashboard from './ops/ops-dashboard';
import SalesDashboard from './sales/sales-dashboard';
import FinancialDashboard from './financial/financial-dashboard';
import QualityDashboard from './quality/quality-dashboard';
import WorkforceDashboard from './workforce/workforce-dashboard';
import InventoryDashboard from './inventory/inventory-dashboard';
import ScheduleReports from './schedule-reports';
import { MetricCard } from './_components/report-components';

const TABS = [
  { key: 'ops', label: 'Operational', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'sales', label: 'Sales', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'financial', label: 'Financial', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'quality', label: 'Compliance', icon: <Shield className="h-4 w-4" /> },
  { key: 'workforce', label: 'Workforce', icon: <Users className="h-4 w-4" /> },
  { key: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
  { key: 'schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" /> },
];

const TAB_ALIASES: Record<string, string> = {
  operational: 'ops',
  compliance: 'quality',
};

const RANGE_OPTIONS = [
  { key: '7', label: '7d', days: 7 },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: '365', label: '1y', days: 365 },
] as const;

export default function ReportsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'ops',
    aliases: TAB_ALIASES,
  });
  const initialRange = searchParams.get('range');
  const [rangeDays, setRangeDays] = useState<number>(() => {
    const match = RANGE_OPTIONS.find((o) => o.key === initialRange);
    return match?.days ?? 30;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [snapshot, setSnapshot] = useState({
    openTickets: 0,
    pipelineValue: 0,
    monthlyRevenue: 0,
    passRate: 0,
    activeStaff: 0,
    activeSupplies: 0,
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const syncRangeUrl = useCallback((nextRangeDays: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('range', String(nextRangeDays));
    const query = sp.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const param = searchParams.get('range');
    const match = RANGE_OPTIONS.find((option) => option.key === param);
    if (!match) return;
    if (match.days !== rangeDays) setRangeDays(match.days);
  }, [rangeDays, searchParams]);

  const fetchSnapshot = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const start = new Date();
    start.setDate(start.getDate() - rangeDays);
    const startISO = start.toISOString();
    const [ticketsRes, oppsRes, jobsRes, inspectionsRes, staffRes, suppliesRes] = await Promise.all([
      supabase.from('work_tickets').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['SCHEDULED', 'IN_PROGRESS']),
      supabase.from('sales_opportunities').select('estimated_monthly_value, stage_code, created_at').is('archived_at', null).gte('created_at', startISO),
      supabase.from('site_jobs').select('billing_amount').is('archived_at', null).eq('status', 'ACTIVE'),
      // inspections table uses boolean `passed` (no `pass_fail`)
      supabase.from('inspections').select('status, passed, created_at').is('archived_at', null).gte('created_at', startISO),
      supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
      supabase.from('supply_catalog').select('id', { count: 'exact', head: true }).is('archived_at', null).neq('supply_status', 'DISCONTINUED'),
    ]);

    const pipelineValue = (oppsRes.data ?? [])
      .filter((row) => row.stage_code !== 'WON' && row.stage_code !== 'LOST')
      .reduce((sum, row) => sum + (row.estimated_monthly_value ?? 0), 0);
    const monthlyRevenue = (jobsRes.data ?? []).reduce((sum, row) => sum + (row.billing_amount ?? 0), 0);
    const completedInspections = (inspectionsRes.data ?? []).filter((row) => row.status === 'COMPLETED' || row.status === 'SUBMITTED');
    const passCount = completedInspections.filter((row) => row.passed === true).length;
    const passRate = completedInspections.length > 0 ? Math.round((passCount / completedInspections.length) * 100) : 0;

    setSnapshot({
      openTickets: ticketsRes.count ?? 0,
      pipelineValue,
      monthlyRevenue,
      passRate,
      activeStaff: staffRes.count ?? 0,
      activeSupplies: suppliesRes.count ?? 0,
    });
    setUpdatedAt(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
  }, [rangeDays]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Operations, Sales, Financial, Quality, Workforce and Inventory dashboards</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {updatedAt && <Badge color="gray">{`Updated ${updatedAt}`}</Badge>}
          <Button
            variant="secondary"
            onClick={() => {
              fetchSnapshot();
              setRefreshKey((k) => k + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Time range
          </span>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setRangeDays(opt.days);
                  syncRangeUrl(opt.days);
                }}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  rangeDays === opt.days
                    ? 'bg-module-accent text-module-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Badge color="gray">{`Snapshot: last ${rangeDays} days (where applicable)`}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          tone="primary"
          label="Open Tickets"
          value={snapshot.openTickets}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
          label="Pipeline Value"
          value={formatCurrency(snapshot.pipelineValue)}
          sublabel="/month"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
          label="Monthly Revenue"
          value={formatCurrency(snapshot.monthlyRevenue)}
        />
        <MetricCard
          icon={<Shield className="h-5 w-5" />}
          tone="warning"
          label="Pass Rate"
          value={`${snapshot.passRate}%`}
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          tone="primary"
          label="Active Staff"
          value={snapshot.activeStaff}
        />
        <MetricCard
          icon={<Package className="h-5 w-5" />}
          tone="primary"
          label="Active Supplies"
          value={snapshot.activeSupplies}
        />
      </div>

      <ChipTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
      />

      {tab === 'ops' && <OpsDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'sales' && <SalesDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'financial' && <FinancialDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'quality' && <QualityDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'workforce' && <WorkforceDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'inventory' && <InventoryDashboard rangeDays={rangeDays} refreshKey={refreshKey} />}
      {tab === 'schedule' && <ScheduleReports />}
    </div>
  );
}
