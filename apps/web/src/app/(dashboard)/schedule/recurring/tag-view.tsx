'use client';

import { useMemo } from 'react';
import { Card, CardContent, EmptyState, Badge } from '@gleamops/ui';
import type { RecurringScheduleRow } from './schedule-list';

interface TagViewProps {
  rows: RecurringScheduleRow[];
  search?: string;
}

function normalizePositionLabel(code: string): string {
  return code.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TagView({ rows, search }: TagViewProps) {
  const grouped = useMemo(() => {
    let filtered = rows;
    if (search) {
      const q = search.toLowerCase();
      filtered = rows.filter(
        (r) =>
          r.staffName.toLowerCase().includes(q) ||
          r.siteName.toLowerCase().includes(q) ||
          r.positionType.toLowerCase().includes(q),
      );
    }

    const tagMap = new Map<string, RecurringScheduleRow[]>();
    for (const row of filtered) {
      const tag = row.positionType || 'Untagged';
      const list = tagMap.get(tag) ?? [];
      list.push(row);
      tagMap.set(tag, list);
    }

    return Array.from(tagMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, search]);

  if (grouped.length === 0) {
    return <EmptyState title="No Shifts" description="No shifts to display. Try adjusting your filters." />;
  }

  return (
    <div className="space-y-4">
      {grouped.map(([tag, tagRows]) => (
        <Card key={tag}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{normalizePositionLabel(tag)}</h3>
              <Badge color="blue">{tagRows.length} shift{tagRows.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="space-y-1.5">
              {tagRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.siteCode ? `${row.siteCode} – ` : ''}{row.siteName} &middot; {row.startTime} – {row.endTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{row.scheduleDays.join(', ')}</span>
                    <Badge color={row.status === 'assigned' ? 'green' : row.status === 'open' ? 'red' : 'yellow'}>
                      {row.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
