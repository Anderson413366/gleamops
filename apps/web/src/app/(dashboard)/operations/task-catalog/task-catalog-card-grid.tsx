'use client';

import { ClipboardList } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Task } from '@gleamops/shared';

interface TaskCatalogCardGridProps {
  rows: Task[];
  onSelect: (item: Task) => void;
}

const PRIORITY_COLORS: Record<string, 'red' | 'yellow' | 'green' | 'gray'> = {
  HIGH: 'red',
  MEDIUM: 'yellow',
  LOW: 'green',
};

function formatCategory(category: string | null, subcategory: string | null): string {
  const pretty = (value: string | null) =>
    value
      ? value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
      : null;
  const main = pretty(category);
  const sub = pretty(subcategory);
  if (!main && !sub) return 'Uncategorized';
  if (!sub) return main ?? 'Uncategorized';
  if (!main) return sub;
  return `${main} - ${sub}`;
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return 'Not Set';
  return `${Number(minutes).toFixed(2).replace(/\.00$/, '.0')} min`;
}

export function TaskCatalogCardGrid({ rows, onSelect }: TaskCatalogCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => {
        const status = (item.status ?? (item.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
                <ClipboardList className="h-5 w-5" />
              </div>
              <Badge color={status === 'ACTIVE' ? 'green' : 'gray'} dot>
                {status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <p className="truncate text-sm font-semibold text-foreground" title={item.name}>{item.name}</p>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={item.code}>{item.code}</p>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground" title={formatCategory(item.category, item.subcategory)}>
              {formatCategory(item.category, item.subcategory)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.priority_level ? (
                <Badge color={PRIORITY_COLORS[item.priority_level] ?? 'gray'}>
                  {item.priority_level.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
                </Badge>
              ) : (
                <Badge color="gray">Not Set</Badge>
              )}
              <Badge color="blue">{formatMinutes(item.default_minutes)}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
