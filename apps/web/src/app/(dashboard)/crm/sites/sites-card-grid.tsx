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
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.site_code}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.status && (
              <Badge color={SITE_STATUS_COLORS[item.status] ?? 'gray'}>{item.status}</Badge>
            )}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {item.square_footage && (
              <p>{item.square_footage.toLocaleString()} sq ft</p>
            )}
            {item.client?.name && (
              <p className="truncate">{item.client.name}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
