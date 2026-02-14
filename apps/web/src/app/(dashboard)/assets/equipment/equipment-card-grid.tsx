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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Wrench className="h-8 w-8" />
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.equipment_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {item.equipment_type && <Badge color="blue">{item.equipment_type}</Badge>}
            <Badge color={(EQUIPMENT_CONDITION_COLORS[item.condition ?? ''] as StatusColor) ?? 'gray'}>
              {(item.condition ?? 'N/A').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.staff?.full_name && <p>{item.staff.full_name}</p>}
            {item.site?.name && <p className="truncate max-w-full">{item.site.name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
