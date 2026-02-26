'use client';

import { Route } from 'lucide-react';
import { Badge } from '@gleamops/ui';

export interface RouteTemplateListItem {
  id: string;
  template_code: string;
  label: string;
  weekday: string;
  is_active: boolean;
  stop_count: number;
  assigned_staff?: { full_name?: string | null; staff_code?: string | null } | null;
  default_vehicle?: { name?: string | null; vehicle_code?: string | null } | null;
}

interface RouteTemplateCardGridProps {
  rows: RouteTemplateListItem[];
  onSelect: (item: RouteTemplateListItem) => void;
}

export function RouteTemplateCardGrid({ rows, onSelect }: RouteTemplateCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out hover:border-primary/40 hover:shadow-md text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </span>
            <Badge color={item.is_active ? 'green' : 'gray'}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
          </div>

          <p className="mt-3 truncate text-sm font-semibold text-foreground" title={item.label}>
            {item.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{item.template_code}</p>

          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Weekday: {item.weekday}</p>
            <p>Stops: {item.stop_count}</p>
            <p>Assigned: {item.assigned_staff?.full_name ?? item.assigned_staff?.staff_code ?? 'Unassigned'}</p>
            <p>Vehicle: {item.default_vehicle?.name ?? item.default_vehicle?.vehicle_code ?? 'None'}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
