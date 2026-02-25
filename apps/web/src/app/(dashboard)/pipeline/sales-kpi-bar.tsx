'use client';

import { Activity, AlertTriangle, DollarSign, FileText, MailWarning, Send } from 'lucide-react';
import { StatCard } from '@gleamops/ui';

export interface SalesPipelineStats {
  pipelineValue: string;
  activeBids: number;
  staleDeals: number;
  emailProblems: number;
  proposalsSent30d: number;
  winRate: string;
}

interface SalesKpiBarProps {
  stats: SalesPipelineStats;
}

export function SalesKpiBar({ stats }: SalesKpiBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
        label="Email Issues"
        value={stats.emailProblems}
        icon={<MailWarning className="h-4 w-4" />}
      />
      <StatCard
        label="Proposals Sent (30d)"
        value={stats.proposalsSent30d}
        icon={<Send className="h-4 w-4" />}
      />
      <StatCard
        label="Win Rate"
        value={stats.winRate}
        icon={<Activity className="h-4 w-4" />}
      />
    </div>
  );
}
