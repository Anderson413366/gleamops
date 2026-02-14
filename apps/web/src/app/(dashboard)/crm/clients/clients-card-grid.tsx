'use client';

import { Building2 } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Client } from '@gleamops/shared';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'orange' | 'red' | 'yellow'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROSPECT: 'orange',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
};

interface ClientsCardGridProps {
  rows: Client[];
  onSelect: (item: Client) => void;
}

export function ClientsCardGrid({ rows, onSelect }: ClientsCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.client_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color={STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            {item.client_type && (
              <Badge color="blue">{item.client_type}</Badge>
            )}
          </div>
          {item.industry && (
            <p className="mt-2 text-xs text-muted-foreground truncate">{item.industry}</p>
          )}
        </div>
      ))}
    </div>
  );
}
