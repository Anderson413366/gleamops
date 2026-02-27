'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState, cn } from '@gleamops/ui';
import { PositionBlock } from './position-block';
import type { RecurringScheduleRow } from './schedule-list';

/** Compute total hours for a staff member across visible dates. */
export function computeStaffHours(
  staffRows: RecurringScheduleRow[],
  dateColumns: string[],
): number {
  let totalMinutes = 0;
  const dateSet = new Set(dateColumns);
  for (const row of staffRows) {
    const [sh, sm] = row.startTime.split(':').map(Number);
    const [eh, em] = row.endTime.split(':').map(Number);
    let shiftMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (shiftMinutes <= 0) shiftMinutes += 24 * 60;
    const daysInRange = row.scheduledDates.filter((d) => dateSet.has(d)).length;
    totalMinutes += shiftMinutes * daysInRange;
  }
  return Math.round((totalMinutes / 60) * 10) / 10;
}

function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) return `${hours}h`;
  return `${hours}h`;
}

interface ScheduleGridProps {
  rows: RecurringScheduleRow[];
  visibleDates?: string[];
  search?: string;
  onSelect?: (row: RecurringScheduleRow) => void;
}

function groupByStaff(rows: RecurringScheduleRow[]) {
  return rows.reduce<Record<string, RecurringScheduleRow[]>>((acc, row) => {
    const key = row.staffName?.trim() || 'Unassigned';
    acc[key] = acc[key] ? [...acc[key], row] : [row];
    return acc;
  }, {});
}

function rowsForDate(rows: RecurringScheduleRow[], dateKey: string) {
  return rows.filter((row) => row.scheduledDates.includes(dateKey));
}

function normalizeDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fallbackWeekDates() {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const distanceFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return normalizeDateKey(date);
  });
}

function formatDateHeading(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function isToday(dateKey: string) {
  return normalizeDateKey(new Date()) === dateKey;
}

export function ScheduleGrid({ rows, visibleDates = [], search = '', onSelect }: ScheduleGridProps) {
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
  const dateColumns = visibleDates.length > 0 ? visibleDates : fallbackWeekDates();
  const gridTemplateColumns = `220px repeat(${dateColumns.length}, minmax(128px, 1fr))`;
  const minWidthPx = 220 + dateColumns.length * 128;

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
      <div style={{ minWidth: `${minWidthPx}px` }}>
        <div
          className="grid border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns }}
        >
          <div className="sticky left-0 z-10 bg-muted/40 border-r border-border px-4 py-3">Specialist</div>
          {dateColumns.map((dateKey) => {
            const heading = formatDateHeading(dateKey);
            return (
              <div key={dateKey} className="px-3 py-3 text-center">
                <p>{heading.day}</p>
                <p className={`mt-0.5 text-[10px] normal-case ${isToday(dateKey) ? 'text-primary font-semibold' : ''}`}>
                  {heading.label}
                </p>
              </div>
            );
          })}
        </div>

        {staffNames.map((staffName) => {
          const staffRows = grouped[staffName];
          const hours = computeStaffHours(staffRows, dateColumns);
          return (
            <div
              key={staffName}
              className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns }}
            >
              <div className="sticky left-0 z-10 bg-card border-r border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{staffName}</p>
                <p className="text-xs text-muted-foreground">
                  {staffRows.length} assignment(s)
                  {hours > 0 && (
                    <span className={cn('ml-1', hours > 40 && 'text-destructive font-medium')}>
                      · {formatHours(hours)} this period
                    </span>
                  )}
                </p>
              </div>

              {dateColumns.map((dateKey) => {
                const dayRows = rowsForDate(staffRows, dateKey);
                return (
                  <div key={`${staffName}-${dateKey}`} className="space-y-2 px-2 py-2">
                    {dayRows.length ? (
                      dayRows.map((row) => (
                        <button
                          key={`${row.id}-${dateKey}`}
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
