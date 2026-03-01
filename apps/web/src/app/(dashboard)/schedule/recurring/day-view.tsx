'use client';

import { useMemo } from 'react';
import { Clock, CalendarClock } from 'lucide-react';
import { EmptyState } from '@gleamops/ui';
import { PositionBlock } from './position-block';
import type { RecurringScheduleRow } from './schedule-list';

interface DayViewProps {
  rows: RecurringScheduleRow[];
  /** The single day to display (YYYY-MM-DD) */
  dateKey: string;
  search?: string;
  onSelect?: (row: RecurringScheduleRow) => void;
}

/** Time slots from 00:00 to 23:00 */
const HOUR_SLOTS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function DayView({ rows, dateKey, search = '', onSelect }: DayViewProps) {
  const dayRows = useMemo(() => {
    let filtered = rows.filter((r) => r.scheduledDates.includes(dateKey));
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.staffName.toLowerCase().includes(q)
        || r.positionType.toLowerCase().includes(q)
        || r.siteName.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [rows, dateKey, search]);

  const dateLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (dayRows.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-12 w-12" />}
        title={`No shifts on ${dateLabel}`}
        description={search ? 'Try a different search term.' : 'No shifts scheduled for this day.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{dateLabel}</h3>
        <span className="text-xs text-muted-foreground">({dayRows.length} shifts)</span>
      </div>

      <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
        {/* Timeline grid */}
        <div className="relative" style={{ minHeight: `${HOUR_SLOTS.length * 48}px` }}>
          {/* Hour gridlines */}
          {HOUR_SLOTS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/50"
              style={{ top: `${hour * 48}px` }}
            >
              <span className="absolute left-2 -top-2.5 text-[11px] text-muted-foreground bg-card px-1">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Shift blocks positioned by time */}
          <div className="ml-16 mr-4 relative">
            {dayRows.map((row) => {
              const startMin = timeToMinutes(row.startTime);
              let endMin = timeToMinutes(row.endTime);
              if (endMin <= startMin) endMin += 24 * 60;
              const top = (startMin / 60) * 48;
              const height = Math.max(((endMin - startMin) / 60) * 48, 40);

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className="absolute left-0 right-0 z-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-module-accent/40 rounded-xl"
                  style={{ top: `${top}px`, height: `${height}px`, maxWidth: '85%' }}
                >
                  <PositionBlock
                    positionType={row.positionType}
                    siteName={row.siteName}
                    startTime={row.startTime}
                    endTime={row.endTime}
                    staffName={row.staffName}
                    siteCode={row.siteCode}
                    isOpenShift={row.status === 'open'}
                    className="h-full"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
