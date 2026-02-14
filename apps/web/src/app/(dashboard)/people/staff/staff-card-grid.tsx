'use client';

import { User } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  ON_LEAVE: 'yellow',
  TERMINATED: 'red',
};

const ROLE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'yellow' | 'gray'> = {
  OWNER_ADMIN: 'purple',
  MANAGER: 'blue',
  SUPERVISOR: 'green',
  INSPECTOR: 'orange',
  SALES: 'yellow',
  CLEANER: 'gray',
};

interface StaffCardGridProps {
  rows: Staff[];
  onSelect: (item: Staff) => void;
}

export function StaffCardGrid({ rows, onSelect }: StaffCardGridProps) {
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
                alt={item.full_name}
                className="h-12 w-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted flex-shrink-0">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.staff_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color={ROLE_COLORS[item.role] ?? 'gray'}>
              {item.role.replace(/_/g, ' ')}
            </Badge>
            <Badge color={STATUS_COLORS[item.staff_status ?? 'ACTIVE'] ?? 'gray'}>
              {(item.staff_status ?? 'ACTIVE').replace(/_/g, ' ')}
            </Badge>
          </div>
          {item.email && (
            <p className="mt-2 text-xs text-muted-foreground truncate">{item.email}</p>
          )}
        </div>
      ))}
    </div>
  );
}
