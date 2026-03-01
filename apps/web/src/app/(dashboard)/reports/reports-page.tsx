'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Shield, Users, Package, RefreshCw, CalendarDays, ChevronDown } from 'lucide-react';
import { Badge, cn } from '@gleamops/ui';
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
  { key: 'overview', label: 'Overview' },
  { key: 'ops', label: 'Operational' },
  { key: 'sales', label: 'Sales' },
  { key: 'financial', label: 'Financial' },
  { key: 'quality', label: 'Compliance' },
  { key: 'workforce', label: 'Workforce' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'schedule', label: 'Schedule' },
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
    defaultTab: 'overview',
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

  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? 'Overview';

  return (
    <div className="space-y-6">
      <div className="pt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <div className="relative">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card pl-3 pr-9 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {TABS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-1.5">
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

        <div className="ml-auto flex items-center gap-2">
          {updatedAt && <Badge color="gray">{`Updated ${updatedAt}`}</Badge>}
          <button
            type="button"
            onClick={() => {
              fetchSnapshot();
              setRefreshKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            icon={<Users className="h-5 w-5" />}
            tone="primary"
            label="Active Staff"
            value={snapshot.activeStaff}
          />
        </div>
      )}

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
