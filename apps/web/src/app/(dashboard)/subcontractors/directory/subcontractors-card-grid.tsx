'use client';

import { HardHat } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';
import { SUBCONTRACTOR_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';

interface SubcontractorsCardGridProps {
  rows: Subcontractor[];
  onSelect: (item: Subcontractor) => void;
}

export function SubcontractorsCardGrid({ rows, onSelect }: SubcontractorsCardGridProps) {
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
              <HardHat className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.company_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.subcontractor_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color={(SUBCONTRACTOR_STATUS_COLORS[item.status] as StatusColor) ?? 'gray'}>
              {item.status}
            </Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.contact_name && <p>{item.contact_name}</p>}
            {item.services_provided && (
              <p className="truncate">{item.services_provided}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
