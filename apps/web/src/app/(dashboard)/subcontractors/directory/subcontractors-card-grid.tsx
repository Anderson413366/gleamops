'use client';

import { HardHat } from 'lucide-react';
import type { Subcontractor } from '@gleamops/shared';

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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <HardHat className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.company_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.subcontractor_code}</p>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.contact_name && <p>{item.contact_name}</p>}
            {item.services_provided && (
              <p className="truncate max-w-full">{item.services_provided}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
