'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, DollarSign, HelpCircle, Package, Users } from 'lucide-react';
import { Card, CardContent, Tooltip } from '@gleamops/ui';
import { Sparkline } from '@/app/(dashboard)/reports/_components/report-components';
import type { OwnerDashboardKpis } from '@gleamops/shared';

interface KpiCardsProps {
  kpis: OwnerDashboardKpis | null;
  loading?: boolean;
  trendData?: Record<string, number[]>;
}

function formatNumber(value: number | null | undefined, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toLocaleString()}${suffix}`;
}

function formatHours(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}h`;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const KPI_META = [
  {
    key: 'complaint_response_time_hours',
    label: 'Complaint Response Time',
    icon: <Activity className="h-4 w-4 text-muted-foreground" />,
    format: formatHours,
    href: '/jobs?tab=tickets',
    helpText: 'Requires resolved complaint tickets',
  },
  {
    key: 'first_time_resolution_rate_pct',
    label: 'First-Time Resolution',
    icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/jobs?tab=tickets',
    helpText: 'Requires completed tickets with resolution data',
  },
  {
    key: 'inventory_on_time_rate_pct',
    label: 'Inventory On-Time Rate',
    icon: <Package className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/inventory?tab=counts',
    helpText: 'Requires inventory counts at sites',
  },
  {
    key: 'specialist_turnover_90d_pct',
    label: 'Staff Turnover (90d)',
    icon: <Users className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/team?tab=staff',
    helpText: 'Based on staff terminations in last 90 days',
  },
  {
    key: 'supply_cost_mtd',
    label: 'Supply Cost MTD',
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    format: formatCurrency,
    href: '/reports?tab=inventory',
    helpText: 'Requires supply cost entries this month',
  },
] as const;

export function KpiCards({ kpis, loading = false, trendData }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {KPI_META.map((item) => {
        const value = kpis ? kpis[item.key] : null;
        const formatted = loading ? '...' : item.format(value);
        const isEmpty = !loading && formatted === '\u2014';
        const trend = trendData?.[item.key];
        const hasTrend = trend && trend.length >= 2;
        return (
          <Link key={item.key} href={item.href} className="group">
            <Card className="shadow-sm transition-shadow group-hover:shadow-md">
              <CardContent className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-semibold leading-tight">
                    {formatted}
                  </p>
                  {isEmpty && (
                    <Tooltip content={item.helpText} position="bottom">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </Tooltip>
                  )}
                </div>
                {hasTrend && (
                  <div className="mt-2">
                    <Sparkline values={trend} width={100} height={28} ariaLabel={`${item.label} trend`} />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
