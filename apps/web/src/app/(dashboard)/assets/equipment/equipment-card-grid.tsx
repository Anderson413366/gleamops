'use client';

import { Wrench } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import type { Equipment, StatusColor } from '@gleamops/shared';

interface EquipmentRow extends Equipment {
  staff?: { full_name: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface EquipmentCardGridProps {
  rows: EquipmentRow[];
  onSelect: (item: EquipmentRow) => void;
}

export function EquipmentCardGrid({ rows, onSelect }: EquipmentCardGridProps) {
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
                alt={item.name}
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.equipment_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.equipment_type && <Badge color="blue">{item.equipment_type}</Badge>}
            <Badge color={(EQUIPMENT_CONDITION_COLORS[item.condition ?? ''] as StatusColor) ?? 'gray'}>
              {(item.condition ?? 'N/A').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.staff?.full_name && <p>{item.staff.full_name}</p>}
            {item.site?.name && <p className="truncate">{item.site.name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
