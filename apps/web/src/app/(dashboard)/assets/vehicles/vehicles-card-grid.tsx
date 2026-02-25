'use client';

import { Car } from 'lucide-react';
import type { Vehicle } from '@gleamops/shared';
import { EntityAvatar } from '@/components/directory/entity-avatar';

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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-module-accent/40 hover:shadow-md flex flex-col items-center p-6 text-center"
        >
          <EntityAvatar
            name={item.name ?? item.vehicle_code}
            seed={item.vehicle_code}
            imageUrl={item.photo_url}
            fallbackIcon={<Car className="h-8 w-8 text-white" />}
            size="xl"
          />
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
