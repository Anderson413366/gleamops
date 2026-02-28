'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, DollarSign, Package, Users } from 'lucide-react';
import { Card, CardContent } from '@gleamops/ui';
import type { OwnerDashboardKpis } from '@gleamops/shared';

interface KpiCardsProps {
  kpis: OwnerDashboardKpis | null;
  loading?: boolean;
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
  },
  {
    key: 'first_time_resolution_rate_pct',
    label: 'First-Time Resolution',
    icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/jobs?tab=tickets',
  },
  {
    key: 'inventory_on_time_rate_pct',
    label: 'Inventory On-Time Rate',
    icon: <Package className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/inventory?tab=counts',
  },
  {
    key: 'specialist_turnover_90d_pct',
    label: 'Specialist Turnover (90d)',
    icon: <Users className="h-4 w-4 text-muted-foreground" />,
    format: (value: number | null | undefined) => formatNumber(value != null ? Math.round(value * 100) / 100 : null, '%'),
    href: '/workforce?tab=staff',
  },
  {
    key: 'supply_cost_mtd',
    label: 'Supply Cost MTD',
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    format: formatCurrency,
    href: '/reports?tab=inventory',
  },
] as const;

export function KpiCards({ kpis, loading = false }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {KPI_META.map((item) => {
        const value = kpis ? kpis[item.key] : null;
        return (
          <Link key={item.key} href={item.href} className="group">
            <Card className="shadow-sm transition-shadow group-hover:shadow-md">
              <CardContent className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.icon}
                </div>
                <p className="text-xl font-semibold leading-tight">
                  {loading ? '...' : item.format(value)}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
