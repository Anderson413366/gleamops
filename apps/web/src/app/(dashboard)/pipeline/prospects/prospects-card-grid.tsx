'use client';

import { Handshake } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import { PROSPECT_STATUS_COLORS } from '@gleamops/shared';
import type { SalesProspect } from '@gleamops/shared';

interface ProspectCardItem extends SalesProspect {
  estimated_value?: number | null;
  estimated_monthly_value?: number | null;
}

interface ProspectsCardGridProps {
  rows: ProspectCardItem[];
  onSelect: (item: ProspectCardItem) => void;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProspectsCardGrid({ rows, onSelect }: ProspectsCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex cursor-pointer flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
            <Handshake className="h-8 w-8" />
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-foreground">{item.company_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.prospect_code}</p>
          <div className="mt-3">
            <Badge color={PROSPECT_STATUS_COLORS[item.prospect_status_code] ?? 'gray'}>
              {item.prospect_status_code}
            </Badge>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Source: {item.source ?? 'Not set'}</p>
            <p>
              Est. Value:{' '}
              {formatCurrency(item.estimated_value ?? item.estimated_monthly_value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
