'use client';

import { MapPin } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Site } from '@gleamops/shared';

const SITE_STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
};

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SitesCardGridProps {
  rows: SiteWithClient[];
  onSelect: (item: SiteWithClient) => void;
}

export function SitesCardGrid({ rows, onSelect }: SitesCardGridProps) {
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
              <MapPin className="h-8 w-8" />
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.site_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {item.status && (
              <Badge color={SITE_STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            )}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.square_footage && (
              <p>{item.square_footage.toLocaleString()} sq ft</p>
            )}
            {item.client?.name && (
              <p className="truncate max-w-full">{item.client.name}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
