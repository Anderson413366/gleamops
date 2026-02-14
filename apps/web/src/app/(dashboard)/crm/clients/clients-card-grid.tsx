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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Building2 className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.client_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge color={STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            {item.client_type && (
              <Badge color="blue">{item.client_type}</Badge>
            )}
          </div>
          {item.industry && (
            <p className="mt-2 text-xs text-muted-foreground truncate max-w-full">{item.industry}</p>
          )}
        </div>
      ))}
    </div>
  );
}
