'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@gleamops/ui';
import { PositionBlock } from './position-block';
import type { RecurringScheduleRow } from './schedule-list';

interface ScheduleGridProps {
  rows: RecurringScheduleRow[];
  search?: string;
  onSelect?: (row: RecurringScheduleRow) => void;
}

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function groupByStaff(rows: RecurringScheduleRow[]) {
  return rows.reduce<Record<string, RecurringScheduleRow[]>>((acc, row) => {
    const key = row.staffName?.trim() || 'Unassigned';
    acc[key] = acc[key] ? [...acc[key], row] : [row];
    return acc;
  }, {});
}

function rowsForDay(rows: RecurringScheduleRow[], day: string) {
  return rows.filter((row) => row.scheduleDays.includes(day));
}

export function ScheduleGrid({ rows, search = '', onSelect }: ScheduleGridProps) {
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

  if (!filtered.length) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-12 w-12" />}
        title="No recurring schedule rows"
        description={search ? 'Try a different search term.' : 'Create recurring position blocks to populate this grid.'}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))] border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="px-4 py-3">Specialist</div>
          {WEEK_DAYS.map((day) => (
            <div key={day} className="px-3 py-3 text-center">{day}</div>
          ))}
        </div>

        {staffNames.map((staffName) => {
          const staffRows = grouped[staffName];
          return (
            <div key={staffName} className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))] border-b border-border last:border-b-0">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{staffName}</p>
                <p className="text-xs text-muted-foreground">{staffRows.length} assignment(s)</p>
              </div>

              {WEEK_DAYS.map((day) => {
                const dayRows = rowsForDay(staffRows, day);
                return (
                  <div key={`${staffName}-${day}`} className="space-y-2 px-2 py-2">
                    {dayRows.length ? (
                      dayRows.map((row) => (
                        <button
                          key={`${row.id}-${day}`}
                          type="button"
                          onClick={() => onSelect?.(row)}
                          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-module-accent/40"
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
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/70 px-2 py-3 text-center text-[11px] text-muted-foreground">
                        OFF
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
