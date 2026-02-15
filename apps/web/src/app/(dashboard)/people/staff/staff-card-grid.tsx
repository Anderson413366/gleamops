'use client';

import { User } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Staff } from '@gleamops/shared';

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
          className="rounded-xl border border-border bg-card shadow-sm cursor-pointer transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800 flex flex-col items-center p-6 text-center"
        >
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.full_name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <User className="h-8 w-8" />
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.full_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.staff_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge color={ROLE_COLORS[item.role] ?? 'gray'}>
              {item.role.replace(/_/g, ' ')}
            </Badge>
          </div>
          {item.email && (
            <p className="mt-2 text-xs text-muted-foreground truncate max-w-full">{item.email}</p>
          )}
        </div>
      ))}
    </div>
  );
}
