'use client';

/* eslint-disable @next/next/no-img-element */

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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Package className="h-8 w-8" />
            </div>
          )}
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
