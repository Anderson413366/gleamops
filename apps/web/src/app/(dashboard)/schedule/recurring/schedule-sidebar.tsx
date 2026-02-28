'use client';

import { useState, useMemo } from 'react';
import { PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@gleamops/ui';

interface ScheduleSidebarProps {
  /** Current anchor date for the schedule range */
  anchorDate: Date;
  onDateSelect: (date: Date) => void;
  /** Show/hide availability overlay in grid */
  showAvailability: boolean;
  onShowAvailabilityChange: (show: boolean) => void;
  /** Show/hide leave overlay in grid */
  showLeave: boolean;
  onShowLeaveChange: (show: boolean) => void;
  /** Reset all filters */
  onResetFilters: () => void;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniCalendar({ currentDate, onSelect }: { currentDate: Date; onSelect: (date: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(currentDate));

  const weeks = useMemo(() => {
    const firstDay = startOfMonth(viewMonth);
    const startOffset = firstDay.getDay();
    const totalDays = daysInMonth(viewMonth);
    const cells: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weekRows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }
    return weekRows;
  }, [viewMonth]);

  const today = new Date();

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-[10px] font-medium text-muted-foreground py-0.5">
            {label}
          </div>
        ))}
        {weeks.flat().map((date, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!date}
            onClick={() => date && onSelect(date)}
            className={cn(
              'h-6 w-6 rounded text-[11px] transition-colors',
              !date && 'invisible',
              date && isSameDay(date, today) && 'bg-primary text-primary-foreground font-bold',
              date && isSameDay(date, currentDate) && !isSameDay(date, today) && 'ring-1 ring-primary',
              date && !isSameDay(date, today) && !isSameDay(date, currentDate) && 'text-foreground hover:bg-muted',
            )}
          >
            {date?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScheduleSidebar({
  anchorDate,
  onDateSelect,
  showAvailability,
  onShowAvailabilityChange,
  showLeave,
  onShowLeaveChange,
  onResetFilters,
}: ScheduleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="shrink-0 w-56 space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <MiniCalendar currentDate={anchorDate} onSelect={onDateSelect} />

      <div className="space-y-2 pt-2 border-t border-border">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAvailability}
            onChange={(e) => onShowAvailabilityChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground">Show Availability</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showLeave}
            onChange={(e) => onShowLeaveChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground">Show Leave</span>
        </label>
      </div>

      <button
        type="button"
        onClick={onResetFilters}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Reset to Full Schedule
      </button>
    </aside>
  );
}
