'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Shield, Users, Package, RefreshCw } from 'lucide-react';
import { ChipTabs, Card, CardContent, Button, Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import OpsDashboard from './ops/ops-dashboard';
import SalesDashboard from './sales/sales-dashboard';
import FinancialDashboard from './financial/financial-dashboard';
import QualityDashboard from './quality/quality-dashboard';
import WorkforceDashboard from './workforce/workforce-dashboard';
import InventoryDashboard from './inventory/inventory-dashboard';

const TABS = [
  { key: 'ops', label: 'Operations', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'sales', label: 'Sales', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'financial', label: 'Financial', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'quality', label: 'Quality', icon: <Shield className="h-4 w-4" /> },
  { key: 'workforce', label: 'Workforce', icon: <Users className="h-4 w-4" /> },
  { key: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
];

export default function ReportsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [snapshot, setSnapshot] = useState({
    openTickets: 0,
    pipelineValue: 0,
    monthlyRevenue: 0,
    passRate: 0,
    activeStaff: 0,
    activeSupplies: 0,
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [ticketsRes, oppsRes, jobsRes, inspectionsRes, staffRes, suppliesRes] = await Promise.all([
      supabase.from('work_tickets').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['OPEN', 'IN_PROGRESS']),
      supabase.from('sales_opportunities').select('estimated_monthly_value').is('archived_at', null),
      supabase.from('site_jobs').select('billing_amount').is('archived_at', null).eq('status', 'ACTIVE'),
      // inspections table uses boolean `passed` (no `pass_fail`)
      supabase.from('inspections').select('status, passed').is('archived_at', null),
      supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
      supabase.from('supply_catalog').select('id', { count: 'exact', head: true }).is('archived_at', null).neq('supply_status', 'DISCONTINUED'),
    ]);

    const pipelineValue = (oppsRes.data ?? []).reduce((sum, row) => sum + (row.estimated_monthly_value ?? 0), 0);
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
    setUpdatedAt(new Date().toLocaleTimeString());
  }, []);

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Operations, Sales, Financial, Quality, Workforce & Inventory Dashboards</p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <Badge color="gray">{`Updated ${updatedAt}`}</Badge>}
          <Button variant="secondary" onClick={fetchSnapshot}>
            <RefreshCw className="h-4 w-4" />
            Refresh Snapshot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Tickets</p><p className="text-xl font-semibold">{snapshot.openTickets}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-xl font-semibold">{formatCurrency(snapshot.pipelineValue)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Monthly Revenue</p><p className="text-xl font-semibold">{formatCurrency(snapshot.monthlyRevenue)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pass Rate</p><p className="text-xl font-semibold">{snapshot.passRate}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-xl font-semibold">{snapshot.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Supplies</p><p className="text-xl font-semibold">{snapshot.activeSupplies}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'ops' && <OpsDashboard />}
      {tab === 'sales' && <SalesDashboard />}
      {tab === 'financial' && <FinancialDashboard />}
      {tab === 'quality' && <QualityDashboard />}
      {tab === 'workforce' && <WorkforceDashboard />}
      {tab === 'inventory' && <InventoryDashboard />}
    </div>
  );
}
