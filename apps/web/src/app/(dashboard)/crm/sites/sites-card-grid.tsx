'use client';

/* eslint-disable @next/next/no-img-element */

import { MapPin } from 'lucide-react';
import type { Site } from '@gleamops/shared';

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SitesCardGridProps {
  rows: SiteWithClient[];
  onSelect: (item: SiteWithClient) => void;
}

function getSiteInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function SitesCardGrid({ rows, onSelect }: SitesCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex cursor-pointer flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:border-module-accent/30 hover:shadow-md"
        >
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.name}
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
              <div className="flex flex-col items-center leading-none">
                <MapPin className="h-5 w-5" />
                <span className="mt-1 text-xs font-semibold">{getSiteInitials(item.name)}</span>
              </div>
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.site_code}</p>
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
