'use client';

import { Car } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import { VEHICLE_STATUS_COLORS } from '@gleamops/shared';
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
          className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
        >
          <div className="flex items-start gap-3">
            {item.photo_url ? (
              <img
                src={item.photo_url}
                alt={item.name ?? item.vehicle_code}
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Car className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name ?? item.vehicle_code}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.vehicle_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color={VEHICLE_STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
          </div>
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
