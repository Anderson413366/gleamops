'use client';

import type { Client } from '@gleamops/shared';

interface ClientsCardGridProps {
  rows: Client[];
  onSelect: (item: Client) => void;
}

function getClientInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getFaviconUrl(website: string): string {
  const host = website.replace(/^https?:\/\//i, '').split('/')[0];
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

export function ClientsCardGrid({ rows, onSelect }: ClientsCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex cursor-pointer flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:border-module-accent/30 hover:shadow-md"
        >
          {item.website ? (
            <img
              src={getFaviconUrl(item.website)}
              alt={`${item.name} logo`}
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
              <span className="text-xl font-semibold">{getClientInitials(item.name)}</span>
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.client_code}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {item.client_type && (
              <span className="inline-flex items-center rounded-full bg-module-accent/12 px-2.5 py-1 text-[11px] font-medium text-module-accent">
                {item.client_type}
              </span>
            )}
          </div>
          {item.industry && (
            <p className="mt-2 text-xs text-muted-foreground truncate max-w-full">{item.industry}</p>
          )}
        </div>
      ))}
    </div>
  );
}
