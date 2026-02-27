'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState, Tooltip, cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Build a set of row-id+date keys that have overlapping time ranges for the same staff on the same date. */
export function buildConflictKeys(rows: RecurringScheduleRow[]): Set<string> {
  const conflicts = new Set<string>();
  const grouped: Record<string, RecurringScheduleRow[]> = {};
  for (const row of rows) {
    const key = row.staffName?.trim() || 'Unassigned';
    grouped[key] = grouped[key] ? [...grouped[key], row] : [row];
  }
  for (const staffRows of Object.values(grouped)) {
    if (staffRows.length < 2) continue;
    for (let i = 0; i < staffRows.length; i++) {
      for (let j = i + 1; j < staffRows.length; j++) {
        const a = staffRows[i];
        const b = staffRows[j];
        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        if (aStart < bEnd && bStart < aEnd) {
          const sharedDates = a.scheduledDates.filter((d) => b.scheduledDates.includes(d));
          for (const date of sharedDates) {
            conflicts.add(`${a.id}:${date}`);
            conflicts.add(`${b.id}:${date}`);
          }
        }
      }
    }
  }
  return conflicts;
}

interface AvailabilityRule {
  staff_name: string;
  day_of_week: number;
  is_available: boolean;
  reason?: string | null;
}

interface ScheduleGridProps {
  rows: RecurringScheduleRow[];
  visibleDates?: string[];
  search?: string;
  onSelect?: (row: RecurringScheduleRow) => void;
  onReassign?: (ticketId: string, newDate: string, newStaffName: string) => void;
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

function dayOfWeekFromDateKey(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

export function ScheduleGrid({ rows, visibleDates = [], search = '', onSelect, onReassign }: ScheduleGridProps) {
  const [dragData, setDragData] = useState<{ rowId: string; staffName: string; dateKey: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);

  // Fetch availability rules
  useEffect(() => {
    let cancelled = false;

    async function fetchAvailability() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('staff_availability_rules')
        .select('id, staff_id, day_of_week, is_available, reason, staff:staff_id(full_name)')
        .eq('is_available', false);

      if (!cancelled && data) {
        setAvailability(
          (data as unknown as Array<{
            staff_id: string;
            day_of_week: number;
            is_available: boolean;
            reason?: string | null;
            staff?: { full_name?: string | null } | null;
          }>).map((r) => ({
            staff_name: r.staff?.full_name?.trim() ?? '',
            day_of_week: r.day_of_week,
            is_available: r.is_available,
            reason: r.reason,
          })),
        );
      }
    }

    void fetchAvailability();
    return () => { cancelled = true; };
  }, []);

  // Build unavailability lookup: "staffName:dayOfWeek" → reason
  const unavailableMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of availability) {
      if (!rule.is_available && rule.staff_name) {
        map.set(`${rule.staff_name}:${rule.day_of_week}`, rule.reason ?? 'Unavailable');
      }
    }
    return map;
  }, [availability]);

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
  const conflictKeys = useMemo(() => buildConflictKeys(filtered), [filtered]);
  const dateColumns = visibleDates.length > 0 ? visibleDates : fallbackWeekDates();
  const gridTemplateColumns = `220px repeat(${dateColumns.length}, minmax(128px, 1fr))`;
  const minWidthPx = 220 + dateColumns.length * 128;

  const handleDragStart = useCallback((event: DragEvent, rowId: string, staffName: string, dateKey: string) => {
    setDragData({ rowId, staffName, dateKey });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ rowId, staffName, dateKey }));
  }, []);

  const handleDragOver = useCallback((event: DragEvent, cellKey: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(cellKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(async (event: DragEvent, targetStaffName: string, targetDateKey: string) => {
    event.preventDefault();
    setDropTarget(null);

    let data = dragData;
    if (!data) {
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
      } catch {
        return;
      }
    }
    if (!data) return;

    const { rowId, dateKey: sourceDate } = data;
    if (targetStaffName === data.staffName && targetDateKey === sourceDate) return;

    // Find the matching ticket to get the actual ticket ID
    const row = filtered.find((r) => r.id === rowId);
    if (!row) return;

    // Extract ticket ID from the row - the first segment before the first dash compound
    // The row ID is a composite, so we need to look up the actual ticket
    const supabase = getSupabaseBrowserClient();

    // Find the work_ticket for this row's staff+site+date+time combination
    const { data: tickets } = await supabase
      .from('work_tickets')
      .select('id, assignments:ticket_assignments(id, staff:staff_id(full_name))')
      .eq('scheduled_date', sourceDate)
      .is('archived_at', null);

    if (!tickets) return;

    const matchingTicket = (tickets as unknown as Array<{
      id: string;
      assignments?: Array<{ id: string; staff?: { full_name?: string | null } | null }>;
    }>).find((t) => {
      const assignedStaff = t.assignments?.map((a) => a.staff?.full_name?.trim()).filter(Boolean) ?? [];
      return assignedStaff.includes(data!.staffName) || (data!.staffName === 'Open Shift' && assignedStaff.length === 0);
    });

    if (!matchingTicket) return;

    // Reschedule to new date
    if (targetDateKey !== sourceDate) {
      await supabase
        .from('work_tickets')
        .update({ scheduled_date: targetDateKey })
        .eq('id', matchingTicket.id);
    }

    onReassign?.(matchingTicket.id, targetDateKey, targetStaffName);
    setDragData(null);
  }, [dragData, filtered, onReassign]);

  const handleDragEnd = useCallback(() => {
    setDragData(null);
    setDropTarget(null);
  }, []);

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
    <>
    <p className="text-xs text-muted-foreground md:hidden mb-2">
      Tip: This grid works best on wider screens. Switch to card view on mobile.
    </p>
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
                const cellKey = `${staffName}:${dateKey}`;
                const isDragOver = dropTarget === cellKey;
                const dow = dayOfWeekFromDateKey(dateKey);
                const unavailableReason = unavailableMap.get(`${staffName}:${dow}`);
                const isUnavailable = Boolean(unavailableReason);

                return (
                  <div
                    key={cellKey}
                    className={cn(
                      'space-y-2 px-2 py-2 transition-colors relative',
                      isDragOver && 'border-dashed border-2 border-primary bg-primary/5 rounded-lg',
                      isUnavailable && 'unavailable-cell',
                    )}
                    onDragOver={(e) => handleDragOver(e, cellKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, staffName, dateKey)}
                    style={isUnavailable ? {
                      backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 5px, hsl(var(--muted)) 5px, hsl(var(--muted)) 6px)',
                      backgroundSize: '8px 8px',
                    } : undefined}
                    title={isUnavailable ? `Unavailable: ${unavailableReason}` : undefined}
                  >
                    {isUnavailable && dayRows.length === 0 && (
                      <Tooltip content={`Unavailable: ${unavailableReason}`}>
                        <div className="rounded-lg border border-dashed border-amber-300/70 bg-amber-50/50 px-2 py-2 text-center text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                          Unavailable
                        </div>
                      </Tooltip>
                    )}
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
                            hasConflict={conflictKeys.has(`${row.id}:${dateKey}`)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, row.id, staffName, dateKey)}
                            onDragEnd={handleDragEnd}
                          />
                        </button>
                      ))
                    ) : !isUnavailable ? (
                      <div className="rounded-lg border border-dashed border-border/70 px-2 py-3 text-center text-[11px] text-muted-foreground">
                        OFF
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
