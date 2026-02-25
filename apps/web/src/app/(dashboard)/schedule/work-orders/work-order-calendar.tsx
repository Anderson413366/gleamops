'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState } from '@gleamops/ui';
import type { WorkOrderTableRow } from './work-order-table';
import { formatDate } from '@/lib/utils/date';

type CalendarViewMode = 'day' | 'week' | 'month' | 'custom';

interface WorkOrderCalendarProps {
  rows: WorkOrderTableRow[];
  onSelect: (row: WorkOrderTableRow) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function normalizeDate(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getWeekStart(date: Date): Date {
  const normalized = normalizeDate(date);
  const day = normalized.getDay();
  const distanceFromMonday = (day + 6) % 7;
  normalized.setDate(normalized.getDate() - distanceFromMonday);
  return normalized;
}

function buildRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = normalizeDate(start);
  const max = normalizeDate(end);
  while (cursor <= max) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function monthDates(anchor: Date): { days: Date[]; lead: number } {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const days = buildRange(first, last);
  return { days, lead: first.getDay() };
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusColor(status: string): 'green' | 'blue' | 'yellow' | 'gray' | 'red' {
  if (status === 'COMPLETED' || status === 'VERIFIED') return 'green';
  if (status === 'SCHEDULED') return 'blue';
  if (status === 'IN_PROGRESS') return 'yellow';
  if (status === 'CANCELED') return 'red';
  return 'gray';
}

export function WorkOrderCalendar({ rows, onSelect }: WorkOrderCalendarProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => normalizeDate(new Date()));
  const [customStart, setCustomStart] = useState(() => toDateKey(getWeekStart(new Date())));
  const [customEnd, setCustomEnd] = useState(() => {
    const end = getWeekStart(new Date());
    end.setDate(end.getDate() + 6);
    return toDateKey(end);
  });

  const { daysInRange, label, monthDays, monthLead } = useMemo(() => {
    if (viewMode === 'day') {
      const day = normalizeDate(anchorDate);
      return {
        daysInRange: [day],
        label: dateLabel(day),
        monthDays: [] as Date[],
        monthLead: 0,
      };
    }

    if (viewMode === 'week') {
      const weekStart = getWeekStart(anchorDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        daysInRange: buildRange(weekStart, weekEnd),
        label: `${dateLabel(weekStart)} - ${dateLabel(weekEnd)}`,
        monthDays: [] as Date[],
        monthLead: 0,
      };
    }

    if (viewMode === 'month') {
      const { days, lead } = monthDates(anchorDate);
      return {
        daysInRange: days,
        label: anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthDays: days,
        monthLead: lead,
      };
    }

    const start = parseDate(customStart);
    const end = parseDate(customEnd);
    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    return {
      daysInRange: buildRange(from, to),
      label: `${dateLabel(from)} - ${dateLabel(to)}`,
      monthDays: [] as Date[],
      monthLead: 0,
    };
  }, [anchorDate, customEnd, customStart, viewMode]);

  const rowsByDate = useMemo(() => {
    const map = new Map<string, WorkOrderTableRow[]>();
    for (const day of daysInRange) map.set(toDateKey(day), []);
    for (const row of rows) {
      const key = row.scheduled_date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(row);
    }
    return map;
  }, [daysInRange, rows]);

  const moveWindow = (direction: -1 | 1) => {
    if (viewMode === 'day') {
      setAnchorDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction);
        return normalizeDate(next);
      });
      return;
    }

    if (viewMode === 'week') {
      setAnchorDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction * 7);
        return normalizeDate(next);
      });
      return;
    }

    if (viewMode === 'month') {
      setAnchorDate((prev) => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + direction);
        return normalizeDate(next);
      });
      return;
    }

    const start = parseDate(customStart);
    const end = parseDate(customEnd);
    const length = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const nextStart = new Date(start);
    const nextEnd = new Date(end);
    nextStart.setDate(nextStart.getDate() + direction * length);
    nextEnd.setDate(nextEnd.getDate() + direction * length);
    setCustomStart(toDateKey(nextStart));
    setCustomEnd(toDateKey(nextEnd));
    setAnchorDate(nextStart);
  };

  if (!rows.length) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-12 w-12" />}
        title="No work orders to display"
        description="No work orders match the current filters."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          {(['day', 'week', 'month', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => moveWindow(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate(normalizeDate(new Date()))}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => moveWindow(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>Start date</span>
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span>End date</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground">{rows.length} work orders</span>
      </div>

      {viewMode === 'month' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {DAY_NAMES.map((dayName) => (
              <div key={dayName} className="py-1">{dayName}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthLead }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[120px] rounded-lg border border-transparent" />
            ))}
            {monthDays.map((day) => {
              const key = toDateKey(day);
              const dayRows = rowsByDate.get(key) ?? [];
              return (
                <Card key={key} className="min-h-[120px] border-border/80">
                  <CardContent className="space-y-1 p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{day.getDate()}</p>
                      <p className="text-[10px] text-muted-foreground">{dayRows.length}</p>
                    </div>
                    {dayRows.slice(0, 3).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onSelect(row)}
                        className="w-full rounded border border-border px-1.5 py-1 text-left text-[10px] hover:bg-muted"
                      >
                        <p className="truncate font-medium text-foreground">{row.ticket_code}</p>
                        <p className="truncate text-muted-foreground">{row.site_name}</p>
                      </button>
                    ))}
                    {dayRows.length > 3 ? <p className="text-[10px] text-muted-foreground">+{dayRows.length - 3} more</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(daysInRange.length, 1)}, minmax(220px, 1fr))` }}
          >
            {daysInRange.map((day) => {
              const key = toDateKey(day);
              const dayRows = rowsByDate.get(key) ?? [];
              return (
                <Card key={key} className="border-border/80">
                  <CardContent className="space-y-2 p-3">
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground">{DAY_NAMES[day.getDay()]}</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(key)}</p>
                    </div>
                    {dayRows.length ? dayRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onSelect(row)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-left hover:bg-muted"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-xs text-foreground">{row.ticket_code}</p>
                          <Badge color={statusColor(row.status)}>{row.status}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{row.site_name}</p>
                      </button>
                    )) : (
                      <p className="text-xs text-muted-foreground">No work orders</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
