'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Shield, Users, Package } from 'lucide-react';
import { ChipTabs } from '@gleamops/ui';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Operations, Sales, Financial, Quality, Workforce & Inventory Dashboards</p>
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
