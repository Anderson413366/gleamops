'use client';

import { Activity, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { StatCard } from '@gleamops/ui';

export interface SalesPipelineStats {
  pipelineValue: string;
  activeBids: number;
  staleDeals: number;
  winRate: string;
}

interface SalesKpiBarProps {
  stats: SalesPipelineStats;
}

export function SalesKpiBar({ stats }: SalesKpiBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Pipeline Value"
        value={stats.pipelineValue}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        label="Active Bids"
        value={stats.activeBids}
        icon={<FileText className="h-4 w-4" />}
      />
      <StatCard
        label="Stale Deals (14d)"
        value={stats.staleDeals}
        icon={<AlertTriangle className="h-4 w-4" />}
      />
      <StatCard
        label="Win Rate"
        value={stats.winRate}
        icon={<Activity className="h-4 w-4" />}
      />
    </div>
  );
}
