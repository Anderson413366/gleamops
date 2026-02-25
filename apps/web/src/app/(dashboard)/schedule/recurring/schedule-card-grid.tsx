'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState, Skeleton, cn } from '@gleamops/ui';
import type { RecurringScheduleRow } from './schedule-list';
import { PositionBlock } from './position-block';

interface ScheduleCardGridProps {
  rows: RecurringScheduleRow[];
  search?: string;
  loading?: boolean;
  onSelect?: (row: RecurringScheduleRow) => void;
}

function groupByStaff(rows: RecurringScheduleRow[]) {
  return rows.reduce<Record<string, RecurringScheduleRow[]>>((acc, row) => {
    const key = row.staffName?.trim() || 'Unassigned';
    acc[key] = acc[key] ? [...acc[key], row] : [row];
    return acc;
  }, {});
}

export function ScheduleCardGrid({ rows, search = '', loading = false, onSelect }: ScheduleCardGridProps) {
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((row) => (
      row.staffName.toLowerCase().includes(query)
      || row.positionType.toLowerCase().includes(query)
      || row.siteName.toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
      || row.scheduleDays.join(',').toLowerCase().includes(query)
    ));
  }, [rows, search]);

  const grouped = useMemo(() => groupByStaff(filtered), [filtered]);
  const staffNames = useMemo(() => Object.keys(grouped).sort((a, b) => a.localeCompare(b)), [grouped]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-12 w-12" />}
        title="No recurring schedule cards"
        description={
          search
            ? 'Try a different search term.'
            : 'Create recurring position blocks to populate this card view.'
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {staffNames.map((staffName) => (
        <section key={staffName} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{staffName}</h3>
            <span className="text-xs text-muted-foreground">{grouped[staffName].length} assignment(s)</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {grouped[staffName].map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect?.(row)}
                className={cn(
                  'w-full text-left rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-module-accent/40',
                  onSelect ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
                )}
              >
                <PositionBlock
                  positionType={row.positionType}
                  siteName={row.siteName}
                  startTime={row.startTime}
                  endTime={row.endTime}
                  staffName={row.staffName}
                  isOpenShift={row.status === 'open'}
                />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
