'use client';

import { useMemo } from 'react';
import { Building2, MapPin, Users } from 'lucide-react';
import { Badge, EmptyState, cn } from '@gleamops/ui';
import type { RecurringScheduleRow } from './schedule-list';

interface CoverageGridProps {
  rows: RecurringScheduleRow[];
  visibleDates: string[];
  search?: string;
}

interface CoverageGroup {
  clientName: string;
  siteName: string;
  siteCode: string | null;
  positionType: string;
  /** Map of dateKey → { assigned: number; required: number } */
  coverage: Map<string, { assigned: number; total: number }>;
}

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function isToday(dateKey: string) {
  return new Date().toISOString().slice(0, 10) === dateKey;
}

export function CoverageGrid({ rows, visibleDates, search = '' }: CoverageGridProps) {
  const groups = useMemo(() => {
    const filtered = search.trim()
      ? rows.filter((r) =>
          r.siteName.toLowerCase().includes(search.toLowerCase())
          || r.positionType.toLowerCase().includes(search.toLowerCase())
          || (r.clientName ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : rows;

    // Group by client > site > position
    const map = new Map<string, CoverageGroup>();

    for (const row of filtered) {
      const key = `${row.clientName ?? 'Unknown'}|${row.siteName}|${row.positionType}`;
      const group = map.get(key) ?? {
        clientName: row.clientName ?? 'Unknown Client',
        siteName: row.siteName,
        siteCode: row.siteCode ?? null,
        positionType: row.positionType,
        coverage: new Map(),
      };

      for (const dateKey of row.scheduledDates) {
        if (!visibleDates.includes(dateKey)) continue;
        const existing = group.coverage.get(dateKey) ?? { assigned: 0, total: 0 };
        existing.total++;
        if (row.status !== 'open') existing.assigned++;
        group.coverage.set(dateKey, existing);
      }

      map.set(key, group);
    }

    // Sort by client > site > position
    return Array.from(map.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
      || a.siteName.localeCompare(b.siteName)
      || a.positionType.localeCompare(b.positionType)
    );
  }, [rows, visibleDates, search]);

  const dateColumns = visibleDates.length > 0 ? visibleDates : [];
  const gridTemplateColumns = `280px repeat(${dateColumns.length}, minmax(80px, 1fr))`;

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="No coverage data"
        description={search ? 'Try a different search term.' : 'No scheduled shifts found for this period.'}
      />
    );
  }

  let lastClient = '';

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <div style={{ minWidth: `${280 + dateColumns.length * 80}px` }}>
        <div
          className="grid border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns }}
        >
          <div className="sticky left-0 z-10 bg-muted/40 border-r border-border px-4 py-3">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Site / Position
            </span>
          </div>
          {dateColumns.map((dateKey) => {
            const heading = formatDateHeading(dateKey);
            return (
              <div key={dateKey} className="px-2 py-3 text-center">
                <p>{heading.day}</p>
                <p className={cn('mt-0.5 text-[10px] normal-case', isToday(dateKey) && 'text-primary font-semibold')}>
                  {heading.label}
                </p>
              </div>
            );
          })}
        </div>

        {groups.map((group, idx) => {
          const showClientHeader = group.clientName !== lastClient;
          lastClient = group.clientName;

          return (
            <div key={`${group.siteName}-${group.positionType}-${idx}`}>
              {showClientHeader && (
                <div className="bg-muted/20 border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold text-foreground">{group.clientName}</span>
                </div>
              )}
              <div
                className="grid border-b border-border last:border-b-0"
                style={{ gridTemplateColumns }}
              >
                <div className="sticky left-0 z-10 bg-card border-r border-border px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {group.siteCode ? `${group.siteCode} ` : ''}{group.siteName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.positionType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                </div>

                {dateColumns.map((dateKey) => {
                  const c = group.coverage.get(dateKey);
                  const assigned = c?.assigned ?? 0;
                  const total = c?.total ?? 0;
                  const hasGap = total > 0 && assigned < total;
                  const isFull = total > 0 && assigned >= total;

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'flex items-center justify-center py-2.5 text-center',
                        hasGap && 'bg-red-50/50 dark:bg-red-950/20',
                        isFull && 'bg-green-50/30 dark:bg-green-950/10',
                      )}
                    >
                      {total > 0 ? (
                        <Badge color={hasGap ? 'red' : 'green'} className="text-[11px]">
                          <Users className="h-3 w-3 mr-0.5" />
                          {assigned}/{total}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
