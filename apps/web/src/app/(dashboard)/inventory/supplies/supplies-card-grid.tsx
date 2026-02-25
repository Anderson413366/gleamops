'use client';

import { Package } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';
import { EntityAvatar } from '@/components/directory/entity-avatar';

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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-module-accent/40 hover:shadow-md flex flex-col items-center p-6 text-center"
        >
          <EntityAvatar
            name={item.name}
            seed={item.code}
            imageUrl={item.image_url}
            fallbackIcon={<Package className="h-8 w-8 text-white" />}
            size="xl"
          />
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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
