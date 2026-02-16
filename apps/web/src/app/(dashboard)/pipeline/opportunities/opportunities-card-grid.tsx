'use client';

import { Target } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import { OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';
import type { SalesOpportunity } from '@gleamops/shared';

interface OpportunityWithProspect extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
}

interface OpportunitiesCardGridProps {
  rows: OpportunityWithProspect[];
  onSelect: (item: OpportunityWithProspect) => void;
}

function formatCurrency(value: number | null) {
  if (value == null) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function OpportunitiesCardGrid({ rows, onSelect }: OpportunitiesCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex cursor-pointer flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
            <Target className="h-8 w-8" />
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-foreground">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.opportunity_code}</p>
          <div className="mt-3">
            <Badge color={OPPORTUNITY_STAGE_COLORS[item.stage_code] ?? 'gray'}>
              {item.stage_code.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Prospect: {item.prospect?.company_name ?? 'Not set'}</p>
            <p>Est. Monthly: {formatCurrency(item.estimated_monthly_value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
