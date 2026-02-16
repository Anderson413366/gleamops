'use client';

/* eslint-disable @next/next/no-img-element */

import { Car } from 'lucide-react';
import type { Vehicle } from '@gleamops/shared';

interface VehicleWithAssigned extends Vehicle {
  assigned?: { full_name: string; staff_code: string } | null;
}

interface VehiclesCardGridProps {
  rows: VehicleWithAssigned[];
  onSelect: (item: VehicleWithAssigned) => void;
}

export function VehiclesCardGrid({ rows, onSelect }: VehiclesCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.name ?? item.vehicle_code}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Car className="h-8 w-8" />
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name ?? item.vehicle_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.vehicle_code}</p>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {(item.make || item.model) && (
              <p>{[item.make, item.model, item.year].filter(Boolean).join(' ')}</p>
            )}
            {item.license_plate && <p>Plate: {item.license_plate}</p>}
            {item.assigned?.full_name && <p>{item.assigned.full_name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
