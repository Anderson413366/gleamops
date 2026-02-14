'use client';

import { Package } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';

interface SuppliesCardGridProps {
  rows: SupplyCatalog[];
  onSelect: (item: SupplyCatalog) => void;
}

export function SuppliesCardGrid({ rows, onSelect }: SuppliesCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
        >
          <div className="flex items-start gap-3">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.category && <Badge color="blue">{item.category}</Badge>}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.unit_cost != null && (
              <p className="font-medium text-foreground">${Number(item.unit_cost).toFixed(2)} / {item.unit}</p>
            )}
            {item.brand && <p>{item.brand}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
